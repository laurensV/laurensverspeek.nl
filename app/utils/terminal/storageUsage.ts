// Real numbers for the terminal's df/du: how much of the visitor's
// localStorage this site actually uses, per key. Formatting is pure; the
// collector guards against blocked storage.

export interface StorageSlice {
  key: string
  bytes: number
}

/** Browsers commonly cap localStorage around 5MB per origin. */
export const STORAGE_QUOTA = 5 * 1024 * 1024

export function collectStorageSlices(): StorageSlice[] {
  try {
    return Object.keys(localStorage)
      .map((key) => ({
        key,
        // UTF-16: two bytes per stored character, key included
        bytes: (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2
      }))
      .sort((a, b) => b.bytes - a.bytes)
  } catch {
    return []
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`
}

const BAR_WIDTH = 10

export interface UsageLine {
  type: 'output' | 'muted' | 'primary'
  text: string
  html?: boolean
}

export function dfLines(slices: StorageSlice[], quota = STORAGE_QUOTA): UsageLine[] {
  if (!slices.length) return [{ type: 'muted', text: 'df: no local data yet — this site travels light' }]
  const lines: UsageLine[] = [{
    type: 'output',
    text: `<span class="term-accent">${'FILESYSTEM'.padEnd(28)}${'USED'.padStart(7)}  USE%</span>`,
    html: true
  }]
  for (const slice of slices) {
    const share = slice.bytes / quota
    const ticks = Math.min(BAR_WIDTH, Math.max(share > 0 ? 1 : 0, Math.round(share * BAR_WIDTH)))
    const bar = `[${'|'.repeat(ticks)}${' '.repeat(BAR_WIDTH - ticks)}]`
    lines.push({
      type: 'output',
      text: `${slice.key.padEnd(28)}${formatBytes(slice.bytes).padStart(7)}  ${bar} ${(share * 100).toFixed(2)}%`
    })
  }
  const total = slices.reduce((sum, slice) => sum + slice.bytes, 0)
  lines.push({
    type: 'muted',
    text: `${'TOTAL'.padEnd(28)}${formatBytes(total).padStart(7)}  of a ~${formatBytes(quota)} quota (${((total / quota) * 100).toFixed(2)}%)`
  })
  return lines
}

export function duLines(slices: StorageSlice[]): UsageLine[] {
  if (!slices.length) return [{ type: 'muted', text: 'du: nothing stored' }]
  return slices.map((slice) => ({
    type: 'output' as const,
    text: `${formatBytes(slice.bytes).padStart(7)}  ${slice.key}`
  }))
}
