import { describe, it, expect } from 'vitest'
import { formatWeather } from '../app/utils/terminal/weather'
import { weatherCategory, weatherLabel } from '../app/utils/weather'

describe('weatherCategory', () => {
  it('buckets the WMO code families into art categories', () => {
    expect(weatherCategory(0)).toBe('clear')
    expect(weatherCategory(2)).toBe('cloudy')
    expect(weatherCategory(3)).toBe('overcast')
    expect(weatherCategory(48)).toBe('fog')
    expect(weatherCategory(55)).toBe('rain')
    expect(weatherCategory(63)).toBe('rain')
    expect(weatherCategory(81)).toBe('rain')
    expect(weatherCategory(73)).toBe('snow')
    expect(weatherCategory(86)).toBe('snow')
    expect(weatherCategory(96)).toBe('storm')
  })
})

describe('formatWeather', () => {
  const now = { temperature: 18.4, wind: 12, humidity: 78, code: 3 }

  it('pairs the art with place, the shared label and the readings', () => {
    const lines = formatWeather('Amsterdam, Netherlands', now)
    expect(lines).toHaveLength(5)
    const text = lines.join('\n')
    expect(text).toContain('Amsterdam, Netherlands')
    expect(text).toContain('overcast')
    expect(text).toContain('18.4°C · wind 12 km/h · humidity 78%')
  })

  it('shows the same condition label the app and tray use', () => {
    // code 48 read "fog" in the terminal but "rime fog" in the app — now one
    for (const code of [1, 48, 55, 81]) {
      const lines = formatWeather('X', { temperature: 5, wind: 3, humidity: 90, code })
      expect(lines.join('\n')).toContain(weatherLabel(code))
    }
  })

  it('keeps the info column aligned to the art rows', () => {
    const lines = formatWeather('X', now)
    // the place lands on the row where the vertical centering puts it
    expect(lines[1]).toContain('X')
    expect(lines[0]!.length).toBeLessThanOrEqual(lines[2]!.length + 60)
  })
})
