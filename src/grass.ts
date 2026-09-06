import * as THREE from "three";
import { getHeightAt, getBiomeAt, isUnderwater, TERRAIN_SIZE } from "./terrain";

const BLADE_COUNT = 35000;
const BLADE_HEIGHT = 0.28;
const BLADE_WIDTH = 0.045;

/** Texture procédurale d'un brin d'herbe (dégradé vert, base plus sombre, pointe plus claire). */
function createBladeTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 64);

  const gradient = ctx.createLinearGradient(0, 64, 0, 0);
  gradient.addColorStop(0, "#2c4a1e");
  gradient.addColorStop(0.6, "#4f7a30");
  gradient.addColorStop(1, "#7fa84a");
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(14, 64);
  ctx.quadraticCurveTo(6, 30, 15, 0);
  ctx.lineTo(17, 0);
  ctx.quadraticCurveTo(26, 30, 18, 64);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Petite fusion locale de deux géométries (deux plans croisés en X vue du dessus, pour donner du volume au brin).
function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const attrs: (keyof typeof a.attributes)[] = ["position", "normal", "uv"];
  for (const name of attrs) {
    const attrA = a.getAttribute(name as string) as THREE.BufferAttribute;
    const attrB = b.getAttribute(name as string) as THREE.BufferAttribute;
    const itemSize = attrA.itemSize;
    const merged_array = new Float32Array(attrA.count * itemSize + attrB.count * itemSize);
    merged_array.set(attrA.array as Float32Array, 0);
    merged_array.set(attrB.array as Float32Array, attrA.count * itemSize);
    merged.setAttribute(name as string, new THREE.BufferAttribute(merged_array, itemSize));
  }
  const indexA = a.getIndex()!;
  const indexB = b.getIndex()!;
  const offset = attrsCountOf(a);
  const mergedIndex = new Uint16Array(indexA.count + indexB.count);
  mergedIndex.set(indexA.array as ArrayLike<number>, 0);
  for (let i = 0; i < indexB.count; i++) {
    mergedIndex[indexA.count + i] = (indexB.array as ArrayLike<number>)[i] + offset;
  }
  merged.setIndex(new THREE.BufferAttribute(mergedIndex, 1));
  return merged;
}
function attrsCountOf(g: THREE.BufferGeometry): number {
  return g.getAttribute("position").count;
}

export function createGrass(scene: THREE.Scene): { update: (time: number) => void } {
  const plane = new THREE.PlaneGeometry(BLADE_WIDTH, BLADE_HEIGHT, 1, 3);
  plane.translate(0, BLADE_HEIGHT / 2, 0);
  const plane2 = plane.clone().rotateY(Math.PI / 2);
  const geometry = mergeTwo(plane, plane2);

  const material = new THREE.MeshStandardMaterial({
    map: createBladeTexture(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.85,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `uniform float uTime;\n#include <common>`)
      .replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        float windPhase = instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.6 + uTime * 1.6;
        float sway = sin( windPhase ) * 0.06 * position.y;
        transformed.x += sway;
        transformed.z += cos( windPhase * 0.7 ) * 0.04 * position.y;
        `,
      );
  };

  const mesh = new THREE.InstancedMesh(geometry, material, BLADE_COUNT);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;
  let attempts = 0;
  const half = TERRAIN_SIZE / 2 - 4;

  while (placed < BLADE_COUNT && attempts < BLADE_COUNT * 3) {
    attempts++;
    const x = (Math.random() - 0.5) * 2 * half;
    const z = (Math.random() - 0.5) * 2 * half;
    const h = getHeightAt(x, z);
    const t = getBiomeAt(h);
    if (t < 0.12 || t > 0.72) continue; // évite le sable et la roche
    if (isUnderwater(x, z)) continue;

    dummy.position.set(x, h, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.75 + Math.random() * 0.6;
    dummy.scale.set(scale, scale * (0.75 + Math.random() * 0.5), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;

  scene.add(mesh);

  function update(time: number) {
    const shader = material.userData.shader;
    if (shader) shader.uniforms.uTime.value = time;
  }

  return { update };
}
