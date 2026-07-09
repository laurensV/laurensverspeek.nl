import { STATE_KEYS } from '~/utils/stateKeys'

// A note for the people who open the console (hi! 👋) — and, for the persistent
// ones, a small multi-step treasure hunt played entirely from the devtools.
export default defineNuxtPlugin((nuxtApp) => {
  const amber = 'color: #ffba00; font-family: monospace; font-weight: bold;'
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
      "🕵️  There's also a little hunt down here. Begin with:  lv.hunt()"
    ].join('\n'),
    ''
  )

  const say = (msg: string) => console.log(`%c${msg}`, amber)

  // step 3 reward: a burst of party mode + a hidden terminal command hint
  const reward = () => {
    nuxtApp.runWithContext(() => {
      useState<boolean>(STATE_KEYS.fxParty, () => false).value = true
    })
    say('🎉 You solved it! Reward unlocked — type  hire  in the terminal (press ~).')
    return 'solved'
  }

  const lv = {
    hunt() {
      say('Step 1/3 · a warm-up. Decode this and run what it says:\n  atob("bHYucmlkZGxlKCk=")')
      return 'step-1'
    },
    riddle() {
      say('Step 2/3 · one command in this terminal reveals all the hidden ones.\n  Answer with:  lv.answer("<that command>")')
      return 'step-2'
    },
    answer(guess: string) {
      if (typeof guess === 'string' && guess.trim().toLowerCase() === 'secrets') return reward()
      say('❌ not quite — think about what you would type to list hidden commands.')
      return 'wrong'
    }
  }

  if (import.meta.client) {
    ;(window as unknown as { lv: typeof lv }).lv = lv
  }
})
