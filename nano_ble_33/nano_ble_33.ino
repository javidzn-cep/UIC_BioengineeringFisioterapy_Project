#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_JSON.h>
#include <MadgwickAHRS.h>
#include <vector>

#define DEVICE_NAME "UIC - Arduino Nano"
#define IMU_SERVICE_UUID "0000AAA0-0000-1000-8000-00805f9b34fb"
#define ACCELEROMETER_XYZ_UUID "0000AAA1-0000-1000-8000-00805f9b34fb"
#define GYROSCOPE_XYZ_UUID "0000AAA2-0000-1000-8000-00805f9b34fb"
#define MAGNETOMETER_XYZ_UUID "0000AAA3-0000-1000-8000-00805f9b34fb"
#define SENSOR_FUSION_PRY_UUID "0000AAA4-0000-1000-8000-00805f9b34fb"
#define ACK_TYPE_CONN_UUID "0000AAB0-0000-1000-8000-00805f9b34fb"
#define ACK_CONN_LINE_UUID "0000AAB1-0000-1000-8000-00805f9b34fb"
#define ACK_HANDSHAKE_UUID "0000AAB2-0000-1000-8000-00805f9b34fb"
#define ACK_RECORDING_UUID "0000AAB3-0000-1000-8000-00805f9b34fb"
#define IMU_REFRESH_RATE 15
#define ACK_REFRESH_RATE 8
#define INPUT_BUTTON 6



unsigned long microsPreviousIMU, microsPreviousACK, startRecordingMicros, prevSendedPackageTimeStamp = 0;
unsigned int ackPackageID = 0;
float aX, aY, aZ, gX, gY, gZ, mX, mY, mZ, pitch, roll, yaw;
bool isRecording = false, waitingForResponse = false;
int prevButtonVal = -1;

BLEService imuService(IMU_SERVICE_UUID);
BLEStringCharacteristic accelerometerXYZ(ACCELEROMETER_XYZ_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic gyroscopeXYZ(GYROSCOPE_XYZ_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic magnetometerXYZ(MAGNETOMETER_XYZ_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic sensorFusionPRY(SENSOR_FUSION_PRY_UUID, BLERead | BLENotify, 1000);
BLEService ackTypeConn(ACK_TYPE_CONN_UUID);
BLEStringCharacteristic ackConnLine(ACK_CONN_LINE_UUID, BLERead | BLENotify, 1000);
BLEStringCharacteristic ackHandshakeLine(ACK_HANDSHAKE_UUID, BLERead | BLEWrite | BLENotify, 1000);
BLEStringCharacteristic recording(ACK_RECORDING_UUID, BLERead | BLEWrite | BLENotify, 1000);

Madgwick madgwickFilter;
std::vector<JSONVar> ackMemory; 

void setup() {
    Serial.begin(9600);

    if (!BLE.begin()) {
        Serial.println("Starting Bluetooth® Low Energy failed!");
        while (1);
    }

    if (!IMU.begin()) {
        Serial.println("Starting IMU failed!");
        while(1);
    }

    pinMode(INPUT_BUTTON, INPUT);

    BLE.setLocalName(DEVICE_NAME);
    BLE.setDeviceName(DEVICE_NAME);

    BLE.setAdvertisedService(imuService);
    BLE.setAdvertisedService(ackTypeConn);

    imuService.addCharacteristic(accelerometerXYZ);
    imuService.addCharacteristic(gyroscopeXYZ);
    imuService.addCharacteristic(magnetometerXYZ);
    imuService.addCharacteristic(sensorFusionPRY);
    ackTypeConn.addCharacteristic(ackConnLine);
    ackTypeConn.addCharacteristic(ackHandshakeLine);
    ackTypeConn.addCharacteristic(recording);

    BLE.addService(imuService);
    BLE.addService(ackTypeConn);
    BLE.advertise();

    madgwickFilter.begin(IMU_REFRESH_RATE);
    microsPreviousIMU = micros();
    microsPreviousACK = micros();
}

void loop() {
    BLEDevice webApp = BLE.central();
    if (webApp) {
        Serial.println("Connected to central: " + webApp.address());
        while (webApp.connected()) {
            if (micros() - microsPreviousIMU >= 1000000 / IMU_REFRESH_RATE) {
                imuDataReader();
                imuCalibration();
                imuSensorFusion();
                sendImuData();
                microsPreviousIMU += 1000000 / IMU_REFRESH_RATE;
            }
            if (micros() - microsPreviousACK >= 1000000 / ACK_REFRESH_RATE) {
                ackDataGetter();
                sendAckPackage();
                microsPreviousACK += 1000000 / ACK_REFRESH_RATE;
            }
            recordingReciber();
            ackConfirmationReciber();
            ackRespondingTimeOutController();
            inputBtnReciber();
        }
        Serial.println("Disconnected from central: " + webApp.address());
    }
    BLE.poll();
}

void imuDataReader() {
    if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable() && IMU.magneticFieldAvailable()) {
        IMU.readAcceleration(aX, aY, aZ);
        IMU.readGyroscope(gX, gY, gZ);
        IMU.readMagneticField(mX, mY, mZ);
    }
}

void imuCalibration(){
    aX += 0;
    aY += 0;
    aZ += 0;
    gX += 0.33;
    gY += 0;
    gZ += 0;
    mX += 0;
    mY += 0;
    mZ += 0;
}

void sendImuData(){
    JSONVar accData, gyroData, magData, sensorData;

    accData["aX"] = aX;
    accData["aY"] = aY;
    accData["aZ"] = aZ;

    gyroData["gX"] = gX;
    gyroData["gY"] = gY;
    gyroData["gZ"] = gZ;

    magData["mX"] = mX;
    magData["mY"] = mY;
    magData["mZ"] = mZ;

    sensorData["pitch"] = pitch;
    sensorData["roll"] = roll;
    sensorData["yaw"] = yaw;
  
    accelerometerXYZ.writeValue(JSON.stringify(accData));
    gyroscopeXYZ.writeValue(JSON.stringify(gyroData));
    magnetometerXYZ.writeValue(JSON.stringify(magData));
    sensorFusionPRY.writeValue(JSON.stringify(sensorData));
}

void imuSensorFusion(){
    madgwickFilter.update(-gX, gY, gZ, -aX, aY, aZ, mX, mY, mX);

    pitch = madgwickFilter.getPitch();
    roll = madgwickFilter.getRoll();
    yaw = madgwickFilter.getYaw();
}

void ackDataGetter(){
    if (isRecording) { 
        JSONVar ackData;
        ackData["id"] = ackPackageID++;
        ackData["micros"] = micros() - startRecordingMicros;
        ackData["angle"] = 0;
        ackData["pitch"] = pitch;
        ackData["roll"] = roll;
        ackData["yaw"] = yaw;
        ackMemory.push_back(ackData);
    }
}

void sendAckPackage() {
    if (!ackMemory.empty() && !waitingForResponse) {
        JSONVar package = ackMemory.front();
        package["remainingPackages"] = ackMemory.size() - 1;
        ackConnLine.writeValue(JSON.stringify(package));
        // Serial.print("Package with ID: ");
        // Serial.print(package["id"]);
        // Serial.println(" Sended");
        waitingForResponse = true;
        prevSendedPackageTimeStamp = micros();
    } else if (ac)
}

void recordingReciber() {
    if (recording.written()) {
        String value = recording.value();
        JSONVar result = JSON.parse(value.c_str());
        isRecording = bool(result["isRecording"]);
        if (isRecording){
            startRecordingMicros = micros();
            waitingForResponse = false;
        }
        prevSendedPackageTimeStamp = 0;
        Serial.print("isRecording: ");
        Serial.println(isRecording);
    }
}

void ackConfirmationReciber() {
    if (ackHandshakeLine.written()) {
        String value = ackHandshakeLine.value();
        JSONVar result = JSON.parse(value.c_str());
        ackMemory.erase(ackMemory.begin());
        waitingForResponse = false;
        // auto it = std::find_if(ackMemory.begin(), ackMemory.end(), [&](const JSONVar& obj) {
        //     return int(obj["id"]) == receivedID;
        // });
        // if (it != ackMemory.end()) {
        //     int index = std::distance(ackMemory.begin(), it);
        //     ackMemory.erase(it);
        // }
    }
}

void ackRespondingTimeOutController(){
    if (prevSendedPackageTimeStamp != 0 && micros() <= prevSendedPackageTimeStamp + 2500000 && waitingForResponse){
        waitingForResponse = true;
        Serial.println("TimeOut Controller Saved");
    }
}

void inputBtnReciber(){
    int buttonVal = digitalRead(INPUT_BUTTON);
    if (prevButtonVal != -1){
        if(prevButtonVal == LOW && buttonVal == HIGH){
            Serial.println("Pressed");
        } else if (prevButtonVal == HIGH && buttonVal == LOW){
            Serial.println("UnPresesed");
        }
    }
    prevButtonVal = buttonVal;
}





