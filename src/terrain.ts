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

/** Retourne t (0=sable, 0.5=herbe, 1=roche) pour une hauteur donnée — même formule que le shader du terrain. */
export function getBiomeAt(h: number): number {
  return THREE.MathUtils.clamp((h + HEIGHT_SCALE) / (HEIGHT_SCALE * 2), 0, 1);
}

function loadTiled(loader: THREE.TextureLoader, url: string, srgb: boolean): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTerrain(): THREE.Mesh {
  const segments = 220;
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const terrainT: number[] = [];

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = getHeightAt(x, z);
    position.setY(i, h);
    terrainT.push(getBiomeAt(h));
  }

  geometry.setAttribute("terrainT", new THREE.Float32BufferAttribute(terrainT, 1));
  geometry.computeVertexNormals();

  const loader = new THREE.TextureLoader();
  const sandDiff = loadTiled(loader, "/textures/sand/diff.jpg", true);
  const sandNor = loadTiled(loader, "/textures/sand/nor.jpg", false);
  const sandRough = loadTiled(loader, "/textures/sand/rough.jpg", false);

  const grassDiff = loadTiled(loader, "/textures/grass/diff.jpg", true);
  const grassNor = loadTiled(loader, "/textures/grass/nor.jpg", false);
  const grassRough = loadTiled(loader, "/textures/grass/rough.jpg", false);
  grassDiff.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);

  const rockDiff = loadTiled(loader, "/textures/rock/diff.jpg", true);
  const rockNor = loadTiled(loader, "/textures/rock/nor.jpg", false);
  const rockRough = loadTiled(loader, "/textures/rock/rough.jpg", false);

  const material = new THREE.MeshStandardMaterial({
    map: grassDiff,
    normalMap: grassNor,
    roughnessMap: grassRough,
    roughness: 1,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.sandMap = { value: sandDiff };
    shader.uniforms.sandNormalMap = { value: sandNor };
    shader.uniforms.sandRoughnessMap = { value: sandRough };
    shader.uniforms.rockMap = { value: rockDiff };
    shader.uniforms.rockNormalMap = { value: rockNor };
    shader.uniforms.rockRoughnessMap = { value: rockRough };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `attribute float terrainT;\nvarying float vTerrainT;\n#include <common>`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvTerrainT = terrainT;`);

    const blendDecl = `
      uniform sampler2D sandMap;
      uniform sampler2D sandNormalMap;
      uniform sampler2D sandRoughnessMap;
      uniform sampler2D rockMap;
      uniform sampler2D rockNormalMap;
      uniform sampler2D rockRoughnessMap;
      varying float vTerrainT;
      float terrainSandW() { return 1.0 - smoothstep( 0.0, 0.32, vTerrainT ); }
      float terrainRockW() { return smoothstep( 0.58, 0.85, vTerrainT ); }
    `;

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `${blendDecl}\n#include <common>`)
      .replace(
        "#include <map_fragment>",
        `
        vec4 sandColor = texture2D( sandMap, vMapUv );
        vec4 grassColor = texture2D( map, vMapUv );
        vec4 rockColor = texture2D( rockMap, vMapUv );
        vec4 blendedColor = mix( grassColor, sandColor, terrainSandW() );
        blendedColor = mix( blendedColor, rockColor, terrainRockW() );
        diffuseColor *= blendedColor;
        `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `
        float roughnessFactor = roughness;
        vec4 sandR = texture2D( sandRoughnessMap, vMapUv );
        vec4 grassR = texture2D( roughnessMap, vMapUv );
        vec4 rockR = texture2D( rockRoughnessMap, vMapUv );
        vec4 blendedRough = mix( grassR, sandR, terrainSandW() );
        blendedRough = mix( blendedRough, rockR, terrainRockW() );
        roughnessFactor *= blendedRough.g;
        `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `
        vec4 sandN = texture2D( sandNormalMap, vMapUv );
        vec4 grassN = texture2D( normalMap, vMapUv );
        vec4 rockN = texture2D( rockNormalMap, vMapUv );
        vec4 blendedN = mix( grassN, sandN, terrainSandW() );
        blendedN = mix( blendedN, rockN, terrainRockW() );
        vec3 mapN = blendedN.xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );
        `,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
