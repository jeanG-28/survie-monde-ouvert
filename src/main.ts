import * as THREE from "three";
import { createTerrain, getHeightAt, TERRAIN_SIZE } from "./terrain";
import { Player } from "./player";
import { ResourceWorld } from "./world";
import { Inventory, RECIPES } from "./inventory";
import type { ItemId } from "./inventory";
import { BuildingSystem } from "./building";
import { UI } from "./ui";
import { createHeldItemMesh } from "./items";
import { createSky } from "./sky";
import { createComposer } from "./postprocessing";
import { createGrass } from "./grass";
import { createPond } from "./water";
import { createDecorations } from "./decorations";
import { createWildlife } from "./wildlife";
import { AnimalWorld } from "./animals";

// --- Scène / rendu ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById("app")!.prepend(renderer.domElement);

createSky(scene, renderer);

const { composer, setSize: setComposerSize } = createComposer(renderer, scene, camera);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  setComposerSize(window.innerWidth, window.innerHeight);
});

// --- Lumières (le ciel HDRI fournit déjà l'éclairage d'ambiance ; le soleil directionnel sert aux ombres) ---
const SUN_OFFSET = new THREE.Vector3(35, 55, 20);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
sun.position.copy(SUN_OFFSET);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
// Frustum resserré autour du joueur (au lieu de couvrir tout le terrain) : ombres bien plus nettes.
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 130;
sun.shadow.bias = -0.0015;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

// --- Monde ---
const terrain = createTerrain();
scene.add(terrain);

const grass = createGrass(scene);
const pond = createPond(scene);
createDecorations(scene, TERRAIN_SIZE);
const wildlife = createWildlife(scene);
const animalWorld = new AnimalWorld(scene);

const resourceWorld = new ResourceWorld(scene);

const inventory = new Inventory();
const buildingSystem = new BuildingSystem(scene, inventory);

const ui = new UI(inventory, (id) => {
  if (inventory.craft(RECIPES.find((r) => r.id === id)!)) {
    equip(id);
  }
});

let equippedMesh: THREE.Object3D | null = null;
let player: Player;

function equip(id: ItemId) {
  if (!player) return;
  if (equippedMesh) player.rightHand.remove(equippedMesh);
  equippedMesh = createHeldItemMesh(id);
  // L'os de la main hérite d'une échelle interne (liée au squelette d'origine) très différente
  // de l'échelle visuelle du personnage : on la compense pour que l'objet tenu ait une taille réaliste.
  const worldScale = new THREE.Vector3();
  player.rightHand.getWorldScale(worldScale);
  equippedMesh.scale.set(1 / worldScale.x, 1 / worldScale.y, 1 / worldScale.z);
  player.rightHand.add(equippedMesh);
  ui.setHeldItem(RECIPES.find((r) => r.id === id)!.label);
}

// --- Contrôles caméra / clavier ---
let yaw = 0;
let pitch = 0.25;
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
    if (player?.onGround) player.velocityY = 5.2;
  } else if (e.code === "Escape") {
    ui.closeCraftMenu();
  }
});

document.addEventListener("keyup", (e) => keys.delete(e.code));

function tryGather() {
  if (!player) return;
  const resourceNode = resourceWorld.findNearby(player.position);
  const animalNode = animalWorld.findNearby(player.position);

  const resourceDist = resourceNode ? resourceNode.position.distanceTo(player.position) : Infinity;
  const animalDist = animalNode ? animalNode.position.distanceTo(player.position) : Infinity;

  if (animalNode && animalDist <= resourceDist) {
    const loot = animalWorld.hit(animalNode);
    if (loot) {
      inventory.addResource("viande", loot.viande);
      inventory.addResource("fourrure", loot.fourrure);
    }
  } else if (resourceNode) {
    const destroyed = resourceWorld.hit(resourceNode);
    if (destroyed) {
      inventory.addResource(resourceNode.type, resourceNode.type === "bois" ? 5 : 4);
    }
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
  player.update(dt);

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

  sun.target.position.copy(player.position);
  sun.position.copy(player.position).add(SUN_OFFSET);
}

function updateInteractionPrompt() {
  const resourceNode = resourceWorld.findNearby(player.position);
  const animalNode = animalWorld.findNearby(player.position);
  const resourceDist = resourceNode ? resourceNode.position.distanceTo(player.position) : Infinity;
  const animalDist = animalNode ? animalNode.position.distanceTo(player.position) : Infinity;

  if (animalNode && animalDist <= resourceDist) {
    ui.showPrompt(`Appuyez sur E pour chasser (${animalNode.species}, ${animalNode.hp}/${animalNode.maxHp} PV)`);
    return;
  }
  const node = resourceNode;
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
  grass.update(now);
  pond.update(dt);
  wildlife.update(dt, now);
  animalWorld.update(dt, now);
  updateInteractionPrompt();
  updateBuildIndicator();

  // Rotation très lente du ciel : nuages qui dérivent doucement, sensation de temps qui passe.
  scene.backgroundRotation.y += dt * 0.006;
  scene.environmentRotation.y = scene.backgroundRotation.y;

  composer.render();
}

async function main() {
  player = await Player.load();
  player.position.set(0, getHeightAt(0, 0), 0);
  scene.add(player.root);

  ui.setLoading(false);
  ui.onStart(() => {
    ui.hideInstructions();
    canvas.requestPointerLock();
  });

  animate();
}

main();
