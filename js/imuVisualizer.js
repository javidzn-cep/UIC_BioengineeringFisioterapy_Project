import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


const canvas = document.querySelector('.IMU-visualizer')
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvas.parentElement.offsetWidth / canvas.parentElement.offsetHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: canvas})
const controls = new OrbitControls(camera, renderer.domElement);
const loader = new OBJLoader();
let pitch, roll, yaw, yawOrigin, angleToSubtract = 0;


scene.background = new THREE.Color(0xffffff)
camera.position.set(0, 5, 15)
renderer.setSize( canvas.parentElement.offsetWidth , canvas.parentElement.offsetHeight );

animate();

const geometry = new THREE.BoxGeometry(5, 1, 12);
const material = new THREE.MeshStandardMaterial( { color: 0xffffff } );
const arduinoModel = new THREE.Mesh( geometry, material );

const pointLight1 = new THREE.PointLight(0xffffff)
const pointLight2 = new THREE.PointLight(0xffffff)
pointLight1.position.set(5, 5, 5)
pointLight1.intensity = 15
pointLight2.position.set(5, 5, -5)
pointLight2.intensity = 10

const gridHelper = new THREE.GridHelper(200, 50);
const axesHelper = new THREE.AxesHelper(10);

arduinoModel.add(axesHelper);
scene.add(arduinoModel, pointLight1, pointLight2, gridHelper);

function animate(){
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    controls.update()
}

function setArduinoPosition(){
    arduinoModel.rotation.x = degreesToRadians(pitch);
    arduinoModel.rotation.y = degreesToRadians(yaw);
    arduinoModel.rotation.z = degreesToRadians(roll);
}

function centerArduino(){
    yaw -= yaw > 0 ? angleToSubtract : -angleToSubtract;
    yaw = ((yaw + 180.0) % 360.0 + 360.0) % 360.0;
    yaw = (yaw < 0) ? yaw + 360.0 : yaw;
    yaw -= 180.0;
    yaw = (yaw > 180.0) ? yaw - 360.0 : yaw;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.center-arduino').addEventListener('click', () => {
        angleToSubtract = yawOrigin;
    })
});

document.addEventListener('sensorfusionvaluechanged',  e => {
    const sensor = e.detail.value;
    pitch = sensor.pitch;
    roll = sensor.roll;
    yaw = yawOrigin = sensor.yaw;
    centerArduino()
    setArduinoPosition();
})

const radiansToDegrees = rad => rad * (180 / Math.PI);
const degreesToRadians = degrees => degrees * (Math.PI / 180);