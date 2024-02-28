    document.addEventListener('randomvaluechanged', e => { console.log('Random value changed: ', e.detail.value); });
    document.addEventListener('accelerometervaluechanged', e => { console.log('Accelerometer value changed: ', e.detail.value); });
    document.addEventListener('gyroscopevaluechanged', e => { console.log('Gyroscope value changed: ', e.detail.value); });
    document.addEventListener('magnetometervaluechanged', e => { console.log('Magnetometer value changed: ', e.detail.value); });