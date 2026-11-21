const KEY = 'shopmate.sound.v1'
const listeners = new Set<() => void>()

let context: AudioContext | null = null
let enabled = readEnabled()

function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function soundEnabled() {
  return enabled
}

export function setSoundEnabled(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* private mode */
  }
  emit()
  if (on) {
    unlockAudio()
    playScanBeep()
  }
}

export function subscribeSound(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function audioContext() {
  if (!context) {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    context = new AudioCtx()
  }
  return context
}

/** Call inside a tap so iPhone Safari will allow later beeps. */
export function unlockAudio() {
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const buffer = ctx.createBuffer(1, 1, 22050)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
}

export function playScanBeep() {
  buzz()
  if (!enabled) return
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(2800, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.1)
}

function buzz() {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(45)
}
