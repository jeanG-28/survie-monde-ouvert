import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/** Charge un vrai ciel HDRI (photo réelle) comme fond ET comme éclairage d'ambiance/reflets. */
export function createSky(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  scene.fog = new THREE.Fog(0xbfd4e0, 60, 190);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new RGBELoader().load("/hdri/sky.hdr", (hdrTexture) => {
    const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
    scene.background = envMap;
    scene.environment = envMap;
    hdrTexture.dispose();
    pmrem.dispose();
  });
}
