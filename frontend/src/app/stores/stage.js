// ステージ進行の UI 状態。ワールド（StageWorld）が書き、オーバーレイ UI が読む。
// クイズの正誤判定・クリア保存もここのアクションが担う（UI は表示だけ）。
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { quizzes } from '@/content/quizzes.js'
import { getStageByRouteName } from '@/content/stages.js'
import { useProgressStore } from './progress.js'
import { useSessionStore } from './session.js'
import { useGame } from '@/runtime/Game.js'

export const useStageStore = defineStore('stage', () => {
  /** 現在のステージ routeName（StageWorld が設定） */
  const routeName = ref(null)
  /** 目的パネルの表示 */
  const objectiveOpen = ref(false)
  /** 目的文（stages3d.js の定義から） */
  const objective = ref('')
  /** 近接プロンプト { label } | null（「E: かんばんをよむ」等） */
  const prompt = ref(null)
  /** 会話 { speaker, lines: string[], index, onEnd?: () => void } | null */
  const dialogue = ref(null)
  /** 文字入力クイズパネルの表示 */
  const quizOpen = ref(false)
  /** HUD に配達依頼書（textInput クイズ）ボタンを出すか（ステージ定義由来） */
  const quizButton = ref(true)
  /** クリア後に「つぎのステージ」があるか（行き先選択 UI 用） */
  const clearHasNext = ref(false)
  /** 選択式クイズ { title, displayQuestion?, question, options, correctAnswerIndex,
   *   explanation, speaker?, onCorrect?: () => void } | null */
  const choiceQuiz = ref(null)
  /** 誤答時のヒント文言（表示用） */
  const wrongHint = ref(null)
  /** 解説パネル { title, text } | null（正解後・イベント後） */
  const explanation = ref(null)
  /** 学習パネル（経路表など）{ title, blocks } | null */
  const learningPanel = ref(null)
  /** クリア演出中 */
  const celebrating = ref(false)
  /** このステージはクリア処理済み */
  const cleared = ref(false)
  /** 収集進捗 { label, got: number, total: number } | null（きびだんご等） */
  const collect = ref(null)
  /** クリア演出後に出す解説（内部状態） */
  let pendingExplanation = null

  const quiz = computed(() => {
    if (!routeName.value) return null
    const key = `stage-${routeName.value.replace('Stage-', '').toLowerCase()}`
    return quizzes[key] ?? null
  })

  /** いずれかのモーダル UI が開いているか（ワールドの入力ロック判定に使う） */
  const uiOpen = computed(
    () =>
      objectiveOpen.value ||
      quizOpen.value ||
      choiceQuiz.value !== null ||
      explanation.value !== null ||
      learningPanel.value !== null ||
      celebrating.value ||
      dialogue.value !== null,
  )

  function reset(newRouteName, objectiveText, opts = {}) {
    routeName.value = newRouteName
    objective.value = objectiveText ?? ''
    quizButton.value = opts.quizButton ?? true
    clearHasNext.value = opts.clearHasNext ?? false
    objectiveOpen.value = false
    prompt.value = null
    dialogue.value = null
    quizOpen.value = false
    choiceQuiz.value = null
    wrongHint.value = null
    explanation.value = null
    learningPanel.value = null
    celebrating.value = false
    cleared.value = false
    collect.value = null
  }

  /** 会話を開始する。onEnd は最後のページを閉じたときに呼ばれる。 */
  function startDialogue(speaker, lines, onEnd) {
    dialogue.value = { speaker, lines, index: 0, onEnd }
  }

  /** 会話を 1 ページ進める。最後なら閉じて onEnd を呼ぶ。 */
  function advanceDialogue() {
    if (!dialogue.value) return
    if (dialogue.value.index < dialogue.value.lines.length - 1) {
      dialogue.value = { ...dialogue.value, index: dialogue.value.index + 1 }
    } else {
      const onEnd = dialogue.value.onEnd
      dialogue.value = null
      onEnd?.()
    }
  }

  /**
   * 文字入力式クイズの回答判定。
   * @returns {boolean} 正解なら true（celebration へ）
   */
  function submitTextAnswer(answer) {
    const q = quiz.value
    if (!q || q.type !== 'textInput') return false
    const ok = answer.trim() === q.correctAnswer
    const game = useGame()
    if (ok) {
      game.audio.sfx('correct')
      quizOpen.value = false
      wrongHint.value = null
      beginClear({ explanationText: q.explanation })
    } else {
      game.audio.sfx('wrong')
      wrongHint.value = _hintFor(answer.trim())
    }
    return ok
  }

  /** 選択式クイズ（C-12: ボタン選択）の回答判定。 */
  function submitChoiceAnswer(index) {
    const cq = choiceQuiz.value
    if (!cq) return false
    const ok = index === cq.correctAnswerIndex
    const game = useGame()
    if (ok) {
      game.audio.sfx('correct')
      const done = cq
      choiceQuiz.value = null
      wrongHint.value = null
      done.onCorrect?.()
    } else {
      game.audio.sfx('wrong')
      wrongHint.value = cq.wrongHints?.[index] ?? 'ちがうみたい。もういちど考えてみよう！'
    }
    return ok
  }

  /** 誤答ヒント（C-13）。 */
  function _hintFor(answer) {
    const q = quiz.value
    if (q?.wrongAnswerHints?.[answer]) return q.wrongAnswerHints[answer]
    if (routeName.value === 'Stage-1-1') {
      if (answer === '192.168.1.11') return 'それは「花の村」の住所だ。届け先は 鍛冶の村 だよ。'
      if (answer === '192.168.1.30') return 'それは「商人の村」の住所だ。届け先は 鍛冶の村 だよ。'
      if (!answer.includes('.')) return 'IPアドレスは 192.168.1.xx のように ピリオド区切りで書くんだ。'
      return 'ちがうみたい。3つの村の かんばん をもういちど見てみよう！'
    }
    if (routeName.value === 'Stage-2-2') {
      if (answer === '192.168.10.1') return 'それは 門B の住所。経路表の「港町」の行を もういちど見よう。'
      if (answer === '192.168.30.1') return 'それは 門D（山岳の国ゆき）。港町へ続く門は どれだった？'
      if (!answer.includes('.')) return 'IPアドレスは 192.168.xx.x のように ピリオド区切りで書くんだ。'
      return 'ちがうみたい。門番の経路表（ルーティングテーブル）を思い出そう！'
    }
    return 'ちがうみたい。ヒントをさがして もういちど挑戦しよう！'
  }

  /**
   * クリア処理（正解・イベント完了で呼ぶ）。演出 → 保存。
   * @param {{ explanationText?: string, explanationTitle?: string, skipCelebration?: boolean }} [opts]
   */
  async function beginClear(opts = {}) {
    const game = useGame()
    game.input.lock('stage-clear')
    pendingExplanation = opts.explanationText
      ? { title: opts.explanationTitle ?? 'せいかい！', text: opts.explanationText }
      : null
    if (opts.skipCelebration) {
      if (pendingExplanation) explanation.value = pendingExplanation
    } else {
      celebrating.value = true
      game.audio.sfx('clear')
    }
    // 保存（正解時のみ・ログイン中のみ API。ローカルは常に記録）
    const stage = getStageByRouteName(routeName.value)
    const progress = useProgressStore()
    const session = useSessionStore()
    await progress.recordClear(stage.id, session.isLoggedIn ? session.user.userId : null)
    cleared.value = true
  }

  /** クリア演出が終わったら解説（あれば）へ。 */
  function showExplanation() {
    celebrating.value = false
    if (pendingExplanation) {
      explanation.value = pendingExplanation
    } else {
      // 解説がないイベント型は演出後すぐ帰還
      _finish()
    }
  }

  /** 解説を閉じる → 行き先を選んで移動（'next' = 次のステージ / 'hub' = ステージ選択）。 */
  function closeExplanation(target = 'next') {
    explanation.value = null
    _finish(target)
  }

  function _finish(target) {
    useGame().input.unlock('stage-clear')
    try {
      useGame().world?.finishStage?.(target)
    } catch {
      /* noop */
    }
  }

  return {
    routeName,
    objective,
    objectiveOpen,
    prompt,
    dialogue,
    quizOpen,
    quizButton,
    clearHasNext,
    choiceQuiz,
    wrongHint,
    explanation,
    learningPanel,
    celebrating,
    cleared,
    collect,
    quiz,
    uiOpen,
    reset,
    startDialogue,
    advanceDialogue,
    submitTextAnswer,
    submitChoiceAnswer,
    beginClear,
    showExplanation,
    closeExplanation,
  }
})
