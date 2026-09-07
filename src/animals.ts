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

const EYE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.3 });
const HOOF_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.7 });

function createRabbitMesh(): THREE.Group {
  const group = new THREE.Group();
  const furColor = new THREE.Color(0x8a7358).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
  const mat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.95 });
  const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xc9a9a0, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.12, 5, 12), mat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.11;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat);
  head.position.set(0.14, 0.16, 0);
  group.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), HOOF_MATERIAL);
  nose.position.set(0.21, 0.15, 0);
  group.add(nose);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), EYE_MATERIAL);
    eye.position.set(0.18, 0.18, side * 0.055);
    group.add(eye);

    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), mat);
    ear.position.set(0.15, 0.26, side * 0.03);
    ear.rotation.z = -0.3;
    group.add(ear);

    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 6), innerEarMat);
    earInner.position.set(0.16, 0.25, side * 0.03);
    earInner.rotation.z = -0.3;
    group.add(earInner);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), mat);
    paw.position.set(0.06, 0.03, side * 0.05);
    group.add(paw);
  }

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), mat);
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
  const bellyMat = new THREE.MeshStandardMaterial({ color: furColor.clone().offsetHSL(0, -0.15, 0.18), roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), mat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.55;
  group.add(body);

  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 4, 8), bellyMat);
  belly.rotation.z = Math.PI / 2;
  belly.position.set(0, 0.44, 0);
  belly.scale.y = 0.7;
  group.add(belly);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.35, 10), mat);
  neck.position.set(0.32, 0.72, 0);
  neck.rotation.z = -0.6;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), mat);
  head.position.set(0.48, 0.92, 0);
  group.add(head);

  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.08, 4, 8), mat);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(0.6, 0.88, 0);
  group.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), HOOF_MATERIAL);
  nose.position.set(0.65, 0.87, 0);
  group.add(nose);

  const antlerMat = new THREE.MeshStandardMaterial({ color: 0x5c4a38, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), EYE_MATERIAL);
    eye.position.set(0.55, 0.95, side * 0.1);
    group.add(eye);

    const earMesh = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), mat);
    earMesh.position.set(0.44, 1.0, side * 0.08);
    earMesh.rotation.z = -0.3;
    earMesh.rotation.x = side * 0.4;
    group.add(earMesh);

    const antlerBase = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.22, 6), antlerMat);
    antlerBase.position.set(0.5, 1.08, side * 0.05);
    antlerBase.rotation.z = -0.2;
    group.add(antlerBase);

    const antlerTine = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.11, 5), antlerMat);
    antlerTine.position.set(0.53, 1.16, side * 0.09);
    antlerTine.rotation.z = -0.6;
    antlerTine.rotation.y = side * 0.3;
    group.add(antlerTine);
  }

  for (const [sx, sz] of [
    [0.18, 0.14],
    [0.18, -0.14],
    [-0.18, 0.14],
    [-0.18, -0.14],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.5, 8), mat);
    leg.position.set(sx, 0.3, sz);
    group.add(leg);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.08, 8), HOOF_MATERIAL);
    hoof.position.set(sx, 0.045, sz);
    group.add(hoof);
  }

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat);
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
