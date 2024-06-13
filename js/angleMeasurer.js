const realTimeMeasurementData = {
        pitch: { addonAngle: 180, formatedCurrent: 180, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false, rawCurrent: null, rawStarting: null, rawEnding: null },
        roll: { addonAngle: 90, formatedCurrent: 90, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false, rawCurrent: null, rawStarting: null, rawEnding: null },
        yaw: { addonAngle: 90, formatedCurrent: 90, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false, rawCurrent: null, rawStarting: null, rawEnding: null },
        isMeasuring: { currentValue: false, prevValue: false },
    },
    recordedMesurementData = {        
        pitch: { addonAngle: 180, formatedCurrent: 180, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false, rawCurrent: null, rawStarting: null, rawEnding: null },
        roll: { addonAngle: 90, formatedCurrent: 90, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false, rawCurrent: null, rawStarting: null, rawEnding: null },
        yaw: { addonAngle: 90, formatedCurrent: 90, formatedPrev: null, formatedStarting: null, formatedEnding: null, rotatingClockWise: false, rawCurrent: null, rawStarting: null, rawEnding: null },
        isMeasuring: { currentValue: false, prevValue: false },
    },
    degreesToRadians = deg => deg * (Math.PI / 180),
    radiansToDegrees = rad => rad * (180 / Math.PI),
    normalizeAngle = angle => (angle % 360 + 360) % 360,
    formatAngle = (angle, addonAngle) => -(angle >= 0 ? angle : 360 + angle) + addonAngle;

document.addEventListener('DOMContentLoaded', () => {
    updateSVGGraphics(realTimeMeasurementData);
    document.addEventListener('sensorfusionvaluechanged', e => {
        updateMeasurementData(realTimeMeasurementData, e.detail.value);
        updateDisplay();
    });
});

function getRecorderMeasurementData(newValue){
    updateMeasurementData(recordedMesurementData, newValue);
    return {
        pitch: getAngles(recordedMesurementData.pitch),
        roll: getAngles(recordedMesurementData.roll),
        yaw: getAngles(recordedMesurementData.yaw)
    }
}

function getAngles(axisData) {
    return {
        starting: axisData.rawStarting ?? axisData.rawCurrent, 
        ending: axisData.rawStarting ? axisData.rawEnding ? axisData.rawEnding : axisData.rawCurrent : 0,
        variance: axisData.rawStarting ? Math.abs(calculateAngleBetween(axisData.formatedStarting, axisData.rawEnding ? axisData.formatedEnding : axisData.formatedCurrent, axisData.rotatingClockWise)) : 0
    }
}

function updateMeasurementData(data, newValue) {
    updateMeasurementValues(data, newValue);
    detectButtonPressed(data);
    checkRotatingDirection(data);
}

function updateDisplay(){
    updateSVGGraphics();
    updateAngleTexts();
}

function updateMeasurementValues(data, newValue) {
    const { pitch, roll, yaw, isMeasuring } = data;
    pitch.formatedPrev = pitch.formatedCurrent;
    roll.formatedPrev = roll.formatedCurrent;
    yaw.formatedPrev = yaw.formatedCurrent;
    isMeasuring.prevValue = isMeasuring.currentValue;
    pitch.formatedCurrent = formatAngle(newValue.pitch, pitch.addonAngle);
    roll.formatedCurrent = formatAngle(newValue.roll, roll.addonAngle);
    yaw.formatedCurrent = formatAngle(newValue.yaw, yaw.addonAngle);
    pitch.rawCurrent = newValue.pitch;
    roll.rawCurrent = newValue.roll;
    yaw.rawCurrent = newValue.yaw;
    isMeasuring.currentValue = newValue.isMeasuring;
}

function detectButtonPressed(data) {
    const { pitch, roll, yaw, isMeasuring } = data;
    if (isMeasuring.prevValue !== isMeasuring.currentValue) {
        if (isMeasuring.currentValue) {
            resetMeasurementData(data);
            pitch.formatedStarting = pitch.formatedCurrent;
            roll.formatedStarting = roll.formatedCurrent;
            yaw.formatedStarting = yaw.formatedCurrent;
            pitch.rawStarting = pitch.rawCurrent;
            roll.rawStarting = roll.rawCurrent;
            yaw.rawStarting = yaw.rawCurrent;
        } else {
            pitch.formatedEnding = pitch.formatedCurrent;
            roll.formatedEnding = roll.formatedCurrent;
            yaw.formatedEnding = yaw.formatedCurrent;
            pitch.rawEnding = pitch.rawCurrent;
            roll.rawEnding = roll.rawCurrent;
            yaw.rawEnding = yaw.rawCurrent;
        }
    }
}

function resetMeasurementData(data) {
    ['pitch', 'roll', 'yaw'].forEach(axis => {
        data[axis].formatedStarting = null;
        data[axis].formatedEnding = null;
        data[axis].rawStarting = null;
        data[axis].rawEnding = null;
    });
}

function checkRotatingDirection(data) {
    if (data.isMeasuring.currentValue) {
        ['pitch', 'roll', 'yaw'].forEach(axis => {
            const axisData = data[axis];
            const check = checkAngleAndDirection(axisData.formatedPrev, axisData.formatedCurrent, axisData.formatedStarting);
            if (check.targetIsBetween) {
                axisData.rotatingClockWise = check.rotatingClockWise;
            }
        });
    }
}

function checkAngleAndDirection(prev, current, target) {
    const rotatingClockWise = determineRotationDirection(prev, current);
    const targetIsBetween = isAngleBetween(prev, current, target, rotatingClockWise);
    return { targetIsBetween, rotatingClockWise };
}

function determineRotationDirection(prev, current) {
    [prev, current] = [prev, current].map(angle => normalizeAngle(angle));
    const clockwiseDifference = (current - prev + 360) % 360;
    const counterclockwiseDifference = (prev - current + 360) % 360;
    return clockwiseDifference < counterclockwiseDifference;
}

function isAngleBetween(start, end, target, clockwise) {
    [start, end, target] = [start, end, target].map(angle => normalizeAngle(angle));
    return clockwise
        ? (start < end) ? (start <= target && target <= end) : (start <= target || target <= end)
        : (end < start) ? (end <= target && target <= start) : (end <= target || target <= start);
}

function updateSVGGraphics() {
    const visualizers = {
        pitch: {
            path: document.querySelector('.pitch-angle-visualizer-path'),
            firstAngle: document.querySelector('.pitch-angle-visualizer-first-angle'),
            secondAngle: document.querySelector('.pitch-angle-visualizer-second-angle'),
            currentAngle: document.querySelector('.pitch-angle-visualizer-current-angle')
        },
        roll: {
            path: document.querySelector('.roll-angle-visualizer-path'),
            firstAngle: document.querySelector('.roll-angle-visualizer-first-angle'),
            secondAngle: document.querySelector('.roll-angle-visualizer-second-angle'),
            currentAngle: document.querySelector('.roll-angle-visualizer-current-angle')
        },
        yaw: {
            path: document.querySelector('.yaw-angle-visualizer-path'),
            firstAngle: document.querySelector('.yaw-angle-visualizer-first-angle'),
            secondAngle: document.querySelector('.yaw-angle-visualizer-second-angle'),
            currentAngle: document.querySelector('.yaw-angle-visualizer-current-angle')
        },
    };

    ['pitch', 'roll', 'yaw'].forEach(axis => {
        const axisData = realTimeMeasurementData[axis];
        const visualizer = visualizers[axis];
        const formatedStarting = axisData.formatedStarting;
        const formatedEnding = axisData.formatedEnding;
        const formatedCurrent = axisData.formatedCurrent;
        const rotatingClockWise = axisData.rotatingClockWise ? 1 : 0;
        const firstAnglePoint = calculateLineAngle(formatedStarting ?? formatedCurrent);
        const secondAnglePoint = calculateLineAngle(formatedEnding ?? formatedCurrent);
        const currentAnglePoint = calculateLineAngle(formatedCurrent);
        
        visualizer.firstAngle.setAttribute('x2', firstAnglePoint.x);
        visualizer.firstAngle.setAttribute('y2', firstAnglePoint.y);
        visualizer.secondAngle.setAttribute('x2', secondAnglePoint.x);
        visualizer.secondAngle.setAttribute('y2', secondAnglePoint.y);
        visualizer.currentAngle.setAttribute('x2', currentAnglePoint.x);
        visualizer.currentAngle.setAttribute('y2', currentAnglePoint.y);
        visualizer.path.setAttribute('d', calculateSVGPath({ 
            firstAngle: formatedStarting ?? formatedCurrent, 
            secondAngle: formatedEnding ?? formatedCurrent, 
            drawClockWise: rotatingClockWise 
        }));
        
    });
}

function calculateLineAngle(angle){
    const viewBox = 50;
    const radius = 40;
    const x = (viewBox - radius) + (radius - (radius * Math.cos(degreesToRadians(angle))));
    const y = (viewBox - radius) + (radius - (radius * Math.sin(degreesToRadians(angle))));
    return { x, y };
}

function calculateSVGPath({ firstAngle, secondAngle, drawClockWise }) {
    const viewBox = 50;
    const radius = 30;
    const bisectrizAngle = bisectorAngle(firstAngle, secondAngle, drawClockWise);
    return [
        `M ${viewBox} ${viewBox}`,
        `L ${(viewBox - radius) + (radius - (radius * Math.cos(degreesToRadians(firstAngle))))} ${(viewBox - radius) + (radius - (radius * Math.sin(degreesToRadians(firstAngle))))}`,
        `A ${radius} ${radius}, 0, 0, ${drawClockWise}, ${(viewBox - radius) + (radius - (radius * Math.cos(degreesToRadians(bisectrizAngle))))} ${(viewBox - radius) + (radius - (radius * Math.sin(degreesToRadians(bisectrizAngle))))}`,
        `A ${radius} ${radius}, 0, 0, ${drawClockWise}, ${(viewBox - radius) + (radius - (radius * Math.cos(degreesToRadians(secondAngle))))} ${(viewBox - radius) + (radius - (radius * Math.sin(degreesToRadians(secondAngle))))}`,
        'Z'
    ].join(' ');
}

function bisectorAngle(angle1, angle2, clockwise) {
    [angle1, angle2] = [angle1, angle2].map(angle => normalizeAngle(angle));
    const angleBetween = calculateAngleBetween(angle1, angle2, clockwise);
    return normalizeAngle(angle1 + (clockwise ? angleBetween / 2 : -angleBetween / 2));
}

function calculateAngleBetween(angle1, angle2, clockwise) {
    [angle1, angle2] = [angle1, angle2].map(angle => normalizeAngle(angle));
    return clockwise ? (angle2 - angle1 + 360) % 360 : (angle1 - angle2 + 360) % 360;
}

function updateAngleTexts(){
    const visualizers = {
        pitch: {
            startingAngle: document.querySelector('.pitch-starting-angle'),
            endingAngle: document.querySelector('.pitch-ending-angle'),
            variance: document.querySelector('.pitch-variance-angle') 
        },
        roll: {
            startingAngle: document.querySelector('.roll-starting-angle'),
            endingAngle: document.querySelector('.roll-ending-angle'),
            variance: document.querySelector('.roll-variance-angle') 
        },
        yaw: {
            startingAngle: document.querySelector('.yaw-starting-angle'),
            endingAngle: document.querySelector('.yaw-ending-angle'),
            variance: document.querySelector('.yaw-variance-angle') 
        },
    };
    ['pitch', 'roll', 'yaw'].forEach(axis => {
        const axisData = realTimeMeasurementData[axis];
        const visualizer = visualizers[axis];
        const angleData = getAngles(axisData)
        visualizer.startingAngle.textContent = angleData.starting.toFixed(2);
        visualizer.endingAngle.textContent = angleData.ending.toFixed(2);
        visualizer.variance.textContent = angleData.variance.toFixed(2);
    });
}

function getAngles(axisData) {
    return {
        starting: axisData.rawStarting ?? axisData.rawCurrent,
        ending: axisData.rawStarting ? axisData.rawEnding ? axisData.rawEnding : axisData.rawCurrent : 0,
        variance: axisData.rawStarting ? Math.abs(calculateAngleBetween(axisData.formatedStarting, axisData.rawEnding ? axisData.formatedEnding : axisData.formatedCurrent, axisData.rotatingClockWise)) : 0
    }
}
