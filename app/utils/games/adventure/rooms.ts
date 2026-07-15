import type { Room, Item } from './types'

// The static world: the site rendered as a dungeon of rooms, the takeable and
// examinable items, and the direction aliases the parser understands.

export const ROOMS: Record<string, Room> = {
  hall: {
    name: 'the home directory',
    desc: 'a wide hall of soft dark pixels. a prompt blinks patiently on the far wall. corridors lead north, east, south and west; a staircase descends into the dark, and a loft ladder climbs to a hatch in the ceiling.',
    exits: {
      north: { to: 'observatory' },
      west: { to: 'workshop' },
      east: { to: 'library' },
      south: { to: 'gallery' },
      down: { to: 'basement' },
      up: { to: 'attic' }
    },
    items: ['readme'],
    fixtures: ['prompt']
  },
  observatory: {
    name: 'the /stats observatory',
    desc: 'a domed room with a telescope aimed not at stars but at a wall of visitor counters. the numbers orbit it like moons. the only exit is south.',
    exits: { south: { to: 'hall' } },
    items: [],
    fixtures: ['telescope']
  },
  workshop: {
    name: 'the /keyboard workshop',
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
  },
  attic: {
    name: 'the attic',
    desc: 'dust motes drift through a shaft of light. a steamer trunk sits under the eaves, and a skylight opens onto a ladder to the roof. the hatch leads back down.',
    exits: { down: { to: 'hall' }, up: { to: 'roof' } },
    items: [],
    fixtures: ['trunk']
  },
  roof: {
    name: 'the roof',
    desc: 'you emerge onto a flat pixel roof under an enormous amber moon. a weathervane creaks. a guestbook rests on a lectern, its pages riffling in the wind. the skylight goes back down.',
    exits: { down: { to: 'attic' } },
    items: [],
    fixtures: ['guestbook', 'weathervane']
  }
}

export const ITEMS: Record<string, Item> = {
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
  },
  lantern: {
    desc: 'a brass lantern with a warm amber flame that never seems to gutter.',
    takeText: 'taken. the dark just got a little less committed.',
    useText: 'the lantern is already lit. it politely continues to be lit.'
  }
}

export const DIRS: Record<string, keyof Room['exits']> = {
  n: 'north', north: 'north', s: 'south', south: 'south',
  e: 'east', east: 'east', w: 'west', west: 'west',
  u: 'up', up: 'up', d: 'down', down: 'down'
}
