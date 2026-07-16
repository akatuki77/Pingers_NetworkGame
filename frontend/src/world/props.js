// ステージに置くプログラム生成の小物（看板など）。GLB を増やさずに雰囲気を足す。
import * as THREE from 'three'

/**
 * 木の立て看板（高札風）。板面に CanvasTexture で複数行テキストを描く。
 * 行数に応じて板の高さが変わる。原点は接地点（足元）。文字面は +Z を向く。
 * @param {string[]} lines 板面の行（1 行目は見出し扱いで大きく）
 */
export function createSignboard(lines, { width = 2.2 } = {}) {
  const group = new THREE.Group()

  const wood = new THREE.MeshLambertMaterial({ color: 0x9c7a4e })
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x6e5233 })

  // 寸法: 行数に応じた板 + 低めの脚 + 笠木
  const boardH = 0.42 + 0.36 * lines.length
  const boardBottom = 0.55
  const boardTop = boardBottom + boardH
  const postX = width / 2 - 0.1

  // 脚 2 本（板の上端まで。頭は笠木で隠れる）
  const postGeo = new THREE.BoxGeometry(0.14, boardTop, 0.14)
  for (const x of [-postX, postX]) {
    const post = new THREE.Mesh(postGeo, woodDark)
    post.position.set(x, boardTop / 2, -0.02)
    post.castShadow = true
    group.add(post)
  }

  // 笠木（少し張り出した屋根板）
  const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, 0.12, 0.3), woodDark)
  cap.position.set(0, boardTop + 0.06, -0.02)
  cap.castShadow = true
  group.add(cap)

  // 板面テクスチャ
  const cw = 512
  const ch = Math.max(96, Math.round((cw * boardH) / width))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  // 板地（明るい木肌 + 薄い木目）
  ctx.fillStyle = '#d8b382'
  ctx.fillRect(0, 0, cw, ch)
  ctx.fillStyle = 'rgba(140, 100, 55, 0.18)'
  for (let y = 10; y < ch; y += 30) ctx.fillRect(0, y, cw, 8)
  ctx.strokeStyle = '#6e5233'
  ctx.lineWidth = 12
  ctx.strokeRect(6, 6, cw - 12, ch - 12)
  // テキスト（行ブロック全体を中央に組む）
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineH = (ch - 40) / lines.length
  lines.forEach((line, i) => {
    const size = Math.min(i === 0 ? 92 : 72, lineH * 0.72)
    ctx.font = `700 ${size}px 'Zen Maru Gothic', azuki, sans-serif`
    ctx.fillStyle = '#3a2a18'
    ctx.fillText(line, cw / 2, 20 + lineH * (i + 0.5))
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  texture.colorSpace = THREE.SRGBColorSpace

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(width, boardH, 0.12),
    [wood, wood, wood, wood, new THREE.MeshLambertMaterial({ map: texture }), wood],
  )
  board.position.set(0, boardBottom + boardH / 2, 0.05)
  board.castShadow = true
  group.add(board)

  return group
}

/**
 * オブジェクトの頭上に浮かぶ文字ラベル（常にカメラを向くスプライト）。
 * 1 行目は見出しとして大きく、白文字 + 濃い縁取りで地形の上でも読める。
 * @param {string[]} lines
 */
export function createFloatingLabel(lines, { size = 1 } = {}) {
  const cw = 640
  const lineH = 108
  const ch = lineH * lines.length + 24
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  lines.forEach((line, i) => {
    const fontPx = i === 0 ? 84 : 60
    ctx.font = `700 ${fontPx}px 'Zen Maru Gothic', azuki, sans-serif`
    const y = 12 + lineH * (i + 0.5)
    ctx.strokeStyle = 'rgba(30, 24, 14, 0.9)'
    ctx.lineWidth = 12
    ctx.strokeText(line, cw / 2, y)
    ctx.fillStyle = 'rgba(255,255,255,0.97)'
    ctx.fillText(line, cw / 2, y)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  const worldH = 0.5 * lines.length * size + 0.12
  sprite.scale.set(worldH * (cw / ch), worldH, 1)
  return sprite
}
