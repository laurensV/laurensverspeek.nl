import { describe, it, expect } from 'vitest'
import { buildMuseumMap, moveVisitor, nearbyPlaque, currentWing, renderMuseum } from '../app/utils/museumWalk'
import { museum } from '../app/data/museum'

const WINGS = [
  { title: 'wing a', exhibits: [{ name: 'one' }, { name: 'two' }, { name: 'three' }] },
  { title: 'wing b', exhibits: [{ name: 'four' }, { name: 'five' }] }
]

describe('the walkable museum', () => {
  it('builds one room per wing with every plaque mounted', () => {
    const map = buildMuseumMap(WINGS)
    const plaques = map.grid.flat().filter((cell) => cell.plaque)
    expect(plaques).toHaveLength(5)
    expect(map.wingRows).toHaveLength(2)
    // the spawn is walkable floor
    expect(map.grid[map.spawn.y]![map.spawn.x]!.walkable).toBe(true)
  })

  it('mounts the full collection without dropping an exhibit', () => {
    const map = buildMuseumMap(museum)
    const plaques = map.grid.flat().filter((cell) => cell.plaque)
    const total = museum.reduce((sum, wing) => sum + wing.exhibits.length, 0)
    expect(plaques.length).toBe(total)
  })

  it('walks on floor and stops at walls', () => {
    const map = buildMuseumMap(WINGS)
    const start = map.spawn
    const stepped = moveVisitor(map, start, 1, 0)
    expect(stepped).toEqual({ x: start.x + 1, y: start.y })
    // march left into the wall: x never goes below 1
    let pos = start
    for (let i = 0; i < 100; i++) pos = moveVisitor(map, pos, -1, 0)
    expect(pos.x).toBe(1)
  })

  it('passes between rooms through the door', () => {
    const map = buildMuseumMap(WINGS)
    let pos = map.spawn
    for (let i = 0; i < 40; i++) pos = moveVisitor(map, pos, 0, 1)
    expect(currentWing(map, pos)).toBe(1)
  })

  it('senses the plaque you stand next to', () => {
    const map = buildMuseumMap(WINGS)
    // find a plaque and stand under it
    let found: { x: number, y: number } | null = null
    map.grid.forEach((row, y) => row.forEach((cell, x) => {
      if (cell.plaque?.wing === 0 && cell.plaque.exhibit === 0) found = { x, y }
    }))
    if (!found) throw new Error('no plaque mounted')
    const below = { x: (found as { x: number }).x, y: (found as { y: number }).y + 1 }
    expect(nearbyPlaque(map, below)).toEqual({ wing: 0, exhibit: 0 })
    expect(nearbyPlaque(map, map.spawn)).toBeNull()
  })

  it('renders a viewport with the visitor at @', () => {
    const map = buildMuseumMap(WINGS)
    const frame = renderMuseum(map, map.spawn, 11)
    const rows = frame.split('\n')
    expect(rows).toHaveLength(11)
    expect(frame).toContain('@')
    expect(frame).toContain('?')

    // the floor must stay a perfect monospace grid: every glyph is ASCII, since
    // JetBrains Mono doesn't cover box/block/geometric characters (they fall
    // back to a narrower proportional font and warp the walls)
    // eslint-disable-next-line no-control-regex
    expect(frame).toMatch(/^[\x20-\x7E·\n]+$/)
  })
})
