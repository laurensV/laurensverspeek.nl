// A tiny mechanical-keyboard tick for terminal typing (opt-in via `keyclick`).
// Unlike the boot chime, this fires many times a second, so it reuses ONE
// AudioContext across keystrokes — a fresh context per key would blow past the
// browser's small context budget. Keystrokes happen inside a user gesture, so
// autoplay policy never blocks it.

let ctx: AudioContext | undefined

/** Play one short click at `level` (0–1, usually the shared volume / 100). */
export function playKeyClick(level: number): void {
  if (!import.meta.client || level <= 0) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    // a high, dry tick with a hair of variation so a fast burst isn't a monotone
    osc.frequency.value = 1500 + Math.round((Math.random() - 0.5) * 220)
    // kept deliberately quiet: a subtle tick under the typing, never a beep
    const peak = Math.min(1, Math.max(0, level)) * 0.05
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(peak, t + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.04)
  } catch {
    // no Web Audio here — stay silent
  }
}
