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
  // 90 ms tone, 70 ms gap, 90 ms tone a little higher. Sine plus a short ramp so the attack is crisp and click-free.
  tone(ctx, now, 2700)
  tone(ctx, now + 0.16, 2920)
}

function tone(ctx: AudioContext, start: number, frequency: number) {
  const duration = 0.09
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.2, start + 0.006)
  gain.gain.setValueAtTime(0.2, start + duration - 0.016)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function buzz() {
  if (typeof navigator.vibrate === 'function') navigator.vibrate([80, 70, 80])
}
