// Pure month-calendar renderer for the `cal` terminal command. Kept free of any
// Nuxt/DOM dependency so it can be unit-tested directly.

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// A calendar grid is 7 two-char columns joined by single spaces → 20 chars wide.
const GRID_WIDTH = WEEKDAYS.join(' ').length

/**
 * Render a Sunday-first month grid as fixed-width monospace lines:
 * a centered "Month YYYY" title, the weekday header, then the weeks.
 */
export function renderCalendar(date: Date): string[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const startDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const title = `${MONTHS[month]} ${year}`
  const pad = Math.max(0, Math.floor((GRID_WIDTH - title.length) / 2))
  const lines = [' '.repeat(pad) + title, WEEKDAYS.join(' ')]

  let week = Array.from({ length: startDay }, () => '  ')
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(String(day).padStart(2, ' '))
    if (week.length === 7) {
      lines.push(week.join(' '))
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push('  ')
    lines.push(week.join(' '))
  }
  return lines
}
