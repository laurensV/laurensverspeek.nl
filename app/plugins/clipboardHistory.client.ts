import { setClipboardRecorder } from '~/utils/clipboard'

// Wire the clipboard history's recorder into the shared writeClipboard() helper
// once, in a real Nuxt context, so every copy across the site is remembered —
// including the terminal's `| copy` pipe, which runs outside a component.
export default defineNuxtPlugin(() => {
  const { record } = useClipboardHistory()
  setClipboardRecorder(record)
})
