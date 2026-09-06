import * as THREE from "three";
import { getHeightAt } from "./terrain";
import { Inventory } from "./inventory";
import type { BuildPieceType } from "./inventory";

const GRID = 2;

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

function createGhost(type: BuildPieceType): THREE.Mesh {
  const geometry =
    type === "fondation"
      ? new THREE.BoxGeometry(GRID, 0.2, GRID)
      : new THREE.BoxGeometry(GRID, 2, 0.15);
  const material = new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

function createPiece(type: BuildPieceType): THREE.Mesh {
  const geometry =
    type === "fondation"
      ? new THREE.BoxGeometry(GRID, 0.2, GRID)
      : new THREE.BoxGeometry(GRID, 2, 0.15);
  const material = new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.8 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class BuildingSystem {
  active = false;
  private currentType: BuildPieceType = "fondation";
  private ghost: THREE.Mesh;
  private scene: THREE.Scene;
  private inventory: Inventory;
  readonly placed: THREE.Object3D[] = [];

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
    this.currentType = this.currentType === "fondation" ? "mur" : "fondation";
    this.scene.remove(this.ghost);
    this.ghost = createGhost(this.currentType);
    this.ghost.visible = this.active;
    this.scene.add(this.ghost);
  }

  get typeLabel(): string {
    return this.currentType === "fondation" ? "Fondation" : "Mur";
  }

  /** Met à jour la position du fantôme de construction vers le point visé au sol. */
  updateGhost(groundPoint: THREE.Vector3 | null) {
    if (!this.active || !groundPoint) return;
    const x = snap(groundPoint.x);
    const z = snap(groundPoint.z);
    const y = getHeightAt(x, z);
    this.ghost.position.set(x, this.currentType === "fondation" ? y + 0.1 : y + 1, z);
  }

  place(): boolean {
    if (!this.active) return false;
    if (!this.inventory.buildPiece(this.currentType)) return false;
    const piece = createPiece(this.currentType);
    piece.position.copy(this.ghost.position);
    this.scene.add(piece);
    this.placed.push(piece);
    return true;
  }
}
