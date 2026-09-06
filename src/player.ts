import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/Soldier.glb";
const TARGET_HEIGHT = 1.8;

function findHandBone(root: THREE.Object3D): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  // Cherche un os "main droite" (ex. mixamorig:RightHand) sans ses doigts (RightHandThumb1, ...).
  root.traverse((obj) => {
    if (found) return;
    const name = obj.name.toLowerCase();
    if ((obj as THREE.Bone).isBone && name.includes("right") && name.includes("hand") && !/thumb|index|middle|ring|pinky/.test(name)) {
      found = obj;
    }
  });
  if (!found) {
    // À défaut, n'importe quel os "main droite", doigts inclus.
    root.traverse((obj) => {
      if (found) return;
      const name = obj.name.toLowerCase();
      if ((obj as THREE.Bone).isBone && name.includes("right") && name.includes("hand")) found = obj;
    });
  }
  return found;
}

function findClip(animations: THREE.AnimationClip[], name: string): THREE.AnimationClip | null {
  return animations.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
}

export class Player {
  readonly root = new THREE.Group();
  readonly rightHand: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer | null;
  private readonly idleAction: THREE.AnimationAction | null;
  private readonly walkAction: THREE.AnimationAction | null;
  private walkWeight = 0;

  position = new THREE.Vector3(0, 0, 0);
  yaw = 0;
  velocityY = 0;
  onGround = true;
  readonly height = TARGET_HEIGHT;
  readonly moveSpeed = 4.2;

  private constructor(
    modelRoot: THREE.Object3D,
    mixer: THREE.AnimationMixer | null,
    idleAction: THREE.AnimationAction | null,
    walkAction: THREE.AnimationAction | null,
    rightHand: THREE.Object3D | null,
  ) {
    this.root.add(modelRoot);
    this.mixer = mixer;
    this.idleAction = idleAction;
    this.walkAction = walkAction;
    this.rightHand = rightHand ?? this.root;
  }

  static async load(): Promise<Player> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(MODEL_URL);
    const model = gltf.scene;

    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Le modèle Soldier.glb regarde par défaut vers l'avant de sa propre base (+Z),
    // à l'opposé de notre convention de déplacement : on le retourne une fois pour toutes.
    model.rotation.y = Math.PI;

    // Le modèle source n'a pas forcément une hauteur de 1.8m : on le redimensionne.
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    model.scale.setScalar(scale);

    // Recale le modèle pour que son origine soit au niveau des pieds (y=0).
    const box2 = new THREE.Box3().setFromObject(model);
    model.position.y -= box2.min.y;

    let mixer: THREE.AnimationMixer | null = null;
    let idleAction: THREE.AnimationAction | null = null;
    let walkAction: THREE.AnimationAction | null = null;

    const idleClip = findClip(gltf.animations, "Idle");
    const walkClip = findClip(gltf.animations, "Walk");
    if (idleClip || walkClip) {
      mixer = new THREE.AnimationMixer(model);
      if (idleClip) {
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
      }
      if (walkClip) {
        walkAction = mixer.clipAction(walkClip);
        walkAction.play();
        walkAction.setEffectiveWeight(0);
      }
    }

    const rightHand = findHandBone(model);

    return new Player(model, mixer, idleAction, walkAction, rightHand);
  }

  /** Fondu enchaîné progressif entre l'animation d'immobilité et celle de marche. */
  animateWalk(isMoving: boolean, dt: number) {
    if (!this.walkAction) return;
    const target = isMoving ? 1 : 0;
    this.walkWeight = THREE.MathUtils.damp(this.walkWeight, target, 8, dt);
    this.walkAction.setEffectiveWeight(this.walkWeight);
    this.idleAction?.setEffectiveWeight(1 - this.walkWeight);
  }

  update(dt: number) {
    this.mixer?.update(dt);
  }

  syncTransform() {
    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
  }
}
