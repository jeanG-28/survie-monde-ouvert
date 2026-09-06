import * as THREE from "three";
import { createTerrain, getHeightAt, TERRAIN_SIZE } from "./terrain";
import { Player } from "./player";
import { ResourceWorld } from "./world";
import { Inventory, RECIPES } from "./inventory";
import type { ItemId } from "./inventory";
import { BuildingSystem } from "./building";
import { UI } from "./ui";
import { createHeldItemMesh } from "./items";

// --- Scène / rendu ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 110);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById("app")!.prepend(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Lumières ---
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.far = 150;
scene.add(sun);

// --- Monde ---
const terrain = createTerrain();
scene.add(terrain);

const resourceWorld = new ResourceWorld(scene);

const inventory = new Inventory();
const buildingSystem = new BuildingSystem(scene, inventory);

const player = new Player();
player.position.set(0, getHeightAt(0, 0), 0);
scene.add(player.root);

let equippedMesh: THREE.Object3D | null = null;
function equip(id: ItemId) {
  if (equippedMesh) player.rightHand.remove(equippedMesh);
  equippedMesh = createHeldItemMesh(id);
  player.rightHand.add(equippedMesh);
  ui.setHeldItem(RECIPES.find((r) => r.id === id)!.label);
}

const ui = new UI(inventory, (id) => {
  if (inventory.craft(RECIPES.find((r) => r.id === id)!)) {
    equip(id);
  }
});

// --- Contrôles caméra / clavier ---
let yaw = 0;
let pitch = 0.35;
const PITCH_MIN = -0.3;
const PITCH_MAX = 1.2;
const CAMERA_DISTANCE = 5.5;
const MOUSE_SENSITIVITY = 0.0025;

const keys = new Set<string>();
let isPointerLocked = false;

const canvas = renderer.domElement;

canvas.addEventListener("click", () => {
  if (ui.isCraftMenuOpen()) return;
  if (!isPointerLocked) canvas.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", (e) => {
  if (!isPointerLocked) return;
  yaw -= e.movementX * MOUSE_SENSITIVITY;
  pitch -= e.movementY * MOUSE_SENSITIVITY;
  pitch = THREE.MathUtils.clamp(pitch, PITCH_MIN, PITCH_MAX);
});

document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (buildingSystem.active && isPointerLocked) {
    buildingSystem.place();
  }
});

document.addEventListener("keydown", (e) => {
  keys.add(e.code);

  if (e.code === "KeyC") {
    const opened = ui.toggleCraftMenu();
    if (opened) document.exitPointerLock();
  } else if (e.code === "KeyB") {
    buildingSystem.toggle();
  } else if (e.code === "Tab") {
    e.preventDefault();
    if (buildingSystem.active) buildingSystem.cycleType();
  } else if (e.code === "KeyE") {
    tryGather();
  } else if (e.code === "Space") {
    e.preventDefault();
    if (player.onGround) player.velocityY = 5.2;
  } else if (e.code === "Escape") {
    ui.closeCraftMenu();
  }
});

document.addEventListener("keyup", (e) => keys.delete(e.code));

ui.onStart(() => {
  ui.hideInstructions();
  canvas.requestPointerLock();
});

function tryGather() {
  const node = resourceWorld.findNearby(player.position);
  if (!node) return;
  const destroyed = resourceWorld.hit(node);
  if (destroyed) {
    inventory.addResource(node.type, node.type === "bois" ? 5 : 4);
  }
}

// --- Raycast pour le fantôme de construction (vise le centre de l'écran) ---
const raycaster = new THREE.Raycaster();
function getGroundPointUnderCrosshair(): THREE.Vector3 | null {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObject(terrain);
  if (hits.length === 0) return null;
  if (hits[0].distance > 10) return null;
  return hits[0].point;
}

// --- Boucle de jeu ---
const clock = new THREE.Clock();
const GRAVITY = -14;
const WORLD_LIMIT = TERRAIN_SIZE / 2 - 2;

function updatePlayer(dt: number) {
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const move = new THREE.Vector3();
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyD")) move.add(right);
  if (keys.has("KeyA")) move.sub(right);

  const isMoving = move.lengthSq() > 0;
  if (isMoving) {
    move.normalize().multiplyScalar(player.moveSpeed * dt);
    player.position.x = THREE.MathUtils.clamp(player.position.x + move.x, -WORLD_LIMIT, WORLD_LIMIT);
    player.position.z = THREE.MathUtils.clamp(player.position.z + move.z, -WORLD_LIMIT, WORLD_LIMIT);
    player.yaw = Math.atan2(move.x, move.z);
  }
  player.animateWalk(isMoving, dt);

  // Gravité + collision avec le sol.
  player.velocityY += GRAVITY * dt;
  player.position.y += player.velocityY * dt;
  const ground = getHeightAt(player.position.x, player.position.z);
  if (player.position.y <= ground) {
    player.position.y = ground;
    player.velocityY = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  player.syncTransform();
}

function updateCamera() {
  const target = new THREE.Vector3(player.position.x, player.position.y + 1.5, player.position.z);
  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ).multiplyScalar(-CAMERA_DISTANCE);
  camera.position.copy(target).add(offset);
  camera.position.y = Math.max(camera.position.y, getHeightAt(camera.position.x, camera.position.z) + 0.3);
  camera.lookAt(target);
}

function updateInteractionPrompt() {
  const node = resourceWorld.findNearby(player.position);
  ui.showPrompt(node ? `Appuyez sur E pour récolter (${node.type})` : null);
}

function updateBuildIndicator() {
  if (buildingSystem.active) {
    buildingSystem.updateGhost(getGroundPointUnderCrosshair());
    ui.setBuildIndicator(`Construction : ${buildingSystem.typeLabel} — clic pour poser, Tab pour changer, B pour quitter`);
  } else {
    ui.setBuildIndicator(null);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const now = performance.now() / 1000;

  updatePlayer(dt);
  updateCamera();
  resourceWorld.update(now);
  updateInteractionPrompt();
  updateBuildIndicator();

  renderer.render(scene, camera);
}
animate();
