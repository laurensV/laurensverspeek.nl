import { describe, it, expect } from 'vitest'
import { advCommand, initialAdvState } from '../app/utils/games/adventure'
import type { AdvState } from '../app/utils/games/adventure'

const play = (state: AdvState, ...inputs: string[]) => {
  let current = state
  let lines: string[] = []
  let done: string | undefined
  for (const input of inputs) {
    const result = advCommand(current, input)
    current = result.state
    lines = result.lines
    done = result.done
  }
  return { state: current, lines, done }
}

describe('adventure', () => {
  it('describes the hall and lists visible items', () => {
    const { lines } = play(initialAdvState(), 'look')
    expect(lines.join('\n')).toContain('the home directory')
    expect(lines.join('\n')).toContain('readme')
  })

  it('moves through exits and refuses missing ones', () => {
    const { state } = play(initialAdvState(), 'go west')
    expect(state.room).toBe('workshop')
    const blocked = play(state, 'go north')
    expect(blocked.state.room).toBe('workshop')
    expect(blocked.lines[0]).toContain("can't go north")
  })

  it('reveals the key under the workshop keyboard exactly once', () => {
    const first = play(initialAdvState(), 'w', 'examine keyboard')
    expect(first.lines[0]).toContain('amber key')
    const second = play(first.state, 'look')
    expect(second.lines.join('\n')).toContain('key')
    const again = play(first.state, 'x keyboard')
    expect(again.lines[0]).toContain('empty now')
  })

  it('keeps the server-room door locked until the key is used', () => {
    // reach the basement lit (carrying the monitor), try the door, then unlock
    const lit = play(initialAdvState(), 's', 'take monitor', 'n', 'down')
    const locked = play(lit.state, 'go north')
    expect(locked.state.room).toBe('basement')
    expect(locked.lines[0]).toContain('locked')
    const withKey = play(lit.state, 'up', 'w', 'x keyboard', 'take key', 'e', 'down', 'use key', 'n')
    expect(withKey.state.room).toBe('serverroom')
  })

  it('lets the grue eat anyone who lingers in the dark', () => {
    const dark = play(initialAdvState(), 'down')
    expect(dark.lines.join('\n')).toContain('grue')
    // looking around is survivable, grabbing at the dark is not
    const looked = play(dark.state, 'look')
    expect(looked.done).toBeUndefined()
    const eaten = play(dark.state, 'take door')
    expect(eaten.done).toBe('dead')
    expect(eaten.state.room).toBe('hall') // reset
  })

  it('escaping the dark by going up is always safe', () => {
    const fled = play(initialAdvState(), 'down', 'up')
    expect(fled.done).toBeUndefined()
    expect(fled.state.room).toBe('hall')
  })

  it('wins by inserting the floppy in the server room', () => {
    const win = play(
      initialAdvState(),
      'w', 'x keyboard', 'take key', 'e', // key from the workshop
      'e', 'take floppy', 'w', // floppy from the library
      's', 'take monitor', 'n', // light source from the gallery
      'down', 'unlock door', 'north', 'insert floppy'
    )
    expect(win.done).toBe('win')
    expect(win.lines.join('\n')).toContain('DEPLOY OK')
    expect(win.lines.join('\n')).toContain('you win')
  })

  it('tracks inventory across take and drop', () => {
    const taken = play(initialAdvState(), 'take readme', 'i')
    expect(taken.lines[0]).toContain('readme')
    const dropped = play(taken.state, 'drop readme', 'i')
    expect(dropped.lines[0]).toContain('nothing but ambition')
    // dropped items return home and can be taken again
    const back = play(dropped.state, 'look')
    expect(back.lines.join('\n')).toContain('readme')
  })

  it('the duck dispenses stage-appropriate hints', () => {
    const early = play(initialAdvState(), 'e', 'talk duck')
    expect(early.lines[0]).toContain('UNDER')
    const late = play(initialAdvState(), 'w', 'x keyboard', 'take key', 'e', 'e', 'talk duck')
    expect(late.lines[0]).toContain('locked doors')
  })

  it('mailing the resume at the post office is worth points', () => {
    const mailed = play(initialAdvState(), 's', 'take resume', 'e', 'mail resume', 'score')
    expect(mailed.state.flags.mailed).toBe(true)
    expect(mailed.lines[0]).toMatch(/score: \d+ points/)
  })

  it('restart rewinds the world', () => {
    const restarted = play(initialAdvState(), 'take readme', 's', 'restart')
    expect(restarted.state).toEqual(initialAdvState())
  })
})

describe('adventure act 2 — the attic', () => {
  it('the attic is dark without a light and the grue enforces it', () => {
    const dark = play(initialAdvState(), 'up')
    expect(dark.lines.join('\n')).toContain('pitch black up here')
    const eaten = play(dark.state, 'open trunk')
    expect(eaten.done).toBe('dead')
    // fleeing back down is safe
    const fled = play(initialAdvState(), 'up', 'down')
    expect(fled.done).toBeUndefined()
    expect(fled.state.room).toBe('hall')
  })

  it('lets you open the trunk with light and take the lantern', () => {
    // fetch the monitor for light, climb to the attic, open the trunk
    const lit = play(initialAdvState(), 's', 'take monitor', 'n', 'up', 'open trunk')
    expect(lit.lines.join('\n')).toContain('brass lantern')
    const look = play(lit.state, 'look')
    expect(look.lines.join('\n')).toContain('lantern')
    const taken = play(lit.state, 'take lantern', 'i')
    expect(taken.lines[0]).toContain('lantern')
    expect(taken.state.flags.trunkOpen).toBe(true)
  })

  it('the lantern is a portable light: the attic stays lit once carried', () => {
    const withLantern = play(initialAdvState(), 's', 'take monitor', 'n', 'up', 'open trunk', 'take lantern', 'drop monitor')
    // back in the attic carrying only the lantern, it is not dark
    const look = play(withLantern.state, 'look')
    expect(look.lines.join('\n')).toContain('the attic')
    expect(look.lines.join('\n')).not.toContain('pitch black')
  })

  it('signing the roof guestbook ties into the museum and scores', () => {
    const signed = play(
      initialAdvState(),
      's', 'take monitor', 'n', 'up', 'open trunk', 'take lantern', 'up', // to the roof
      'examine guestbook', 'sign guestbook'
    )
    expect(signed.state.flags.act2won).toBe(true)
    expect(signed.lines.join('\n')).toContain('museum')
    const scoreLine = play(signed.state, 'score')
    expect(scoreLine.lines[0]).toMatch(/score: \d+ points/)
    // signing twice is idempotent
    const again = play(signed.state, 'sign guestbook')
    expect(again.lines[0]).toContain('already signed')
  })
})
