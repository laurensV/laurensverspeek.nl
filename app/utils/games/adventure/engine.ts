import type { AdvState, AdvResult } from './types'
import { ROOMS, ITEMS, DIRS } from './rooms'

// The pure heart of the adventure: `advCommand` is a state → state function so
// the whole game is unit-testable. The GameHandle wrapper (see handle.ts) adds
// the line editor, frame rendering and saves on top of it.

const FILLER = new Set(['the', 'a', 'an', 'to', 'at', 'on', 'with', 'into', 'in'])

export const initialAdvState = (): AdvState => ({ room: 'hall', inv: [], flags: {}, moves: 0 })

/** Items currently visible in a room, accounting for takes and reveals. */
const roomItems = (state: AdvState, roomId: string): string[] => {
  const base = ROOMS[roomId]?.items ?? []
  const extra: string[] = []
  if (roomId === 'workshop' && state.flags.keyRevealed && !state.flags.keyTaken) extra.push('key')
  // the trunk gives up the lantern once it's been opened
  if (roomId === 'attic' && state.flags.trunkOpen && !state.flags['gone:lantern'] && !state.inv.includes('lantern')) extra.push('lantern')
  return [...base.filter((item) => !state.inv.includes(item) && !state.flags[`gone:${item}`]), ...extra]
}

// a lit lantern chases the grue out of any dark room; the CRT still works too
const hasLight = (state: AdvState) => state.inv.includes('monitor') || state.inv.includes('lantern')
const isDark = (state: AdvState) => (state.room === 'basement' || state.room === 'attic') && !hasLight(state)

export const describeRoom = (state: AdvState): string[] => {
  if (isDark(state)) {
    const escape = state.room === 'attic' ? 'going back down seems wise' : 'going back up seems wise'
    return [
      `it is pitch black ${state.room === 'attic' ? 'up here' : 'down here'}. you are likely to be eaten by a grue.`,
      `(something breathes politely nearby. ${escape}.)`
    ]
  }
  const room = ROOMS[state.room]!
  const lines = [`— ${room.name} —`, room.desc]
  const items = roomItems(state, state.room)
  if (items.length) lines.push(`you can see: ${items.join(', ')}.`)
  return lines
}

const score = (state: AdvState) =>
  state.inv.length * 5
  + (state.flags.keyRevealed ? 10 : 0)
  + (state.flags.unlocked ? 20 : 0)
  + (state.flags.mailed ? 15 : 0)
  + (state.flags.trunkOpen ? 10 : 0)
  + (state.flags.act2won ? 30 : 0)
  + (state.flags.won ? 50 : 0)

/** One turn of the adventure: parse a line, return output + the next state. */
export function advCommand(prev: AdvState, input: string): AdvResult {
  const state: AdvState = { ...prev, inv: [...prev.inv], flags: { ...prev.flags } }
  const words = input.toLowerCase().trim().split(/\s+/).filter((w) => w && !FILLER.has(w))
  const [verb, ...rest] = words
  const noun = rest.join(' ')
  if (!verb) return { lines: ['(say something. "help" lists the verbs.)'], state }
  state.moves++

  // the grue: doing anything physical in the dark except leaving is a commitment.
  // the way out of the basement is up; out of the attic, down
  if (isDark(state) && prev.moves > 0 && isDark(prev)) {
    const escapeDir = state.room === 'attic' ? 'down' : 'up'
    const fleeing = (verb === 'go' && DIRS[noun] === escapeDir) || DIRS[verb] === escapeDir
      || ['quit', 'exit', 'restart', 'help', '?', 'look', 'l', 'inventory', 'inv', 'i', 'score'].includes(verb)
    if (!fleeing) {
      return {
        lines: [
          'you fumble in the dark. the polite breathing stops being polite.',
          '*** you have been eaten by a grue. ***',
          'the grue apologizes — it is a well-raised grue — but you are still eaten.'
        ],
        state: initialAdvState(),
        done: 'dead'
      }
    }
  }

  switch (verb) {
    case 'help':
    case '?':
      return {
        lines: [
          'verbs: look · go <dir> (n/s/e/w/up/down) · take/drop <item> · examine <thing>',
          '       inventory · use <item> · open <thing> · sign · talk <someone> · score · restart · quit',
          'progress saves itself. Esc also quits.'
        ],
        state
      }
    case 'look':
    case 'l':
      return { lines: describeRoom(state), state }
    case 'inventory':
    case 'inv':
    case 'i':
      return {
        lines: [state.inv.length ? `you are carrying: ${state.inv.join(', ')}.` : 'you are carrying nothing but ambition.'],
        state
      }
    case 'score':
      return { lines: [`score: ${score(state)} points in ${state.moves} moves.`], state }
    case 'quit':
    case 'exit':
      return { lines: [], state, done: 'quit' }
    case 'restart':
      return { lines: ['the world rewinds. the coffee refills itself.', '', ...describeRoom(initialAdvState())], state: initialAdvState() }
  }

  // movement: "go north", bare "north"/"n"
  const dir = verb === 'go' ? DIRS[noun] : DIRS[verb]
  if (dir) {
    const exit = ROOMS[state.room]!.exits[dir]
    if (!exit) return { lines: [`you can't go ${dir} from here.`], state }
    if (exit.lockedBy && !state.flags[exit.lockedBy]) {
      return { lines: [exit.lockedText ?? 'that way is locked.'], state }
    }
    state.room = exit.to
    if (state.room === 'basement' && !state.inv.includes('monitor') && !state.flags.seenDark) {
      state.flags.seenDark = true
      return { lines: [...describeRoom(state), '(hint: somewhere in this dungeon, something still glows.)'], state }
    }
    return { lines: describeRoom(state), state }
  }

  if (verb === 'take' || verb === 'get' || verb === 'grab') {
    if (!noun) return { lines: ['take what?'], state }
    if (noun === 'duck') return { lines: ['the duck declines. it has tenure in this library.'], state }
    if (!roomItems(state, state.room).includes(noun)) return { lines: [`there is no ${noun} here to take.`], state }
    state.inv.push(noun)
    if (noun === 'key') state.flags.keyTaken = true
    else state.flags[`gone:${noun}`] = true
    return { lines: [ITEMS[noun]?.takeText ?? 'taken.'], state }
  }

  if (verb === 'drop') {
    if (!state.inv.includes(noun)) return { lines: [`you aren't carrying a ${noun}.`], state }
    state.inv = state.inv.filter((item) => item !== noun)
    if (noun === 'key') state.flags.keyTaken = false
    else delete state.flags[`gone:${noun}`]
    // dropped items land in the current room only if it's their home; keep it
    // simple: they teleport home, like well-trained tools
    return { lines: [`you set the ${noun} down. it will find its way home.`, noun === 'monitor' && state.room === 'basement' ? 'the dark takes one step closer.' : ''].filter(Boolean), state }
  }

  if (verb === 'examine' || verb === 'x' || verb === 'inspect' || verb === 'read') {
    if (!noun) return { lines: ['examine what?'], state }
    if (noun === 'keyboard' && state.room === 'workshop') {
      if (!state.flags.keyRevealed) {
        state.flags.keyRevealed = true
        return { lines: ['you lift the biggest keyboard. taped under the space bar: a small amber key.'], state }
      }
      return { lines: ['a split ergonomic board. the tape under the space bar is empty now.'], state }
    }
    if (ITEMS[noun] && (state.inv.includes(noun) || roomItems(state, state.room).includes(noun))) {
      return { lines: [ITEMS[noun].desc], state }
    }
    if (noun === 'door' && state.room === 'basement') {
      return { lines: [state.flags.unlocked ? 'the server-room door stands open, humming an invitation.' : 'heavy steel, amber keyhole. it wants exactly one thing.'], state }
    }
    if (noun === 'duck' && state.room === 'library') return { lines: ['yellow. serene. it has debugged more than you ever will.'], state }
    if (noun === 'prompt' && state.room === 'hall') return { lines: ['it blinks: ~$ █ — patient as ever.'], state }
    if (noun === 'telescope' && state.room === 'observatory') return { lines: ['through the eyepiece: a bar chart of visits, its tallest bar labeled "you, refreshing".'], state }
    if (noun === 'tubes' && state.room === 'postoffice') return { lines: ['the mail tube smells faintly of unread newsletters.'], state }
    if (noun === 'slot' && state.room === 'serverroom') return { lines: ['a floppy-shaped absence. it yearns.'], state }
    if (noun === 'trunk' && state.room === 'attic') {
      return { lines: [state.flags.trunkOpen ? 'the trunk lid is up; a brass lantern nestles in the felt lining.' : 'a steamer trunk, latched but not locked. it wants to be opened.'], state }
    }
    if (noun === 'weathervane' && state.room === 'roof') return { lines: ['a pixel rooster spins to point, unwaveringly, at the amber moon. good taste.'], state }
    if (noun === 'guestbook' && state.room === 'roof') {
      return {
        lines: [
          'the guestbook, in a hundred hands: "was here", "found the grue", "quit vim eventually",',
          '"deployed the site", "read every plaque". the last printed line, in amber:',
          '"the whole collection is on display — type museum, or visit /museum."',
          state.flags.act2won ? '(your name is already here, near the top.)' : '(there is a blank line, and a pen. try: sign guestbook.)'
        ],
        state
      }
    }
    return { lines: [`you see no ${noun} worth examining here.`], state }
  }

  if (verb === 'open') {
    if (noun === 'trunk' && state.room === 'attic') {
      if (state.flags.trunkOpen) return { lines: ['the trunk is already open. the lantern waits inside.'], state }
      state.flags.trunkOpen = true
      return { lines: ['the latch gives with a puff of dust. inside, cradled in old felt: a brass lantern.'], state }
    }
    if (noun === 'door' || noun === 'trunk') return { lines: [`there's nothing like that to open here.`], state }
    return { lines: [`you can't open the ${noun || 'nothing'}.`], state }
  }

  if (verb === 'sign') {
    if (noun !== 'guestbook' && noun !== '') return { lines: [`you can only sign the guestbook — and only on the roof.`], state }
    if (state.room !== 'roof') return { lines: ['there is nothing to sign here. the guestbook is up on the roof.'], state }
    if (state.flags.act2won) return { lines: ['you already signed. the ink is dry, the sentiment stands.'], state }
    state.flags.act2won = true
    return {
      lines: [
        'you take up the pen and add your line to the guestbook.',
        'the amber moon brightens by one notch, as if acknowledging it.',
        '',
        `*** the roof remembers you — +30 points (${score(state)} total) ***`,
        `the last line was right: the whole collection is on display. type 'museum' any time.`
      ],
      state
    }
  }

  if (verb === 'talk' || verb === 'ask') {
    if (noun !== 'duck') return { lines: ['nobody answers. the duck in the library is the talker here.'], state }
    if (state.room !== 'library') return { lines: ['you address the air. the duck is in the library.'], state }
    const hint = state.flags.won ? 'quack. (it nods at you, dev to dev.)'
      : !state.flags.keyRevealed ? 'quack. (it glances at the workshop. something about looking UNDER things.)'
        : !state.inv.includes('key') ? 'quack. (take the key, obviously. the duck rolls its eyes.)'
          : !state.flags.unlocked ? 'quack. (locked doors in basements want keys used on them.)'
            : !state.inv.includes('floppy') ? 'quack. (it taps the shelf where the floppy sits. servers eat floppies.)'
              : 'quack. (the server room awaits your floppy. go deploy.)'
    return { lines: [hint], state }
  }

  if (verb === 'use' || verb === 'insert' || verb === 'unlock' || verb === 'mail' || verb === 'drink') {
    const item = noun === 'door' ? 'key' : noun
    if (item && !state.inv.includes(item) && ITEMS[item]) return { lines: [`you'd need to be carrying the ${item} first.`], state }
    if (item === 'key') {
      if (state.room !== 'basement') return { lines: ['the key fits nothing here. it hums toward the basement.'], state }
      if (state.flags.unlocked) return { lines: ['the door is already unlocked.'], state }
      state.flags.unlocked = true
      return { lines: ['the amber key turns with a satisfying clunk. the server-room door swings open.'], state }
    }
    if (item === 'floppy') {
      if (state.room !== 'serverroom') return { lines: ['no drive here accepts floppies. the server room might.'], state }
      state.flags.won = true
      return {
        lines: [
          'you slide the floppy in. the rack chews thoughtfully. lights cascade green.',
          '',
          'DEPLOY OK — laurensverspeek.nl v2.0.0 is live.',
          'somewhere above you, a hit counter ticks up by one. it was you.',
          '',
          `*** you win — ${score(state)} points in ${state.moves} moves ***`,
          `(celebrate with the 'fireworks' command. you've earned it.)`
        ],
        state,
        done: 'win'
      }
    }
    if (item === 'coffee') return { lines: [ITEMS.coffee!.useText!], state }
    if (item === 'resume') {
      if (state.room !== 'postoffice') return { lines: ['you wave the resume around. no one is hiring in this room.'], state }
      state.flags.mailed = true
      return { lines: ['you post the resume into OUTBOX. an instant auto-reply arrives: "impressive! we will circle back." (+15 points, condolences)'], state }
    }
    if (item === 'monitor') return { lines: ['it already does its one job: glowing.'], state }
    if (item === 'readme') return { lines: ['you read it again. still says to look where thumbs can reach.'], state }
    return { lines: [`you can't use that here.`], state }
  }

  return { lines: [`i don't know how to "${verb}". try 'help'.`], state }
}
