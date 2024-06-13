#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_JSON.h>
#include <MadgwickAHRS.h>
#include <vector>

const char* DEVICE_NAME = "UIC - Arduino Nano";
const char* IMU_SERVICE_UUID = "0000AAA0-0000-1000-8000-00805f9b34fb";
const char* SENSOR_FUSION_PRY_UUID = "0000AAA1-0000-1000-8000-00805f9b34fb";
const char* ANGLE_MESURING_OBSERVER_UUID = "0000AAA2-0000-1000-8000-00805f9b34fb";
const char* ACK_TYPE_CONN_UUID = "0000AAB0-0000-1000-8000-00805f9b34fb";
const char* ACK_DATA_LINE_UUID = "0000AAB1-0000-1000-8000-00805f9b34fb";
const char* ACK_HANDSHAKE_UUID = "0000AAB2-0000-1000-8000-00805f9b34fb";
const char* ACK_RECORDING_OBSERVER_UUID = "0000AAB3-0000-1000-8000-00805f9b34fb";
const uint8_t IMU_REFRESH_RATE = 15;
const uint8_t ACK_REFRESH_RATE = 2;
const uint8_t INPUT_BUTTON = 6;
const uint32_t SECOND_IN_MICROS = 1000000;
const uint32_t BUTTON_TIMEOUT = 250000;
const uint32_t ACK_TIMEOUT = (SECOND_IN_MICROS / ACK_REFRESH_RATE) * 3;

uint8_t prevButtonVal = -1;
int16_t ackPackageID, ackReceivedID;
uint32_t microsPreviousIMU, microsPreviousACK, startRecordingMicros, prevPressedBtnMicros = 0,prevSendedPackageTimeStamp = 0;
float pitch, roll, yaw, aX, aY, aZ, gX, gY, gZ, mX, mY, mZ;
bool isRecording = false, waitingForResponse = false, isMeasuring = false;

BLEService imuService(IMU_SERVICE_UUID);
BLEStringCharacteristic sensorFusionPRY(SENSOR_FUSION_PRY_UUID, BLERead | BLENotify, 1000);
BLEBooleanCharacteristic angleMesuringObserver(ANGLE_MESURING_OBSERVER_UUID, BLERead | BLEWrite | BLENotify);
BLEService ackTypeConn(ACK_TYPE_CONN_UUID);
BLEStringCharacteristic ackDataLine(ACK_DATA_LINE_UUID, BLERead | BLENotify, 1000);
BLEUnsignedIntCharacteristic ackHandshakeLine(ACK_HANDSHAKE_UUID, BLERead | BLEWrite | BLENotify);
BLEBooleanCharacteristic recordingObserver(ACK_RECORDING_OBSERVER_UUID, BLERead | BLEWrite | BLENotify);

Madgwick madgwickFilter;
std::vector<JSONVar> ackMemory; 

void setup() {
    Serial.begin(9600);
    initBLE();
    initIMU();
    initDigital();
    madgwickFilter.begin(IMU_REFRESH_RATE);

}

void loop() {
    BLEDevice webApp = BLE.central();
    if (webApp) {
        handleConection();
        while (webApp.connected()) {
            handleIMU();
            handleACK();
            ackConfirmationReceiver();
            sendAckPackage();
            ackRespondingTimeOutController();
            recordingReceiver();
            inputBtnReceiver();
        }
        handleDisconection();
    }
    BLE.poll();
}

void initBLE(){
    if (!BLE.begin()) {
        Serial.println(F("Starting Bluetooth® Low Energy failed!"));
        while (1);
    }
    BLE.setLocalName(DEVICE_NAME);
    BLE.setDeviceName(DEVICE_NAME);
    BLE.setAdvertisedService(imuService);
    BLE.setAdvertisedService(ackTypeConn);
    imuService.addCharacteristic(sensorFusionPRY);
    imuService.addCharacteristic(angleMesuringObserver);
    ackTypeConn.addCharacteristic(ackDataLine);
    ackTypeConn.addCharacteristic(ackHandshakeLine);
    ackTypeConn.addCharacteristic(recordingObserver);
    BLE.addService(imuService);
    BLE.addService(ackTypeConn);
    BLE.advertise();
}

void initIMU(){
    if (!IMU.begin()) {
        Serial.println(F("Starting IMU failed!"));
        while(1);
    }
}

void initDigital(){
    pinMode(INPUT_BUTTON, INPUT);
    pinMode(LEDR, OUTPUT);
    pinMode(LEDG, OUTPUT);
    pinMode(LEDB, OUTPUT);
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LEDR, HIGH);
    digitalWrite(LEDG, HIGH);
    digitalWrite(LEDB, HIGH);
    digitalWrite(LED_BUILTIN, LOW);
}

void handleConection(){
    microsPreviousIMU = micros();
    microsPreviousACK = micros();
    turnLEDon(1);
}

void handleDisconection(){
    turnLEDon(0);
    digitalWrite(LED_BUILTIN, LOW);
    ackMemory.clear();
    isRecording = false;
    isMeasuring = false;
    waitingForResponse = false;
    prevButtonVal = -1;
}

void handleIMU() {
    if (micros() - microsPreviousIMU >= (SECOND_IN_MICROS / IMU_REFRESH_RATE)) {
        imuDataReader();
        imuCalibration();
        imuSensorFusion();
        sendImuData();
        microsPreviousIMU += (SECOND_IN_MICROS / IMU_REFRESH_RATE);
    }
}

void handleACK(){
    if (micros() - microsPreviousACK >= (SECOND_IN_MICROS / ACK_REFRESH_RATE)) {
        ackDataGetter();
        microsPreviousACK += (SECOND_IN_MICROS / ACK_REFRESH_RATE);
    }
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
    gX += 0;
    gY += 0;
    gZ += 0;
    mX += 0;
    mY += 0;
    mZ += 0;
}

void imuSensorFusion(){
    madgwickFilter.update(-gX, gY, gZ, -aX, aY, aZ, mX, mY, mX);
    pitch = madgwickFilter.getPitch();
    roll = madgwickFilter.getRoll();
    yaw = madgwickFilter.getYaw();
}

void sendImuData(){
    JSONVar sensorData;
    sensorData["pitch"] = pitch;
    sensorData["roll"] = roll;
    sensorData["yaw"] = yaw;
    sensorData["isMeasuring"] = isMeasuring;
    sensorFusionPRY.writeValue(JSON.stringify(sensorData));
}

void turnLEDon(bool isOn){
    digitalWrite(LEDR, !isOn);
    digitalWrite(LEDG, !isOn);
    digitalWrite(LEDB, !isOn);
}

void ackDataGetter(){
    if (isRecording) { 
        JSONVar ackData;
        ackData["id"] = ackPackageID++;
        ackData["micros"] = micros() - startRecordingMicros;
        ackData["pitch"] = pitch;
        ackData["roll"] = roll;
        ackData["yaw"] = yaw;
        ackData["isMeasuring"] = isMeasuring;
        ackMemory.push_back(ackData);
    }
}

void sendAckPackage() {
    if (!ackMemory.empty() && !waitingForResponse) {
        JSONVar package = ackMemory.front();
        package["waitingPackages"] = ackMemory.size()-1;
        ackDataLine.writeValue(JSON.stringify(package));
        waitingForResponse = true;
        prevSendedPackageTimeStamp = micros();
        digitalWrite(LED_BUILTIN, HIGH);
    }
}

void recordingReceiver() {
    if (recordingObserver.written()) {
        isRecording = recordingObserver.value();
        if (isRecording){
            ackMemory.clear();
            ackMemory.shrink_to_fit();
            startRecordingMicros = micros();
            waitingForResponse = false;
            prevSendedPackageTimeStamp = 0;
            ackPackageID = 0;
            ackReceivedID = -1;
        }
    }
}

void ackConfirmationReceiver() {
    if (ackHandshakeLine.written()) {
        int16_t receivedID = ackHandshakeLine.value();
        if(receivedID != ackReceivedID) {
          ackMemory.erase(ackMemory.begin());
          ackReceivedID = receivedID;
        }
        waitingForResponse = false;
        digitalWrite(LED_BUILTIN, LOW);
    }
}

void ackRespondingTimeOutController(){
    if (prevSendedPackageTimeStamp != 0 && micros() >= (prevSendedPackageTimeStamp + ACK_TIMEOUT) && waitingForResponse){
        waitingForResponse = false;
        prevSendedPackageTimeStamp = 0;
    }
}

void inputBtnReceiver(){
    int buttonVal = digitalRead(INPUT_BUTTON);
    if (prevButtonVal != -1){
        if(prevButtonVal == LOW && buttonVal == HIGH && (prevPressedBtnMicros + BUTTON_TIMEOUT) < micros()){
            isMeasuring = !isMeasuring;
            prevPressedBtnMicros = micros();
        }
    }
    prevButtonVal = buttonVal;
}