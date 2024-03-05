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
#define cfAlpha 0.1


unsigned long millisOld;
float aX, aY, aZ, gX, gY, gZ, mX, mY, mZ;
float thetaG = 0, phiG = 0, dt, phi, theta, psi;


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

    madgwickFilter.begin(IMU.accelerationSampleRate());
    millisOld = millis();
}

void loop() {
    BLEDevice webApp = BLE.central();
    if (webApp) {
        Serial.println("Connected to central: " + webApp.address());
        while (webApp.connected()) {
            imuDataHandler();
        }
        Serial.print("Disconnected from central: " + webApp.address());
    }
}

void imuDataHandler() {
    if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()/* && IMU.magneticFieldAvailable()*/) {
        IMU.readAcceleration(aX, aY, aZ);
        IMU.readGyroscope(gX, gY, gZ);
        IMU.readMagneticField(mX, mY, mZ);

        sensorFusionTrigonometry();
        // sensorFusionMadgwickAlgorithm();

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

void sensorFusionTrigonometry(){
  unsigned long millisNew = millis();
  dt = (millisNew - millisOld) / 1000.;
  millisOld = millisNew;

  float thetaM = atan2(aX, aZ) * (180 / PI);
  float phiM = atan2(aY, aZ) * (180 / PI);

  thetaG = thetaG + gY * dt;
  phiG = phiG - gX * dt;

  theta = (1 - cfAlpha) * (theta + gY * dt) + (cfAlpha * thetaM);
  phi = (1 - cfAlpha) * (phi - gX * dt) + (cfAlpha * phiM);

  float thetaRad  = theta * (PI / 180);
  float phiRad  = phi * (PI / 180);
  float mX3d = mX * cos(thetaRad) - mY * sin(phiRad) * sin(thetaRad) + mZ * cos(phiRad) * sin(thetaRad);
  float mY3d = mY * cos(phiRad) + mZ * sin(phiRad);
  psi = atan2(mY3d, mX3d) * (180 / PI);

  JSONVar sensorJSON;
  sensorJSON["pitch"] = theta;
  sensorJSON["roll"] = phi;
  sensorJSON["yaw"] = psi;
  
  sensorFusionPRY.writeValue(JSON.stringify(sensorJSON));
}


void sensorFusionMadgwickAlgorithm(){

  madgwickFilter.updateIMU(gX, gY, gZ, aX, aY, aZ);

  JSONVar sensorJSON;
  sensorJSON["pitch"] = madgwickFilter.getPitch();
  sensorJSON["roll"] = madgwickFilter.getRoll();
  sensorJSON["yaw"] = madgwickFilter.getYaw();

  Serial.println(JSON.stringify(sensorJSON));
  
  sensorFusionPRY.writeValue(JSON.stringify(sensorJSON));
}