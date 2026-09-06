import * as THREE from "three";
import { fractalNoise } from "./noise";

export const TERRAIN_SIZE = 200;
const HEIGHT_SCALE = 7;
const NOISE_SCALE = 0.025;

/** Hauteur du terrain à une position (x, z) donnée — utilisée à la fois pour le maillage et pour poser joueur/objets au sol. */
export function getHeightAt(x: number, z: number): number {
  // Un bruit basse fréquence "déforme" les coordonnées d'un second bruit,
  // ce qui casse la régularité visuelle d'un simple bruit fractal (relief plus naturel).
  const warpX = fractalNoise(x * 0.01, z * 0.01, 2) * 12;
  const warpZ = fractalNoise(x * 0.01 + 50, z * 0.01 + 50, 2) * 12;
  return fractalNoise((x + warpX) * NOISE_SCALE, (z + warpZ) * NOISE_SCALE, 5) * HEIGHT_SCALE;
}

export function createTerrain(): THREE.Mesh {
  const segments = 180;
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors: number[] = [];
  const grassLow = new THREE.Color(0x3f6b2e);
  const grassHigh = new THREE.Color(0x6b8f3f);
  const rock = new THREE.Color(0x7d766a);
  const sand = new THREE.Color(0xcdb987);

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = getHeightAt(x, z);
    position.setY(i, h);

    const t = THREE.MathUtils.clamp((h + HEIGHT_SCALE) / (HEIGHT_SCALE * 2), 0, 1);
    const color = new THREE.Color();
    if (t < 0.3) color.lerpColors(sand, grassLow, t / 0.3);
    else if (t < 0.7) color.lerpColors(grassLow, grassHigh, (t - 0.3) / 0.4);
    else color.lerpColors(grassHigh, rock, (t - 0.7) / 0.3);

    // Grain fin (façon texture) : un bruit à haute fréquence module légèrement la teinte
    // pour casser l'effet "dégradé plat" et suggérer une variation d'herbe/terre.
    const grain = fractalNoise(x * 0.6, z * 0.6, 2) * 0.06;
    color.r = THREE.MathUtils.clamp(color.r + grain, 0, 1);
    color.g = THREE.MathUtils.clamp(color.g + grain, 0, 1);
    color.b = THREE.MathUtils.clamp(color.b + grain * 0.6, 0, 1);

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
