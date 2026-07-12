import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHighScore, setCelebrateSink } from '../app/utils/terminalGameKit'

// a tiny localStorage stub so the pure game-kit can read/write a "best"
beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  })
})

describe('the high-score celebrate sink', () => {
  it('fires when a score beats an existing best', () => {
    localStorage.setItem('lv-snake-highscore', '10')
    const celebrate = vi.fn()
    setCelebrateSink(celebrate)
    const result = useHighScore('lv-snake-highscore').record(25)
    expect(result).toEqual({ isNew: true, best: 10 })
    expect(celebrate).toHaveBeenCalledOnce()
    setCelebrateSink(null)
  })

  it('does NOT fire on the very first play (no prior best)', () => {
    const celebrate = vi.fn()
    setCelebrateSink(celebrate)
    const result = useHighScore('lv-tetris-highscore').record(500)
    expect(result.isNew).toBe(true)
    expect(celebrate).not.toHaveBeenCalled()
    setCelebrateSink(null)
  })

  it('does NOT fire when the score does not beat the best', () => {
    localStorage.setItem('lv-2048-highscore', '2048')
    const celebrate = vi.fn()
    setCelebrateSink(celebrate)
    useHighScore('lv-2048-highscore').record(1024)
    expect(celebrate).not.toHaveBeenCalled()
    setCelebrateSink(null)
  })
})
