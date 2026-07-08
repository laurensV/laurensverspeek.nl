import { describe, it, expect } from 'vitest'
import { weatherGlyph, formatWeather } from '../app/utils/terminal/weather'

describe('weatherGlyph', () => {
  it('maps the WMO code families onto labels', () => {
    expect(weatherGlyph(0).label).toBe('clear sky')
    expect(weatherGlyph(2).label).toBe('partly cloudy')
    expect(weatherGlyph(3).label).toBe('overcast')
    expect(weatherGlyph(48).label).toBe('fog')
    expect(weatherGlyph(55).label).toBe('rain')
    expect(weatherGlyph(63).label).toBe('rain')
    expect(weatherGlyph(81).label).toBe('rain')
    expect(weatherGlyph(73).label).toBe('snow')
    expect(weatherGlyph(86).label).toBe('snow')
    expect(weatherGlyph(96).label).toBe('thunderstorm')
  })

  it('falls back gracefully on unknown codes', () => {
    expect(weatherGlyph(42).label).toBe('weather')
    expect(weatherGlyph(42).art).toHaveLength(5)
  })

  it('all glyphs are five rows tall', () => {
    for (const code of [0, 1, 3, 45, 61, 75, 95]) {
      expect(weatherGlyph(code).art).toHaveLength(5)
    }
  })
})

describe('formatWeather', () => {
  const now = { temperature: 18.4, wind: 12, humidity: 78, code: 3 }

  it('pairs the glyph with place, label and readings', () => {
    const lines = formatWeather('Amsterdam, Netherlands', now)
    expect(lines).toHaveLength(5)
    const text = lines.join('\n')
    expect(text).toContain('Amsterdam, Netherlands')
    expect(text).toContain('overcast')
    expect(text).toContain('18.4°C · wind 12 km/h · humidity 78%')
  })

  it('keeps the info column aligned to the glyph rows', () => {
    const lines = formatWeather('X', now)
    // the place lands on the row where the vertical centering puts it
    expect(lines[1]).toContain('X')
    expect(lines[0]!.length).toBeLessThanOrEqual(lines[2]!.length + 60)
  })
})
