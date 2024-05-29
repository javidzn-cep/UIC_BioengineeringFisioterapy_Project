let isRecording = false

document.addEventListener('DOMContentLoaded', () => {

    document.querySelector('.blt-start-recording').addEventListener('click', () => {
        isRecording = !isRecording
        const dataView = new DataView(new ArrayBuffer(1));
        dataView.setUint8(0, JSON.stringify(isRecording ? 1 : 0));
        servicesAndCharacteristics[1].characteristics[2].gattCharacteristic?.writeValue(dataView)
    });
    
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
});

const formatNumber = num => num.toFixed(13);