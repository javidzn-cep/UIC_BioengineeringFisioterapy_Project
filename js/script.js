
const formatNumber = num => num.toFixed(13);
let isRecording = false, recibedID = -1;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.blt-start-recording').addEventListener('click', toggleRecording);
    document.addEventListener('newackvalue', ackComunicationReiber);
    dataVisualizer();
});


function toggleRecording(){
    isRecording = !isRecording;
    const arrayBuffer = new TextEncoder().encode(JSON.stringify({ isRecording: isRecording }));
    servicesAndCharacteristics[1].characteristics[2].gattCharacteristic?.writeValueWithResponse(arrayBuffer)
        .catch(error => console.error(error))
}

function ackComunicationReiber(e){
    const newVal = e.detail.value;
    ackComunicationIntegrityTest(newVal)
    // insertRecordingData(newVal)
    recibedID = newVal.id
    const arrayBuffer = new TextEncoder().encode(JSON.stringify({ recibedID: newVal.id }));
    servicesAndCharacteristics[1].characteristics[1].gattCharacteristic.writeValueWithResponse(arrayBuffer)
        .catch(error => console.error(error))
}

function ackComunicationIntegrityTest(newVal){
    if (recibedID != -1) {
        if (recibedID === (newVal.id - 1)) {
            console.log(`%c✅ CORRECT - Sended: ${newVal.id} Packages | Waiting: ${newVal.remainingPackages} packages | ID: ${newVal.id}`, 'color: green')
        } else {
            console.log(`%c❌ ERROR - PrevID: ${recibedID} | NewId: ${newVal.id}`, 'color: red')
        }
    }
}

function insertRecordingData(data){
    const div = document.createElement('div');
    div.classList.add('recording-data');
    div.textContent = [data.id, data.micros, data.angle, data.pitch, data.roll, data.yaw].join(',');
    document.querySelector('.recording-data-container').appendChild(div)
}

function dataVisualizer(){
    document.addEventListener('sensorfusionvaluechanged', e => {
        document.querySelector('.pitch').textContent = formatNumber(e.detail.value.pitch);
        document.querySelector('.roll').textContent = formatNumber(e.detail.value.roll);
        document.querySelector('.yaw').textContent = formatNumber(e.detail.value.yaw);
    })

    document.addEventListener('accelerometervaluechanged', e => {
        document.querySelector('.aX').textContent = formatNumber(e.detail.value.aX);
        document.querySelector('.aY').textContent = formatNumber(e.detail.value.aY);
        document.querySelector('.aZ').textContent = formatNumber(e.detail.value.aZ);
    });

    document.addEventListener('gyroscopevaluechanged', e => {
        document.querySelector('.gX').textContent = formatNumber(e.detail.value.gX);
        document.querySelector('.gY').textContent = formatNumber(e.detail.value.gY);
        document.querySelector('.gZ').textContent = formatNumber(e.detail.value.gZ);
    });

    document.addEventListener('magnetometervaluechanged', e => {
        document.querySelector('.mX').textContent = formatNumber(e.detail.value.mX);
        document.querySelector('.mY').textContent = formatNumber(e.detail.value.mY);
        document.querySelector('.mZ').textContent = formatNumber(e.detail.value.mZ);
    });
}