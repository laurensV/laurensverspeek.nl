import { setCelebrateSink } from '~/utils/terminalGameKit'

// Wire the game-kit's "new personal best" moment to the site-wide confetti flag.
// Captured at plugin setup so the sink (fired later, outside a Nuxt context) can
// still flip the flag. ScoreCelebration.vue clears it when the burst finishes.
export default defineNuxtPlugin(() => {
  const { celebrateActive } = useSiteEffects()
  setCelebrateSink(() => { celebrateActive.value = true })
})
