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
<<<<<<< Updated upstream
#define LOW_FILTER_ALPHA 0.25
#define REFRESH_RATE 22


unsigned long microsPrevious, microsNow;
float aX, aY, aZ, gX, gY, gZ, mX, mY, mZ;
float pitch, roll, yaw;

=======
>>>>>>> Stashed changes

// Bluetooth Low Energy Variables
BLEService imuService(IMU_SERVICE_UUID);
<<<<<<< Updated upstream
BLEStringCharacteristic accelerometerXYZ(ACCELEROMETER_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic gyroscopeXYZ(GYROSCOPE_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic magnetometerXYZ(MAGNETOMETER_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic sensorFusionPRY(SENSOR_FUSION_PRY_UUID, BLERead | BLENotify, 100);
Madgwick madgwickFilter;


=======
BLEStringCharacteristic accelerometerXYZ(ACCELEROMETER_XYZ_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic gyroscopeXYZ(GYROSCOPE_XYZ_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic magnetometerXYZ(MAGNETOMETER_XYZ_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic sensorFusionPRY(SENSOR_FUSION_PRY_UUID, BLERead | BLENotify, 1000);


// IMU Reading Variables
float aX, aY, aZ, gX, gY, gZ, mX, mY, mZ;

// Complementary Filter Variables
float thetaG = 0, phiG = 0, dt, phi, theta, psi, cfAlpha = 0.05;
unsigned long millisOld;

// Kalman Filter Variables
float kalmanAnglePitch = 0, kalmanUncertaintyAnglePitch  = 0.1;
float kalmanAngleRoll = 0, kalmanUncertaintyAngleRoll  = 0.1;
float gyroPitch = 0, gyroRoll = 0, gyroYaw  = 0;
float kalmanGain;
float gryoDeviation = 0.05, accDeviation = 1.2;

// Madgwik Filter Variables
float refreshRatePerSeconds = 17;
float millisPerReading = 1000. / refreshRatePerSeconds;
Madgwick madgwickFilter;






>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    madgwickFilter.begin(REFRESH_RATE);
    microsPrevious = micros();
=======
    madgwickFilter.begin(refreshRatePerSeconds);
    millisOld = millis();
>>>>>>> Stashed changes
}

void loop() {
    BLEDevice webApp = BLE.central();
    if (webApp) {
        Serial.println("Connected to central: " + webApp.address());
        while (webApp.connected()) {
<<<<<<< Updated upstream
            microsNow = micros();
            if (microsNow - microsPrevious >= 1000000 / REFRESH_RATE) {
                imuDataHandler();
                sensorFusionMadgwickAlgorithm();
                microsPrevious += 1000000 / REFRESH_RATE;
=======
            unsigned long millisNew = millis();
            if(millisNew - millisOld >= millisPerReading){
              imuDataHandler();
              millisOld += millisPerReading;
>>>>>>> Stashed changes
            }
        }
        Serial.print("Disconnected from central: " + webApp.address());
    }
    BLE.poll();
}

void imuDataHandler() {
    if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()/* && IMU.magneticFieldAvailable()*/) {
        IMU.readAcceleration(aX, aY, aZ);
        IMU.readGyroscope(gX, gY, gZ);
        IMU.readMagneticField(mX, mY, mZ);

        calibrateIMU();
<<<<<<< Updated upstream
=======

        // sensorFusionTrigonometry();
        // sensorFusionKalmanFilter();
        sensorFusionMadgwickAlgorithm();
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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

=======



void sensorFusionTrigonometry(){
  unsigned long millisNew = millis();
  dt = (millisNew - millisOld) / 1000.;
  millisOld = millisNew;

  float thetaM = atan2(aX, sqrt(pow(aY, 2) + pow(aZ, 2))) * (180 / PI);
  float phiM = atan2(aY, sqrt(pow(aX, 2) + pow(aZ, 2))) * (180 / PI);

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
  
>>>>>>> Stashed changes
  Serial.println(JSON.stringify(sensorJSON));
  sensorFusionPRY.writeValue(JSON.stringify(sensorJSON));
}

<<<<<<< Updated upstream
void calibrateIMU(){
  aX += 0;
  aY += 0;
  aZ += 0;
  gX += 0.33;
  gY += 0;
  gZ += 0;
=======
void sensorFusionKalmanFilter(){
  unsigned long millisNew = millis();
  dt = (millisNew - millisOld) / 1000.;
  millisOld = millisNew;

  float accPitch = atan2(aX, sqrt(pow(aY, 2) + pow(aZ, 2))) * (180 / PI);
  float accRoll = atan2(aY, sqrt(pow(aX, 2) + pow(aZ, 2))) * (180 / PI);
  
  gyroPitch += gY * dt;
  gyroRoll += gX * dt;
  gyroYaw += gZ * dt;


  kalmanFilter(kalmanAnglePitch, kalmanUncertaintyAnglePitch, gyroPitch, accPitch);
  kalmanFilter(kalmanAngleRoll, kalmanUncertaintyAngleRoll, gyroRoll, accRoll);

  JSONVar sensorJSON;
  sensorJSON["pitch"] = kalmanAnglePitch;
  sensorJSON["roll"] = kalmanAngleRoll;
  sensorJSON["accPitch"] = accPitch;
  sensorJSON["accRoll"] = accRoll;
  sensorJSON["gyroPitch"] = gyroPitch;
  sensorJSON["gyroRoll"] = gyroRoll;

  Serial.println(JSON.stringify(sensorJSON));
  sensorFusionPRY.writeValue(JSON.stringify(sensorJSON));
}

void kalmanFilter(float &kalmanState, float &kalmanUncertainty, float kalmanInput, float kalmanMeasurement){
  kalmanState += kalmanInput * dt;
  kalmanUncertainty += pow(dt, 2) * pow(gryoDeviation, 2);
  kalmanGain = kalmanUncertainty / (kalmanUncertainty + pow(accDeviation, 2));
  kalmanState += kalmanGain * (kalmanMeasurement - kalmanState);
  kalmanUncertainty = (1 - kalmanGain) * kalmanUncertainty;
}


void sensorFusionMadgwickAlgorithm(){

  madgwickFilter.update(-gX, gY, gZ, -aX, aY, aZ, mX, mY, mZ);

  JSONVar sensorJSON;
  sensorJSON["pitch"] = madgwickFilter.getPitch();
  sensorJSON["roll"] = madgwickFilter.getRoll();
  sensorJSON["yaw"] = madgwickFilter.getYaw();

  Serial.println(JSON.stringify(sensorJSON));
  sensorFusionPRY.writeValue(JSON.stringify(sensorJSON));
}

void calibrateIMU(){
  aX += 0;
  aY += 0;
  aY += 0;
  gX += 0.35;
  gY += 0.15;
  gX -= 0.1;
>>>>>>> Stashed changes
  mX += 32768;
  mY += 32768;
  mZ += 32768;
}