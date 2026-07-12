import { describe, it, expect } from 'vitest'
import { isLand, renderGlobe, tzToLon, vibeLat } from '../app/utils/globe'

describe('globe geography', () => {
  it('places known continents on land and open ocean on water', () => {
    expect(isLand(48, -100)).toBe(true) // north america
    expect(isLand(4, 20)).toBe(true) // central africa
    expect(isLand(-25, 134)).toBe(true) // australia
    expect(isLand(0, -150)).toBe(false) // middle of the pacific
    expect(isLand(30, -40)).toBe(false) // mid-atlantic
  })

  it('wraps longitude around the date line', () => {
    // siberia straddles ~90°E; a point near +180 vs its far edge shouldn't
    // read as ocean purely because of the raw longitude distance
    expect(isLand(52, 178)).toBe(isLand(52, -182 + 360))
  })
})

describe('renderGlobe', () => {
  it('draws a disc of the requested size', () => {
    const rows = renderGlobe(0, 42, 21)
    expect(rows).toHaveLength(21)
    expect(rows.every((row) => row.length === 42)).toBe(true)
    // the middle rows carry the globe, the extreme corners stay blank
    expect(rows[10]).toMatch(/[@%*·]/)
    expect(rows[0]!.startsWith(' ')).toBe(true)
  })

  it('spinning changes the visible face', () => {
    const a = renderGlobe(0, 42, 21).join('\n')
    const b = renderGlobe(Math.PI, 42, 21).join('\n')
    expect(a).not.toBe(b)
  })

  it('plots a front-facing marker and hides a back-facing one', () => {
    // spin 0 faces lon 0; a marker at lon 0 should be drawn, one at lon 180 not
    const front = renderGlobe(0, 42, 21, [{ lat: 0, lon: 0, self: true }]).join('')
    const back = renderGlobe(0, 42, 21, [{ lat: 0, lon: 180 }]).join('')
    expect(front).toContain('◉')
    expect(back).not.toContain('●')
  })
})

describe('coordinate helpers', () => {
  it('maps a UTC offset to a longitude', () => {
    expect(tzToLon(0)).toBe(0)
    expect(tzToLon(60)).toBe(15) // +1h → 15°E
    expect(tzToLon(-480)).toBe(-120) // UTC-8 → 120°W
    expect(tzToLon(9000)).toBe(180) // clamped
  })

  it('gives a stable, in-range latitude per visitor id', () => {
    expect(vibeLat(7)).toBe(vibeLat(7))
    for (const id of [0, 1, 42, 999]) {
      const lat = vibeLat(id)
      expect(lat).toBeGreaterThanOrEqual(-16)
      expect(lat).toBeLessThanOrEqual(49)
    }
  })
})
