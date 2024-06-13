const 
    ACK_TIMEOUT = 750000,
    RECORDING_MESSAGES = [
        {name: 'default', message: 'Start Recording', recordingUI: false, downloadAvailable: true},
        {name: 'recording', message: 'Recording...', recordingUI: true, downloadAvailable: false},
        {name: 'waiting', message: 'Waiting for the Last Packages...', recordingUI: false, downloadAvailable: false},
    ],
    measurementData = 
        {
            pitch: { addonAngle: 180, formatedCurrent: 180, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false},
            roll: { addonAngle: 90, formatedCurrent: 90, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false},
            yaw: { addonAngle: 90, formatedCurrent: 90, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false},
            isMeasuring: { currentValue: false, prevValue: false },
        },
    recordingInfo = {receivedPackages: 0, waitingPackages: 0, lostPackages: 0}
    timerFormater = secs => [Math.floor((secs % 3600) / 60), secs % 60].map(num => num.toString().padStart(2, '0')).join(':');
let prevValue, timeOutID, isRecording, lostPackages, recordingData;

document.addEventListener('DOMContentLoaded', () => {
    initVariables();
    updateMessages('default');
    document.querySelector('.blt-start-recording').addEventListener('click', toggleRecording);
    document.querySelector('.download-data-btn').addEventListener('click', downloadData);
    document.addEventListener('newackvalue', ackComunicationReceiver);
});

function initVariables(){
    prevValue = null;
    isRecording = false;
    lostPackages = 0;
    recordingData = [];
}


function toggleRecording(){
    isRecording = !isRecording;
    const arrayBuffer = new Uint8Array([isRecording]);
    GATT_SERVICES_CHARACTERISTICS[1].characteristics[2].gattCharacteristic?.writeValueWithResponse(arrayBuffer)
        .then(_ => isRecording ? setRecordingStarted() : updateMessages(recordingInfo.waitingPackages == 0 ? 'default' : 'waiting'))
        .catch(error => console.error(error))
}

function setRecordingStarted(){
    clearRecordingData();
    updateMessages('recording');
    startingMillis = new Date().getTime();
    prevValue = null;
    startTimer();
}

function clearRecordingData(){
    recordingInfo.receivedPackages = recordingInfo.waitingPackages = recordingInfo.waitingPackages = 0;
    recordingData = [];
    updateRecordingInfo();
}

function ackComunicationReceiver(e){
    const newVal = e.detail.value;
    if (!prevValue || prevValue.id != newVal.id){
        sendConfirmation(newVal.id);
        ackComunicationIntegrityTest(newVal);
        updateRecordingVariables(newVal);
        updateRecordingInfo();
        (!isRecording && recordingInfo.waitingPackages == 0) && updateMessages('default')
    }
}

function updateRecordingVariables(newVal){
    prevValue = newVal;
    recordingInfo.receivedPackages++;
    recordingInfo.waitingPackages = newVal.waitingPackages;
    recordingData.push(newDataFormater(newVal));
}

function newDataFormater(newData){
    const measurementAngles = getRecorderMeasurementData(newData);
    const savedData =  {
        micros: newData.micros,
        pitch: newData.pitch,
        roll: newData.roll,
        yaw: newData.yaw,
        measuredPitch: measurementAngles.pitch.variance,
        measuredRoll: measurementAngles.roll.variance,
        measuredYaw: measurementAngles.yaw.variance,
    }
    return savedData;
}

function ackComunicationIntegrityTest(newVal){
    if (prevValue) {
        if (prevValue.id === (newVal.id - 1)) {
            // console.log(`%c✅ CORRECT - Sended: ${newVal.id} Packages | Waiting: ${newVal.waitingPackages} packages | ID: ${newVal.id}`, 'color: green')
        } else if(prevValue.id > (newVal.id - 1)) {
            console.log(`%c❌ ERROR - Lost Package: PrevID: ${prevValue.id} | NewId: ${newVal.id}`, 'color: red');
            recordingInfo.lostPackages += prevValue.id - newVal.id + 1;
        }else{
            console.log(`%c❌ ERROR - Unkwoun Error: `,  'color: red', newVal);
        }
    }
}

function sendConfirmation(id) {
    const arrayBuffer = new Uint16Array([id]);
    return new Promise((resolve, reject) => {
        timeOutID = setTimeout(() => reject(new Error("ACK TimeOut Exceeded")), ACK_TIMEOUT);
        GATT_SERVICES_CHARACTERISTICS[1].characteristics[1].gattCharacteristic.writeValueWithResponse(arrayBuffer)
            .then(() => resolve())
            .catch(error => reject(error))
            .finally(_=> clearTimeout(timeOutID));
        })
        .catch(error => {
            console.error(error);
            setTimeout(sendConfirmation, 200)
        });
}

function startTimer(){
    const timer = document.querySelector('.recording-timer');
    (function checkTime(){
        timer.textContent = timerFormater(((new Date().getTime() - startingMillis) / 1000).toFixed(0))
        isRecording && setTimeout(checkTime, 50);
    })()
}

function updateRecordingInfo(){
    updateChart()
    document.querySelector('.num-recieved-packages').textContent = recordingInfo.receivedPackages;
    document.querySelector('.num-waiting-packages').textContent = recordingInfo.waitingPackages;
    document.querySelector('.num-lost-packages').textContent = recordingInfo.lostPackages;
}

function downloadData(){
    const timeStamp = new Date();
    const csvSeparator = ',';
    const titles = ['TimeStamp', 'Measured Pitch', 'Measured Roll', 'Measured Yaw', 'Pitch', 'Roll', 'Yaw']
    const csvContent = `data:text/csv;charset=utf-8,${titles.join(csvSeparator)}\n${recordingData.map(data => [data.micros,  data.measuredPitch, data.measuredRoll, data.measuredYaw, data.pitch, data.roll, data.yaw].map(number => number.toFixed(10)).join(csvSeparator)).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `${[timeStamp.getFullYear(), timeStamp.getMonth() + 1, timeStamp.getDate(), timeStamp.getHours(), timeStamp.getMinutes(), timeStamp.getSeconds()].join('-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateMessages(staus){
    const info = RECORDING_MESSAGES.find(message => message.name === staus)
    document.querySelector('.recording-frame').classList.toggle('recording', info.recordingUI);
    document.querySelector('.recording-status-info').textContent = info.message;
    document.querySelector('.download-data-btn').classList.toggle('download-available', info.downloadAvailable && recordingData.length != 0)
}










