// Loads the GoatCounter script when a site code is configured.
// Without NUXT_PUBLIC_GOATCOUNTER this plugin does nothing at all.
export default defineNuxtPlugin(() => {
  const { goatcounter } = useRuntimeConfig().public
  if (!goatcounter) return

  useHead({
    script: [
      {
        'src': 'https://gc.zgo.at/count.js',
        'async': true,
        'data-goatcounter': `https://${goatcounter}.goatcounter.com/count`
      }
    ]
  })
})
