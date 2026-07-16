// GLB アセットのロードとキャッシュ。同じパスへの多重リクエストを 1 本化する。
// ロード進捗はローディング演出（Veil）側が購読する。
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

const loader = new GLTFLoader()
/** @type {Map<string, Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>>} */
const cache = new Map()

/**
 * GLB を読み込む（キャッシュあり）。scene を使う側は必ず clone すること。
 * @param {string} path public/ 直下からの絶対パス（例: '/models/stage/background_hub.glb'）
 */
export function loadGlb(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      new Promise((resolve, reject) => {
        loader.load(path, resolve, undefined, reject)
      }),
    )
  }
  return cache.get(path)
}

/**
 * GLTF シーンのクローンを返し、影の設定を一括適用する。
 * @param {{ scene: THREE.Object3D }} gltf
 * @param {{ castShadow?: boolean, receiveShadow?: boolean }} [opts]
 */
export function instantiate(gltf, opts = {}) {
  const { castShadow = true, receiveShadow = true } = opts
  // SkinnedMesh を含む GLB は通常の clone では骨が繋がらないため SkeletonUtils を使う
  const root = SkeletonUtils.clone(gltf.scene)
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = castShadow
      obj.receiveShadow = receiveShadow
      // SkinnedMesh はシャドウパスで誤カリングされ影が消えるため無効化（頂点数は小さい）
      if (obj.isSkinnedMesh) obj.frustumCulled = false
    }
  })
  return root
}

/** 複数パスの事前ロード。 */
export function preload(paths) {
  return Promise.all(paths.map((p) => loadGlb(p)))
}
