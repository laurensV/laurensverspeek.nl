import { describe, it, expect } from 'vitest'
import { adoptPet, feedPet, playWithPet, petStage, petMood, petFace, petAge, isPetState, coinsEarned, buyAccessory, emptyWallet, gearFace, isPetWallet, type PetWallet } from '../app/utils/pet'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const T0 = 1_750_000_000_000
const NOON = 12 // any awake hour

describe('pet', () => {
  it('grows through its stages by age', () => {
    const pet = adoptPet('pixel', T0)
    expect(petStage(pet, T0)).toBe('egg')
    expect(petStage(pet, T0 + 2 * HOUR)).toBe('hatchling')
    expect(petStage(pet, T0 + 3 * DAY)).toBe('juvenile')
    expect(petStage(pet, T0 + 8 * DAY)).toBe('adult')
  })

  it('gets hungry and eventually sulks between meals', () => {
    const pet = adoptPet('pixel', T0)
    expect(petMood(pet, T0 + HOUR, NOON)).toBe('happy')
    expect(petMood(pet, T0 + 20 * HOUR, NOON)).toBe('hungry')
    expect(petMood(pet, T0 + 40 * HOUR, NOON)).toBe('sulking')
    // one meal fixes everything
    const fed = feedPet(pet, T0 + 40 * HOUR)
    expect(petMood(fed, T0 + 40 * HOUR, NOON)).toBe('happy')
  })

  it('recent play keeps it happy even when a meal is a while ago', () => {
    const pet = adoptPet('pixel', T0)
    // 13h after feeding (and adoption-day play): merely content…
    expect(petMood(pet, T0 + 13 * HOUR, NOON)).toBe('content')
    // …but happy again right after a round of play
    const played = playWithPet(pet, T0 + 12 * HOUR)
    expect(petMood(played, T0 + 13 * HOUR, NOON)).toBe('happy')
  })

  it('sleeps at night regardless of hunger', () => {
    const pet = adoptPet('pixel', T0)
    expect(petMood(pet, T0 + 40 * HOUR, 2)).toBe('asleep')
    expect(petMood(pet, T0 + HOUR, 23)).toBe('asleep')
  })

  it('renders stage- and mood-appropriate faces', () => {
    expect(petFace('egg', 'content')).toBe('(○)')
    expect(petFace('hatchling', 'happy')).toBe('(◕ᴥ◕)')
    expect(petFace('adult', 'happy')).toContain('✧')
    expect(petFace('juvenile', 'asleep')).toContain('ᶻ')
  })

  it('labels its age readably', () => {
    const pet = adoptPet('pixel', T0)
    expect(petAge(pet, T0)).toBe('not even an hour old')
    expect(petAge(pet, T0 + 5 * HOUR)).toBe('5h old')
    expect(petAge(pet, T0 + 3 * DAY)).toBe('3d old')
  })

  it('validates persisted state strictly', () => {
    expect(isPetState(adoptPet('pixel', T0))).toBe(true)
    expect(isPetState(null)).toBe(false)
    expect(isPetState({ name: '', born: T0, lastFed: T0, lastPlayed: T0 })).toBe(false)
    expect(isPetState({ name: 'x', born: 'yesterday', lastFed: T0, lastPlayed: T0 })).toBe(false)
  })
})

describe('pet economy', () => {
  it('mints coins from the hall-of-fame score readings', () => {
    expect(coinsEarned({ snake: 0, tetris: 0, g2048: 0, wpm: 0, minesBests: 0, pong: 0, duelWins: 0, chessAiWins: 0 })).toBe(0)
    expect(coinsEarned({ snake: 105, tetris: 1250, g2048: 512, wpm: 62, minesBests: 2, pong: 9, duelWins: 3, chessAiWins: 4 }))
      .toBe(10 + 12 + 5 + 12 + 30 + 4 + 30 + 20)
  })

  it('sells an affordable accessory exactly once', () => {
    const bought = buyAccessory(emptyWallet(), 'bowtie', 25)
    expect(bought).toEqual({ spent: 20, accessories: ['bowtie'] })
    expect(typeof buyAccessory(bought as PetWallet, 'bowtie', 100)).toBe('string') // already owned
  })

  it('refuses when broke or when the item does not exist', () => {
    expect(typeof buyAccessory(emptyWallet(), 'hat', 10)).toBe('string') // hat costs 35
    expect(typeof buyAccessory(emptyWallet(), 'jetpack', 999)).toBe('string')
  })

  it('dresses the face with head gear in front and neckwear behind', () => {
    expect(gearFace('(°ᴥ°)', [])).toBe('(°ᴥ°)')
    expect(gearFace('(°ᴥ°)', ['hat', 'bowtie'])).toBe('🎩(°ᴥ°)🎀')
    expect(gearFace('(°ᴥ°)', ['hat', 'crown'])).toBe('👑(°ᴥ°)') // the crown outranks the hat
  })

  it('validates wallets from storage', () => {
    expect(isPetWallet({ spent: 5, accessories: ['hat'] })).toBe(true)
    expect(isPetWallet({ spent: -1, accessories: [] })).toBe(false)
    expect(isPetWallet({ spent: 0, accessories: [42] })).toBe(false)
    expect(isPetWallet('nope')).toBe(false)
  })
})
