const 
    deviceName = 'UIC BCN',
    bleService = '00000000-0000-0000-000a-0000000e00ce',
    bleCharacteristic = '00000000-0000-0000-0000-0a0000000e0e';
let 
    bluetoothDeviceDetected, gattCharacteristic;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.read').addEventListener('click', e => isWebBluetoothEnabled() && read());
    document.querySelector('.start').addEventListener('click', e => isWebBluetoothEnabled() && start());
    document.querySelector('.stop').addEventListener('click', e => isWebBluetoothEnabled() && stop());
})

const isWebBluetoothEnabled = () => navigator.bluetooth != undefined;

function read() {
    return (bluetoothDeviceDetected ? Promise.resolve() : getDeviceInfo())
        .then(
            connectGATT
        )
        .then(_ => {
            console.log('Reading Battery Level...')
            gattCharacteristic.readValue()
        })
        .catch(error => {
            console.warn('Waiting to start reading: ' + error)
        })
}
function getDeviceInfo() {
    let options = {
        optionalServices: [bleService],
        filters: [{ name: deviceName }]
        // acceptAllDevices: true
    }
    
    console.log('Requesting any Bluetooth Device...')
    return navigator.bluetooth.requestDevice(options)
        .then(device => {
            bluetoothDeviceDetected = device
        })
        .catch(error => {
        console.warn('Argh! ' + error)
    })
}



function connectGATT() {
    if (bluetoothDeviceDetected.gatt.connected && gattCharacteristic) {
        return Promise.resolve()
    }

    return bluetoothDeviceDetected.gatt.connect()
        .then(server => {
            console.log('Getting GATT Service...');
            return server.getPrimaryService(bleService)
        })
        .then(service => {
            console.log('Getting GATT Characteristic...')
            return service.getCharacteristic(bleCharacteristic)
        })
        .then(characteristic => {
            gattCharacteristic = characteristic
            gattCharacteristic.addEventListener('characteristicvaluechanged', e => handleChangedValue(e))
            start()
            document.querySelector('.start').disabled = false
            document.querySelector('.stop').disabled = true
        })
}

function handleChangedValue(e) {
    let value = e.target.value.getUint8(0)
    var now = new Date()
    console.log('> ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + ' Dato Recibido: ' + value)
}

function start() {
    gattCharacteristic.startNotifications()
        .then(_ => {
            console.log('Start reading...')
            document.querySelector('.start').disabled = true
            document.querySelector('.stop').disabled = false
        })
        .catch(error => {
            console.warn('[ERROR] Start: ' + error)
        })
}

function stop() {
    gattCharacteristic.stopNotifications()
        .then(_ => {
            console.log('Stop reading...')
            document.querySelector('.start').disabled = false
            document.querySelector('stop').disabled = true
        })
        .catch(error => {
            console.warn('[ERROR] Stop: ' + error)
        })
}