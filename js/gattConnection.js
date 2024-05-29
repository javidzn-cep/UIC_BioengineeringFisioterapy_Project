const 
    servicesAndCharacteristics = [
        {
            service: { uuid: '0000aaa0-0000-1000-8000-00805f9b34fb' },
            characteristics: [
                { uuid: '0000aaa1-0000-1000-8000-00805f9b34fb', event: 'accelerometervaluechanged', gattCharacteristic: null },
                { uuid: '0000aaa2-0000-1000-8000-00805f9b34fb', event: 'gyroscopevaluechanged', gattCharacteristic: null },
                { uuid: '0000aaa3-0000-1000-8000-00805f9b34fb', event: 'magnetometervaluechanged', gattCharacteristic: null },
                { uuid: '0000aaa4-0000-1000-8000-00805f9b34fb', event: 'sensorfusionvaluechanged', gattCharacteristic: null }
            ]
        },
        {
            service: { uuid: '0000aab0-0000-1000-8000-00805f9b34fb'},
            characteristics: [
                { uuid: '0000aab1-0000-1000-8000-00805f9b34fb', event: 'newackvalue', gattCharacteristic: null },
                { uuid: '0000aab2-0000-1000-8000-00805f9b34fb', event: 'ackconfirmationid', gattCharacteristic: null},
                { uuid: '0000aab3-0000-1000-8000-00805f9b34fb', event: 'recording', gattCharacteristic: null}
            ]
        }
    ],
    isWebBluetoothEnabled = () => navigator.bluetooth != undefined;
let bluetoothDevice

document.addEventListener('DOMContentLoaded', () => {
    setCustomEvents()
    document.querySelector('.blt-request').addEventListener('click', () => isWebBluetoothEnabled() && requestAndGetBluetoothInfo());
});

function setCustomEvents(){
    servicesAndCharacteristics.forEach(serviceInfo => {
        serviceInfo.characteristics.forEach(characteristic => 
            characteristic.event = new CustomEvent(characteristic.event, { detail: { value: null } } )
        );
    });
}


function requestAndGetBluetoothInfo() {
    requestDevice()
        .then(connectToGatt)
        .catch(error => { console.warn(`Failed to start: ${error}`) });
}


function requestDevice() {
    const options = {
        filters: [{ namePrefix: 'UIC' }],
        optionalServices: servicesAndCharacteristics.map(gattInfo => gattInfo.service.uuid)
    };
    console.log('Requesting any Bluetooth Device...');
    return navigator.bluetooth.requestDevice(options)
        .then(device => bluetoothDevice = device)
        .catch(error => { throw new Error(`Failed to request device: ${error}`); });
}

function connectToGatt() {
    if (bluetoothDevice.gatt.connected) {
        return Promise.resolve();
    }
    return bluetoothDevice.gatt.connect()
        .then(server => {
            console.log('Getting GATT Services and Characteristics...');
            return Promise.all(servicesAndCharacteristics.map(serviceInfo => {
                return server.getPrimaryService(serviceInfo.service.uuid)
                    .then(primaryService => {
                        return Promise.all(serviceInfo.characteristics.map(characteristicInfo => primaryService.getCharacteristic(characteristicInfo.uuid)));
                    })
                    .then(characteristics => {
                        characteristics.forEach((characteristic, index) => {
                            serviceInfo.characteristics[index].gattCharacteristic = characteristic;
                            characteristic.addEventListener('characteristicvaluechanged', e => handleCharacteristicValueChanged(serviceInfo.characteristics[index], e));
                        });
                    })
                    .then(startNotifications)
            }));
        });
}

function handleCharacteristicValueChanged(characteristic, e) {
    try {
        characteristic.uuid == '0000aab3-0000-1000-8000-00805f9b34fb' && console.log(e.target.value)
        characteristic.event.detail.value = JSON.parse(new TextDecoder().decode(e.target.value));
        document.dispatchEvent(characteristic.event);
    } catch (e){
        console.error(e)
    }
}

function startNotifications() {
    servicesAndCharacteristics.forEach(service => {
        service.characteristics.forEach(characteristic => {
            characteristic.gattCharacteristic?.startNotifications()
                .then(_ => {
                    console.log(`Started notifications for characteristic ${characteristic.uuid}`);
                })
                .catch(error => {
                    console.warn(`Failed to start notifications for characteristic ${characteristic.uuid}: ${error}`);
                });
        });
    });
}