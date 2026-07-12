// WMO weather-code helpers, shared by the lvOS tray chip and the Weather app so
// they never disagree on what code 61 looks like. open-meteo is the single
// upstream (keyless, Amsterdam) everywhere weather appears on the site.

export const AMSTERDAM = { latitude: 52.37, longitude: 4.9 } as const

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
