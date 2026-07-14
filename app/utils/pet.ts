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

// ---- the pet economy -------------------------------------------------------
// Game high scores mint coins (derived from the SAME localStorage keys the
// hall of fame reads — no second score ledger); coins buy snacks and
// accessories the sprite actually wears.

export interface PetWallet {
  spent: number
  accessories: string[]
}

export const emptyWallet = (): PetWallet => ({ spent: 0, accessories: [] })

export const isPetWallet = (parsed: unknown): parsed is PetWallet => {
  if (typeof parsed !== 'object' || parsed === null) return false
  const candidate = parsed as Record<string, unknown>
  return typeof candidate.spent === 'number' && candidate.spent >= 0
    && Array.isArray(candidate.accessories)
    && candidate.accessories.every((item) => typeof item === 'string')
}

export interface PetAccessory {
  id: string
  name: string
  glyph: string
  cost: number
}

export const PET_SHOP: PetAccessory[] = [
  { id: 'bowtie', name: 'a dapper bowtie', glyph: '🎀', cost: 20 },
  { id: 'hat', name: 'a tiny top hat', glyph: '🎩', cost: 35 },
  { id: 'crown', name: 'a pixel crown', glyph: '👑', cost: 60 }
]

export const SNACK_COST = 5

export interface ScoreReadings {
  snake: number
  asteroids: number
  tetris: number
  g2048: number
  wpm: number
  /** how many minesweeper difficulties have a best time */
  minesBests: number
  /** longest pong rally */
  pong: number
  /** online pong + chess matches won against real visitors */
  duelWins: number
  /** chess games won against the house AI */
  chessAiWins: number
}

/** Total coins ever minted by the visitor's high scores. */
export function coinsEarned(scores: ScoreReadings): number {
  return Math.floor(scores.snake / 10)
    + Math.floor(scores.asteroids / 50)
    + Math.floor(scores.tetris / 100)
    + Math.floor(scores.g2048 / 100)
    + Math.floor(scores.wpm / 5)
    + scores.minesBests * 15
    + Math.floor(scores.pong / 2)
    + scores.duelWins * 10
    + scores.chessAiWins * 5
}

/** Dress the face: head gear in front, neckwear behind. */
export function gearFace(face: string, accessories: string[]): string {
  const head = accessories.includes('crown') ? '👑' : accessories.includes('hat') ? '🎩' : ''
  const neck = accessories.includes('bowtie') ? '🎀' : ''
  return `${head}${face}${neck}`
}

/** Returns the wallet after buying, or an error string. */
export function buyAccessory(wallet: PetWallet, id: string, earned: number): PetWallet | string {
  const item = PET_SHOP.find((entry) => entry.id === id)
  if (!item) return `no such item — the shop stocks: ${PET_SHOP.map((entry) => entry.id).join(', ')}`
  if (wallet.accessories.includes(id)) return `${item.name} is already in the wardrobe`
  const balance = earned - wallet.spent
  if (balance < item.cost) return `${item.name} costs ${item.cost} coins — you have ${balance}. beat some high scores.`
  return { spent: wallet.spent + item.cost, accessories: [...wallet.accessories, id] }
}
