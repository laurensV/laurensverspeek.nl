// Shared, dependency-free logic for the wpm race, imported by BOTH the relay
// server and the client (like pong-core/chess-core). The passages live here so
// the solo typing test and the online race type the same sentences, and the
// server can validate every progress report against the real text length.

/** @type {string[]} One corpus for the solo wpm test AND the online race. */
export const RACE_PASSAGES = [
  'the quick brown fox jumps over the lazy dog while the terminal hums quietly in amber',
  'a static site can still feel alive if you hide enough easter eggs in its corners',
  'first solve the problem then write the code then delete half of it the next morning',
  'a good commit message explains why the change exists not what the diff already shows',
  'somewhere between vim and the browser every developer ends up building a tiny os',
  'two visitors one passage and a relay holding the stopwatch may the fastest thumbs win',
  'never trust the client with the finish line the server saw who crossed it first'
]

/** ms between race-start (text revealed) and race-go (typing counts) */
export const RACE_COUNTDOWN_MS = 3000

/** @param {() => number} [random] @returns {string} */
export function pickPassage(random = Math.random) {
  return RACE_PASSAGES[Math.floor(random() * RACE_PASSAGES.length)] ?? RACE_PASSAGES[0] ?? ''
}

/**
 * True when a progress report is well-formed: an integer count of leading
 * correct characters that never runs backwards and never exceeds the passage.
 * @param {unknown} chars @param {number} previous @param {number} max
 * @returns {chars is number}
 */
export function validProgress(chars, previous, max) {
  return typeof chars === 'number'
    && Number.isInteger(chars)
    && chars >= previous
    && chars <= max
}
