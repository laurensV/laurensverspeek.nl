import { setCelebrateSink } from '~/utils/terminalGameKit'
import { planPersonalBest } from '~/utils/celebration'

// Wire the game-kit's "new personal best" moment to the site-wide confetti flag.
// Captured at plugin setup so the sink (fired later, outside a Nuxt context) can
// still flip the flag. ScoreCelebration.vue clears celebrateActive when the
// burst finishes; the world-record toast owns worldRecord's lifetime.
export default defineNuxtPlugin(() => {
  const { celebrateActive, worldRecord } = useSiteEffects()
  setCelebrateSink(() => {
    // a plain personal best must not inherit a world-record flag still lingering
    // from a record set moments ago (the toast keeps it ~4.2s, past the confetti)
    const plan = planPersonalBest(celebrateActive.value)
    if (plan.clearWorldRecord) worldRecord.value = ''
    if (plan.trigger) celebrateActive.value = true
  })
})
