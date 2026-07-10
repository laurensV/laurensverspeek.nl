// Pure logic for the tmux-style terminal panes: pane order, focus movement
// and layout classing. The reactive state lives in useTerminal; keeping the
// decisions here makes them unit-testable.

export const MAX_PANES = 4

export type SplitDir = 'cols' | 'rows'

/** Panes render in creation order, the classic transcript (id 0) first. */
export const paneOrder = (extraIds: number[]): number[] => [0, ...extraIds]

export const canSplit = (paneCount: number): boolean => paneCount < MAX_PANES

/** Move focus by step through the pane order, wrapping at both ends. */
export function nextFocus(order: number[], current: number, step: 1 | -1): number {
  if (!order.length) return 0
  const index = order.indexOf(current)
  if (index === -1) return order[0]!
  return order[(index + step + order.length) % order.length]!
}

/** After closing a pane, focus its previous neighbour (or the first pane). */
export function focusAfterClose(order: number[], closed: number): number {
  const remaining = order.filter((id) => id !== closed)
  if (!remaining.length) return 0
  const index = order.indexOf(closed)
  return remaining[Math.max(0, index - 1)] ?? remaining[0]!
}

/** Layout class for the pane grid: single, two columns/rows, or a 2×2 grid. */
export function paneLayout(paneCount: number, dir: SplitDir): 'is-single' | 'is-cols' | 'is-rows' | 'is-grid' {
  if (paneCount <= 1) return 'is-single'
  if (paneCount === 2) return dir === 'rows' ? 'is-rows' : 'is-cols'
  return 'is-grid'
}

/** Which tmux prefix keys do what; null = not a pane key. */
export function prefixAction(key: string):
  | { kind: 'split', dir: SplitDir }
  | { kind: 'focus', step: 1 | -1 }
  | { kind: 'close' }
  | null {
  switch (key) {
    case '%': return { kind: 'split', dir: 'cols' }
    case '"': return { kind: 'split', dir: 'rows' }
    case 'o':
    case 'ArrowRight':
    case 'ArrowDown':
      return { kind: 'focus', step: 1 }
    case 'ArrowLeft':
    case 'ArrowUp':
      return { kind: 'focus', step: -1 }
    case 'x': return { kind: 'close' }
    default: return null
  }
}
