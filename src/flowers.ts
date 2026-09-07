import * as THREE from "three";
import { getHeightAt, getBiomeAt, isUnderwater, TERRAIN_SIZE } from "./terrain";
import { loadNatureAssets, pickClone } from "./natureAssets";

const COUNT = 260;

export function createFlowers(scene: THREE.Scene) {
  const half = TERRAIN_SIZE / 2 - 10;

  loadNatureAssets().then((assets) => {
    let placed = 0;
    let attempts = 0;
    while (placed < COUNT && attempts < COUNT * 4) {
      attempts++;
      const x = (Math.random() - 0.5) * 2 * half;
      const z = (Math.random() - 0.5) * 2 * half;
      const h = getHeightAt(x, z);
      const t = getBiomeAt(h);
      if (t < 0.15 || t > 0.55) continue; // seulement en zone d'herbe franche
      if (isUnderwater(x, z)) continue;

      const flower = pickClone(assets.flowers);
      flower.position.set(x, h, z);
      flower.rotation.y = Math.random() * Math.PI * 2;
      flower.scale.setScalar(0.8 + Math.random() * 0.5);
      scene.add(flower);
      placed++;
    }
  });
}
