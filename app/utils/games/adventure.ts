import type { GameHandle, GameCallbacks } from '~/utils/games/types'
import { storageGetJson, storageSetJson, storageRemove } from '~/utils/safeStorage'

// A pocket text adventure: the site as a dungeon. The engine (`advCommand`)
// is a pure state → state function so the whole game is unit-testable; the
// GameHandle wrapper below adds the line editor, frame rendering and saves.

export interface AdvState {
  room: string
  inv: string[]
  flags: Record<string, boolean>
  moves: number
}

interface Exit {
  to: string
  lockedBy?: string // flag name that must be true to pass
  lockedText?: string
}

interface Room {
  name: string
  desc: string
  exits: Partial<Record<'north' | 'south' | 'east' | 'west' | 'up' | 'down', Exit>>
  items: string[] // takeable things currently in the room (mutated via state.flags, see roomItems)
  fixtures?: string[] // things you can examine/talk to but not take
}

interface Item {
  desc: string
  takeText?: string
  useText?: string
}

const ROOMS: Record<string, Room> = {
  hall: {
    name: 'the home directory',
    desc: 'a wide hall of soft dark pixels. a prompt blinks patiently on the far wall. corridors lead north, east, south and west; a staircase descends into the dark.',
    exits: {
      north: { to: 'observatory' },
      west: { to: 'workshop' },
      east: { to: 'library' },
      south: { to: 'gallery' },
      down: { to: 'basement' }
    },
    items: ['readme'],
    fixtures: ['prompt']
  },
  observatory: {
    name: 'the /now observatory',
    desc: 'a domed room with a telescope aimed not at stars but at a roadmap. sticky notes orbit it like moons. the only exit is south.',
    exits: { south: { to: 'hall' } },
    items: [],
    fixtures: ['telescope']
  },
  workshop: {
    name: 'the /uses workshop',
    desc: 'workbenches of mechanical keyboards in various states of surgery. a soldering iron cools in the corner. the hall is back east.',
    exits: { east: { to: 'hall' } },
    items: ['coffee'],
    fixtures: ['keyboard']
  },
  library: {
    name: 'the /blog library',
    desc: 'shelves of markdown, alphabetized by vibe. a reading lamp hums. a rubber duck supervises from the top shelf. the hall is west.',
    exits: { west: { to: 'hall' } },
    items: ['floppy'],
    fixtures: ['duck']
  },
  gallery: {
    name: 'the /about gallery',
    desc: 'a timeline of paintings: a kid with a computer, a student, a founder, a dev. east leads to the post office, north back to the hall.',
    exits: { north: { to: 'hall' }, east: { to: 'postoffice' } },
    items: ['monitor', 'resume'],
    fixtures: []
  },
  postoffice: {
    name: 'the /contact post office',
    desc: 'brass pneumatic tubes labeled mail, github and linkedin hiss softly. a slot marked OUTBOX waits. the gallery is back west.',
    exits: { west: { to: 'gallery' } },
    items: [],
    fixtures: ['tubes']
  },
  basement: {
    name: 'the basement',
    desc: 'bare concrete and cable trays. a heavy door with a small amber keyhole stands to the north. the stairs go back up.',
    exits: {
      up: { to: 'hall' },
      north: {
        to: 'serverroom',
        lockedBy: 'unlocked',
        lockedText: 'the server-room door is locked. a small amber keyhole glints at you.'
      }
    },
    items: [],
    fixtures: ['door']
  },
  serverroom: {
    name: 'the server room',
    desc: 'racks hum a chord in E minor. one machine has an empty floppy slot and a post-it: "deploy me". the door back south is the only exit.',
    exits: { south: { to: 'basement' } },
    items: [],
    fixtures: ['slot']
  }
}

const ITEMS: Record<string, Item> = {
  readme: {
    desc: 'a crumpled README. it says: "the workshop tapes its spare keys where thumbs can reach."',
    takeText: 'taken. documentation is precious.'
  },
  coffee: {
    desc: 'a mug of coffee, still warm. impossible, given the circumstances. inspiring, for the same reason.',
    takeText: 'taken, carefully. not a drop spilled.',
    useText: 'you drink the coffee. productivity +100. it was decaf all along.'
  },
  key: {
    desc: 'a small amber key. it looks like it opens exactly one very specific door.',
    takeText: 'taken. it is pleasantly warm, like everything amber here.'
  },
  floppy: {
    desc: 'a 3.5" floppy labeled "v2.0.0 — FINAL(2)". it holds either a website or 1.44 MB of hope.',
    takeText: 'taken. you resist the urge to use it as a coaster.'
  },
  monitor: {
    desc: 'an ancient CRT monitor, still on somehow, casting a stubborn green glow.',
    takeText: 'you heave the CRT into your inventory. your back files a formal complaint. at least it glows.'
  },
  resume: {
    desc: 'a neatly typeset resume scroll. the skills section is honest, which is the impressive part.',
    takeText: 'taken. never leave home without a spare.'
  }
}

const DIRS: Record<string, keyof Room['exits']> = {
  n: 'north', north: 'north', s: 'south', south: 'south',
  e: 'east', east: 'east', w: 'west', west: 'west',
  u: 'up', up: 'up', d: 'down', down: 'down'
}

const FILLER = new Set(['the', 'a', 'an', 'to', 'at', 'on', 'with', 'into', 'in'])

export const initialAdvState = (): AdvState => ({ room: 'hall', inv: [], flags: {}, moves: 0 })

/** Items currently visible in a room, accounting for takes and reveals. */
const roomItems = (state: AdvState, roomId: string): string[] => {
  const base = ROOMS[roomId]?.items ?? []
  const extra = roomId === 'workshop' && state.flags.keyRevealed && !state.flags.keyTaken ? ['key'] : []
  return [...base.filter((item) => !state.inv.includes(item) && !state.flags[`gone:${item}`]), ...extra]
}

const isDark = (state: AdvState) => state.room === 'basement' && !state.inv.includes('monitor')

const describeRoom = (state: AdvState): string[] => {
  if (isDark(state)) {
    return [
      'it is pitch black down here. you are likely to be eaten by a grue.',
      '(something breathes politely nearby. going back up seems wise.)'
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
  + (state.flags.won ? 50 : 0)

export interface AdvResult {
  lines: string[]
  state: AdvState
  done?: 'win' | 'dead' | 'quit'
}

/** One turn of the adventure: parse a line, return output + the next state. */
export function advCommand(prev: AdvState, input: string): AdvResult {
  const state: AdvState = { ...prev, inv: [...prev.inv], flags: { ...prev.flags } }
  const words = input.toLowerCase().trim().split(/\s+/).filter((w) => w && !FILLER.has(w))
  const [verb, ...rest] = words
  const noun = rest.join(' ')
  if (!verb) return { lines: ['(say something. "help" lists the verbs.)'], state }
  state.moves++

  // the grue: doing anything physical in the dark except leaving is a commitment
  if (isDark(state) && prev.moves > 0 && isDark(prev)) {
    const fleeing = (verb === 'go' && DIRS[noun] === 'up') || DIRS[verb] === 'up'
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
          '       inventory · use <item> · talk <someone> · score · restart · quit',
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
    if (noun === 'telescope' && state.room === 'observatory') return { lines: ['through the eyepiece: a kanban column labeled "someday", stretching to the horizon.'], state }
    if (noun === 'tubes' && state.room === 'postoffice') return { lines: ['the mail tube smells faintly of unread newsletters.'], state }
    if (noun === 'slot' && state.room === 'serverroom') return { lines: ['a floppy-shaped absence. it yearns.'], state }
    return { lines: [`you see no ${noun} worth examining here.`], state }
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

// ── the GameHandle wrapper ──────────────────────────────────────────────────

const SAVE_KEY = 'lv-adventure'

const isAdvState = (parsed: unknown): parsed is AdvState => {
  if (typeof parsed !== 'object' || parsed === null) return false
  const candidate = parsed as Record<string, unknown>
  return typeof candidate.room === 'string' && candidate.room in ROOMS
    && Array.isArray(candidate.inv) && candidate.inv.every((item) => typeof item === 'string')
    && typeof candidate.flags === 'object' && candidate.flags !== null
    && typeof candidate.moves === 'number'
}

export const loadAdventure = (): AdvState | null => storageGetJson(SAVE_KEY, isAdvState)

const wrap = (text: string, width = 62): string[] => {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      if (line && `${line} ${word}`.length > width) {
        out.push(line)
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    out.push(line)
  }
  return out
}

export function createAdventureGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const saved = loadAdventure()
  let state = saved ?? initialAdvState()
  let buffer = ''
  const transcript: string[] = []

  const say = (lines: string[]) => {
    for (const line of lines) transcript.push(...(line ? wrap(line) : ['']))
  }

  say(saved
    ? ['ADVENTURE — resumed where you left off ("restart" begins anew).', '']
    : ['ADVENTURE — the site is the dungeon. "help" lists the verbs.', ''])
  say(describeRoom(state))

  const render = () => {
    const view = transcript.slice(-15)
    onFrame([...view, '', `> ${buffer}█`, '(Esc saves & quits)'].join('\n'))
  }
  render()

  const finish = (lines: string[]) => onEnd(lines)

  return {
    onKey: (key: string) => {
      if (key === 'Escape') {
        storageSetJson(SAVE_KEY, state)
        finish(['adventure: saved. the dungeon holds its breath until you return.'])
        return true
      }
      if (key === 'Backspace') {
        buffer = buffer.slice(0, -1)
        render()
        return true
      }
      if (key === 'Enter') {
        const input = buffer.trim()
        buffer = ''
        if (!input) {
          render()
          return true
        }
        say([`> ${input}`])
        const result = advCommand(state, input)
        state = result.state
        say(result.lines)
        if (result.done === 'quit') {
          storageSetJson(SAVE_KEY, state)
          finish(['adventure: saved. the dungeon holds its breath until you return.'])
          return true
        }
        if (result.done === 'dead') {
          storageRemove(SAVE_KEY)
          finish([...result.lines, 'adventure: game over — run it again to try anew.'])
          return true
        }
        if (result.done === 'win') {
          storageRemove(SAVE_KEY)
          finish(result.lines)
          return true
        }
        storageSetJson(SAVE_KEY, state)
        render()
        return true
      }
      if (key.length === 1 && buffer.length < 60) {
        buffer += key
        render()
        return true
      }
      return false
    },
    stop: () => storageSetJson(SAVE_KEY, state)
  }
}
