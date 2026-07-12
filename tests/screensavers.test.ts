import { describe, expect, it, vi } from 'vitest'
import { bounce, createSaver, isSaverId, SAVER_IDS } from '../app/utils/screensavers'

describe('bounce', () => {
  it('advances position by velocity inside the bounds', () => {
    expect(bounce(10, 5, 0, 100)).toEqual([15, 5])
  })

  it('reflects off the max bound and flips velocity', () => {
    const [pos, vel] = bounce(98, 5, 0, 100)
    expect(pos).toBe(97) // 103 overshoots by 3 → 100 - 3
    expect(vel).toBe(-5)
  })

  it('reflects off the min bound and flips velocity', () => {
    const [pos, vel] = bounce(2, -5, 0, 100)
    expect(pos).toBe(3) // -3 undershoots by 3 → 0 + 3
    expect(vel).toBe(5)
  })
})

describe('isSaverId', () => {
  it('accepts every registered saver id', () => {
    for (const id of SAVER_IDS) expect(isSaverId(id)).toBe(true)
  })

  it('rejects unknown values (corrupt localStorage)', () => {
    expect(isSaverId('pipes')).toBe(false)
    expect(isSaverId(null)).toBe(false)
    expect(isSaverId(42)).toBe(false)
  })
})

describe('createSaver', () => {
  const mockCtx = () => ({
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn()
  }) as unknown as CanvasRenderingContext2D

  it.each(SAVER_IDS)('%s renders frames without throwing and paints the canvas', (id) => {
    const saver = createSaver(id, '#ffba00')
    const ctx = mockCtx()
    for (let i = 0; i < 30; i++) saver.tick(ctx, 800, 600)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('resets globalAlpha after a frame so the next painter is unaffected', () => {
    for (const id of SAVER_IDS) {
      const ctx = mockCtx()
      createSaver(id, '#ffba00').tick(ctx, 800, 600)
      expect(ctx.globalAlpha).toBe(1)
    }
  })
})
