import * as THREE from "three";
import { getHeightAt, isUnderwater, TERRAIN_SIZE } from "./terrain";
import type { ResourceType } from "./inventory";

export interface ResourceNode {
  mesh: THREE.Object3D;
  type: ResourceType;
  hp: number;
  maxHp: number;
  respawnAt: number | null;
  position: THREE.Vector3;
}

const textureLoader = new THREE.TextureLoader();
const rockDiffuse = textureLoader.load("/textures/rock/diff.jpg");
const rockNormal = textureLoader.load("/textures/rock/nor.jpg");
const rockRoughness = textureLoader.load("/textures/rock/rough.jpg");
rockDiffuse.colorSpace = THREE.SRGBColorSpace;
const rockMaterial = new THREE.MeshStandardMaterial({
  map: rockDiffuse,
  normalMap: rockNormal,
  roughnessMap: rockRoughness,
  roughness: 1,
});

function loadTiledTexture(url: string, repeatX: number, repeatY: number, srgb: boolean): THREE.Texture {
  const tex = textureLoader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const barkMaterial = new THREE.MeshStandardMaterial({
  map: loadTiledTexture("/textures/bark/diff.jpg", 2, 1, true),
  normalMap: loadTiledTexture("/textures/bark/nor.jpg", 2, 1, false),
  roughnessMap: loadTiledTexture("/textures/bark/rough.jpg", 2, 1, false),
  roughness: 1,
});

/** Icosaèdre aux sommets déplacés aléatoirement — sert de base organique (rocher, touffe de feuillage). */
function createJitteredBlob(radius: number, detail: number, jitterAmount: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + (Math.random() - 0.5) * jitterAmount);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function randomLeafMaterial(): THREE.MeshStandardMaterial {
  const leafColor = new THREE.Color(0x2e5c2a).offsetHSL((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
  return new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.9, flatShading: true });
}

/** Conifère : plusieurs étages de cônes décalés. */
function createPineTree(): THREE.Object3D {
  const group = new THREE.Group();
  const trunkHeight = 1.5 + Math.random() * 0.6;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, trunkHeight, 7), barkMaterial);
  trunk.position.y = trunkHeight / 2;
  group.add(trunk);

  const leafMaterial = randomLeafMaterial();
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const radius = THREE.MathUtils.lerp(1.15, 0.3, t);
    const height = THREE.MathUtils.lerp(1.2, 0.85, t);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 9), leafMaterial);
    cone.position.y = trunkHeight + t * 1.05 + height / 2 - 0.2;
    cone.rotation.y = Math.random() * Math.PI;
    cone.castShadow = true;
    group.add(cone);
  }
  return group;
}

/** Feuillu : houppier fait de plusieurs touffes organiques regroupées. */
function createBroadleafTree(): THREE.Object3D {
  const group = new THREE.Group();
  const trunkHeight = 1.3 + Math.random() * 0.7;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.22, trunkHeight, 7), barkMaterial);
  trunk.position.y = trunkHeight / 2;
  group.add(trunk);

  const leafMaterial = randomLeafMaterial();
  const canopyCenter = trunkHeight + 0.6;
  const blobCount = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blobCount; i++) {
    const angle = (i / blobCount) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 0.35 + Math.random() * 0.35;
    const blobRadius = 0.55 + Math.random() * 0.35;
    const blob = new THREE.Mesh(createJitteredBlob(blobRadius, 1, 0.35), leafMaterial);
    blob.position.set(Math.cos(angle) * dist, canopyCenter + (Math.random() - 0.5) * 0.5, Math.sin(angle) * dist);
    blob.castShadow = true;
    group.add(blob);
  }
  // Touffe centrale pour combler le sommet.
  const topBlob = new THREE.Mesh(createJitteredBlob(0.7, 1, 0.3), leafMaterial);
  topBlob.position.y = canopyCenter + 0.5;
  topBlob.castShadow = true;
  group.add(topBlob);

  return group;
}

function createTree(): THREE.Object3D {
  const group = Math.random() < 0.55 ? createPineTree() : createBroadleafTree();
  const scale = 0.85 + Math.random() * 0.4;
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
}

function createRock(): THREE.Object3D {
  const rock = new THREE.Mesh(createJitteredBlob(0.55, 1, 0.3), rockMaterial);
  rock.scale.set(1 + Math.random() * 0.4, 0.55 + Math.random() * 0.3, 1 + Math.random() * 0.4);
  rock.rotation.y = Math.random() * Math.PI * 2;
  rock.castShadow = true;
  return rock;
}

const RESPAWN_SECONDS = 30;

export class ResourceWorld {
  readonly nodes: ResourceNode[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, treeCount = 95, rockCount = 45) {
    this.scene = scene;
    for (let i = 0; i < treeCount; i++) this.spawnNode("bois", createTree, 30);
    for (let i = 0; i < rockCount; i++) this.spawnNode("pierre", createRock, 20);
  }

  private randomGroundPoint(): THREE.Vector3 {
    const margin = 8;
    let x = 0;
    let z = 0;
    do {
      x = (Math.random() - 0.5) * (TERRAIN_SIZE - margin * 2);
      z = (Math.random() - 0.5) * (TERRAIN_SIZE - margin * 2);
    } while (isUnderwater(x, z));
    return new THREE.Vector3(x, getHeightAt(x, z), z);
  }

  private spawnNode(type: ResourceType, factory: () => THREE.Object3D, hp: number) {
    const position = this.randomGroundPoint();
    const mesh = factory();
    mesh.position.copy(position);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.nodes.push({ mesh, type, hp, maxHp: hp, respawnAt: null, position });
  }

  /** Renvoie le nœud de ressource le plus proche à portée d'interaction, ou null. */
  findNearby(position: THREE.Vector3, maxDist = 2.2): ResourceNode | null {
    let best: ResourceNode | null = null;
    let bestDist = maxDist;
    for (const node of this.nodes) {
      if (node.respawnAt !== null) continue;
      const dist = node.position.distanceTo(position);
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  }

  /** Inflige un coup de récolte au nœud ; renvoie true si la ressource a été détruite. */
  hit(node: ResourceNode, damage = 20): boolean {
    node.hp -= damage;
    if (node.hp <= 0) {
      node.mesh.visible = false;
      node.respawnAt = performance.now() / 1000 + RESPAWN_SECONDS;
      return true;
    }
    return false;
  }

  update(nowSeconds: number) {
    for (const node of this.nodes) {
      if (node.respawnAt !== null && nowSeconds >= node.respawnAt) {
        node.hp = node.maxHp;
        node.mesh.visible = true;
        node.respawnAt = null;
      }
    }
  }
}
