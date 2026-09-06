import * as THREE from "three";
import { fractalNoise } from "./noise";

export const TERRAIN_SIZE = 200;
const HEIGHT_SCALE = 6;
const NOISE_SCALE = 0.03;

/** Hauteur du terrain à une position (x, z) donnée — utilisée à la fois pour le maillage et pour poser joueur/objets au sol. */
export function getHeightAt(x: number, z: number): number {
  return fractalNoise(x * NOISE_SCALE, z * NOISE_SCALE, 4) * HEIGHT_SCALE;
}

export function createTerrain(): THREE.Mesh {
  const segments = 150;
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors: number[] = [];
  const grass = new THREE.Color(0x4a7c3f);
  const rock = new THREE.Color(0x8a8378);
  const sand = new THREE.Color(0xc2b280);

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = getHeightAt(x, z);
    position.setY(i, h);

    const t = THREE.MathUtils.clamp((h + HEIGHT_SCALE) / (HEIGHT_SCALE * 2), 0, 1);
    const color = new THREE.Color();
    if (t < 0.35) color.lerpColors(sand, grass, t / 0.35);
    else color.lerpColors(grass, rock, (t - 0.35) / 0.65);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
