import * as THREE from "three";
import { getHeightAt, isUnderwater, POND_CENTER, POND_RADIUS, WATER_LEVEL } from "./terrain";

const REED_COUNT = 500;
const LILY_COUNT = 22;
const BUSH_COUNT = 90;

function createReedTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 64, 0, 0);
  gradient.addColorStop(0, "#3a4a1e");
  gradient.addColorStop(1, "#7a8f3a");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(7, 64);
  ctx.quadraticCurveTo(3, 20, 8, 0);
  ctx.lineTo(9, 0);
  ctx.quadraticCurveTo(13, 20, 9, 64);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createReeds(scene: THREE.Scene) {
  const height = 0.9;
  const geometry = new THREE.PlaneGeometry(0.12, height, 1, 2);
  geometry.translate(0, height / 2, 0);
  const material = new THREE.MeshStandardMaterial({
    map: createReedTexture(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.85,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, REED_COUNT);
  mesh.castShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;
  let attempts = 0;
  while (placed < REED_COUNT && attempts < REED_COUNT * 4) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    const dist = POND_RADIUS - 3 + Math.random() * 4; // anneau autour de la rive
    const x = POND_CENTER.x + Math.cos(angle) * dist;
    const z = POND_CENTER.y + Math.sin(angle) * dist;
    const h = getHeightAt(x, z);
    if (h > WATER_LEVEL + 0.6) continue; // trop loin de l'eau
    dummy.position.set(x, Math.min(h, WATER_LEVEL + 0.05), z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.7 + Math.random() * 0.8;
    dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}

function createLilyPads(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({ color: 0x2f5d34, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < LILY_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (POND_RADIUS - 4);
    const x = POND_CENTER.x + Math.cos(angle) * dist;
    const z = POND_CENTER.y + Math.sin(angle) * dist;
    const radius = 0.25 + Math.random() * 0.25;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius, 12), material);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, WATER_LEVEL + 0.03, z);
    pad.rotation.z = Math.random() * Math.PI * 2;
    scene.add(pad);
  }
}

function createBushes(scene: THREE.Scene, terrainSize: number) {
  const material = new THREE.MeshStandardMaterial({ color: 0x3d6b2f, roughness: 0.9, flatShading: true });
  const half = terrainSize / 2 - 6;
  let placed = 0;
  let attempts = 0;
  while (placed < BUSH_COUNT && attempts < BUSH_COUNT * 4) {
    attempts++;
    const x = (Math.random() - 0.5) * 2 * half;
    const z = (Math.random() - 0.5) * 2 * half;
    if (isUnderwater(x, z)) continue;
    const h = getHeightAt(x, z);

    const group = new THREE.Group();
    const clumps = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < clumps; i++) {
      const geometry = new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.15, 0);
      const pos = geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let j = 0; j < pos.count; j++) {
        v.fromBufferAttribute(pos, j);
        v.multiplyScalar(1 + (Math.random() - 0.5) * 0.3);
        pos.setXYZ(j, v.x, v.y, v.z);
      }
      geometry.computeVertexNormals();
      const clump = new THREE.Mesh(geometry, material);
      clump.position.set((Math.random() - 0.5) * 0.3, 0.22 + Math.random() * 0.08, (Math.random() - 0.5) * 0.3);
      clump.castShadow = true;
      group.add(clump);
    }
    group.position.set(x, h, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.6;
    group.scale.setScalar(scale);
    scene.add(group);
    placed++;
  }
}

export function createDecorations(scene: THREE.Scene, terrainSize: number) {
  createReeds(scene);
  createLilyPads(scene);
  createBushes(scene, terrainSize);
}
