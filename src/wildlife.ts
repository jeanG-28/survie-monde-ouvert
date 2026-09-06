import * as THREE from "three";
import { getHeightAt, isUnderwater, TERRAIN_SIZE } from "./terrain";

type Updatable = { update: (dt: number, now: number) => void };

function randomGroundPoint(half: number): THREE.Vector2 {
  let x = 0;
  let z = 0;
  do {
    x = (Math.random() - 0.5) * 2 * half;
    z = (Math.random() - 0.5) * 2 * half;
  } while (isUnderwater(x, z));
  return new THREE.Vector2(x, z);
}

// --- Oiseaux : forme basse-poly, volent en boucle autour d'un centre, battement d'ailes. ---
function createBird(): { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh } {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingGeo = new THREE.PlaneGeometry(0.18, 0.06);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.9, side: THREE.DoubleSide });
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.09, 0, 0);
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.09, 0, 0);
  group.add(wingL, wingR);

  return { group, wingL, wingR };
}

function createBirds(scene: THREE.Scene, count: number): Updatable {
  const birds: { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; center: THREE.Vector2; radius: number; height: number; speed: number; phase: number }[] = [];
  const half = TERRAIN_SIZE / 2 - 15;

  for (let i = 0; i < count; i++) {
    const { group, wingL, wingR } = createBird();
    const center = randomGroundPoint(half);
    const radius = 6 + Math.random() * 10;
    const height = 9 + Math.random() * 10;
    const speed = 0.25 + Math.random() * 0.2;
    const phase = Math.random() * Math.PI * 2;
    scene.add(group);
    birds.push({ group, wingL, wingR, center, radius, height, speed, phase });
  }

  function update(_dt: number, now: number) {
    for (const b of birds) {
      const angle = now * b.speed + b.phase;
      const x = b.center.x + Math.cos(angle) * b.radius;
      const z = b.center.y + Math.sin(angle) * b.radius;
      b.group.position.set(x, b.height, z);
      b.group.rotation.y = -angle + Math.PI / 2;
      const flap = Math.sin(now * 14 + b.phase) * 0.9;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    }
  }

  return { update };
}

// --- Papillons : ailes plates texturées façon découpe, vol erratique près du sol. ---
function createButterflyTexture(hue: number): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
  ctx.beginPath();
  ctx.ellipse(20, 16, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsl(${hue}, 80%, 30%)`;
  ctx.beginPath();
  ctx.ellipse(20, 16, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createButterflies(scene: THREE.Scene, count: number): Updatable {
  const flies: { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; center: THREE.Vector2; phase: number; seed: number }[] = [];
  const half = TERRAIN_SIZE / 2 - 10;

  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      map: createButterflyTexture(Math.random() * 360),
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    const wingGeo = new THREE.PlaneGeometry(0.14, 0.14);
    wingGeo.translate(0.07, 0, 0);
    const wingL = new THREE.Mesh(wingGeo, material);
    const wingR = new THREE.Mesh(wingGeo, material);
    wingR.scale.x = -1;
    group.add(wingL, wingR);

    const center = randomGroundPoint(half);
    scene.add(group);
    flies.push({ group, wingL, wingR, center, phase: Math.random() * Math.PI * 2, seed: Math.random() * 100 });
  }

  function update(_dt: number, now: number) {
    for (const f of flies) {
      const t = now * 0.4 + f.seed;
      const x = f.center.x + Math.sin(t) * 3 + Math.sin(t * 2.3) * 1.2;
      const z = f.center.y + Math.cos(t * 0.8) * 3 + Math.cos(t * 1.7) * 1.2;
      const y = getHeightAt(x, z) + 0.6 + Math.sin(t * 3) * 0.25;
      f.group.position.set(x, y, z);
      f.group.rotation.y = t;
      const flap = Math.sin(now * 18 + f.phase) * 1.1 + 1.1;
      f.wingL.rotation.y = flap;
      f.wingR.rotation.y = -flap;
    }
  }

  return { update };
}

// --- Petits mammifères (lapins) : forme procédurale, sautillent dans un territoire restreint. ---
function createRabbit(): THREE.Group {
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

function createRabbits(scene: THREE.Scene, count: number): Updatable {
  const half = TERRAIN_SIZE / 2 - 10;
  const rabbits: { group: THREE.Group; home: THREE.Vector2; target: THREE.Vector2; phase: number; speed: number }[] = [];

  for (let i = 0; i < count; i++) {
    const group = createRabbit();
    const home = randomGroundPoint(half);
    scene.add(group);
    rabbits.push({ group, home, target: home.clone(), phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.3 });
  }

  function pickNewTarget(r: (typeof rabbits)[number]) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 4;
    r.target = new THREE.Vector2(r.home.x + Math.cos(angle) * dist, r.home.y + Math.sin(angle) * dist);
  }

  function update(dt: number, now: number) {
    for (const r of rabbits) {
      const pos2 = new THREE.Vector2(r.group.position.x, r.group.position.z);
      const toTarget = r.target.clone().sub(pos2);
      if (toTarget.length() < 0.15) {
        if (Math.random() < 0.01) pickNewTarget(r);
      } else {
        r.group.rotation.y = Math.atan2(toTarget.x, toTarget.y);
        toTarget.normalize().multiplyScalar(r.speed * dt);
        pos2.add(toTarget);
      }
      const ground = getHeightAt(pos2.x, pos2.y);
      const hop = Math.abs(Math.sin(now * 6 + r.phase)) * 0.06;
      r.group.position.set(pos2.x, ground + hop, pos2.y);
    }
  }

  return { update };
}

export function createWildlife(scene: THREE.Scene) {
  const birds = createBirds(scene, 7);
  const butterflies = createButterflies(scene, 18);
  const rabbits = createRabbits(scene, 8);

  return {
    update(dt: number, now: number) {
      birds.update(dt, now);
      butterflies.update(dt, now);
      rabbits.update(dt, now);
    },
  };
}
