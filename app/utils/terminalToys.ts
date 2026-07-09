// Classic CLI toys for the terminal: cowsay, fortune and a mini figlet.

export function cowsay(text: string): string {
  const words = (text || 'moo?').split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 38) {
      lines.push(current.trim())
      current = word
    } else {
      current = `${current} ${word}`
    }
  }
  if (current.trim()) lines.push(current.trim())

  const width = Math.max(...lines.map((l) => l.length))
  const padded = lines.map((l) => l.padEnd(width, ' '))
  const bubble =
    padded.length === 1
      ? [`< ${padded[0]} >`]
      : padded.map((line, i) => {
          if (i === 0) return `/ ${line} \\`
          if (i === padded.length - 1) return `\\ ${line} /`
          return `| ${line} |`
        })

  const cow = String.raw`        \   ^__^
         \  (oo)\_______
            (__)\       )\/${'\\'}
                ||----w |
                ||     ||`

  return [` ${'_'.repeat(width + 2)}`, ...bubble, ` ${'-'.repeat(width + 2)}`, cow].join('\n')
}

const FORTUNES = [
  'There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.',
  'A blockchain is just a linked list with trust issues.',
  '99 little bugs in the code, 99 little bugs. Take one down, patch it around... 127 little bugs in the code.',
  'It works on my machine. — every developer, moments before disaster',
  "The 'S' in Web3 stands for security.",
  'Weeks of coding can save you hours of planning.',
  'A user interface is like a joke: if you have to explain it, it is not that good.',
  'To understand recursion, you must first understand recursion.',
  'The best error message is the one that never shows up. The second best is honest.',
  'Real developers test in production. Smart developers have a staging environment. I have both feelings daily.',
  'Decentralize everything — except your keys. Never lose your keys.',
  'sudo make me a sandwich.'
]

export function fortune(): string {
  return FORTUNES[Math.floor(Math.random() * FORTUNES.length)]!
}

// Compact 5-row bitmap font for the `figlet` command ('#' = block, '.' = space)
const FIGLET_FONT: Record<string, string[]> = {
  a: ['.##.', '#..#', '####', '#..#', '#..#'],
  b: ['###.', '#..#', '###.', '#..#', '###.'],
  c: ['.###', '#...', '#...', '#...', '.###'],
  d: ['###.', '#..#', '#..#', '#..#', '###.'],
  e: ['####', '#...', '###.', '#...', '####'],
  f: ['####', '#...', '###.', '#...', '#...'],
  g: ['.###', '#...', '#.##', '#..#', '.###'],
  h: ['#..#', '#..#', '####', '#..#', '#..#'],
  i: ['###', '.#.', '.#.', '.#.', '###'],
  j: ['..##', '...#', '...#', '#..#', '.##.'],
  k: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
  l: ['#...', '#...', '#...', '#...', '####'],
  m: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  n: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  o: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  p: ['###.', '#..#', '###.', '#...', '#...'],
  q: ['.##.', '#..#', '#..#', '#.##', '.###'],
  r: ['###.', '#..#', '###.', '#.#.', '#..#'],
  s: ['.###', '#...', '.##.', '...#', '###.'],
  t: ['#####', '..#..', '..#..', '..#..', '..#..'],
  u: ['#..#', '#..#', '#..#', '#..#', '.##.'],
  v: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  w: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  x: ['#..#', '#..#', '.##.', '#..#', '#..#'],
  y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  z: ['####', '...#', '.##.', '#...', '####'],
  '0': ['.##.', '#..#', '#..#', '#..#', '.##.'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###.', '...#', '.##.', '#...', '####'],
  '3': ['###.', '...#', '.##.', '...#', '###.'],
  '4': ['#..#', '#..#', '####', '...#', '...#'],
  '5': ['####', '#...', '###.', '...#', '###.'],
  '6': ['.###', '#...', '###.', '#..#', '.##.'],
  '7': ['####', '...#', '..#.', '.#..', '.#..'],
  '8': ['.##.', '#..#', '.##.', '#..#', '.##.'],
  '9': ['.##.', '#..#', '.###', '...#', '###.'],
  ' ': ['..', '..', '..', '..', '..'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['###.', '...#', '.##.', '....', '.#..'],
  '-': ['....', '....', '####', '....', '....'],
  '.': ['.', '.', '.', '.', '#']
}

export function figlet(text: string): string {
  const chars = [...(text || 'lv').toLowerCase()].slice(0, 12)
  const rows = ['', '', '', '', '']
  for (const ch of chars) {
    const glyph = FIGLET_FONT[ch] ?? FIGLET_FONT['?']!
    for (let r = 0; r < 5; r++) {
      rows[r] = (rows[r] ?? '') + (glyph[r] ?? '') + '  '
    }
  }
  return rows.map((row) => row.replaceAll('#', '█').replaceAll('.', ' ')).join('\n')
}

export const SL_TRAIN = String.raw`
      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\___/
  \_/      \O=====O=====O=====O_/      \_/
`
