import * as THREE from "three";
import { fractalNoise } from "./noise";

export const TERRAIN_SIZE = 200;
const HEIGHT_SCALE = 7;
const NOISE_SCALE = 0.025;
const TEXTURE_REPEAT = 26;

/** Hauteur du terrain à une position (x, z) donnée — utilisée à la fois pour le maillage et pour poser joueur/objets au sol. */
export function getHeightAt(x: number, z: number): number {
  // Un bruit basse fréquence "déforme" les coordonnées d'un second bruit,
  // ce qui casse la régularité visuelle d'un simple bruit fractal (relief plus naturel).
  const warpX = fractalNoise(x * 0.01, z * 0.01, 2) * 12;
  const warpZ = fractalNoise(x * 0.01 + 50, z * 0.01 + 50, 2) * 12;
  return fractalNoise((x + warpX) * NOISE_SCALE, (z + warpZ) * NOISE_SCALE, 5) * HEIGHT_SCALE;
}

function loadTiledTexture(loader: THREE.TextureLoader, url: string, srgb: boolean): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTerrain(): THREE.Mesh {
  const segments = 180;
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const terrainT: number[] = [];

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = getHeightAt(x, z);
    position.setY(i, h);
    terrainT.push(THREE.MathUtils.clamp((h + HEIGHT_SCALE) / (HEIGHT_SCALE * 2), 0, 1));
  }

  geometry.setAttribute("terrainT", new THREE.Float32BufferAttribute(terrainT, 1));
  geometry.computeVertexNormals();

  const loader = new THREE.TextureLoader();
  const sandMap = loadTiledTexture(loader, "/textures/sand/diff.jpg", true);
  const grassMap = loadTiledTexture(loader, "/textures/grass/diff.jpg", true);
  const rockMap = loadTiledTexture(loader, "/textures/rock/diff.jpg", true);
  grassMap.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);

  const material = new THREE.MeshStandardMaterial({ map: grassMap, roughness: 1, metalness: 0 });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.sandMap = { value: sandMap };
    shader.uniforms.rockMap = { value: rockMap };
    shader.uniforms.terrainRepeat = { value: TEXTURE_REPEAT };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `attribute float terrainT;\nvarying float vTerrainT;\n#include <common>`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvTerrainT = terrainT;`);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `uniform sampler2D sandMap;\nuniform sampler2D rockMap;\nuniform float terrainRepeat;\nvarying float vTerrainT;\n#include <common>`,
      )
      .replace(
        "#include <map_fragment>",
        `
        vec2 terrainUv = vMapUv;
        vec4 sandColor = texture2D( sandMap, terrainUv );
        vec4 grassColor = texture2D( map, terrainUv );
        vec4 rockColor = texture2D( rockMap, terrainUv );
        vec4 blendedColor = mix( sandColor, grassColor, smoothstep( 0.0, 0.32, vTerrainT ) );
        blendedColor = mix( blendedColor, rockColor, smoothstep( 0.58, 0.85, vTerrainT ) );
        diffuseColor *= blendedColor;
        `,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
