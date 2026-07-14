import { AMSTERDAM, weatherGlyph, fetchCurrentWeather } from '~/utils/weather'

// A tiny live-temperature chip for the lvOS tray. Amsterdam, keyless
// open-meteo, fetched once on mount — no geolocation prompt, no dependency.
let fetched = false

export function useWeatherChip() {
  const temp = useState<number | null>('weather-chip-temp', () => null)
  const code = useState<number | null>('weather-chip-code', () => null)

  if (import.meta.client && !fetched) {
    fetched = true
    // the one shared current-weather fetch, also used by the terminal command
    void fetchCurrentWeather(AMSTERDAM).then((w) => {
      temp.value = Math.round(w.temp) // the chip shows whole degrees
      code.value = w.code
    }).catch(() => { /* the tray simply stays quiet */ })
  }

  const glyph = computed(() => weatherGlyph(code.value))

  // the full weather app fetches a fresher current reading than the tray's
  // once-on-mount snapshot; letting it push that back keeps the tray chip and
  // the app from showing two different temperatures for the same city
  const setCurrent = (t: number, c: number) => {
    temp.value = t
    code.value = c
  }

  return { temp, glyph, setCurrent }
}
