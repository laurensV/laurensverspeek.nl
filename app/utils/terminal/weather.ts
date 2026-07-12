import { weatherCategory, weatherLabel, type WeatherCategory } from '~/utils/weather'

// Pure rendering for the terminal's `weather` command (data comes from the
// keyless open-meteo API, fetched client-side). The condition text comes from
// the shared weatherLabel so the command agrees with the tray and the app; the
// ASCII art is picked by the shared weatherCategory bucket.

export interface WeatherNow {
  temperature: number
  wind: number
  humidity: number
  code: number
}

const ART: Record<WeatherCategory, string[]> = {
  clear: ['    \\ | /  ', '     .-.   ', '  - (   ) -', '     `-\'   ', '    / | \\  '],
  cloudy: ['   \\ |     ', '    .-. -. ', ' - (  (   ).', '   (___(__)', '           '],
  overcast: ['           ', '     .--.  ', '  .-(    ). ', ' (___.__)__)', '           '],
  fog: ['           ', ' _ - _ - _ ', '  _ - _ -  ', ' _ - _ - _ ', '           '],
  rain: ['     .-.   ', '    (   ). ', '   (___(__)', '    ʻ ʻ ʻ  ', '   ʻ ʻ ʻ   '],
  snow: ['     .-.   ', '    (   ). ', '   (___(__)', '    * * *  ', '   * * *   '],
  storm: ['     .-.   ', '    (   ). ', '   (___(__)', '    ⚡ʻ⚡   ', '   ʻ ʻ ʻ   ']
}

/** ASCII art on the left, place + readings on the right. */
export function formatWeather(place: string, now: WeatherNow): string[] {
  const art = ART[weatherCategory(now.code)]
  const label = weatherLabel(now.code)
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
