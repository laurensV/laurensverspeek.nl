// While the terminal is open the browser-tab icon becomes a filled prompt
// block — the pixel sibling of the tab title's `~ command` reflection.
const TERMINAL_ICON = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">`
  + `<rect width="32" height="32" rx="7" fill="#101014" stroke="#3a3a46" stroke-width="1"/>`
  + `<rect x="8" y="9" width="4" height="14" fill="#ffba00"/>`
  + `<rect x="15" y="9" width="9" height="14" fill="#ffba00" opacity="0.35"/>`
  + `</svg>`
)

export default defineNuxtPlugin(() => {
  const isOpen = useState(STATE_KEYS.terminalOpen, () => false)
  let original: string | null = null

  watch(isOpen, (open) => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')
    if (!icon) return
    if (open) {
      original ??= icon.href
      icon.href = TERMINAL_ICON
    } else if (original !== null) {
      icon.href = original
    }
  })
})
