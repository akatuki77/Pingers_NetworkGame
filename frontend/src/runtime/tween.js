// アニメーションは必ずこの GSAP 経由で行う（rAF 内の手書き lerp は設計ミス — CLAUDE.md）。
// モーション規定: standard 0.25s / emphasized 0.5s、イージングは easeOutCubic 系に統一。
import { gsap } from 'gsap'

export const MOTION = {
  standard: 0.25,
  emphasized: 0.5,
  easeOut: 'power2.out', // ≒ easeOutCubic
  easeInOut: 'power2.inOut',
  easeSoft: 'sine.inOut',
}

export { gsap }
