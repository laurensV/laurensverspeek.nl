// App-icon badge for the installed PWA: the unread-mail count (the same
// single-source read-state the lvOS mail icon and terminal `mail` use) shows
// on the home-screen/dock icon via the Badging API, and clears as you read.
// Only engages when actually running installed — browsers don't render badges
// for tabs, and regular visitors shouldn't pay for the mail fetch.
export default defineNuxtPlugin(() => {
  if (!('setAppBadge' in navigator)) return
  const installed = window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: window-controls-overlay)').matches
  if (!installed) return

  const { unread } = useLvosMail()
  watch(unread, (count) => {
    // the OS treats a failed badge as cosmetic — never surface it
    if (count > 0) void navigator.setAppBadge(count).catch(() => undefined)
    else void navigator.clearAppBadge().catch(() => undefined)
  }, { immediate: true })
})
