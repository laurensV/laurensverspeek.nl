import type { GameHandle, GameCallbacks } from '~/utils/games/types'

// A tiny `less`-style pager: pipe a command's output through `| less` and it
// takes over the terminal with a scrollable window instead of dumping a wall
// of scrollback. j/k or ↑/↓ scroll a line, space/b page, g/G jump, / searches,
// q quits. Pure over its `lines` — the terminal captures the output and hands
// it here.

const ROWS = 18

export function createPager(lines: string[], { onFrame, onEnd }: GameCallbacks): GameHandle {
  let top = 0
  let search = ''
  let searching = false
  const maxTop = () => Math.max(0, lines.length - ROWS)

  const render = () => {
    top = Math.max(0, Math.min(top, maxTop()))
    const view = lines.slice(top, top + ROWS)
    // pad to a stable height so the frame doesn't jump
    while (view.length < ROWS) view.push('~')
    const shownEnd = Math.min(top + ROWS, lines.length)
    const pct = lines.length ? Math.round((shownEnd / lines.length) * 100) : 100
    const status = searching
      ? `/${search}`
      : `less — ${lines.length} lines · ${top + 1}-${shownEnd} (${pct}%) · j/k ↑↓ · space/b page · g/G · / search · q quit`
    onFrame([...view, '', status].join('\n'))
  }

  const findNext = (from: number) => {
    if (!search) return
    const needle = search.toLowerCase()
    for (let i = from; i < lines.length; i++) {
      if (lines[i]!.toLowerCase().includes(needle)) {
        top = i
        return
      }
    }
  }

  render()

  return {
    onKey(key) {
      if (searching) {
        if (key === 'Enter') {
          searching = false
          findNext(top)
        } else if (key === 'Escape') {
          searching = false
          search = ''
        } else if (key === 'Backspace') {
          search = search.slice(0, -1)
        } else if (key.length === 1) {
          search += key
        }
        render()
        return true
      }
      switch (key) {
        case 'j': case 'ArrowDown': top++; break
        case 'k': case 'ArrowUp': top--; break
        case ' ': case 'f': case 'PageDown': top += ROWS; break
        case 'b': case 'PageUp': top -= ROWS; break
        case 'g': case 'Home': top = 0; break
        case 'G': case 'End': top = maxTop(); break
        case '/': searching = true; search = ''; break
        case 'n': findNext(top + 1); break
        case 'q': case 'Escape':
          onEnd([])
          return true
        default:
          return false
      }
      render()
      return true
    },
    stop: () => { /* nothing to tear down */ }
  }
}
