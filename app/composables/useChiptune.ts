// Shared 8-bit "tracker": a square-wave arpeggio synthesized with WebAudio and
// exposed through a single AnalyserNode. State lives at module scope so the
// media player and the visualizer app control the same playback and read the
// same frequency/waveform data. No audio files were harmed.

const playing = ref(false)
const track = 'chiptune_dreams.mod'

let audioCtx: AudioContext | undefined
let analyserNode: AnalyserNode | undefined
let noteTimer: ReturnType<typeof setInterval> | undefined
let step = 0

// A minor arpeggio ladder — the chiptune classic
const MELODY = [220, 261.63, 329.63, 440, 329.63, 261.63, 246.94, 293.66, 369.99, 493.88, 369.99, 293.66]

const playNote = () => {
  if (!audioCtx || !analyserNode) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'square'
  osc.frequency.value = MELODY[step % MELODY.length]!
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
  osc.connect(gain)
  gain.connect(analyserNode)
  analyserNode.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.2)
  step++
}

const play = () => {
  if (playing.value) return
  audioCtx = new AudioContext()
  analyserNode = audioCtx.createAnalyser()
  analyserNode.fftSize = 256
  playing.value = true
  playNote()
  noteTimer = setInterval(playNote, 200)
}

const stop = () => {
  playing.value = false
  clearInterval(noteTimer)
  void audioCtx?.close()
  audioCtx = undefined
  analyserNode = undefined
}

/** Shared chiptune engine. Both media apps see the same play state + analyser. */
export function useChiptune() {
  const toggle = () => (playing.value ? stop() : play())
  const getAnalyser = () => analyserNode
  return { playing: readonly(playing), track, toggle, stop, getAnalyser }
}
