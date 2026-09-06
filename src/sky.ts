import * as THREE from "three";

const SKY_TOP = new THREE.Color(0x2f6fb8);
const SKY_HORIZON = new THREE.Color(0xbcdcf0);
const FOG_COLOR = new THREE.Color(0xcfe6f4);

/** Ciel en dégradé (dôme shader) + brouillard assorti, plus un disque de soleil visible. */
export function createSky(scene: THREE.Scene): { setSunPosition: (pos: THREE.Vector3) => void } {
  scene.fog = new THREE.Fog(FOG_COLOR.getHex(), 45, 130);

  const geometry = new THREE.SphereGeometry(280, 32, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: SKY_TOP },
      bottomColor: { value: SKY_HORIZON },
      offset: { value: 15 },
      exponent: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(geometry, material);
  scene.add(dome);

  const sunGeometry = new THREE.SphereGeometry(6, 16, 16);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false, toneMapped: false });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  scene.add(sunMesh);

  function setSunPosition(pos: THREE.Vector3) {
    sunMesh.position.copy(pos).setLength(260);
  }

  return { setSunPosition };
}
