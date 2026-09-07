import * as THREE from "three";
import { getClimateAt, getHeightAt, isUnderwater, TERRAIN_SIZE } from "./terrain";
import type { ResourceType } from "./inventory";
import { loadNatureAssets, pickClone } from "./natureAssets";
import type { NatureAssets } from "./natureAssets";

export interface ResourceNode {
  mesh: THREE.Object3D;
  type: ResourceType;
  hp: number;
  maxHp: number;
  respawnAt: number | null;
  position: THREE.Vector3;
}

const RESPAWN_SECONDS = 30;

export class ResourceWorld {
  readonly nodes: ResourceNode[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, treeCount = 95, rockCount = 45) {
    this.scene = scene;

    // Vrais modèles 3D bas-poly (Kenney Nature Kit, CC0) : chargés une fois, puis clonés par instance.
    loadNatureAssets().then((assets) => {
      for (let i = 0; i < treeCount; i++) this.spawnTree(assets);
      for (let i = 0; i < rockCount; i++) this.spawnRock(assets);
    });
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

  private spawnTree(assets: NatureAssets) {
    const position = this.randomGroundPoint();
    const climate = getClimateAt(position.x, position.z);
    const pool = climate < -0.32 ? assets.coldTrees : climate > 0.32 ? assets.hotTrees : assets.temperateTrees;
    const mesh = pickClone(pool);
    mesh.position.copy(position);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.scale.setScalar(1.8 + Math.random() * 1.0);
    this.scene.add(mesh);
    this.nodes.push({ mesh, type: "bois", hp: 30, maxHp: 30, respawnAt: null, position });
  }

  private spawnRock(assets: NatureAssets) {
    const position = this.randomGroundPoint();
    const mesh = pickClone(assets.rocks);
    mesh.position.copy(position);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.scale.setScalar(0.8 + Math.random() * 0.8);
    this.scene.add(mesh);
    this.nodes.push({ mesh, type: "pierre", hp: 20, maxHp: 20, respawnAt: null, position });
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
