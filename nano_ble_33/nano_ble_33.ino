#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_JSON.h>

#define DEVICE_NAME "UIC - Arduino"
#define RANDOM_DATA_SERVICE_UUID "180F"
#define RANDOM_DATA_CHAR_UUID "2A19"
#define IMU_SERVICE_UUID "0000AAA0-0000-1000-8000-00805f9b34fb"
#define ACCELEROMETER_XYZ_UUID "0000AAA1-0000-1000-8000-00805f9b34fb"
#define GYROSCOPE_XYZ_UUID "0000AAA2-0000-1000-8000-00805f9b34fb"

BLEService randomDataService(RANDOM_DATA_SERVICE_UUID);
BLEService imuService(IMU_SERVICE_UUID);
BLEStringCharacteristic randomDataChar(RANDOM_DATA_CHAR_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic accelerometerXYZ(ACCELEROMETER_XYZ_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic gyroscopeXYZ(GYROSCOPE_XYZ_UUID, BLERead | BLENotify, 100);

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
            readAccelerometer();
            readGyroscope();
        }
        Serial.println("Disconnected from central: " + webApp.address());
    }
}

void readRandomData(){
    randomDataChar.writeValue(JSON.stringify(random(100)));
}

void readAccelerometer() {
    float aX, aY, aZ;
    if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(aX, aY, aZ);
        JSONVar accelerometerData;
        accelerometerData["aX"] = aX;
        accelerometerData["aY"] = aY;
        accelerometerData["aZ"] = aZ;
        accelerometerXYZ.writeValue(JSON.stringify(accelerometerData));
    }
}

void readGyroscope() {
    float gX, gY, gZ;
    if (IMU.gyroscopeAvailable()) {
        IMU.readGyroscope(gX, gY, gZ);
        JSONVar gyroscopeData;
        gyroscopeData["gX"] = gX;
        gyroscopeData["gY"] = gY;
        gyroscopeData["gZ"] = gZ;
        gyroscopeXYZ.writeValue(JSON.stringify(gyroscopeData));
    }
}