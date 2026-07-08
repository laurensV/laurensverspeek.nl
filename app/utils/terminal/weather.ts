// Pure rendering for the terminal's `weather` command (data comes from the
// keyless open-meteo API, fetched client-side). WMO weather codes map onto a
// small wttr.in-style ASCII glyph plus a label.

export interface WeatherNow {
  temperature: number
  wind: number
  humidity: number
  code: number
}

interface Glyph {
  label: string
  art: string[]
}

const GLYPHS: { codes: (code: number) => boolean, glyph: Glyph }[] = [
  {
    codes: (c) => c === 0,
    glyph: { label: 'clear sky', art: ['    \\ | /  ', '     .-.   ', '  - (   ) -', '     `-\'   ', '    / | \\  '] }
  },
  {
    codes: (c) => c === 1 || c === 2,
    glyph: { label: 'partly cloudy', art: ['   \\ |     ', '    .-. -. ', ' - (  (   ).', '   (___(__)', '           '] }
  },
  {
    codes: (c) => c === 3,
    glyph: { label: 'overcast', art: ['           ', '     .--.  ', '  .-(    ). ', ' (___.__)__)', '           '] }
  },
  {
    codes: (c) => c === 45 || c === 48,
    glyph: { label: 'fog', art: ['           ', ' _ - _ - _ ', '  _ - _ -  ', ' _ - _ - _ ', '           '] }
  },
  {
    codes: (c) => (c >= 51 && c <= 57) || (c >= 61 && c <= 67) || (c >= 80 && c <= 82),
    glyph: { label: 'rain', art: ['     .-.   ', '    (   ). ', '   (___(__)', '    ʻ ʻ ʻ  ', '   ʻ ʻ ʻ   '] }
  },
  {
    codes: (c) => (c >= 71 && c <= 77) || c === 85 || c === 86,
    glyph: { label: 'snow', art: ['     .-.   ', '    (   ). ', '   (___(__)', '    * * *  ', '   * * *   '] }
  },
  {
    codes: (c) => c >= 95,
    glyph: { label: 'thunderstorm', art: ['     .-.   ', '    (   ). ', '   (___(__)', '    ⚡ʻ⚡   ', '   ʻ ʻ ʻ   '] }
  }
]

const FALLBACK: Glyph = { label: 'weather', art: ['           ', '     ?     ', '    ???    ', '     ?     ', '           '] }

export function weatherGlyph(code: number): Glyph {
  return GLYPHS.find((entry) => entry.codes(code))?.glyph ?? FALLBACK
}

/** ASCII art on the left, place + readings on the right. */
export function formatWeather(place: string, now: WeatherNow): string[] {
  const { label, art } = weatherGlyph(now.code)
  const info = [
    place,
    label,
    `${now.temperature}°C · wind ${now.wind} km/h · humidity ${now.humidity}%`
  ]
  // info sits vertically centered next to the 5-row glyph
  const offset = Math.floor((art.length - info.length) / 2)
  return art.map((row, i) => {
    const text = info[i - offset] ?? ''
    return `${row}  ${text}`.trimEnd()
  })
}
