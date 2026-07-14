// Parsing for the terminal `timer` command — kept pure + tested, out of the
// command handler.

/** Parse a human duration ("5m", "90s", "1h30m", or a bare integer = seconds)
 * into milliseconds. Returns null when nothing usable parses (empty, or junk
 * like "5x" / "abc"). */
export function parseDuration(spec: string): number | null {
  const s = spec.trim().toLowerCase()
  if (!s) return null
  // a bare integer is a count of seconds
  if (/^\d+$/.test(s)) return Number(s) * 1000
  const parts = [...s.matchAll(/(\d+)\s*([hms])/g)]
  if (!parts.length) return null
  // the whole string must be h/m/s chunks — reject leftover junk
  if (s.replace(/(\d+)\s*[hms]/g, '').trim() !== '') return null
  const unit: Record<string, number> = { h: 3600_000, m: 60_000, s: 1000 }
  return parts.reduce((ms, part) => ms + Number(part[1]) * (unit[part[2] ?? 's'] ?? 1000), 0)
}

/** Format a millisecond duration back to a compact label ("1h30m", "90s"). */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h ? `${h}h` : '', m ? `${m}m` : '', s ? `${s}s` : ''].filter(Boolean).join('') || '0s'
}
