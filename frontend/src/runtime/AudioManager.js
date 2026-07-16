// 音の一元管理。SE は WebAudio で合成し、BGM は小さなシーケンサで演奏する
// （音声アセット不要・ライセンスフリー。将来サンプル音源への差し替えも このクラス内で完結させる）。
// AudioContext はブラウザの自動再生制限のため、最初のユーザー操作で生成・resume する。

const YO = { d3: 50, e3: 52, g3: 55, a3: 57, b3: 59, d4: 62, e4: 64, g4: 67, a4: 69, b4: 71, d5: 74, e5: 76, g5: 79 }

// ── BGM パターン（呂律・陽音階。beat = 4分音符 1 拍） ──────────────
const BGM_PATTERNS = {
  // タイトル〜ハブ: 空に浮かぶ島。ゆったり・あたたかく
  hub: {
    bpm: 76,
    beats: 32, // 8小節ループ
    tracks: [
      {
        inst: 'pluck',
        gain: 0.5,
        notes: [
          [0, YO.d5, 1.5], [2, YO.b4, 1], [3, YO.a4, 1],
          [4, YO.g4, 1.5], [6, YO.e4, 2],
          [8, YO.a4, 1], [9.5, YO.b4, 0.5], [10, YO.d5, 1], [11, YO.e5, 1],
          [12, YO.b4, 3],
          [16, YO.d5, 1.5], [18, YO.e5, 1], [19, YO.g5, 1],
          [20, YO.e5, 1.5], [22, YO.d5, 2],
          [24, YO.b4, 1], [25.5, YO.a4, 0.5], [26, YO.g4, 1], [27, YO.e4, 1],
          [28, YO.d4, 4],
        ],
      },
      {
        inst: 'pad',
        gain: 0.16,
        notes: [
          [0, YO.d3, 8], [0, YO.a3, 8],
          [8, YO.g3, 8], [8, YO.d4, 8],
          [16, YO.a3, 8], [16, YO.e4, 8],
          [24, YO.g3, 4], [24, YO.b3, 4], [28, YO.d3, 4], [28, YO.a3, 4],
        ],
      },
      {
        inst: 'bell',
        gain: 0.12,
        notes: [[14, YO.d5, 2], [30, YO.a4, 2]],
      },
    ],
  },
  // ステージ: 歩き出したくなる、少しリズミカルに
  stage: {
    bpm: 92,
    beats: 32,
    tracks: [
      {
        inst: 'pluck',
        gain: 0.42,
        notes: [
          [0, YO.d4, 0.5], [1, YO.e4, 0.5], [2, YO.g4, 1], [3, YO.a4, 1],
          [4, YO.b4, 1.5], [6, YO.a4, 1], [7, YO.g4, 1],
          [8, YO.e4, 1], [9, YO.g4, 0.5], [10, YO.a4, 2],
          [12, YO.g4, 1], [13, YO.e4, 1], [14, YO.d4, 2],
          [16, YO.d4, 0.5], [17, YO.e4, 0.5], [18, YO.g4, 1], [19, YO.a4, 1],
          [20, YO.b4, 1], [21, YO.d5, 1], [22, YO.b4, 1], [23, YO.a4, 1],
          [24, YO.g4, 1], [25, YO.a4, 0.5], [26, YO.b4, 1.5], [28, YO.a4, 1], [29, YO.g4, 1], [30, YO.e4, 2],
        ],
      },
      {
        inst: 'pad',
        gain: 0.12,
        notes: [
          [0, YO.d3, 8], [8, YO.a3, 8], [16, YO.g3, 8], [24, YO.a3, 8],
        ],
      },
      {
        inst: 'taiko',
        gain: 0.5,
        notes: [
          [0, 40, 0.2], [2.5, 40, 0.2], [3, 45, 0.15],
          [4, 40, 0.2], [6.5, 40, 0.2], [7, 45, 0.15],
          [8, 40, 0.2], [10.5, 40, 0.2], [11, 45, 0.15],
          [12, 40, 0.2], [14, 45, 0.15], [14.5, 45, 0.12], [15, 45, 0.15],
          [16, 40, 0.2], [18.5, 40, 0.2], [19, 45, 0.15],
          [20, 40, 0.2], [22.5, 40, 0.2], [23, 45, 0.15],
          [24, 40, 0.2], [26.5, 40, 0.2], [27, 45, 0.15],
          [28, 40, 0.2], [30, 45, 0.15], [31, 40, 0.2],
        ],
      },
    ],
  },
  // エンディング（4-2）: 祝祭。ハブ主題の明るい変奏
  ending: {
    bpm: 84,
    beats: 32,
    tracks: [
      {
        inst: 'pluck',
        gain: 0.5,
        notes: [
          [0, YO.g4, 1], [1, YO.a4, 1], [2, YO.b4, 1], [3, YO.d5, 1],
          [4, YO.e5, 2], [6, YO.d5, 1], [7, YO.b4, 1],
          [8, YO.a4, 1.5], [10, YO.b4, 1], [11, YO.a4, 1],
          [12, YO.g4, 3],
          [16, YO.d5, 1], [17, YO.e5, 1], [18, YO.g5, 1.5], [20, YO.e5, 1], [21, YO.d5, 1],
          [22, YO.b4, 1], [23, YO.a4, 1],
          [24, YO.g4, 1], [25, YO.a4, 1], [26, YO.b4, 1], [27, YO.a4, 0.5], [27.5, YO.g4, 0.5],
          [28, YO.d4, 4],
        ],
      },
      {
        inst: 'pad',
        gain: 0.16,
        notes: [
          [0, YO.g3, 8], [0, YO.d4, 8],
          [8, YO.a3, 8], [8, YO.e4, 8],
          [16, YO.g3, 8], [16, YO.b3, 8],
          [24, YO.d3, 8], [24, YO.a3, 8],
        ],
      },
      { inst: 'bell', gain: 0.14, notes: [[0, YO.g5, 2], [16, YO.d5, 2]] },
    ],
  },
}

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12)
}

export class AudioManager {
  constructor() {
    this.ctx = null
    this.enabled = true
    this._bgm = null // { name, timer, nextBeat, startTime, gainNode }
    this._pendingBgm = null

    // 最初のユーザー操作でコンテキストを起こす
    const resume = () => {
      this._ensureCtx()
      if (this.ctx.state === 'suspended') this.ctx.resume()
      if (this._pendingBgm) {
        const name = this._pendingBgm
        this._pendingBgm = null
        this.playBgm(name)
      }
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
  }

  _ensureCtx() {
    if (this.ctx) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.9
    this.comp = this.ctx.createDynamicsCompressor()
    this.comp.threshold.value = -18
    this.comp.ratio.value = 4
    this.master.connect(this.comp)
    this.comp.connect(this.ctx.destination)

    this.sfxBus = this.ctx.createGain()
    this.sfxBus.gain.value = 0.85
    this.sfxBus.connect(this.master)

    this.bgmBus = this.ctx.createGain()
    this.bgmBus.gain.value = 0.55
    this.bgmBus.connect(this.master)

    // BGM 用の軽い残響（フィードバックディレイ）
    this.echo = this.ctx.createDelay(1)
    this.echo.delayTime.value = 0.28
    this.echoFb = this.ctx.createGain()
    this.echoFb.gain.value = 0.22
    this.echoWet = this.ctx.createGain()
    this.echoWet.gain.value = 0.3
    this.echo.connect(this.echoFb)
    this.echoFb.connect(this.echo)
    this.echo.connect(this.echoWet)
    this.echoWet.connect(this.bgmBus)
  }

  // ── 楽器（1 音を today スケジュールする） ────────────────────────
  _pluck(t, freq, dur, gain, dest) {
    const ctx = this.ctx
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain, t)
    env.gain.exponentialRampToValueAtTime(0.001, t + Math.max(dur * 0.9, 0.35))
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(freq * 5, t)
    lp.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.3)
    for (const [type, det, g] of [
      ['triangle', 0, 1],
      ['triangle', 6, 0.4],
      ['sine', -4, 0.5],
    ]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = freq
      o.detune.value = det
      const og = ctx.createGain()
      og.gain.value = g
      o.connect(og)
      og.connect(lp)
      o.start(t)
      o.stop(t + dur + 0.5)
    }
    // 爪弾きのアタック（短いノイズ）
    const noise = this._noiseSource(t, 0.03)
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(gain * 0.3, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    noise.connect(ng)
    ng.connect(lp)
    lp.connect(env)
    env.connect(dest)
  }

  _pad(t, freq, dur, gain, dest) {
    const ctx = this.ctx
    const env = ctx.createGain()
    const atk = Math.min(1.2, dur * 0.3)
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + atk)
    env.gain.setValueAtTime(gain, t + dur * 0.7)
    env.gain.exponentialRampToValueAtTime(0.001, t + dur)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = freq * 3
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.detune.value = det
      const og = ctx.createGain()
      og.gain.value = 0.5
      o.connect(og)
      og.connect(lp)
      o.start(t)
      o.stop(t + dur + 0.2)
    }
    lp.connect(env)
    env.connect(dest)
  }

  _bell(t, freq, dur, gain, dest) {
    const ctx = this.ctx
    for (const [ratio, g, d] of [
      [1, 1, dur],
      [2.76, 0.3, dur * 0.5],
      [5.4, 0.12, dur * 0.25],
    ]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * ratio
      const env = ctx.createGain()
      env.gain.setValueAtTime(gain * g, t)
      env.gain.exponentialRampToValueAtTime(0.001, t + Math.max(d, 0.2))
      o.connect(env)
      env.connect(dest)
      o.start(t)
      o.stop(t + d + 0.3)
    }
  }

  _taiko(t, midi, gain, dest) {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = 'sine'
    const f = midiToFreq(midi)
    o.frequency.setValueAtTime(f * 2.2, t)
    o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.09)
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain, t)
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    o.connect(env)
    env.connect(dest)
    o.start(t)
    o.stop(t + 0.3)
    const noise = this._noiseSource(t, 0.05)
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(gain * 0.25, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 900
    noise.connect(bp)
    bp.connect(ng)
    ng.connect(dest)
  }

  _noiseSource(t, dur) {
    const ctx = this.ctx
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.start(t)
    return src
  }

  // ── SE ─────────────────────────────────────────────────────────
  /** @param {string} name */
  sfx(name) {
    if (!this.enabled) return
    this._ensureCtx()
    if (this.ctx.state === 'suspended') return // ユーザー操作前は鳴らせない
    const t = this.ctx.currentTime + 0.001
    const out = this.sfxBus
    const S = {
      // UI
      hover: () => this._bell(t, 880, 0.12, 0.12, out),
      confirm: () => {
        this._bell(t, 660, 0.18, 0.2, out)
        this._bell(t + 0.07, 990, 0.3, 0.18, out)
      },
      cancel: () => this._pluck(t, 330, 0.2, 0.25, out),
      talk: () => this._bell(t, 740 + Math.random() * 120, 0.06, 0.08, out),
      // プレイヤー
      jump: () => {
        const o = this.ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.setValueAtTime(300, t)
        o.frequency.exponentialRampToValueAtTime(680, t + 0.12)
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0.22, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        o.connect(g)
        g.connect(out)
        o.start(t)
        o.stop(t + 0.2)
      },
      land: () => this._taiko(t, 45, 0.3, out),
      dash: () => {
        const noise = this._noiseSource(t, 0.18)
        const bp = this.ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.setValueAtTime(600, t)
        bp.frequency.exponentialRampToValueAtTime(2400, t + 0.15)
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0.16, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        noise.connect(bp)
        bp.connect(g)
        g.connect(out)
      },
      footstep: () => {
        const n = this._noiseSource(t, 0.04)
        const bp = this.ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 300 + Math.random() * 200
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0.1, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
        n.connect(bp)
        bp.connect(g)
        g.connect(out)
      },
      // 選択プレート
      tick: () => this._bell(t, 1180, 0.05, 0.06, out),
      fire: () => {
        this._bell(t, 587, 0.4, 0.22, out)
        this._bell(t + 0.1, 880, 0.5, 0.2, out)
        this._bell(t + 0.22, 1174, 0.7, 0.18, out)
      },
      // クイズ
      correct: () => {
        for (const [dt, f] of [[0, 659], [0.12, 784], [0.24, 988], [0.36, 1319]]) {
          this._bell(t + dt, f, 0.6, 0.2, out)
        }
      },
      wrong: () => {
        this._pluck(t, 233, 0.35, 0.3, out)
        this._pluck(t + 0.16, 220, 0.5, 0.3, out)
      },
      clear: () => {
        // クリアファンファーレ（和風ペンタトニックの上昇）
        const seq = [[0, YO.d4], [0.14, YO.e4], [0.28, YO.g4], [0.42, YO.a4], [0.56, YO.b4], [0.7, YO.d5], [0.98, YO.g5]]
        for (const [dt, m] of seq) this._bell(t + dt, midiToFreq(m), 0.8, 0.22, out)
        this._taiko(t, 40, 0.5, out)
        this._taiko(t + 0.7, 45, 0.4, out)
      },
    }
    S[name]?.()
  }

  // ── BGM ────────────────────────────────────────────────────────
  /** @param {keyof typeof BGM_PATTERNS | null} name null で停止 */
  playBgm(name) {
    if (!this.enabled) return
    this._ensureCtx()
    if (this.ctx.state === 'suspended') {
      this._pendingBgm = name
      return
    }
    if (this._bgm?.name === name) return
    this._stopBgm(1.2)
    if (!name) return

    const pattern = BGM_PATTERNS[name]
    const gainNode = this.ctx.createGain()
    gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 1.5)
    gainNode.connect(this.bgmBus)
    gainNode.connect(this.echo)

    const state = {
      name,
      pattern,
      gainNode,
      startTime: this.ctx.currentTime + 0.1,
      scheduledUntilBeat: 0,
      timer: null,
    }
    const secPerBeat = 60 / pattern.bpm
    const schedule = () => {
      const now = this.ctx.currentTime
      const horizon = now + 0.6 // 先読み
      while (state.startTime + state.scheduledUntilBeat * secPerBeat < horizon) {
        const loopStartBeat = state.scheduledUntilBeat
        for (const track of pattern.tracks) {
          for (const [beat, midi, dur] of track.notes) {
            const t = state.startTime + (loopStartBeat + beat) * secPerBeat
            if (t < now - 0.05) continue
            const freq = midiToFreq(midi)
            const d = dur * secPerBeat
            if (track.inst === 'pluck') this._pluck(t, freq, d, track.gain, gainNode)
            else if (track.inst === 'pad') this._pad(t, freq, d, track.gain, gainNode)
            else if (track.inst === 'bell') this._bell(t, freq, d, track.gain, gainNode)
            else if (track.inst === 'taiko') this._taiko(t, midi, track.gain, gainNode)
          }
        }
        state.scheduledUntilBeat += pattern.beats
      }
    }
    schedule()
    state.timer = setInterval(schedule, 250)
    this._bgm = state
  }

  _stopBgm(fade = 0.8) {
    const bgm = this._bgm
    if (!bgm) return
    clearInterval(bgm.timer)
    const now = this.ctx.currentTime
    bgm.gainNode.gain.setValueAtTime(bgm.gainNode.gain.value, now)
    bgm.gainNode.gain.exponentialRampToValueAtTime(0.001, now + fade)
    setTimeout(() => bgm.gainNode.disconnect(), (fade + 0.1) * 1000)
    this._bgm = null
  }

  stopBgm(fade) {
    if (this.ctx) this._stopBgm(fade)
    this._pendingBgm = null
  }
}
