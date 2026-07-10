import { describe, it, expect } from 'vitest'
import { adoptPet, feedPet, playWithPet, petStage, petMood, petFace, petAge, isPetState } from '../app/utils/pet'

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
