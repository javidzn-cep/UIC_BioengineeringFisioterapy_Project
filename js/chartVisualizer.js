
let recordingChart

document.addEventListener('DOMContentLoaded', ()=> {
    recordingChart = createChart();
    window.addEventListener('resize', resizeChart)
});

function createChart() {
    const ctx = document.querySelector('.recording-chart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Pitch',
                    borderColor: 'hsl(41, 90%, 50%)',
                    backgroundColor: 'hsl(41, 90%, 80%',
                    pointStyle: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                },
                {
                    label: 'Roll',
                    borderColor: 'hsl(310, 90%, 50%)',
                    backgroundColor: 'hsl(310, 90%, 80%)',
                    pointStyle: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                },
                {
                    label: 'Yaw',
                    borderColor: 'hsl(234, 90%, 50%)',
                    backgroundColor: 'hsl(234, 90%, 80%)',

                    pointStyle: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                },
                {
                    label: 'Measured-Pitch',

                    borderColor: 'hsl(123, 90%, 50%)',
                    backgroundColor: 'hsl(123, 90%, 80%)',
                    pointStyle: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                },
                {
                    label: 'Measured-Roll',
                    borderColor: 'hsl(172, 90%, 50%)',
                    backgroundColor: 'hsl(172, 90%, 80%)',
                    pointStyle: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                },
                {
                    label: 'Measured-Yaw',
                    borderColor: 'hsl(28, 90%, 50%)',
                    backgroundColor: 'hsl(28, 90%, 80%)',
                    pointStyle: false,
                    cubicInterpolationMode: 'monotone',
                    tension: 0.4,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
        },
    });
}

function resizeChart(){
    const canvasContainer = document.querySelector('.recording-chart').parentElement
    recordingChart.resize(canvasContainer.offsetWidth, canvasContainer.offsetHeight)
}

function updateChart(){
    if (recordingData.length != 0){
        recordingChart.data.labels.push(`${(recordingData[recordingData.length - 1].micros / 1000000).toFixed(2)}s`)
        recordingChart.data.datasets[0].data.push(recordingData[recordingData.length - 1].pitch);
        recordingChart.data.datasets[1].data.push(recordingData[recordingData.length - 1].roll);
        recordingChart.data.datasets[2].data.push(recordingData[recordingData.length - 1].yaw);
        recordingChart.data.datasets[3].data.push(recordingData[recordingData.length - 1].measuredPitch);
        recordingChart.data.datasets[4].data.push(recordingData[recordingData.length - 1].measuredRoll);
        recordingChart.data.datasets[5].data.push(recordingData[recordingData.length - 1].measuredYaw);
    } else {
        recordingChart.data.labels = []
        recordingChart.data.datasets.forEach(dataset => dataset.data = []);
    }
    recordingChart.update();
}

