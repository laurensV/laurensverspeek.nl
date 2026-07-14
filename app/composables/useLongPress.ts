// Touch long-press → a menu, since touch has no right-click. The same ~500ms
// press-hold-with-move-cancel state machine backed both the lvOS desktop's
// context menu and the Files app's row menu, hand-rolled in each; this is that
// machine, once. Bind start/move/end to touchstart/touchmove/touchend; the fire
// callback gets where the press landed (and an optional per-target payload, e.g.
// the file row it began on). end() suppresses the trailing click so the menu it
// just opened can't be instantly dismissed.

export interface LongPressDetail<T> {
  x: number
  y: number
  /** The element the touch actually started on (event.target). */
  target: HTMLElement
  /** The element the handler is bound to (event.currentTarget). */
  currentTarget: HTMLElement
  /** Whatever the consumer passed to start() — e.g. the file entry of this row. */
  payload: T
}

export function useLongPress<T = undefined>(
  onLongPress: (detail: LongPressDetail<T>) => void,
  opts: { ms?: number, moveTol?: number } = {}
) {
  const ms = opts.ms ?? 500
  const moveTol = opts.moveTol ?? 10
  let timer: ReturnType<typeof setTimeout> | undefined
  let at: { x: number, y: number } | null = null
  let longPressed = false

  const start = (event: TouchEvent, payload?: T) => {
    const touch = event.touches[0]
    if (!touch) return
    longPressed = false
    at = { x: touch.clientX, y: touch.clientY }
    const target = event.target as HTMLElement
    const currentTarget = event.currentTarget as HTMLElement
    timer = setTimeout(() => {
      longPressed = true
      onLongPress({ x: at!.x, y: at!.y, target, currentTarget, payload: payload as T })
    }, ms)
  }
  const move = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (at && touch && (Math.abs(touch.clientX - at.x) > moveTol || Math.abs(touch.clientY - at.y) > moveTol)) {
      clearTimeout(timer)
    }
  }
  const end = (event: TouchEvent) => {
    clearTimeout(timer)
    // a long-press must not also fire the trailing tap/click (which would open
    // the tapped item, or instantly dismiss the menu it just summoned)
    if (longPressed) event.preventDefault()
  }
  onUnmounted(() => clearTimeout(timer))

  return { start, move, end }
}
