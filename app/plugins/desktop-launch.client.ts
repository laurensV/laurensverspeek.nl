// Boot lvOS straight from a URL: laurensverspeek.nl/?desktop
// Handy as a shareable "launch the OS" link and a non-terminal entry point.
export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { desktopActive } = useSiteEffects()

  const maybeLaunch = () => {
    if (route.query.desktop !== undefined) desktopActive.value = true
  }

  onNuxtReady(maybeLaunch)
  watch(() => route.query.desktop, maybeLaunch)
})
