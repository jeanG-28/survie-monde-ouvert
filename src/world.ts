import * as THREE from "three";
import { getHeightAt, TERRAIN_SIZE } from "./terrain";
import type { ResourceType } from "./inventory";

export interface ResourceNode {
  mesh: THREE.Object3D;
  type: ResourceType;
  hp: number;
  maxHp: number;
  respawnAt: number | null;
  position: THREE.Vector3;
}

function createTree(): THREE.Object3D {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.22, 1.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 }),
  );
  trunk.position.y = 0.8;
  group.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e5c2a, roughness: 1 }),
  );
  leaves.position.y = 2.4;
  group.add(leaves);
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
}

function createRock(): THREE.Object3D {
  const rock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1, flatShading: true }),
  );
  rock.scale.set(1, 0.7, 1);
  rock.castShadow = true;
  return rock;
}

const RESPAWN_SECONDS = 30;

export class ResourceWorld {
  readonly nodes: ResourceNode[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, treeCount = 60, rockCount = 40) {
    this.scene = scene;
    for (let i = 0; i < treeCount; i++) this.spawnNode("bois", createTree, 30);
    for (let i = 0; i < rockCount; i++) this.spawnNode("pierre", createRock, 20);
  }

  private randomGroundPoint(): THREE.Vector3 {
    const margin = 8;
    const x = (Math.random() - 0.5) * (TERRAIN_SIZE - margin * 2);
    const z = (Math.random() - 0.5) * (TERRAIN_SIZE - margin * 2);
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
