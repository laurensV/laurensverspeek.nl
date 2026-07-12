import { isQuitKey } from '~/utils/terminalGameKit'
import { renderGlobe, type GlobeMarker } from '~/utils/globe'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const GLOBE_W = 42
const GLOBE_H = 21

// A spinning ASCII earth that plots live visitors (◉ you, ● others) by their
// timezone. Runs as a game so it owns the ticker and quits on q. The markers
// getter reads the shared live-visitor geo, so the terminal globe and the lvOS
// globe app show the exact same crowd.
export function createGlobeGame(
  getMarkers: () => GlobeMarker[],
  { onFrame, onEnd }: GameCallbacks
): GameHandle {
  let spin = 0
  let paused = false

  const render = () => {
    const markers = getMarkers()
    const others = markers.filter((m) => !m.self).length
    const rows = renderGlobe(spin, GLOBE_W, GLOBE_H, markers)
    const crowd = others > 0
      ? `${others} other visitor${others === 1 ? '' : 's'} online — ● by timezone`
      : 'you are the only dot right now — ◉ is you'
    onFrame([
      `EARTH  ·  ${crowd}`,
      ...rows,
      `(◉ you · ● visitors · space pauses · q quits)`
    ].join('\n'))
  }

  render()
  const timer = setInterval(() => {
    if (paused) return
    spin += 0.08
    render()
  }, 90)

  const stop = () => clearInterval(timer)

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        stop()
        onEnd(['the earth keeps turning without you.'])
        return true
      }
      if (key === ' ') {
        paused = !paused
        return true
      }
      return false
    },
    stop
  }
}
