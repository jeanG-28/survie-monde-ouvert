import * as THREE from "three";
import type { ItemId } from "./inventory";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
const METAL = new THREE.MeshStandardMaterial({ color: 0xb8b8bc, roughness: 0.4, metalness: 0.6 });
const FUR = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });

export function createHeldItemMesh(id: ItemId): THREE.Object3D {
  const group = new THREE.Group();
  if (id === "hache") {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), WOOD);
    group.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.03), METAL);
    head.position.set(0.06, 0.16, 0);
    group.add(head);
  } else if (id === "pioche") {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6), WOOD);
    group.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), METAL);
    head.position.y = 0.18;
    group.add(head);
  } else if (id === "arc") {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 12, Math.PI * 1.3), WOOD);
    bow.rotation.z = Math.PI * 0.35;
    group.add(bow);
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 });
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.44, 4), stringMat);
    string.position.x = 0.02;
    group.add(string);
  } else if (id === "manteau") {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 10), FUR);
    group.add(collar);
  } else {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6), WOOD);
    group.add(handle);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.4, 0.012), METAL);
    blade.position.y = 0.26;
    group.add(blade);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  group.rotation.x = Math.PI / 2.2;
  return group;
}
