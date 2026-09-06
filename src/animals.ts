import * as THREE from "three";
import { getHeightAt, isUnderwater, TERRAIN_SIZE } from "./terrain";

export type Species = "lapin" | "cerf";

export interface AnimalNode {
  group: THREE.Group;
  species: Species;
  hp: number;
  maxHp: number;
  loot: { viande: number; fourrure: number };
  home: THREE.Vector2;
  target: THREE.Vector2;
  phase: number;
  speed: number;
  wanderRadius: number;
  respawnAt: number | null;
  position: THREE.Vector3;
}

function randomGroundPoint(half: number): THREE.Vector2 {
  let x = 0;
  let z = 0;
  do {
    x = (Math.random() - 0.5) * 2 * half;
    z = (Math.random() - 0.5) * 2 * half;
  } while (isUnderwater(x, z));
  return new THREE.Vector2(x, z);
}

function createRabbitMesh(): THREE.Group {
  const group = new THREE.Group();
  const furColor = new THREE.Color(0x8a7358).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
  const mat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.95 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.12, 3, 6), mat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.11;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat);
  head.position.set(0.14, 0.16, 0);
  group.add(head);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 6), mat);
    ear.position.set(0.15, 0.25, side * 0.03);
    ear.rotation.z = -0.3;
    group.add(ear);
  }

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), mat);
  tail.position.set(-0.15, 0.14, 0);
  group.add(tail);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
}

function createDeerMesh(): THREE.Group {
  const group = new THREE.Group();
  const furColor = new THREE.Color(0x7a5a3a).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
  const mat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), mat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.55;
  group.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.35, 6), mat);
  neck.position.set(0.32, 0.72, 0);
  neck.rotation.z = -0.6;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat);
  head.position.set(0.48, 0.92, 0);
  group.add(head);

  const antlerMat = new THREE.MeshStandardMaterial({ color: 0x5c4a38, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const antler = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 5), antlerMat);
    antler.position.set(0.5, 1.08, side * 0.05);
    antler.rotation.z = -0.2;
    group.add(antler);
  }

  for (const [sx, sz] of [
    [0.18, 0.14],
    [0.18, -0.14],
    [-0.18, 0.14],
    [-0.18, -0.14],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.55, 6), mat);
    leg.position.set(sx, 0.28, sz);
    group.add(leg);
  }

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mat);
  tail.position.set(-0.32, 0.62, 0);
  group.add(tail);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
}

const RESPAWN_SECONDS = 45;

export class AnimalWorld {
  readonly nodes: AnimalNode[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, rabbitCount = 14, deerCount = 6) {
    this.scene = scene;
    for (let i = 0; i < rabbitCount; i++) this.spawn("lapin");
    for (let i = 0; i < deerCount; i++) this.spawn("cerf");
  }

  private spawn(species: Species) {
    const half = TERRAIN_SIZE / 2 - 10;
    const home = randomGroundPoint(half);
    const group = species === "lapin" ? createRabbitMesh() : createDeerMesh();
    const position = new THREE.Vector3(home.x, getHeightAt(home.x, home.y), home.y);
    group.position.copy(position);
    this.scene.add(group);

    const node: AnimalNode = {
      group,
      species,
      hp: species === "lapin" ? 20 : 60,
      maxHp: species === "lapin" ? 20 : 60,
      loot: species === "lapin" ? { viande: 2, fourrure: 1 } : { viande: 5, fourrure: 3 },
      home,
      target: home.clone(),
      phase: Math.random() * Math.PI * 2,
      speed: species === "lapin" ? 0.5 + Math.random() * 0.3 : 0.9 + Math.random() * 0.4,
      wanderRadius: species === "lapin" ? 4 : 8,
      respawnAt: null,
      position,
    };
    this.nodes.push(node);
  }

  private pickNewTarget(n: AnimalNode) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * n.wanderRadius;
    n.target = new THREE.Vector2(n.home.x + Math.cos(angle) * dist, n.home.y + Math.sin(angle) * dist);
  }

  findNearby(position: THREE.Vector3, maxDist = 2.5): AnimalNode | null {
    let best: AnimalNode | null = null;
    let bestDist = maxDist;
    for (const n of this.nodes) {
      if (n.respawnAt !== null) continue;
      const dist = n.position.distanceTo(position);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }
    return best;
  }

  /** Inflige un coup ; renvoie le butin si l'animal meurt, sinon null. */
  hit(n: AnimalNode, damage = 15): { viande: number; fourrure: number } | null {
    n.hp -= damage;
    if (n.hp <= 0) {
      n.group.visible = false;
      n.respawnAt = performance.now() / 1000 + RESPAWN_SECONDS;
      return n.loot;
    }
    return null;
  }

  update(dt: number, now: number) {
    for (const n of this.nodes) {
      if (n.respawnAt !== null) {
        if (now >= n.respawnAt) {
          n.hp = n.maxHp;
          n.group.visible = true;
          n.respawnAt = null;
          n.home = randomGroundPoint(TERRAIN_SIZE / 2 - 10);
          n.target = n.home.clone();
        }
        continue;
      }

      const pos2 = new THREE.Vector2(n.group.position.x, n.group.position.z);
      const toTarget = n.target.clone().sub(pos2);
      if (toTarget.length() < 0.15) {
        if (Math.random() < 0.01) this.pickNewTarget(n);
      } else {
        n.group.rotation.y = Math.atan2(toTarget.x, toTarget.y);
        toTarget.normalize().multiplyScalar(n.speed * dt);
        pos2.add(toTarget);
      }
      const ground = getHeightAt(pos2.x, pos2.y);
      const bounce = Math.abs(Math.sin(now * (n.species === "lapin" ? 6 : 3) + n.phase)) * (n.species === "lapin" ? 0.06 : 0.03);
      n.group.position.set(pos2.x, ground + bounce, pos2.y);
      n.position.copy(n.group.position);
    }
  }
}
