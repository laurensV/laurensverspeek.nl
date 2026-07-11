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
      { params: { latitude: 52.37, longitude: 4.9, current: 'temperature_2m,weather_code' } }
    ).then((data) => {
      temp.value = Math.round(data.current.temperature_2m)
      code.value = data.current.weather_code
    }).catch(() => { /* the tray simply stays quiet */ })
  }

  // a single glyph for the WMO code (rough buckets)
  const glyph = computed(() => {
    const c = code.value
    if (c === null) return ''
    if (c === 0) return '☀'
    if (c <= 3) return '⛅'
    if (c <= 48) return '☁'
    if (c <= 67) return '🌧'
    if (c <= 77) return '❄'
    if (c <= 82) return '🌧'
    return '⛈'
  })

  return { temp, glyph }
}
