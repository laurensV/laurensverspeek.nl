import { initTerminalFs } from '~/utils/terminal/terminalStorage'

// The terminal overlay is lazily mounted now, so the VFS restore + site/blog
// seeding it used to trigger on every page (when it was always mounted) no
// longer happens on a plain page. This plugin runs that init on every client
// page load — cheap (no command registry, just the filesystem) — so blog
// overrides, `reseed` and the Files app find a complete, seeded filesystem
// whether or not the terminal is ever opened. It wires exactly once per app
// lifetime (shared guard with the terminal's own call).
export default defineNuxtPlugin((nuxtApp) => {
  initTerminalFs(() =>
    nuxtApp.runWithContext(() => queryCollection('blog').order('date', 'DESC').all())
  )
})
