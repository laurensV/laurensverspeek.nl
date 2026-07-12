import { describe, it, expect } from 'vitest'
import { hslToRgb, rgbToHex, hexToRgb, rgbToHsl } from '../app/utils/color'

describe('colour conversions', () => {
  it('hsl → rgb for known anchors', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 })
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 })
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 })
    expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('rgb → hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    expect(rgbToHex(255, 186, 0)).toBe('#ffba00') // the site amber
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('hex → rgb, rejecting junk', () => {
    expect(hexToRgb('#ffba00')).toEqual({ r: 255, g: 186, b: 0 })
    expect(hexToRgb('ffba00')).toEqual({ r: 255, g: 186, b: 0 })
    expect(hexToRgb('nope')).toBeNull()
  })

  it('round-trips hsl → rgb → hsl', () => {
    const hsl = rgbToHsl(...Object.values(hslToRgb(44, 100, 50)) as [number, number, number])
    expect(hsl.h).toBeGreaterThanOrEqual(43)
    expect(hsl.h).toBeLessThanOrEqual(45)
    expect(hsl.s).toBe(100)
    expect(hsl.l).toBe(50)
  })
})
