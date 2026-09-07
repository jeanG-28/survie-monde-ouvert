import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const COLD_TREE_NAMES = ["tree_pineTallA", "tree_pineTallB", "tree_pineTallC", "tree_pineTallD", "tree_pineSmallA", "tree_pineSmallB"];
const HOT_TREE_NAMES = ["tree_palmBend", "tree_palmTall", "tree_palmShort"];
const TEMPERATE_TREE_NAMES = ["tree_default", "tree_oak", "tree_fat", "tree_detailed_fall"];
const ROCK_NAMES = ["rock_largeA", "rock_largeC", "rock_largeE", "rock_tallB", "rock_smallA", "rock_smallD"];
const BUSH_NAMES = ["plant_bush", "plant_bushDetailed", "plant_bushLarge"];
const FLOWER_NAMES = [
  "flower_purpleA",
  "flower_purpleB",
  "flower_purpleC",
  "flower_redA",
  "flower_redB",
  "flower_redC",
  "flower_yellowA",
  "flower_yellowB",
  "flower_yellowC",
];
const MUSHROOM_NAMES = ["mushroom_red", "mushroom_tan"];
const STUMP_NAMES = ["stump_round"];

export interface NatureAssets {
  coldTrees: THREE.Object3D[];
  hotTrees: THREE.Object3D[];
  temperateTrees: THREE.Object3D[];
  rocks: THREE.Object3D[];
  bushes: THREE.Object3D[];
  flowers: THREE.Object3D[];
  mushrooms: THREE.Object3D[];
  stumps: THREE.Object3D[];
}

let cached: Promise<NatureAssets> | null = null;

// Le kit d'origine utilise un vert-cyan très stylisé pour la plupart des feuillages ;
// on le recolore vers un vert forêt plus naturel (sans toucher aux teintes d'automne).
const NATURAL_GREEN = new THREE.Color(0x3f7a30);

function loadOne(loader: GLTFLoader, name: string): Promise<THREE.Object3D> {
  return loader.loadAsync(`/models/nature/${name}.glb`).then((gltf) => {
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mat = o.material as THREE.MeshStandardMaterial;
        if (mat && (mat.name === "leafsDark" || mat.name === "leafsGreen")) {
          mat.color.copy(NATURAL_GREEN).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.08);
        }
      }
    });
    return gltf.scene;
  });
}

/** Charge une seule fois le "Nature Kit" (Kenney, CC0) : vrais modèles bas-poly pour arbres, rochers, buissons, fleurs... */
export function loadNatureAssets(): Promise<NatureAssets> {
  if (cached) return cached;
  const loader = new GLTFLoader();
  cached = Promise.all([
    Promise.all(COLD_TREE_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(HOT_TREE_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(TEMPERATE_TREE_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(ROCK_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(BUSH_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(FLOWER_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(MUSHROOM_NAMES.map((n) => loadOne(loader, n))),
    Promise.all(STUMP_NAMES.map((n) => loadOne(loader, n))),
  ]).then(([coldTrees, hotTrees, temperateTrees, rocks, bushes, flowers, mushrooms, stumps]) => ({
    coldTrees,
    hotTrees,
    temperateTrees,
    rocks,
    bushes,
    flowers,
    mushrooms,
    stumps,
  }));
  return cached;
}

/** Clone aléatoire (transform indépendant, géométrie/matériaux partagés) depuis une liste de gabarits. */
export function pickClone(list: THREE.Object3D[]): THREE.Object3D {
  return list[Math.floor(Math.random() * list.length)].clone();
}
