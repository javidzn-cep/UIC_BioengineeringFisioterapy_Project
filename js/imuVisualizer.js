import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


const canvas = document.querySelector('.IMU-visualizer')
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvas.parentElement.offsetWidth / canvas.parentElement.offsetHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: canvas})
const controls = new OrbitControls(camera, renderer.domElement)


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
const axesHelper = new THREE.AxesHelper(5);

arduinoModel.add(axesHelper)
scene.add(arduinoModel, pointLight1, pointLight2, gridHelper);

function animate(){
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    controls.update()
}

export function setArduinoPosition(pitch, roll, yaw){
    arduinoModel.setRotationFromEuler(new THREE.Euler(pitch, yaw, roll), 'XYZ');
    document.querySelector('.pitch').textContent = radiansToDegrees(pitch);
    document.querySelector('.roll').textContent = radiansToDegrees(roll);
    document.querySelector('.yaw').textContent = radiansToDegrees(yaw);
}

const radiansToDegrees = rad => rad * (180 / Math.PI);