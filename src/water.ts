import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { POND_CENTER, POND_RADIUS, WATER_LEVEL } from "./terrain";

export function createPond(scene: THREE.Scene): { update: (dt: number) => void } {
  const geometry = new THREE.CircleGeometry(POND_RADIUS - 1, 48);
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
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND_CENTER.x, WATER_LEVEL, POND_CENTER.y);
  scene.add(water);

  function update(dt: number) {
    (water.material as THREE.ShaderMaterial).uniforms.time.value += dt * 0.6;
  }

  return { update };
}
