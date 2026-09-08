import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { COAST_START, POND_CENTER, POND_RADIUS, TERRAIN_SIZE, WATER_LEVEL } from "./terrain";

function makeWater(geometry: THREE.BufferGeometry): Water {
  const waterNormals = new THREE.TextureLoader().load("/textures/waternormals.jpg", (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  });
  const water = new Water(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals,
    sunDirection: new THREE.Vector3(35, 55, 20).normalize(),
    sunColor: 0xfff1d6,
    waterColor: 0x0e3b4d,
    distortionScale: 2.2,
    alpha: 0.85,
    fog: true,
  });
  // Water.js calcule un alpha dans son shader mais n'active jamais le blending sur son matériau :
  // sans ce réglage, l'eau reste 100% opaque quoi qu'on passe en option, et les poissons ne se
  // voient jamais dessous. On l'active nous-mêmes pour qu'ils soient visibles sous la surface.
  const material = water.material as THREE.ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  return water;
}

export function createPond(scene: THREE.Scene): { update: (dt: number) => void } {
  const water = makeWater(new THREE.CircleGeometry(POND_RADIUS - 1, 48));
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND_CENTER.x, WATER_LEVEL, POND_CENTER.y);
  scene.add(water);

  // Mer côtière : couvre toute la bande côte est où le terrain a été abaissé sous le niveau de l'eau.
  const oceanWidth = TERRAIN_SIZE / 2 - COAST_START + 20;
  const ocean = makeWater(new THREE.PlaneGeometry(oceanWidth, TERRAIN_SIZE + 40));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(COAST_START + oceanWidth / 2, WATER_LEVEL, 0);
  scene.add(ocean);

  function update(dt: number) {
    (water.material as THREE.ShaderMaterial).uniforms.time.value += dt * 0.6;
    (ocean.material as THREE.ShaderMaterial).uniforms.time.value += dt * 0.6;
  }

  return { update };
}
