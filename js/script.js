document.addEventListener('DOMContentLoaded', () => {

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

const formatNuumber = num => num.toFixed(13);