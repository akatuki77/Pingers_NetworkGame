// ワールド共通の環境（空・霧・ライティング）。ルックの一貫性をここで担保する。
import * as THREE from 'three'

export const SKY_COLORS = {
  day: { top: '#5d9fd8', horizon: '#d8e9f2' },
  dusk: { top: '#7a6ea8', horizon: '#f0c8a0' },
  night: { top: '#1e2a52', horizon: '#4a5a8a' },
}

/** グラデーションの空ドームを作って scene に追加し、霧も設定する。 */
export function createSky(scene, { top, horizon } = SKY_COLORS.day, fogRange = [80, 380]) {
  const topColor = new THREE.Color(top)
  const horizonColor = new THREE.Color(horizon)
  scene.fog = new THREE.Fog(horizonColor.getHex(), fogRange[0], fogRange[1])
  const geo = new THREE.SphereGeometry(400, 32, 20)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: topColor },
      horizonColor: { value: horizonColor },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        float t = smoothstep(-0.12, 0.55, h);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }
    `,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  scene.add(mesh)
  return mesh
}

/** 標準ライティング（半球光 + 影付き太陽 + 逆光リム）。 */
export function createLighting(scene, { sunPos = [16, 22, 14], shadowRange = 20 } = {}) {
  const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x9a8465, 1.0)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xffedd0, 2.4)
  sun.position.set(...sunPos)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024) // ソフトシャドウ前提ではこの解像度で十分（性能優先）
  sun.shadow.camera.left = -shadowRange
  sun.shadow.camera.right = shadowRange
  sun.shadow.camera.top = shadowRange
  sun.shadow.camera.bottom = -shadowRange
  sun.shadow.camera.near = 5
  sun.shadow.camera.far = 80
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.025
  sun.shadow.camera.updateProjectionMatrix() // 範囲変更の反映（忘れると ±5 のまま）
  scene.add(sun)

  const rim = new THREE.DirectionalLight(0xbcd8ff, 0.5)
  rim.position.set(-14, 10, -18)
  scene.add(rim)

  return { hemi, sun, rim }
}
