import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/CesiumMan.glb";
const TARGET_HEIGHT = 1.8;

function findHandBone(root: THREE.Object3D): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found) return;
    if ((obj as THREE.Bone).isBone && /hand.*r|r.*hand|hand_r|r_hand/i.test(obj.name)) {
      found = obj;
    }
  });
  if (!found) {
    // À défaut, on prend n'importe quel os contenant "hand" dans son nom.
    root.traverse((obj) => {
      if (found) return;
      if ((obj as THREE.Bone).isBone && /hand/i.test(obj.name)) found = obj;
    });
  }
  return found;
}

export class Player {
  readonly root = new THREE.Group();
  readonly rightHand: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer | null;
  private readonly walkAction: THREE.AnimationAction | null;

  position = new THREE.Vector3(0, 0, 0);
  yaw = 0;
  velocityY = 0;
  onGround = true;
  readonly height = TARGET_HEIGHT;
  readonly moveSpeed = 4.2;

  private constructor(
    modelRoot: THREE.Object3D,
    mixer: THREE.AnimationMixer | null,
    walkAction: THREE.AnimationAction | null,
    rightHand: THREE.Object3D | null,
  ) {
    this.root.add(modelRoot);
    this.mixer = mixer;
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
    let walkAction: THREE.AnimationAction | null = null;
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      walkAction = mixer.clipAction(gltf.animations[0]);
      walkAction.play();
      walkAction.paused = true;
    }

    const rightHand = findHandBone(model);

    return new Player(model, mixer, walkAction, rightHand);
  }

  /** Anime la marche via le clip d'animation du modèle, mis en pause à l'arrêt. */
  animateWalk(isMoving: boolean, _dt: number) {
    if (this.walkAction) this.walkAction.paused = !isMoving;
  }

  update(dt: number) {
    this.mixer?.update(dt);
  }

  syncTransform() {
    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
  }
}
