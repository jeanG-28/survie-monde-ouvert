import * as THREE from "three";
import type { ItemId } from "./inventory";

const WOOD = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
const METAL = new THREE.MeshStandardMaterial({ color: 0xc3c5cc, roughness: 0.28, metalness: 0.75 });
const METAL_EDGE = new THREE.MeshStandardMaterial({ color: 0xe8eaf0, roughness: 0.15, metalness: 0.85 });
const FUR = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
const BINDING = new THREE.MeshStandardMaterial({ color: 0x2e2117, roughness: 0.95 });

/** Enveloppe de corde/cuir à l'endroit où une tête d'outil se fixe sur son manche. */
function addBinding(group: THREE.Group, y: number, radius = 0.028) {
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 5, 10), BINDING);
  wrap.rotation.x = Math.PI / 2;
  wrap.position.y = y;
  group.add(wrap);
}

export function createHeldItemMesh(id: ItemId): THREE.Object3D {
  const group = new THREE.Group();
  if (id === "hache") {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.36, 10), WOOD);
    group.add(handle);

    // Tête en coin (au lieu d'un simple pavé) : silhouette de hache bien plus lisible.
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4, 1), METAL);
    head.rotation.z = Math.PI / 2;
    head.rotation.y = Math.PI / 4;
    head.scale.set(1, 1, 0.32);
    head.position.set(0.1, 0.16, 0);
    group.add(head);

    const edge = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.05, 4, 1), METAL_EDGE);
    edge.rotation.z = Math.PI / 2;
    edge.rotation.y = Math.PI / 4;
    edge.scale.set(1, 1, 0.32);
    edge.position.set(0.16, 0.16, 0);
    group.add(edge);

    addBinding(group, 0.09);
  } else if (id === "pioche") {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.4, 10), WOOD);
    group.add(handle);

    // Deux pointes coniques opposées plutôt qu'un pavé plat, pour une vraie silhouette de pioche.
    for (const side of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.16, 6), METAL);
      spike.position.set(side * 0.1, 0.19, 0);
      spike.rotation.z = side * Math.PI * 0.42;
      group.add(spike);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 6), METAL_EDGE);
      tip.position.set(side * 0.17, 0.19, 0);
      tip.rotation.z = side * Math.PI * 0.42;
      group.add(tip);
    }
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), METAL);
    ferrule.position.y = 0.19;
    group.add(ferrule);
    addBinding(group, 0.1);
  } else if (id === "arc") {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 8, 16, Math.PI * 1.3), WOOD);
    bow.rotation.z = Math.PI * 0.35;
    group.add(bow);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), BINDING);
    grip.position.set(0.02, 0, 0);
    group.add(grip);
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.5 });
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.44, 5), stringMat);
    string.position.x = 0.02;
    group.add(string);
  } else if (id === "manteau") {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 8, 14), FUR);
    group.add(collar);
  } else {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 8), WOOD);
    group.add(handle);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), METAL);
    guard.position.y = 0.065;
    group.add(guard);
    // Lame effilée (extrusion d'une forme triangulaire) plutôt qu'un pavé uniforme.
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.022, 0);
    bladeShape.lineTo(0.022, 0);
    bladeShape.lineTo(0.022, 0.28);
    bladeShape.lineTo(0, 0.36);
    bladeShape.lineTo(-0.022, 0.28);
    bladeShape.closePath();
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }), METAL_EDGE);
    blade.position.set(0, 0.07, -0.005);
    group.add(blade);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  group.rotation.x = Math.PI / 2.2;
  return group;
}
