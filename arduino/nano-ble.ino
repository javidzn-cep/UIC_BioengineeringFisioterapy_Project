#include <ArduinoBLE.h>

#define SERVICE_UUID "0x180F"
#define CHARACTERISTIC_UUID "0x2A19"

BLEService service(SERVICE_UUID);
BLEUnsignedCharCharacteristic characteristic(CHARACTERISTIC_UUID, BLERead | BLENotify);

void setup() {

  Serial.begin(9600);
  while (!Serial);

  if (!BLE.begin()) {
    Serial.println("starting Bluetooth® Low Energy failed!");
    while (1);
  }

  BLE.setLocalName("UIC BCN");
  BLE.setAdvertisedService(service);

  characteristic.writeValue(0);
  service.addCharacteristic(characteristic);

  BLE.addService(service);

  BLE.advertise();
  Serial.println("BLE iniciado. Esperando conexión...");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());

    while (central.connected()) {
      int dato = random(100);
      characteristic.writeValue(dato);

      Serial.print("Dato enviado: ");
      Serial.println(dato);

      delay(500);
    }

    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}