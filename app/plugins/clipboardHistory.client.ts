import { setClipboardRecorder } from '~/utils/clipboard'

// Wire the clipboard history's recorder into the shared writeClipboard() helper
// once, in a real Nuxt context, so every copy across the site is remembered —
// including the terminal's `| copy` pipe, which runs outside a component.
export default defineNuxtPlugin(() => {
  const { record } = useClipboardHistory()
  setClipboardRecorder(record)

  // ALSO record plain select-and-copy (Ctrl/Cmd+C, right-click → Copy) anywhere
  // on the site: those never touch writeClipboard(), so without this the history
  // looked empty unless you used a copy button or the terminal's `| copy`.
  document.addEventListener('copy', () => {
    const text = window.getSelection()?.toString()
    if (text) record(text)
  })
})
