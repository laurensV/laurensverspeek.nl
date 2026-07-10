// The site pet: a tiny persistent tamagotchi. All rules are pure functions of
// (state, now) so the whole creature is unit-testable; the composable feeds it
// timestamps and the status bar just renders the face.

export interface PetState {
  name: string
  born: number // epoch ms
  lastFed: number
  lastPlayed: number
}

export type PetStage = 'egg' | 'hatchling' | 'juvenile' | 'adult'
export type PetMood = 'asleep' | 'happy' | 'content' | 'hungry' | 'sulking'

const HOUR = 3_600_000
const DAY = 24 * HOUR

export const adoptPet = (name: string, now: number): PetState => ({
  name,
  born: now,
  lastFed: now,
  lastPlayed: now
})

export const feedPet = (pet: PetState, now: number): PetState => ({ ...pet, lastFed: now })
export const playWithPet = (pet: PetState, now: number): PetState => ({ ...pet, lastPlayed: now })

export function petStage(pet: PetState, now: number): PetStage {
  const age = now - pet.born
  if (age < HOUR) return 'egg'
  if (age < 2 * DAY) return 'hatchling'
  if (age < 7 * DAY) return 'juvenile'
  return 'adult'
}

export function petMood(pet: PetState, now: number, hourOfDay: number): PetMood {
  if (hourOfDay >= 23 || hourOfDay < 6) return 'asleep'
  const sinceFed = now - pet.lastFed
  if (sinceFed > 36 * HOUR) return 'sulking'
  if (sinceFed > 18 * HOUR) return 'hungry'
  // recent play keeps spirits high even between meals
  if (sinceFed < 6 * HOUR || now - pet.lastPlayed < 12 * HOUR) return 'happy'
  return 'content'
}

/** One-line monospace face for the status bar and the terminal card. */
export function petFace(stage: PetStage, mood: PetMood): string {
  if (stage === 'egg') return mood === 'asleep' ? '(‥)' : '(○)'
  const eyes = {
    asleep: '–ᴥ–',
    happy: '◕ᴥ◕',
    content: '°ᴥ°',
    hungry: 'ᴗᴥᴗ',
    sulking: '´ᴥ`'
  }[mood]
  const face = `(${eyes})`
  if (mood === 'asleep') return `${face} ᶻ`
  if (stage === 'adult') return `${face}✧` // elders earn a little sparkle
  return face
}

export const petMoodLine = (mood: PetMood): string => ({
  asleep: 'fast asleep. pixel pets keep strict hours.',
  happy: 'delighted. tail-wag frequency: 60fps.',
  content: 'doing fine. contemplating the cursor.',
  hungry: 'peckish. dreams of fresh bytes.',
  sulking: 'sulking — it has not been fed in ages. one meal fixes everything.'
}[mood])

/** Rough age label: "2 days", "3 hours", "just hatched". */
export function petAge(pet: PetState, now: number): string {
  const age = now - pet.born
  if (age < HOUR) return 'not even an hour old'
  if (age < DAY) return `${Math.floor(age / HOUR)}h old`
  return `${Math.floor(age / DAY)}d old`
}

export const isPetState = (parsed: unknown): parsed is PetState => {
  if (typeof parsed !== 'object' || parsed === null) return false
  const candidate = parsed as Record<string, unknown>
  return typeof candidate.name === 'string' && candidate.name.length > 0
    && typeof candidate.born === 'number'
    && typeof candidate.lastFed === 'number'
    && typeof candidate.lastPlayed === 'number'
}
