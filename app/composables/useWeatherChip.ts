import { AMSTERDAM, weatherGlyph } from '~/utils/weather'

// A tiny live-temperature chip for the lvOS tray. Amsterdam, keyless
// open-meteo, fetched once on mount — no geolocation prompt, no dependency.
let fetched = false

export function useWeatherChip() {
  const temp = useState<number | null>('weather-chip-temp', () => null)
  const code = useState<number | null>('weather-chip-code', () => null)

  if (import.meta.client && !fetched) {
    fetched = true
    void $fetch<{ current: { temperature_2m: number, weather_code: number } }>(
      'https://api.open-meteo.com/v1/forecast',
      { params: { ...AMSTERDAM, current: 'temperature_2m,weather_code' } }
    ).then((data) => {
      temp.value = Math.round(data.current.temperature_2m)
      code.value = data.current.weather_code
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
