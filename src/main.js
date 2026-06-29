import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { gsap } from 'gsap';

// --- State & Config ---
let currentMode = '3d'; // '3d' or 'pano'
let modelScene = null;
let roomBounds = null;
let sphereMesh = null;
let sphereMat = null;
let activeHotspots = [];
let isTransitioning = false;
const keys = { w: false, a: false, s: false, d: false, q: false, e: false };

// --- DOM Elements ---
const container = document.getElementById('canvas-container');
const hotspotOverlay = document.getElementById('hotspot-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = loadingOverlay.querySelector('.loading-text');
const roomBadge = document.getElementById('room-badge');
const navPanel = document.getElementById('nav-panel');

// Mode Switcher Buttons
const btn3d = document.getElementById('btn-mode-3d');
const btnPano = document.getElementById('btn-mode-pano');

// Info Modal Elements
const infoModal = document.getElementById('info-modal');
const infoTitle = document.getElementById('info-title');
const infoBody = document.getElementById('info-body');
const infoClose = document.getElementById('info-close');

// Setup instructions UI for 3D Walkthrough
roomBadge.textContent = "Dining Room & Kitchen";
const updateHUDInstructions = () => {
  if (currentMode === '3d') {
    navPanel.innerHTML = `
      <div style="color: #9ca3af; font-size: 13px; font-weight: 500; display: flex; gap: 12px; align-items: center; padding: 10px 20px; flex-wrap: wrap; justify-content: center;">
        <span>Walk:</span>
        <kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); color: white;">W</kbd>
        <kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); color: white;">A</kbd>
        <kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); color: white;">S</kbd>
        <kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); color: white;">D</kbd>
        <span style="color: rgba(255,255,255,0.3)">|</span>
        <span>Height:</span>
        <kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); color: white;">E</kbd> (Up)
        <kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); color: white;">Q</kbd> (Down)
        <span style="color: rgba(255,255,255,0.3)">|</span>
        <span>Drag Move:</span>
        <span style="color: white; font-weight: 600;">Middle Mouse Button</span>
      </div>
    `;
  } else {
    navPanel.innerHTML = `
      <div style="color: #9ca3af; font-size: 13px; font-weight: 500; display: flex; gap: 12px; align-items: center; padding: 10px 20px; flex-wrap: wrap; justify-content: center;">
        <span style="color: #10b981; font-weight: 600;">● Photorealistic 360° View</span>
        <span style="color: rgba(255,255,255,0.3)">|</span>
        <span>Drag Left Mouse Button to look around</span>
      </div>
    `;
  }
};
updateHUDInstructions();

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 5); // Start at standard eye-height position

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Enable XR support for VR button
renderer.xr.enabled = true;

container.appendChild(renderer.domElement);

// Add the VR Button to the page
document.body.appendChild(VRButton.createButton(renderer));

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true; 
controls.panSpeed = 2.5;

// Set controls target to look slightly ahead
controls.target.set(0, 1.8, 4.95);
controls.update();

// --- Setup Panorama Skybox Sphere ---
const sphereGeo = new THREE.SphereGeometry(50, 60, 40);
sphereGeo.scale(-1, 1, 1); // Flip inside out

sphereMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1
});

sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
sphereMesh.visible = false; // Hidden in 3D Mode
scene.add(sphereMesh);

// Load Panorama Texture
const textureLoader = new THREE.TextureLoader();
textureLoader.load(import.meta.env.BASE_URL + 'assets/panoramas/dining_room_360.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  sphereMat.map = texture;
  sphereMat.needsUpdate = true;
}, undefined, (err) => {
  console.error("Error loading 360 panorama image:", err);
});

// --- Lighting (Only active in 3D Mode, disabled in Panorama Mode) ---
const lightGroup = new THREE.Group();
scene.add(lightGroup);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
lightGroup.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0001;
lightGroup.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.3);
fillLight.position.set(-10, 10, -10);
lightGroup.add(fillLight);

// --- Keyboard Listeners ---
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'arrowup') keys.w = true;
  if (key === 's' || key === 'arrowdown') keys.s = true;
  if (key === 'a' || key === 'arrowleft') keys.a = true;
  if (key === 'd' || key === 'arrowright') keys.d = true;
  if (key === 'q') keys.q = true;
  if (key === 'e') keys.e = true;
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'arrowup') keys.w = false;
  if (key === 's' || key === 'arrowdown') keys.s = false;
  if (key === 'a' || key === 'arrowleft') keys.a = false;
  if (key === 'd' || key === 'arrowright') keys.d = false;
  if (key === 'q') keys.q = false;
  if (key === 'e') keys.e = false;
});

// Info modal close listener
infoClose.addEventListener('click', hideInfoModal);

// --- Camera Glide Transition Helper ---
function transitionCamera(targetCamPos, targetLookTarget, onCompleteCallback) {
  if (isTransitioning) return;
  isTransitioning = true;
  controls.enabled = false;
  hideInfoModal();

  const tl = gsap.timeline({
    onComplete: () => {
      // Re-align target to be 5cm in front of camera position
      const lookDir = new THREE.Vector3();
      camera.getWorldDirection(lookDir);
      controls.target.copy(camera.position).add(lookDir.multiplyScalar(0.05));
      controls.update();
      
      controls.enabled = true;
      isTransitioning = false;
      
      if (onCompleteCallback) onCompleteCallback();
    }
  });

  tl.to(camera.position, {
    x: targetCamPos.x,
    y: targetCamPos.y,
    z: targetCamPos.z,
    duration: 1.5,
    ease: 'power2.inOut'
  });

  tl.to(controls.target, {
    x: targetLookTarget.x,
    y: targetLookTarget.y,
    z: targetLookTarget.z,
    duration: 1.5,
    ease: 'power2.inOut'
  }, "<");
}

// --- Polar to 3D Coordinates (For Panorama Hotspots) ---
function get3DPosition(yaw, pitch, radius = 40) {
  const phi = THREE.MathUtils.degToRad(90 - pitch);
  const theta = THREE.MathUtils.degToRad(yaw);
  
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

// --- Hotspot Helpers ---
function create3DHotspot(hotspot) {
  const hotspotEl = document.createElement('div');
  hotspotEl.className = 'hotspot hotspot-info';
  
  // Icon
  const iconEl = document.createElement('div');
  iconEl.className = 'hotspot-icon';
  iconEl.innerHTML = 'i';
  hotspotEl.appendChild(iconEl);
  
  // Tooltip
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'hotspot-tooltip';
  tooltipEl.textContent = hotspot.title;
  hotspotEl.appendChild(tooltipEl);
  
  // Click handler
  hotspotEl.addEventListener('click', () => {
    if (hotspot.isPanoHotspot) {
      showInfoModal(hotspot.title, hotspot.content);
    } else {
      transitionCamera(hotspot.camPos, hotspot.lookTarget, () => {
        showInfoModal(hotspot.title, hotspot.content);
      });
    }
  });
  
  hotspotOverlay.appendChild(hotspotEl);
  
  activeHotspots.push({
    element: hotspotEl,
    pos3D: hotspot.pos3D
  });
}

function updateHotspotsProjection() {
  const tempV = new THREE.Vector3();
  
  activeHotspots.forEach(hotspot => {
    tempV.copy(hotspot.pos3D);
    tempV.project(camera);
    
    const isBehind = tempV.z > 1;
    
    if (isBehind) {
      hotspot.element.style.display = 'none';
    } else {
      const xScreen = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      const yScreen = (tempV.y * -0.5 + 0.5) * window.innerHeight;
      
      hotspot.element.style.display = 'block';
      hotspot.element.style.transform = `translate(-50%, -50%) translate(${xScreen}px, ${yScreen}px)`;
    }
  });
}

function showInfoModal(title, content) {
  infoTitle.textContent = title;
  infoBody.innerHTML = content;
  infoModal.classList.add('active');
}

function hideInfoModal() {
  infoModal.classList.remove('active');
}

// --- Load Model ---
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loadingOverlay.style.display = 'flex';
loadingOverlay.style.opacity = '1';

loader.load(
  import.meta.env.BASE_URL + 'assets/models/dining_room_kitchen.glb',
  (gltf) => {
    modelScene = gltf.scene;
    
    modelScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        if (node.material) {
          node.material.roughness = Math.max(node.material.roughness, 0.3);
          if (node.material.map) {
            node.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        }
      }
    });
    
    // Calculate model boundaries
    const box = new THREE.Box3().setFromObject(modelScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    roomBounds = box.clone();
    roomBounds.expandByScalar(-0.5); // shrink bounds by 0.5m
    
    // Add to scene (only visible if currentMode is '3d')
    if (currentMode === '3d') {
      scene.add(modelScene);
      initialize3DMode();
    }
    
    // Hide loading screen
    gsap.to(loadingOverlay, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        loadingOverlay.style.display = 'none';
      }
    });
  },
  (xhr) => {
    if (xhr.total > 0) {
      const progress = Math.round((xhr.loaded / xhr.total) * 100);
      loadingText.textContent = `Loading 3D Model: ${progress}%`;
    } else {
      const mbLoaded = (xhr.loaded / (1024 * 1024)).toFixed(1);
      loadingText.textContent = `Loading 3D Model: ${mbLoaded} MB`;
    }
  },
  (error) => {
    console.error("An error occurred loading the GLB model:", error);
    loadingText.textContent = "Error loading model. Check console.";
  }
);

// --- Mode Switcher Operations ---

function initialize3DMode() {
  if (!modelScene) return;
  
  const box = new THREE.Box3().setFromObject(modelScene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Setup camera at eye-level inside room
  camera.position.set(center.x, center.y + 1.8, center.z + size.z * 0.4);
  controls.target.copy(camera.position).add(new THREE.Vector3(0, 0, -0.05));
  
  // Set normal 3D controls parameters
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 30;
  
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.NONE
  };
  controls.update();

  // Create 3D Hotspots
  hotspotOverlay.innerHTML = '';
  activeHotspots = [];
  
  const hotspots3D = [
    {
      title: "Dining Area",
      content: "Contemporary dining layout featuring custom oak furniture, ambient architectural lighting, and open layout connecting to the kitchen.",
      pos3D: center.clone().add(new THREE.Vector3(-1.0, 0.4, -0.5)),
      camPos: center.clone().add(new THREE.Vector3(-1.0, 1.8, 1.0)),
      lookTarget: center.clone().add(new THREE.Vector3(-1.0, 1.5, -0.5))
    },
    {
      title: "Gourmet Kitchen",
      content: "Fully integrated smart appliances, solid marble countertops, and seamless flush cabinetry designed for modern culinary experiences.",
      pos3D: center.clone().add(new THREE.Vector3(1.2, 0.4, 0.8)),
      camPos: center.clone().add(new THREE.Vector3(1.2, 1.8, -0.4)),
      lookTarget: center.clone().add(new THREE.Vector3(1.2, 1.5, 0.8))
    }
  ];
  hotspots3D.forEach(create3DHotspot);
}

function initializePanoMode() {
  // Move camera exactly to origin center of panorama sphere
  camera.position.set(0, 0, 0.1);
  controls.target.set(0, 0, 0);
  
  // Lock controls distance so user orbits in place (head rotation only)
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minDistance = 0.01;
  controls.maxDistance = 0.1;
  
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.NONE,
    RIGHT: THREE.MOUSE.NONE
  };
  controls.update();

  // Create Panorama Hotspots
  hotspotOverlay.innerHTML = '';
  activeHotspots = [];
  
  create3DHotspot({
    title: "Dining Room (Cycles Render)",
    content: "A photorealistic 360-degree render of the dining space using Blender Cycles, demonstrating the perfect mirror reflections and soft architectural ambient lighting.",
    pos3D: get3DPosition(40, -10, 45), // float in front
    isPanoHotspot: true
  });
}

function setMode(mode) {
  if (isTransitioning || mode === currentMode) return;
  currentMode = mode;
  hideInfoModal();
  updateHUDInstructions();
  
  if (mode === '3d') {
    btn3d.classList.add('active');
    btnPano.classList.remove('active');
    
    sphereMesh.visible = false;
    lightGroup.visible = true;
    if (modelScene) {
      scene.add(modelScene);
      modelScene.visible = true;
      initialize3DMode();
    }
  } else if (mode === 'pano') {
    btnPano.classList.add('active');
    btn3d.classList.remove('active');
    
    sphereMesh.visible = true;
    lightGroup.visible = false;
    if (modelScene) {
      scene.remove(modelScene);
    }
    initializePanoMode();
  }
}

// Attach Mode Switcher Click Listeners
btn3d.addEventListener('click', () => setMode('3d'));
btnPano.addEventListener('click', () => setMode('pano'));

// --- WASD + Q/E Height Movement Controller ---
function updateMovement() {
  if (!modelScene || isTransitioning || currentMode !== '3d') return;
  
  const speed = 0.06; // walking speed
  const moveDirection = new THREE.Vector3();
  
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  
  const right = new THREE.Vector3();
  right.crossVectors(camera.up, forward).normalize();
  
  if (keys.w) moveDirection.add(forward);
  if (keys.s) moveDirection.sub(forward);
  if (keys.a) moveDirection.add(right);
  if (keys.d) moveDirection.sub(right);
  
  if (keys.e) moveDirection.y += 1;
  if (keys.q) moveDirection.y -= 1;
  
  if (moveDirection.lengthSq() > 0) {
    const verticalSpeed = moveDirection.y * speed;
    moveDirection.y = 0;
    
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize().multiplyScalar(speed);
    }
    moveDirection.y = verticalSpeed;
    
    camera.position.add(moveDirection);
    controls.target.add(moveDirection);
    controls.update();
  }
}

// --- WebXR Render Animation Loop ---
renderer.setAnimationLoop(() => {
  // Only process walking movement in 3D mode (not in panorama mode or during transitions)
  if (currentMode === '3d') {
    updateMovement();
  }
  
  controls.update();
  
  // Enforce boundary collision checks in 3D Mode to keep camera inside room bounds
  if (currentMode === '3d' && modelScene && roomBounds && !isTransitioning) {
    const prevPos = camera.position.clone();
    camera.position.clamp(roomBounds.min, roomBounds.max);
    
    const clampedOffset = camera.position.clone().sub(prevPos);
    if (clampedOffset.lengthSq() > 0) {
      controls.target.add(clampedOffset);
      controls.update();
    }
  }
  
  // Project hotspots onto 2D overlay (only active outside VR mode)
  if (activeHotspots.length > 0) {
    updateHotspotsProjection();
  }
  
  renderer.render(scene, camera);
});

// --- Resize Handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
