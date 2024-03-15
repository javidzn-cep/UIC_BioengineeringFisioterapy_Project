#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_JSON.h>
#include <MadgwickAHRS.h>


#define DEVICE_NAME "UIC - Arduino Nano"
#define IMU_SERVICE_UUID "0000AAA0-0000-1000-8000-00805f9b34fb"
#define ACCELEROMETER_XYZ_UUID "0000AAA1-0000-1000-8000-00805f9b34fb"
#define GYROSCOPE_XYZ_UUID "0000AAA2-0000-1000-8000-00805f9b34fb"
#define MAGNETOMETER_XYZ_UUID "0000AAA3-0000-1000-8000-00805f9b34fb"
#define SENSOR_FUSION_PRY_UUID "0000AAA4-0000-1000-8000-00805f9b34fb"
#define PI 3.14159265
#define LOW_FILTER_ALPHA 0.25
#define REFRESH_RATE 22


unsigned long microsPrevious, microsNow;
float aX, aY, aZ, gX, gY, gZ, mX, mY, mZ;
float pitch, roll, yaw;


BLEService imuService(IMU_SERVICE_UUID);
BLEStringCharacteristic accelerometerXYZ(ACCELEROMETER_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic gyroscopeXYZ(GYROSCOPE_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic magnetometerXYZ(MAGNETOMETER_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic sensorFusionPRY(SENSOR_FUSION_PRY_UUID, BLERead | BLENotify, 100);
Madgwick madgwickFilter;


void setup() {
    Serial.begin(9600);

    if (!BLE.begin()) {
        Serial.println("Starting Bluetooth® Low Energy failed!");
        while (1);
    }

    if (!IMU.begin()) {
        Serial.println("Starting IMU failed!");
        // while(1);
    }

    BLE.setLocalName(DEVICE_NAME);
    BLE.setDeviceName(DEVICE_NAME);

    BLE.setAdvertisedService(imuService);

    imuService.addCharacteristic(accelerometerXYZ);
    imuService.addCharacteristic(gyroscopeXYZ);
    imuService.addCharacteristic(magnetometerXYZ);
    imuService.addCharacteristic(sensorFusionPRY);

    BLE.addService(imuService);
    BLE.advertise();

    madgwickFilter.begin(REFRESH_RATE);
    microsPrevious = micros();
}

void loop() {
    BLEDevice webApp = BLE.central();
    if (webApp) {
        Serial.println("Connected to central: " + webApp.address());
        while (webApp.connected()) {
            microsNow = micros();
            if (microsNow - microsPrevious >= 1000000 / REFRESH_RATE) {
                imuDataHandler();
                sensorFusionMadgwickAlgorithm();
                microsPrevious += 1000000 / REFRESH_RATE;
            }
        }
        Serial.print("Disconnected from central: " + webApp.address());
    }
}

void imuDataHandler() {
    if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()/* && IMU.magneticFieldAvailable()*/) {
        IMU.readAcceleration(aX, aY, aZ);
        IMU.readGyroscope(gX, gY, gZ);
        IMU.readMagneticField(mX, mY, mZ);

        calibrateIMU();

        JSONVar accJSON;
        accJSON["aX"] = aX;
        accJSON["aY"] = aY;
        accJSON["aZ"] = aZ;

        JSONVar gyroJSON;
        gyroJSON["gX"] = gX;
        gyroJSON["gY"] = gY;
        gyroJSON["gZ"] = gZ;

        JSONVar magJSON;
        magJSON["mX"] = mX;
        magJSON["mY"] = mY;
        magJSON["mZ"] = mZ;
      
        accelerometerXYZ.writeValue(JSON.stringify(accJSON));
        gyroscopeXYZ.writeValue(JSON.stringify(gyroJSON));
        magnetometerXYZ.writeValue(JSON.stringify(magJSON));
    }
}

void sensorFusionMadgwickAlgorithm(){

  madgwickFilter.update(-gX, gY, gZ, -aX, aY, aZ, mX, mY, mX);
//   pitch = LOW_FILTER_ALPHA * pitch + (1 - LOW_FILTER_ALPHA) * madgwickFilter.getPitch();
//   roll = LOW_FILTER_ALPHA * roll + (1 - LOW_FILTER_ALPHA) * madgwickFilter.getRoll();
//   yaw = LOW_FILTER_ALPHA * yaw + (1 - LOW_FILTER_ALPHA) * madgwickFilter.getYaw();
  pitch = madgwickFilter.getPitch();
  roll = madgwickFilter.getRoll();
  yaw = madgwickFilter.getYaw();

  JSONVar sensorJSON;
  sensorJSON["pitch"] = pitch;
  sensorJSON["roll"] = roll;
  sensorJSON["yaw"] = yaw;

  Serial.println(JSON.stringify(sensorJSON));
  sensorFusionPRY.writeValue(JSON.stringify(sensorJSON));
}

void calibrateIMU(){
  aX += 0;
  aY += 0;
  aZ += 0;
  gX += 0.33;
  gY += 0;
  gZ += 0;
  mX += 32768;
  mY += 32768;
  mZ += 32768;
}