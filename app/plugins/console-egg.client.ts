import { STATE_KEYS } from '~/utils/stateKeys'
import { storageGet, storageSet } from '~/utils/safeStorage'

// A note for the people who open the console (hi! 👋) — and, for the persistent
// ones, a five-round hunt played entirely from devtools. Every round is a real
// browser/JS skill (decoding, DOM inspection, reading a function's source, char
// codes, reverse-engineering a check) — no trivia, nothing you couldn't reason
// out with a dev's toolkit. Finishing it unlocks the hidden `backstage` command.
export default defineNuxtPlugin((nuxtApp) => {
  const amber = 'color: #ffba00; font-family: monospace; font-weight: bold;'
  const dim = 'color: #ffba00; font-family: monospace; opacity: 0.75;'
  const ascii = String.raw`
 _    __      __
| |   \ \    / /
| |    \ \  / /
| |___  \ \/ /
|_____|  \__/
`

  console.log(`%c${ascii}`, amber)
  console.log('%cWell hello there, fellow dev 👋', 'color: #ffba00; font-size: 14px; font-weight: bold;')
  console.log(
    [
      'You look like someone who reads source code for fun.',
      'The whole site is open source: https://github.com/laurensV/laurensverspeek.nl',
      '',
      "Psst — press ~ for the terminal and try 'secrets' for the hidden stuff.",
      '',
      "🕵️  There's a 5-round hunt down here, and it unlocks something at the end.",
      '     Every round is a normal dev move — no guessing. Begin with:  lv.hunt()'
    ].join('\n'),
    ''
  )

  const say = (msg: string) => console.log(`%c${msg}`, amber)
  const hint = (msg: string) => console.log(`%c${msg}`, dim)

  // progress lives in a closure, so you can't just read the answers off `lv`.
  let round = 0

  // each round: the prompt to print, and the word that clears it. The answers
  // are only ever produced by *doing* the round, never printed by lv itself.
  const rounds: { prompt: () => void, answer: string }[] = [
    {
      // R1 · base64 — decode a constant with atob()
      answer: 'inspect',
      prompt: () => {
        say('Round 1/5 · everything worth hiding starts encoded.')
        hint('   Decode this, then solve with the word you get:')
        hint('     atob("aW5zcGVjdA==")')
        hint('     lv.solve("<word>")')
      }
    },
    {
      // R2 · inspect a live object and read a value out of it
      answer: 'otter',
      prompt: () => {
        say('Round 2/5 · everything is an object if you look at it.')
        hint('   Expand lv.vault and read the value it is guarding:')
        hint('     lv.vault          //  or  Object.values(lv.vault)')
      }
    },
    {
      // R3 · read a function's own source with .toString()
      answer: 'kernel',
      prompt: () => {
        say('Round 3/5 · functions remember how they were written.')
        hint('   One helper hides its answer in its own source. Read it:')
        hint('     String(lv.decode)   //  or  lv.decode.toString()')
      }
    },
    {
      // R4 · char codes → String.fromCharCode
      answer: 'packet',
      prompt: () => {
        say('Round 4/5 · raw bytes on the wire.')
        hint('   Turn these char codes back into text:')
        hint('     String.fromCharCode(...lv.codes)')
      }
    },
    {
      // R5 · combine — hand back rounds 3 and 4 to earn the last word
      answer: 'access',
      prompt: () => {
        say('Round 5/5 · you kept your answers, right? lv.finish wants two of them.')
        hint('   Feed it your round-3 and round-4 words (in that order):')
        hint('     lv.finish("<round 3>", "<round 4>")   //  read String(lv.finish) if stuck')
      }
    }
  ]

  const reward = () => {
    round = rounds.length + 1 // done; further solve() calls just celebrate
    if (import.meta.client) {
      storageSet(STATE_KEYS.huntSolved, '1')
    }
    void nuxtApp.runWithContext(() => {
      useState<boolean>(STATE_KEYS.huntSolved, () => false).value = true
      useState<boolean>(STATE_KEYS.fxFireworks, () => false).value = true
    })
    say('🎉 All five. You actually did it.')
    hint('   You just unlocked a command that exists nowhere else on this site.')
    say('   Press ~ and run:   backstage')
    return 'unlocked'
  }

  const lv = {
    hunt() {
      round = 1
      say('The hunt begins. Five rounds, each a real dev move. Answer with lv.solve(...).')
      rounds[0]!.prompt()
      return 'round-1'
    },
    solve(guess: unknown) {
      if (round < 1) {
        say('Start the hunt first:  lv.hunt()')
        return 'not-started'
      }
      if (round > rounds.length) {
        reward()
        return 'unlocked'
      }
      const want = rounds[round - 1]!.answer
      if (typeof guess === 'string' && guess.trim().toLowerCase() === want) {
        round += 1
        if (round > rounds.length) return reward()
        say(`✅ Round ${round - 1} down. On to the next.`)
        rounds[round - 1]!.prompt()
        return `round-${round}`
      }
      say(`❌ not quite — you're still on round ${round}/${rounds.length}. Re-read the clue and try again.`)
      return 'wrong'
    },
    // R2 · a live object to inspect; one of its values is the word
    vault: { note: 'one of my values is the word you want', pass: 'otter', locked: true },
    // R3 · the answer lives in this function's source, on purpose. Kept in a
    // real (reachable) branch, not a comment, so minifiers can't strip it.
    decode(reveal?: string) {
      if (reveal === 'source') return 'kernel'
      return 'read my source — the answer is the string I compare against 🙂'
    },
    // R4 · char codes for the round-4 word
    codes: [112, 97, 99, 107, 101, 116],
    // R5 · hand back rounds 3 and 4 (in order) and it returns the final word
    finish(a?: string, b?: string) {
      if (a === 'kernel' && b === 'packet') return 'access'
      return 'not the two words I need — those were your round-3 and round-4 answers'
    }
  }

  if (import.meta.client) {
    ;(window as unknown as { lv: typeof lv }).lv = lv
    // a past win keeps `backstage` unlocked across reloads
    if (storageGet(STATE_KEYS.huntSolved) === '1') {
      void nuxtApp.runWithContext(() => {
        useState<boolean>(STATE_KEYS.huntSolved, () => false).value = true
      })
    }
  }
})
