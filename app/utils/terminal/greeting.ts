// Time-aware flavor line for the terminal greeting. Pure: takes the hour so
// tests (and the 404 shell, if it ever wants it) can pin the clock.

export function greetingLine(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning. The coffee is virtual, the shell is real.'
  if (hour >= 12 && hour < 18) return 'Good afternoon. The shell is warmed up.'
  if (hour >= 18 && hour < 23) return 'Good evening. Prime hacking hours.'
  return 'Up late? The best commits happen after midnight (citation needed).'
}
