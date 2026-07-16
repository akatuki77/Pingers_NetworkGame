// ステージ 3D 定義とハブメニュー定義の整合性テスト。
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { stages } from '../stages.js'
import { stageWorlds } from '../stages3d.js'
import { hubLevels } from '../hubMenus.js'
import { quizzes } from '../quizzes.js'

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))

describe('stages3d.js', () => {
  it('全ステージ routeName に 3D 定義がある', () => {
    for (const s of stages) {
      expect(stageWorlds[s.routeName], `${s.routeName} の定義がない`).toBeTruthy()
    }
  })

  it('terrain の GLB が実在する', () => {
    for (const [key, def] of Object.entries(stageWorlds)) {
      expect(existsSync(publicDir + def.terrain), `${key} terrain ${def.terrain}`).toBe(true)
    }
  })

  it('quizKey は quizzes.js に実在する', () => {
    for (const [key, def] of Object.entries(stageWorlds)) {
      if (def.quizKey) {
        expect(quizzes[def.quizKey], `${key} quizKey ${def.quizKey}`).toBeTruthy()
      }
    }
  })

  it('スポーン地点が bounds 内にある', () => {
    for (const [key, def] of Object.entries(stageWorlds)) {
      expect(Math.abs(def.spawn.x), key).toBeLessThanOrEqual(def.bounds)
      expect(Math.abs(def.spawn.z), key).toBeLessThanOrEqual(def.bounds)
    }
  })
})

describe('hubMenus.js', () => {
  it('L2 に全 7 ステージのプレートがあり stageId が一致する', () => {
    const plateStageIds = hubLevels['stage-select'].items
      .filter((i) => i.stageId)
      .map((i) => i.stageId)
      .sort((a, b) => a - b)
    expect(plateStageIds).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('プレートは中央スポーン禁止域（半径4）の外にある', () => {
    for (const level of Object.values(hubLevels)) {
      for (const item of level.items) {
        const [x, z] = item.position
        expect(Math.hypot(x, z), `${item.id} が禁止域内`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('L1 の遷移先レベルが実在する', () => {
    for (const item of hubLevels['story-select'].items) {
      if (item.to?.level) expect(hubLevels[item.to.level]).toBeTruthy()
    }
  })
})
