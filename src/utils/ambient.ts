import type { AmbientSoundType } from '../types'

let ctx: AudioContext | null = null
let nodes: AudioNode[] = []
let gain: GainNode | null = null

function ensureCtx() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function stopAll() {
  nodes.forEach((n) => {
    try {
      n.disconnect()
    } catch {
      /* */
    }
  })
  nodes = []
  if (gain) {
    try {
      gain.disconnect()
    } catch {
      /* */
    }
  }
  gain = null
}

function fadeOut(done: () => void) {
  const g = gain
  if (!g || !ctx) {
    stopAll()
    done()
    return
  }
  const t = ctx.currentTime
  g.gain.cancelScheduledValues(t)
  g.gain.setValueAtTime(g.gain.value, t)
  g.gain.linearRampToValueAtTime(0.0001, t + 0.35)
  window.setTimeout(() => {
    stopAll()
    done()
  }, 400)
}

function whiteNoise() {
  const c = ensureCtx()
  const bufferSize = 2 * c.sampleRate
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  return src
}

function build(type: AmbientSoundType) {
  stopAll()
  if (type === 'off') return
  const c = ensureCtx()
  gain = c.createGain()
  gain.gain.value = 0.0001
  const t = c.currentTime
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.4)
  gain.connect(c.destination)

  if (type === 'white') {
    const src = whiteNoise()
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1200
    src.connect(filter)
    filter.connect(gain)
    src.start()
    nodes.push(src, filter)
    return
  }

  if (type === 'rain') {
    const src = whiteNoise()
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 400
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 9000
    src.connect(hp)
    hp.connect(lp)
    lp.connect(gain)
    src.start()
    nodes.push(src, hp, lp)
    return
  }

  if (type === 'forest') {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 180
    const osc2 = c.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 230
    const mix = c.createGain()
    mix.gain.value = 0.02
    osc.connect(mix)
    osc2.connect(mix)
    mix.connect(gain)
    osc.start()
    osc2.start()
    nodes.push(osc, osc2, mix)
    return
  }

  if (type === 'cafe') {
    const src = whiteNoise()
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2000
    bp.Q.value = 0.7
    src.connect(bp)
    bp.connect(gain)
    src.start()
    nodes.push(src, bp)
  }
}

export const ambientController = {
  set(type: AmbientSoundType, running: boolean) {
    if (typeof window === 'undefined') return
    if (!running || type === 'off') {
      fadeOut(() => undefined)
      return
    }
    try {
      build(type)
      void ensureCtx().resume()
    } catch {
      /* autoplay blocked */
    }
  },
}
