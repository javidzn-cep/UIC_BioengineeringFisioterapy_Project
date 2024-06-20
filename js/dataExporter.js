const formatDate = timeStamp => [timeStamp.getDate(), timeStamp.getMonth() + 1, timeStamp.getFullYear()].map(padZero).join('/');
const formatTime = timeStamp => [timeStamp.getHours(), timeStamp.getMinutes()].map(padZero).join(':');
const padZero = number => number.toString().padStart(2, '0');
const toggleInputError = (selector, isError) => document.querySelector(selector).classList.toggle('input-error', isError);

document.addEventListener('DOMContentLoaded', () => {
    initSDKs();
    attachEventListeners();
});

function initSDKs(){
    // your Email.js & Firebase keys
}

function attachEventListeners() {
    document.querySelector('.download-data-btn').addEventListener('click', downloadData);
    document.querySelector('.modal-backdrop').addEventListener('click', () => toggleModal(false));
    document.querySelector('.send-modal-toggler').addEventListener('click', () => toggleModal(true));
    document.querySelector('#email-full-name').addEventListener('input', fullNameInputHandler);
    document.querySelector('#email-dni').addEventListener('input', idInputHandler);
    document.querySelector('.email-info-form').addEventListener('submit', sendEmail);
    document.querySelector('.modal-frame').addEventListener('click', e => e.stopPropagation());
}

function idInputHandler() {
    toggleInputError('#email-dni', !idValidator());
    formValidator();
}

function fullNameInputHandler() {
    toggleInputError('#email-full-name', !fullNameValidator());
    formValidator();
}

function idValidator() {
    let value = document.querySelector('#email-dni').value.toUpperCase();
    const niePrefix = { 'X': '0', 'Y': '1', 'Z': '2' };
    if (/^[XYZ]/.test(value)) {
        value = value.replace(/^[XYZ]/, match => niePrefix[match]);
    }
    if (!/^[0-9]{8}[A-Z]$/.test(value)) {
        return false;
    }
    const dniNumber = parseInt(value.substring(0, value.length - 1), 10);
    const dniLetter = value.charAt(value.length - 1);
    const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = validLetters[dniNumber % 23];
    return dniLetter === expectedLetter;
}

function fullNameValidator() {
    const value = document.querySelector('#email-full-name').value.trim();
    return value !== '';
}

function formValidator() {
    const isValid = idValidator() && fullNameValidator();
    document.querySelector('.send-email-btn').classList.toggle('sending-available', isValid);
    return isValid
}

function getCSVContent() {
    const csvSeparator = ',';
    const titles = ['TimeStamp', 'Measured Pitch', 'Measured Roll', 'Measured Yaw', 'Pitch', 'Roll', 'Yaw'];
    const csvContent = `${titles.join(csvSeparator)}\n${recordingData.map(data => [
        data.micros, data.measuredPitch, data.measuredRoll, data.measuredYaw, data.pitch, data.roll, data.yaw
    ].map(number => number.toFixed(10)).join(csvSeparator)).join('\n')}`;
    return csvContent;
}

async function sendEmail(e) {
    e.preventDefault();
    if (!formValidator()) return false;
    toggleSending({isSending: true});
    
    const timeStamp = new Date();
    const fromName = document.querySelector('#email-full-name').value.trim();
    const fromDNI = document.querySelector('#email-dni').value.toUpperCase();
    const comments = document.querySelector('#email-comments').value.trim();
    const day = formatDate(timeStamp);
    const time = formatTime(timeStamp);
    const downloadURL = await uploadFile(fromDNI, timeStamp);

    if (downloadURL) {
        const params = {
            fromName: fromName,
            fromDNI: fromDNI,
            timeStampDay: day,
            timeStampTime: time,
            comments: comments || 'No comments added',
            downloadURL: downloadURL
        };
        emailjs.send('service_tugokqd', 'template_a53xbqw', params)
            .then(_ => {
                toggleSending({success: true})
                setTimeout(() => toggleModal(false), 2000);
            })
            .catch(error => {
                console.error('Error Sending Email: ', error);
                toggleSending({success: false})
                setTimeout(() => toggleSending({isSending: false}), 2000)
            });
    } else {
        toggleSending({success: false})
        setTimeout(() => toggleSending({isSending: false}), 2000)
    }
}

async function uploadFile(fromDNI, timeStamp) {
    const csvContent = getCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const storageRef = firebase.storage().ref();
    const fileName = `${formatFileName(timeStamp)}.csv`;
    const fileRef = storageRef.child(`UIC-Project-Data/${fromDNI}/${fileName}`);

    try {
        const snapshot = await fileRef.put(blob);
        return await snapshot.ref.getDownloadURL();
    } catch (error) {
        console.error('Error Uploading File: ', error);
        return null;
    }
}

function formatFileName(timeStamp) {
    return [
        timeStamp.getFullYear(),
        timeStamp.getMonth() + 1,
        timeStamp.getDate(),
        timeStamp.getHours(),
        timeStamp.getMinutes(),
        timeStamp.getSeconds()
    ].map(padZero).join('-');
}

function downloadData() {
    const timeStamp = new Date();
    const csvContent = getCSVContent();
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `${formatFileName(timeStamp)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleModal(modalShown) {
    if (!modalShown) {
        document.querySelector('.modal-frame').addEventListener('transitionend', resetForm, { once: true });
    } else {
        formValidator();
    }
    document.querySelector('.modal-backdrop').classList.toggle('modal-shown', modalShown);
}

function resetForm() {
    document.querySelector('.email-info-form').reset();
    toggleSending({clear: true});
}

function toggleSending({isSending = null, success = null, clear= null}) {
    const submitBtn = document.querySelector('.send-email-btn');
    if(isSending != null){
        submitBtn.classList.toggle('sending-email', isSending);
        submitBtn.querySelector('.send-email-btn-text').textContent = isSending ? 'Sending Data...' : 'Send Data';
    }
    
    if (success != null){
        submitBtn.classList.toggle('sending-success', success);
        submitBtn.classList.toggle('sending-error', !success);
    }

    if(clear != null){
        submitBtn.classList.remove('sending-success', 'sending-error', 'sending-email')
        submitBtn.querySelector('.send-email-btn-text').textContent = 'Send Data';
    }
}
