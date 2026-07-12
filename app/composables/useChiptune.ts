// Shared 8-bit "tracker": a square-wave arpeggio synthesized with WebAudio and
// exposed through a single AnalyserNode. State lives at module scope; the
// media player (with its visualizer modes) controls playback and reads the
// frequency/waveform data. No audio files were harmed.

const playing = ref(false)

// the tiny record crate: each track is a looped arpeggio with its own tempo
const TRACKS = [
  // A minor ladder — the chiptune classic
  { name: 'chiptune_dreams.mod', tempo: 200, melody: [220, 261.63, 329.63, 440, 329.63, 261.63, 246.94, 293.66, 369.99, 493.88, 369.99, 293.66] },
  // slower, moodier suspended shapes
  { name: 'bitcrush_sunset.mod', tempo: 260, melody: [196, 246.94, 293.66, 392, 293.66, 246.94, 174.61, 220, 261.63, 349.23, 261.63, 220] },
  // brisk major-pentatonic joyride
  { name: '8bit_autobahn.mod', tempo: 150, melody: [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 369.99, 440, 587.33, 440, 369.99] }
] as const

const trackIndex = ref(0)
const track = computed(() => TRACKS[trackIndex.value % TRACKS.length]!.name)

let audioCtx: AudioContext | undefined
let analyserNode: AnalyserNode | undefined
let masterGain: GainNode | undefined
let noteTimer: ReturnType<typeof setInterval> | undefined
let step = 0

// the shared lvOS volume (useVolume) drives this master gain; kept in a plain
// var so play() can apply it without needing a Nuxt context
let currentLevel = 0.7
let volumeWired = false

const playNote = () => {
  if (!audioCtx || !analyserNode) return
  const melody = TRACKS[trackIndex.value % TRACKS.length]!.melody
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'square'
  osc.frequency.value = melody[step % melody.length]!
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18)
  osc.connect(gain)
  gain.connect(analyserNode)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.2)
  step++
}

const startTicker = () => {
  clearInterval(noteTimer)
  playNote()
  noteTimer = setInterval(playNote, TRACKS[trackIndex.value % TRACKS.length]!.tempo)
}

const play = () => {
  if (playing.value) return
  audioCtx = new AudioContext()
  analyserNode = audioCtx.createAnalyser()
  analyserNode.fftSize = 256
  masterGain = audioCtx.createGain()
  masterGain.gain.value = currentLevel
  analyserNode.connect(masterGain)
  masterGain.connect(audioCtx.destination)
  playing.value = true
  startTicker()
}

/** Skip to the next (or a specific) track; keeps playing if already playing. */
const next = (index?: number) => {
  trackIndex.value = ((index ?? trackIndex.value + 1) + TRACKS.length) % TRACKS.length
  step = 0
  if (playing.value) startTicker()
}

const stop = () => {
  playing.value = false
  clearInterval(noteTimer)
  void audioCtx?.close()
  audioCtx = undefined
  analyserNode = undefined
  masterGain = undefined
}

/** Shared chiptune engine. Both media apps see the same play state + analyser. */
export function useChiptune() {
  // one app-lifetime watcher ties the master gain to the shared lvOS volume
  const { level } = useVolume()
  if (import.meta.client && !volumeWired) {
    volumeWired = true
    effectScope(true).run(() => {
      watch(level, (value) => {
        currentLevel = value
        if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(value, audioCtx.currentTime, 0.05)
      }, { immediate: true })
    })
  }

  const toggle = () => (playing.value ? stop() : play())
  const getAnalyser = () => analyserNode
  const trackNames = TRACKS.map((entry) => entry.name)
  return { playing: readonly(playing), track, trackNames, trackIndex: readonly(trackIndex), toggle, next, stop, getAnalyser }
}
