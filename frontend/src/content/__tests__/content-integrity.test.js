// 教材データの整合性テスト（src/content/README.md の「整合性テストの復活義務」を実装）。
// stageId・正解値は DB のクリア記録と対応する契約であり、このテストが破壊を検知する。
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { stages } from '../stages.js'
import { quizzes } from '../quizzes.js'
import { storyContent } from '../stories.js'
import { models } from '../models.js'
import { terms } from '../glossary.js'
import { routeTable } from '../../app/routes.js'

describe('stages.js', () => {
  it('stageId が 1〜7 で重複なく揃っている', () => {
    const ids = stages.map((s) => s.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('routeName がルーター定義と一致する', () => {
    const routeNames = new Set(routeTable.filter((r) => r.name).map((r) => r.name))
    for (const s of stages) {
      expect(routeNames, `route ${s.routeName} がルーターに存在しない`).toContain(s.routeName)
    }
  })

  it('ルーターの stage ルートの meta.stageId が台帳と一致する', () => {
    for (const s of stages) {
      const route = routeTable.find((r) => r.name === s.routeName)
      expect(route?.meta?.stageId).toBe(s.id)
    }
  })
})

describe('quizzes.js 正解値のロック（DB 対応・変更禁止）', () => {
  it('stage-1-1 correctAnswer = 192.168.1.20', () => {
    expect(quizzes['stage-1-1'].correctAnswer).toBe('192.168.1.20')
  })
  it('stage-2-2 correctAnswer = 192.168.20.1', () => {
    expect(quizzes['stage-2-2'].correctAnswer).toBe('192.168.20.1')
  })
  it('stage-3-2 correctAnswerIndex = 1', () => {
    expect(quizzes['stage-3-2'].correctAnswerIndex).toBe(1)
  })
  it('stage-4-2 復習クイズ = イヌ 1・キジ 0・サル 2', () => {
    const byAnimal = Object.fromEntries(
      quizzes['stage-4-2'].reviewQuizzes.map((q) => [q.animal, q.correctAnswerIndex]),
    )
    expect(byAnimal).toEqual({ イヌ: 1, キジ: 0, サル: 2 })
  })
})

describe('選択式クイズの選択肢範囲', () => {
  it('correctAnswerIndex が選択肢の範囲内にある', () => {
    const check = (q, label) => {
      expect(q.correctAnswerIndex, label).toBeGreaterThanOrEqual(0)
      expect(q.correctAnswerIndex, label).toBeLessThan(q.options.length)
    }
    for (const [key, quiz] of Object.entries(quizzes)) {
      if (quiz.type === 'choice') check(quiz, key)
      if (quiz.type === 'choiceMulti') {
        quiz.reviewQuizzes.forEach((q) => check(q, `${key}/${q.animal}`))
      }
    }
  })
})

describe('stories.js', () => {
  it('全小章の stageId・routeName が stages.js と一致する', () => {
    const byId = new Map(stages.map((s) => [s.id, s]))
    const subChapters = storyContent['1'].chapter.flatMap((c) => c.subChapters)
    expect(subChapters.length).toBe(stages.length)
    for (const sub of subChapters) {
      const stage = byId.get(sub.stageId)
      expect(stage, `stageId ${sub.stageId} が stages.js にない`).toBeTruthy()
      expect(sub.routeName).toBe(stage.routeName)
    }
  })
})

describe('models.js', () => {
  const publicDir = fileURLToPath(new URL('../../../public', import.meta.url))
  it('全 path が public/models/ に実在する', () => {
    for (const m of models) {
      expect(existsSync(publicDir + m.path), `${m.path} が存在しない`).toBe(true)
    }
  })
})

describe('glossary.js', () => {
  it('用語 id が重複しない', () => {
    const ids = terms.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
