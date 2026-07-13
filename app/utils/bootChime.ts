// A short startup arpeggio, played when the boot splash runs. It's a one-shot
// (the chiptune engine is a looping jukebox), so it owns a tiny throwaway
// AudioContext. Autoplay policy will reject it on a gesture-less first visit —
// that's fine, it's caught; it sounds on user-triggered boots (`reboot`, entering
// lvOS) and once the page has any interaction.

// C major-ish rising arpeggio, then an octave landing — friendly, not a fanfare
const NOTES = [523.25, 659.25, 783.99, 1046.5]
const STEP = 0.09 // seconds between note onsets
const DURATION = 0.16 // per-note length

/** Play the boot chime at `level` (0–1, usually the lvOS volume / 100). */
export function playBootChime(level: number): void {
  if (!import.meta.client || level <= 0) return
  try {
    const ctx = new AudioContext()
    const master = ctx.createGain()
    // keep it gentle: the arpeggio peaks well below full scale even at max volume
    master.gain.value = Math.min(1, Math.max(0, level)) * 0.18
    master.connect(ctx.destination)

    const start = ctx.currentTime
    NOTES.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = start + i * STEP
      // a quick attack/decay envelope per note so they don't click
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(1, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + DURATION)
      osc.connect(gain)
      gain.connect(master)
      osc.start(t)
      osc.stop(t + DURATION)
    })

    // close the context shortly after the last note frees itself
    const total = start + NOTES.length * STEP + DURATION + 0.1
    setTimeout(() => void ctx.close().catch(() => {}), (total - start) * 1000 + 100)
  } catch {
    // no Web Audio, or autoplay blocked before a gesture — stay silent
  }
}
