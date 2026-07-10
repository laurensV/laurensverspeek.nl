// Keep the mobile browser chrome (<meta name="theme-color">) on the page's
// actual surface color instead of a fixed amber — it follows theme switches.
export default defineNuxtPlugin((nuxtApp) => {
  const colorMode = useColorMode()

  const apply = () => {
    // read after a frame so the new theme's CSS has actually applied
    requestAnimationFrame(() => {
      const meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) return
      const surface = getComputedStyle(document.body).backgroundColor
      meta.setAttribute(
        'content',
        surface && surface !== 'rgba(0, 0, 0, 0)'
          ? surface
          : colorMode.value === 'dark' ? '#101014' : '#ffffff'
      )
    })
  }

  nuxtApp.hook('app:mounted', apply)
  watch(() => colorMode.value, apply)
})
