import * as THREE from "three";
import { getHeightAt } from "./terrain";
import { Inventory } from "./inventory";
import type { BuildPieceType } from "./inventory";

const GRID = 2;
const TYPES: BuildPieceType[] = ["fondation", "mur", "etabli"];

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

function buildWorkbenchGroup(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.8), material);
  top.position.y = 0.8;
  group.add(top);
  for (const [sx, sz] of [
    [0.6, 0.32],
    [0.6, -0.32],
    [-0.6, 0.32],
    [-0.6, -0.32],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), material);
    leg.position.set(sx, 0.4, sz);
    group.add(leg);
  }
  const vice = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.15), material);
  vice.position.set(0.5, 0.92, 0);
  group.add(vice);
  return group;
}

function createGhost(type: BuildPieceType): THREE.Object3D {
  const material = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.5 });
  if (type === "etabli") return buildWorkbenchGroup(material);
  const geometry =
    type === "fondation" ? new THREE.BoxGeometry(GRID, 0.2, GRID) : new THREE.BoxGeometry(GRID, 2, 0.15);
  return new THREE.Mesh(geometry, material);
}

function createPiece(type: BuildPieceType): THREE.Object3D {
  const material = new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.8 });
  let object: THREE.Object3D;
  if (type === "etabli") {
    object = buildWorkbenchGroup(material);
  } else {
    const geometry =
      type === "fondation" ? new THREE.BoxGeometry(GRID, 0.2, GRID) : new THREE.BoxGeometry(GRID, 2, 0.15);
    object = new THREE.Mesh(geometry, material);
  }
  object.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return object;
}

export class BuildingSystem {
  active = false;
  private currentType: BuildPieceType = "fondation";
  private ghost: THREE.Object3D;
  private scene: THREE.Scene;
  private inventory: Inventory;
  readonly placed: THREE.Object3D[] = [];
  readonly workbenchPositions: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene, inventory: Inventory) {
    this.scene = scene;
    this.inventory = inventory;
    this.ghost = createGhost(this.currentType);
    this.ghost.visible = false;
    scene.add(this.ghost);
  }

  toggle() {
    this.active = !this.active;
    this.ghost.visible = this.active;
  }

  cycleType() {
    const i = TYPES.indexOf(this.currentType);
    this.currentType = TYPES[(i + 1) % TYPES.length];
    this.scene.remove(this.ghost);
    this.ghost = createGhost(this.currentType);
    this.ghost.visible = this.active;
    this.scene.add(this.ghost);
  }

  get typeLabel(): string {
    if (this.currentType === "fondation") return "Fondation";
    if (this.currentType === "mur") return "Mur";
    return "Établi";
  }

  /** Ajoute un établi de départ près d'un point donné, sans coût ni fantôme. */
  placeStarterWorkbench(position: THREE.Vector3) {
    const piece = createPiece("etabli");
    piece.position.copy(position);
    this.scene.add(piece);
    this.workbenchPositions.push(position.clone());
  }

  /** Met à jour la position du fantôme de construction vers le point visé au sol. */
  updateGhost(groundPoint: THREE.Vector3 | null) {
    if (!this.active || !groundPoint) return;
    const x = snap(groundPoint.x);
    const z = snap(groundPoint.z);
    const y = getHeightAt(x, z);
    this.ghost.position.set(x, this.currentType === "fondation" || this.currentType === "etabli" ? y : y + 1, z);
  }

  place(): boolean {
    if (!this.active) return false;
    if (!this.inventory.buildPiece(this.currentType)) return false;
    const piece = createPiece(this.currentType);
    piece.position.copy(this.ghost.position);
    this.scene.add(piece);
    this.placed.push(piece);
    if (this.currentType === "etabli") this.workbenchPositions.push(piece.position.clone());
    return true;
  }
}
