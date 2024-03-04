#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_JSON.h>

#define DEVICE_NAME "UIC - Arduino Nano"
#define RANDOM_DATA_SERVICE_UUID "180F"
#define RANDOM_DATA_CHAR_UUID "2A19"
#define RSSI_UUID ""
#define IMU_SERVICE_UUID "0000AAA0-0000-1000-8000-00805f9b34fb"
#define ACCELEROMETER_XYZ_UUID "0000AAA1-0000-1000-8000-00805f9b34fb"
#define GYROSCOPE_XYZ_UUID "0000AAA2-0000-1000-8000-00805f9b34fb"
#define MAGNETOMETER_XYZ_UUID "0000AAA3-0000-1000-8000-00805f9b34fb"

BLEService randomDataService(RANDOM_DATA_SERVICE_UUID);
BLEService imuService(IMU_SERVICE_UUID);
BLEStringCharacteristic randomDataChar(RANDOM_DATA_CHAR_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic accelerometerXYZ(ACCELEROMETER_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic gyroscopeXYZ(GYROSCOPE_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic magnetometerXYZ(MAGNETOMETER_XYZ_UUID, BLERead | BLENotify, 100);

void setup() {
    Serial.begin(9600);
    while (!Serial);

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

    BLE.setAdvertisedService(randomDataService);
    BLE.setAdvertisedService(imuService);

    randomDataService.addCharacteristic(randomDataChar);
    imuService.addCharacteristic(accelerometerXYZ);
    imuService.addCharacteristic(gyroscopeXYZ);
    imuService.addCharacteristic(magnetometerXYZ);

    BLE.addService(randomDataService);
    BLE.addService(imuService);

    BLE.advertise();

    Serial.println("BLE iniciado. Esperando conexión...");
    Serial.println("Accelerometer sample rate = " + String(IMU.accelerationSampleRate()) + "Hz");
}

void loop() {
    BLEDevice webApp = BLE.central();
    if (webApp) {
        Serial.println("Connected to central: " + webApp.address());
        while (webApp.connected()) {
            readRandomData();
            imuDataHandler();
        }
        Serial.print("Disconnected from central: " + webApp.address());
    }
}

void readRandomData(){
    randomDataChar.writeValue(JSON.stringify(random(100)));
}

void imuDataHandler() {
    float aX, aY, aZ, gX, gY, gZ, mX, mY, mZ;
    // if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable() && IMU.magneticFieldAvailable()) {
        IMU.readAcceleration(aX, aY, aZ);
        IMU.readGyroscope(gX, gY, gZ);
        IMU.readMagneticField(mX, mY, mZ);

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

        String accJSONString = JSON.stringify(accJSON);
        String gyroJSONString = JSON.stringify(gyroJSON);
        String magJSONString = JSON.stringify(magJSON);
        
        Serial.println(accJSONString);
        Serial.println(gyroJSONString);
        Serial.println(magJSONString);

        if (accJSONString.length() <= accelerometerXYZ.valueSize() && gyroJSONString.length() <= gyroscopeXYZ.valueSize() && magJSONString.length() <= magnetometerXYZ.valueSize()) {
            accelerometerXYZ.writeValue(accJSONString);
            gyroscopeXYZ.writeValue(gyroJSONString);
            magnetometerXYZ.writeValue(magJSONString);
        } else {
            Serial.println("JSON demasiado grande para las características BLE. No se ha enviado.");
        }
    // }
}