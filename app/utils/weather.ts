// WMO weather-code helpers, shared by the lvOS tray chip and the Weather app so
// they never disagree on what code 61 looks like. open-meteo is the single
// upstream (keyless, Amsterdam) everywhere weather appears on the site.

export const AMSTERDAM = { latitude: 52.37, longitude: 4.9 } as const

/** A current-conditions reading from open-meteo (temp rounded). */
export interface CurrentWeather { temp: number, code: number, wind: number, humidity: number }

/** Fetch current conditions for a spot — one call shared by the tray chip and
 * the terminal `weather` command so they don't each hit open-meteo their own
 * way. `extended` also asks for wind + humidity (0 otherwise). */
export async function fetchCurrentWeather(
  coords: { latitude: number, longitude: number },
  extended = false
): Promise<CurrentWeather> {
  const current = extended
    ? 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m'
    : 'temperature_2m,weather_code'
  const data = await $fetch<{ current: { temperature_2m: number, weather_code: number, wind_speed_10m?: number, relative_humidity_2m?: number } }>(
    'https://api.open-meteo.com/v1/forecast',
    { query: { ...coords, current }, timeout: 10_000 }
  )
  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    wind: Math.round(data.current.wind_speed_10m ?? 0),
    humidity: Math.round(data.current.relative_humidity_2m ?? 0)
  }
}

/** A single glyph for a WMO weather code (rough buckets). */
export function weatherGlyph(code: number | null): string {
  if (code === null) return ''
  if (code === 0) return '☀'
  if (code <= 3) return '⛅'
  if (code <= 48) return '☁'
  if (code <= 67) return '🌧'
  if (code <= 77) return '❄'
  if (code <= 82) return '🌧'
  return '⛈'
}

/** Coarse art/condition bucket for a WMO code — the one place that decides
 * which sky a code belongs to, shared by the tray, the app and the terminal
 * `weather` command so they never disagree on what code 1 or 48 looks like. */
export type WeatherCategory = 'clear' | 'cloudy' | 'overcast' | 'fog' | 'rain' | 'snow' | 'storm'
export function weatherCategory(code: number): WeatherCategory {
  if (code === 0) return 'clear'
  if (code <= 2) return 'cloudy'
  if (code === 3) return 'overcast'
  if (code <= 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  return 'storm'
}

/** A short human label for a WMO weather code. */
export function weatherLabel(code: number | null): string {
  if (code === null) return '—'
  const labels: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'fog', 48: 'rime fog',
    51: 'light drizzle', 53: 'drizzle', 55: 'dense drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain',
    66: 'freezing rain', 67: 'freezing rain',
    71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
    80: 'light showers', 81: 'showers', 82: 'violent showers',
    85: 'snow showers', 86: 'snow showers',
    95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm with hail'
  }
  return labels[code] ?? 'unknown'
}
