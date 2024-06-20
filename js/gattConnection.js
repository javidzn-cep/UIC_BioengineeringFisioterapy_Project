const 
    GATT_SERVICES_CHARACTERISTICS = [
        {
            service: { uuid: '0000aaa0-0000-1000-8000-00805f9b34fb', gattService: null},
            characteristics: [
                { uuid: '0000aaa1-0000-1000-8000-00805f9b34fb', event: 'sensorfusionvaluechanged', gattCharacteristic: null, notificationsStarted: false },
            ]
        },
        {
            service: { uuid: '0000aab0-0000-1000-8000-00805f9b34fb', gattService: null},
            characteristics: [
                { uuid: '0000aab1-0000-1000-8000-00805f9b34fb', event: 'newackvalue', gattCharacteristic: null, notificationsStarted: false },
                { uuid: '0000aab2-0000-1000-8000-00805f9b34fb', event: 'ackconfirmationid', gattCharacteristic: null, notificationsStarted: false},
                { uuid: '0000aab3-0000-1000-8000-00805f9b34fb', event: 'recording', gattCharacteristic: null, notificationsStarted: false}
            ]
        }
    ],
    GATT_MESSAGES = [
        { 
            to: 'device', identifier: '.blt-device-status', status: [
                {name: 'default', indicatorClassName: 'indicator-default', message: 'No Device Connected',},
                {name: 'waiting', indicatorClassName: 'indicator-waiting', message: '', auxFuncition: () => updateDeviceName('waiting')},
                {name: 'success', indicatorClassName: 'indicator-success', message: '', auxFuncition: () => updateDeviceName('success')},
            ]
        },
        {
            to: 'server', identifier: '.blt-server-status', status: [
                {name: 'default', indicatorClassName: 'indicator-default', message: 'No GATT Server Connected'},
                {name: 'waiting', indicatorClassName: 'indicator-waiting', message: 'Connecting to GATT Server...'},
                {name: 'success', indicatorClassName: 'indicator-success', message: 'GATT Server Connected Successfully'},
                {name: 'error', indicatorClassName: 'indicator-error', message: 'Error tying to connect to GATT Server'},
            ]
        },
        {
            to: 'services', identifier: '.blt-services-status', status: [
                {name: 'default', indicatorClassName: 'indicator-default', message: 'No Services Connected'},
                {name: 'waiting', indicatorClassName: 'indicator-waiting', message: '', auxFuncition: updateServicesMessage},
                {name: 'success', indicatorClassName: 'indicator-success', message: 'GATT Services Connected Successfully'},
                {name: 'error', indicatorClassName: 'indicator-error', message: 'Error tying to get GATT Services'},
            ]
        },
        {
            to: 'characteristics', identifier: '.blt-characteristics-status', status: [
                {name: 'default', indicatorClassName: 'indicator-default', message: 'No Characteristics Connected'},
                {name: 'waiting', indicatorClassName: 'indicator-waiting', message: '' , auxFuncition: updateCharacteristicsMessage},
                {name: 'success', indicatorClassName: 'indicator-success', message: 'GATT Characteristics Connected Successfully'},
                {name: 'error', indicatorClassName: 'indicator-error', message: 'Error tying to get GATT Characteristics'},
            ]
        },
        {
            to: 'notifications', identifier: '.blt-notification-status', status: [
                {name: 'default', indicatorClassName: 'indicator-default', message: 'No Notifications for Characteristics Started'},
                {name: 'waiting', indicatorClassName: 'indicator-waiting', message: '', auxFuncition: updateStartingNoficationsMessage},
                {name: 'success', indicatorClassName: 'indicator-success', message: 'Notifications for GATT Characteristics Started Successfully'},
                {name: 'error', indicatorClassName: 'indicator-error', message: 'Error tying to start notifications for GATT Characteristics'},
            ]
        },
    ]
    isWebBluetoothEnabled = () => navigator.bluetooth != undefined;
let bluetoothDevice

document.addEventListener('DOMContentLoaded', () => {
    setCustomEvents();
    updateGattMessages({device: 'default', server: 'default', services: 'default', characteristics: 'default', notifications: 'default'})
    document.querySelector('.blt-request').addEventListener('click', () => isWebBluetoothEnabled() && requestAndGetBluetoothInfo());
});

function setCustomEvents(){
    GATT_SERVICES_CHARACTERISTICS.forEach(serviceInfo => {
        serviceInfo.characteristics.forEach(characteristic => 
            characteristic.event = new CustomEvent(characteristic.event, { detail: { value: null } } )
        );
    });
}

function requestAndGetBluetoothInfo() {
    requestDevice()
        .then(connectToGatt)
}

function requestDevice() {
    const options = {
        filters: [{ namePrefix: 'UIC' }],
        optionalServices: GATT_SERVICES_CHARACTERISTICS.map(gattInfo => gattInfo.service.uuid)
    };
    return navigator.bluetooth.requestDevice(options)
        .then(device => {
            bluetoothDevice = device
            bluetoothDevice.addEventListener('gattserverdisconnected', handleDisconnection)
            updateGattMessages({device: 'waiting'})

        })
        .catch(error => { throw new Error(`Failed to request device: ${error}`); });
}

function connectToGatt() {
    if (bluetoothDevice.gatt.connected) {
        updateGattMessages({device: 'success'})
        return Promise.resolve();
    }

    updateGattMessages({server: 'waiting', services: 'default', characteristics: 'default', notifications: 'default'})
    return bluetoothDevice.gatt.connect()
        .then(server => {
            updateGattMessages({server: 'success', services: 'waiting'})
            return Promise.all(GATT_SERVICES_CHARACTERISTICS.map(serviceInfo => {
                 server.getPrimaryService(serviceInfo.service.uuid).then(primaryService => {
                    GATT_SERVICES_CHARACTERISTICS.find(serviceInfo => serviceInfo.service.uuid === primaryService.uuid).service.gattService = primaryService;
                    updateGattMessages({services: 'waiting'})
                    return primaryService
                    })
                    .then(primaryService => {
                        updateGattMessages({services: 'success', characteristics: 'waiting'})
                        return Promise.all(serviceInfo.characteristics.map(characteristicInfo => 
                            primaryService.getCharacteristic(characteristicInfo.uuid).then(characteristic => {
                                let characteristicInfo =  serviceInfo.characteristics.find(c => c.uuid === characteristic.uuid);
                                characteristicInfo.gattCharacteristic = characteristic
                                characteristicInfo.notificationsStarted = false
                                updateGattMessages({characteristics: 'waiting'})
                                return characteristic
                                })
                                .then(characteristic => {
                                    characteristic.addEventListener('characteristicvaluechanged', e => handleCharacteristicValueChanged(serviceInfo.characteristics.find(c => c.uuid === characteristicInfo.uuid), e));
                                })
                                .catch(error => {
                                    console.error(error)
                                    updateGattMessages({characteristics: 'error'});
                                    return null;
                                })
                        ));
                    })
                    .then(_ => {
                        !GATT_SERVICES_CHARACTERISTICS.some(service => service.characteristics.some(characteristics => characteristics.gattCharacteristic === null)) && startCharacteristicsNotifications();
                    })
                    .catch(error => {
                        console.error(error);
                        updateGattMessages({services: 'error'})
                    });
            }));
        })
        .catch(error => {
            console.error(error);
            updateGattMessages({server: 'error'})
        });
}

function handleCharacteristicValueChanged(characteristic, e) {
    try {
        value = JSON.parse(new TextDecoder().decode(e.target.value))
    } catch (ex){
        // const dataView = new DataView(e.target.value.buffer)
        // value = dataView.buffer.length == 1 ? dataView.getUint8(0) : dataView.getUint16(0, true)
    }
    characteristic.event.detail.value = value;
    document.dispatchEvent(characteristic.event);
}

async function startCharacteristicsNotifications() {
    updateGattMessages({characteristics: 'success', notifications: 'waiting'});
    
    for (const service of GATT_SERVICES_CHARACTERISTICS) {
        for (const characteristic of service.characteristics.filter(characteristic => !characteristic.notificationsStarted)) {
            try {
                if (characteristic.gattCharacteristic) {
                    await characteristic.gattCharacteristic.startNotifications();
                    characteristic.notificationsStarted = true;
                    
                    const characteristicNotNotifying = GATT_SERVICES_CHARACTERISTICS
                        .flatMap(service => service.characteristics)
                        .filter(characteristics => !characteristics.notificationsStarted);
                    
                    const currentStatus = characteristicNotNotifying.length === 0 ? 'success' : 'waiting';
                    updateGattMessages({device: currentStatus, notifications: currentStatus});
                }
            } catch (error) {
                updateGattMessages({notifications: 'error'});
                console.error(`Failed to start notifications for characteristic ${characteristic.uuid}: ${error}`);
            }
        }
    }
}

function handleDisconnection(){
    setTimeout(() => {
        const causedByConnError = Array.from(document.querySelectorAll('.blt-status-indicator')).some(indicator => indicator.classList.contains('indicator-error'));
        setTimeout(() => {
            updateGattMessages({device: 'default', server: 'default', services: 'default', characteristics: 'default', notifications: 'default'})
        }, causedByConnError ? 5000 : 0)
    }, 500)
}

function updateGattMessages({device = null, server = null, services = null, characteristics = null, notifications = null}){
    const messages = [
        {to: 'device', status: device}, 
        {to: 'server', status: server},
        {to: 'services', status: services},
        {to: 'characteristics', status: characteristics},
        {to: 'notifications', status: notifications}
    ]
    messages.filter(message => message.status != null).forEach(message => {
        const info = GATT_MESSAGES.find(info => info.to == message.to);
        const infoStatus = info.status.find(info => info.name == message.status);
        const element = document.querySelector(info.identifier);
        infoStatus.auxFuncition && infoStatus.auxFuncition();
        const indicator = element.querySelector('.blt-status-indicator');
        const text = element.querySelector('.blt-status-text');
        changeIndicator(indicator, infoStatus.indicatorClassName);
        text.innerHTML = infoStatus.message;
    })
}

function updateDeviceName(status){
    GATT_MESSAGES.find(info => info.to == 'device').status.find(statusInfo => statusInfo.name == status).message = bluetoothDevice.name;
}

function updateServicesMessage(){
    const totalServices = GATT_SERVICES_CHARACTERISTICS.length;
    const servicesWithNonNullGattService = GATT_SERVICES_CHARACTERISTICS.filter(service => service.service.gattService !== null).length;
    GATT_MESSAGES.find(info => info.to == 'services').status.find(statusInfo => statusInfo.name == 'waiting').message = `Getting GATT Services (${servicesWithNonNullGattService}/${totalServices})...`;
}

function updateCharacteristicsMessage(){
    const totalCharacteristics = GATT_SERVICES_CHARACTERISTICS.reduce((count, service) => count + service.characteristics.length, 0);
    const characteristicsWithNonNullGattCharacteristic = GATT_SERVICES_CHARACTERISTICS.reduce((count, service) => count + service.characteristics.filter(characteristic => characteristic.gattCharacteristic !== null).length, 0);
    GATT_MESSAGES.find(info => info.to == 'characteristics').status.find(statusInfo => statusInfo.name == 'waiting').message = `Getting GATT Characteristics (${characteristicsWithNonNullGattCharacteristic}/${totalCharacteristics})...`;
}

function updateStartingNoficationsMessage(){
    const totalCharacteristics = GATT_SERVICES_CHARACTERISTICS.reduce((count, service) => count + service.characteristics.length, 0);
    const characteristicWithStartedNotifications = GATT_SERVICES_CHARACTERISTICS.reduce((count, service) => count + service.characteristics.filter(characteristic => characteristic.notificationsStarted).length, 0);
    GATT_MESSAGES.find(info => info.to == 'notifications').status.find(statusInfo => statusInfo.name == 'waiting').message = `Starting Notifications for GATT Characteristics (${characteristicWithStartedNotifications}/${totalCharacteristics})...`;
}

function changeIndicator(element, newIndicator){
    const prevIdentifiers = Array.from(element.classList).filter(classlist => classlist.startsWith('indicator'));
    prevIdentifiers.length != 0 && element.classList.remove(prevIdentifiers);
    element.classList.add(newIndicator)
}