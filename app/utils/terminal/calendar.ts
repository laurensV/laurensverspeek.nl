// Pure month-calendar core, shared by the terminal `cal` command and the lvOS
// taskbar calendar popover so the two can't disagree on the week start (they
// used to: `cal` rendered Sunday-first while the popover was Monday-first). Kept
// free of any Nuxt/DOM dependency so it can be unit-tested directly.
//
// Monday-first throughout — the site's European convention, matching the lvOS
// popover it now shares this math with.

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export interface MonthGrid {
  /** e.g. "July 2026" */
  title: string
  /** number of blank cells before day 1, with Monday as the first column */
  leadingBlanks: number
  /** days in the month */
  daysInMonth: number
}

/** The month-grid geometry both calendar surfaces build from. */
export function monthGrid(date: Date): MonthGrid {
  const year = date.getFullYear()
  const month = date.getMonth()
  // getDay() is 0=Sunday; shift so Monday is column 0
  const firstDay = new Date(year, month, 1).getDay()
  return {
    title: `${MONTHS[month]} ${year}`,
    leadingBlanks: (firstDay + 6) % 7,
    daysInMonth: new Date(year, month + 1, 0).getDate()
  }
}

// A calendar grid is 7 two-char columns joined by single spaces → 20 chars wide.
const GRID_WIDTH = WEEKDAYS.join(' ').length

/**
 * Render a Monday-first month grid as fixed-width monospace lines:
 * a centered "Month YYYY" title, the weekday header, then the weeks.
 */
export function renderCalendar(date: Date): string[] {
  const { title, leadingBlanks, daysInMonth } = monthGrid(date)

  const pad = Math.max(0, Math.floor((GRID_WIDTH - title.length) / 2))
  const lines = [' '.repeat(pad) + title, WEEKDAYS.join(' ')]

  let week = Array.from({ length: leadingBlanks }, () => '  ')
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
