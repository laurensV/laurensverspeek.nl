import { describe, it, expect } from 'vitest'
import { teapotPoints, renderTeapot } from '../app/utils/teapot'

describe('the 418 teapot', () => {
  const points = teapotPoints()

  it('samples a dense cloud with unit-ish normals', () => {
    expect(points.length).toBeGreaterThan(3000)
    for (const p of points.filter((_, i) => i % 500 === 0)) {
      const len = Math.hypot(p.nx, p.ny, p.nz)
      expect(len).toBeGreaterThan(0.5)
      expect(len).toBeLessThan(1.5)
    }
  })

  it('renders the requested dimensions exactly', () => {
    const frame = renderTeapot(points, 0.5, 0.2, 48, 20)
    const rows = frame.split('\n')
    expect(rows).toHaveLength(20)
    for (const row of rows) expect(row).toHaveLength(48)
  })

  it('actually draws a teapot (plenty of lit cells)', () => {
    const frame = renderTeapot(points, 0.5, 0.2)
    const inked = frame.replace(/[\s\n]/g, '').length
    expect(inked).toBeGreaterThan(400)
  })

  it('rotation changes the frame; same angles are deterministic', () => {
    const a = renderTeapot(points, 0.3, 0.1)
    const b = renderTeapot(points, 1.3, 0.1)
    const a2 = renderTeapot(points, 0.3, 0.1)
    expect(a).not.toBe(b)
    expect(a).toBe(a2)
  })
})
