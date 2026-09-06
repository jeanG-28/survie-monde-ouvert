import * as THREE from "three";

const SKIN = 0xd8a878;
const SHIRT = 0x3b5f8a;
const PANTS = 0x33322e;

/** Construit un personnage aux proportions humaines réalistes à partir de primitives. */
function buildHumanoid(): { group: THREE.Group; rightHand: THREE.Object3D; leftLeg: THREE.Object3D; rightLeg: THREE.Object3D } {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.9 });

  // Proportions (mètres), hauteur totale ~1.8m, hanche = origine du groupe (y=0).
  const hipY = 0.9;
  const torsoHeight = 0.55;
  const headRadius = 0.13;

  // Torse (capsule) : du bassin aux épaules.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, torsoHeight - 0.38, 4, 8), shirtMat);
  torso.position.y = hipY + torsoHeight / 2;
  group.add(torso);

  // Bassin.
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.05, 4, 8), pantsMat);
  pelvis.position.y = hipY;
  group.add(pelvis);

  // Tête + cou.
  const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 16, 16), skinMat);
  head.position.y = hipY + torsoHeight + headRadius + 0.05;
  group.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinMat);
  neck.position.y = hipY + torsoHeight + 0.05;
  group.add(neck);

  // Bras (épaule -> main), un pivot par épaule pour pouvoir animer/attacher un objet en main.
  function buildArm(side: 1 | -1): { pivot: THREE.Group; hand: THREE.Object3D } {
    const pivot = new THREE.Group();
    pivot.position.set(0.26 * side, hipY + torsoHeight - 0.05, 0);
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), skinMat);
    upperArm.position.y = -0.19;
    pivot.add(upperArm);
    const hand = new THREE.Object3D();
    hand.position.y = -0.38;
    pivot.add(hand);
    return { pivot, hand };
  }
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  group.add(leftArm.pivot, rightArm.pivot);

  // Jambes (hanche -> pied), un pivot par hanche pour l'animation de marche.
  function buildLeg(side: 1 | -1): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(0.1 * side, hipY - 0.05, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 4, 8), pantsMat);
    leg.position.y = -0.35;
    pivot.add(leg);
    return pivot;
  }
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  group.add(leftLeg, rightLeg);

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true;
  });

  return { group, rightHand: rightArm.hand, leftLeg, rightLeg };
}

export class Player {
  readonly root = new THREE.Group();
  readonly rightHand: THREE.Object3D;
  private readonly leftLeg: THREE.Object3D;
  private readonly rightLeg: THREE.Object3D;

  position = new THREE.Vector3(0, 0, 0);
  yaw = 0;
  velocityY = 0;
  onGround = true;
  readonly height = 1.8;
  readonly moveSpeed = 4.2;

  private walkCycle = 0;

  constructor() {
    const { group, rightHand, leftLeg, rightLeg } = buildHumanoid();
    this.root.add(group);
    this.rightHand = rightHand;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
  }

  /** Anime la marche (balancement des jambes) selon la vitesse de déplacement. */
  animateWalk(isMoving: boolean, dt: number) {
    if (isMoving) {
      this.walkCycle += dt * 8;
      const swing = Math.sin(this.walkCycle) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
    } else {
      this.walkCycle = 0;
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, dt * 10);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, dt * 10);
    }
  }

  syncTransform() {
    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
  }
}
