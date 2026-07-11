// A GitHub-style contribution heatmap as ASCII, built from a date→count map.
// The public events API is keyless but only covers recent activity, so this is
// an honest "recent contributions" grid (default 13 weeks), not the full year.
// Pure + tested: the command just fetches and hands the counts here.

export interface DayCount {
  /** YYYY-MM-DD */
  date: string
  count: number
}

const SHADES = ['·', '░', '▒', '▓', '█'] // 0 … most
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Map a raw count to a 0–4 shade level given the busiest day. */
export function shadeLevel(count: number, max: number): number {
  if (count <= 0) return 0
  if (max <= 0) return 0
  const ratio = count / max
  if (ratio > 0.66) return 4
  if (ratio > 0.33) return 3
  if (ratio > 0.1) return 2
  return 1
}

/**
 * Render the `weeks` most recent weeks ending on `today` as a 7-row grid
 * (Sun→Sat), one column per week, plus a month header and a legend. Returns
 * terminal lines. Pure: pass `today` for determinism in tests.
 */
export function buildContribGraph(days: DayCount[], today: Date, weeks = 13): string[] {
  const counts = new Map(days.map((d) => [d.date, d.count]))
  // end on the Saturday of this week so columns are whole weeks
  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1))

  // column-major grid[week][dow]
  const grid: number[][] = Array.from({ length: weeks }, () => Array<number>(7).fill(-1))
  const monthAt: (string | null)[] = Array<string | null>(weeks).fill(null)
  let max = 0
  const cursor = new Date(start)
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      if (cursor <= end) {
        const key = iso(cursor)
        const c = counts.get(key) ?? 0
        grid[w]![d] = c
        max = Math.max(max, c)
        // label a column with the month name when its first day starts one
        if (cursor.getUTCDate() <= 7 && d === 0) monthAt[w] = MONTHS[cursor.getUTCMonth()]!
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }

  // month header aligned over the columns (each cell is 1 char wide)
  const header = '    ' + monthAt.map((m) => (m ? m[0]! : ' ')).join('')
  const rows = DOW.map((label, d) => {
    const cells = grid.map((week) => {
      const c = week[d]!
      return c < 0 ? ' ' : SHADES[shadeLevel(c, max)]!
    }).join('')
    // show only Mon/Wed/Fri labels, like GitHub
    const rowLabel = d === 1 || d === 3 || d === 5 ? label.padEnd(4) : '    '
    return rowLabel + cells
  })

  const total = days.reduce((sum, d) => sum + d.count, 0)
  const legend = `less ${SHADES.join('')} more   ${total} contributions in the last ${weeks} weeks`
  return [header, ...rows, '', legend]
}
