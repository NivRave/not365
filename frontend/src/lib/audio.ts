// Web Audio API zero-dependency chime synthesizer
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (AudioCtx) {
      audioCtx = new AudioCtx()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Plays a cheerful dual-tone chime when a goal is scored
 */
export function playGoalChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'triangle'
    osc2.type = 'sine'

    // Play triumphant ascending chord (C5 -> E5 -> G5)
    osc1.frequency.setValueAtTime(523.25, now)
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15)
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.3)

    osc2.frequency.setValueAtTime(261.63, now)
    osc2.frequency.exponentialRampToValueAtTime(329.63, now + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(392.0, now + 0.3)

    gainNode.gain.setValueAtTime(0.01, now)
    gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.8)
    osc2.stop(now + 0.8)
  } catch {
    // Ignore audio permission or browser autoplay policies
  }
}

/**
 * Plays a short subtle click/pop notification
 */
export function playWhistleSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1800, now)
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.1)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch {
    // Ignore
  }
}
