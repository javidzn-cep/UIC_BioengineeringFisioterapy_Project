import { setArduinoPosition } from './imuVisualizer.js'

const accelerometerData = {
    actualData: {x: null, y: null, z: null},
    prevData: {x: null, y: null, z: null}
};
const gyroscopeData = {
    actualData: {x: null, y: null, z: null},
    prevData: {x: null, y: null, z: null}
};
const arduinoPosition = {
    pitch: 0,
    roll: 0,
    yaw: 0
}

let lastDataTimeStamp = null;

document.addEventListener('accelerometervaluechanged', e => {
    const prevAccData = accelerometerData.actualData;
    accelerometerData.actualData.x = e.detail.value.aX;
    accelerometerData.actualData.y = e.detail.value.aY;
    accelerometerData.actualData.z = e.detail.value.aZ;
    accelerometerData.prevData = prevAccData;
    const filterData = lowPassFilter(accelerometerData);
    accelerometerData.actualData = filterData;
    complementaryFilter();
});

document.addEventListener('gyroscopevaluechanged', e => {
    const prevAccData = gyroscopeData.actualData;
    gyroscopeData.actualData.x = e.detail.value.gX;
    gyroscopeData.actualData.y = e.detail.value.gY;
    gyroscopeData.actualData.z = e.detail.value.gZ;
    gyroscopeData.prevData = prevAccData;
    const filterData = lowPassFilter(gyroscopeData);
    gyroscopeData.actualData = filterData;
    complementaryFilter();
});

function getIntervalTimeStamp(){
    const actualTimeStamp = new Date().getTime()
    const lastTimeStamp = lastDataTimeStamp;
    lastDataTimeStamp = actualTimeStamp
    return actualTimeStamp - lastTimeStamp;    
}

function lowPassFilter(data) {
    const filterEnabled = document.querySelector('.low-pass-filter').checked;
    const alpha = 0.7;
    let filteredData = null;
    if(data.prevData.x != null && filterEnabled){
        filteredData = {
            x: alpha * data.prevData.x + (1 - alpha) * data.actualData.x,
            y: alpha * data.prevData.y + (1 - alpha) * data.actualData.y,
            z: alpha * data.prevData.z + (1 - alpha) * data.actualData.z
        }
    } else{
        filteredData = data.actualData;
    }
    return filteredData;
}

function complementaryFilter(){

    const accX = gToMetersPerSecondSquared(accelerometerData.actualData.x)
    const accY = gToMetersPerSecondSquared(accelerometerData.actualData.y)
    const accZ = gToMetersPerSecondSquared(accelerometerData.actualData.z)
    const gyroX = dpsToRadiansPerSecond(gyroscopeData.actualData.x)
    const gyroY = dpsToRadiansPerSecond(gyroscopeData.actualData.y)
    const gyroZ = dpsToRadiansPerSecond(gyroscopeData.actualData.z)
    const dt = millisecondsToSeconds(getIntervalTimeStamp());
    const alpha = 0.5;

    const pitch_acc = Math.atan2(-accX, Math.sqrt(Math.pow(accY, 2) + Math.pow(accZ, 2)));
    const roll_acc = Math.atan2(accY, accZ);

    const pitch_gyro = arduinoPosition.pitch + gyroX * dt;
    const roll_gyro = arduinoPosition.roll + gyroY * dt;
    
    
    arduinoPosition.pitch = alpha * (arduinoPosition.pitch + pitch_gyro * dt) + (1 - alpha) * pitch_acc;
    arduinoPosition.roll = alpha * (arduinoPosition.roll + roll_gyro * dt) + (1 - alpha) * roll_acc;
    arduinoPosition.yaw += gyroZ * dt;

    setArduinoPosition(-arduinoPosition.pitch, arduinoPosition.roll, arduinoPosition.yaw)
}


const gToMetersPerSecondSquared = gs => gs * 9.81;
const dpsToRadiansPerSecond = dps => dps * (Math.PI / 180);
const millisecondsToSeconds = ms => ms / 1000;
