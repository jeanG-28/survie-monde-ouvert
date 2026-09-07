import * as THREE from "three";
import { getHeightAt, getBiomeAt, isUnderwater, TERRAIN_SIZE } from "./terrain";

const COLORS = [0xf5d80a, 0xffffff, 0xc13a6b, 0x8a4fd6];
const COUNT_PER_COLOR = 320;
const FLOWER_SIZE = 0.16;

/** Texture procédurale d'une fleur à 5 pétales, vue de dessus, en blanc (teintée par le matériau). */
function createFlowerTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillStyle = "#ffffff";
  const cx = 16;
  const cy = 16;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(angle) * 6, cy + Math.sin(angle) * 6, 6, 4, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#5a4210";
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createFlowers(scene: THREE.Scene) {
  const texture = createFlowerTexture();
  const half = TERRAIN_SIZE / 2 - 10;
  const geometry = new THREE.PlaneGeometry(FLOWER_SIZE, FLOWER_SIZE);
  geometry.rotateX(-Math.PI / 2);

  for (const color of COLORS) {
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, COUNT_PER_COLOR);
    const dummy = new THREE.Object3D();
    let placed = 0;
    let attempts = 0;
    while (placed < COUNT_PER_COLOR && attempts < COUNT_PER_COLOR * 4) {
      attempts++;
      const x = (Math.random() - 0.5) * 2 * half;
      const z = (Math.random() - 0.5) * 2 * half;
      const h = getHeightAt(x, z);
      const t = getBiomeAt(h);
      if (t < 0.15 || t > 0.55) continue; // seulement en zone d'herbe franche
      if (isUnderwater(x, z)) continue;
      dummy.position.set(x, h + 0.05, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.7 + Math.random() * 0.8;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }
}
