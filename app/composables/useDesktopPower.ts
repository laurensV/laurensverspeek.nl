import type { Ref } from 'vue'

// lvOS session & power: lock screen, logout, and the CRT power-off that
// precedes shutdown/reboot. Extracted from WebDesktop so the shell stays
// mostly template.

export function useDesktopPower(deps: {
  booting: Ref<boolean>
  startOpen: Ref<boolean>
  calendarOpen: Ref<boolean>
}) {
  const router = useRouter()

  const closeMenus = () => {
    deps.startOpen.value = false
    deps.calendarOpen.value = false
  }

  const logout = () => {
    closeMenus()
    void router.push('/')
  }

  // the lock screen overlays everything; keyboard shortcuts pause while it's up
  const locked = ref(false)
  const lock = () => {
    closeMenus()
    locked.value = true
  }

  // CRT power-off: collapse the desktop to a bright line, then act. Reduced
  // motion skips straight to the action.
  const poweringOff = ref(false)
  let powerTimer: ReturnType<typeof setTimeout> | undefined
  // keepDim leaves the desktop collapsed after the animation: shutdown hands off
  // to an async router push, and clearing the class (the keyframes fill forwards)
  // would snap the desktop back to full size for a frame before it unmounts.
  const powerOff = (after: () => void, keepDim = false) => {
    closeMenus()
    if (prefersReducedMotion()) return after()
    poweringOff.value = true
    powerTimer = setTimeout(() => {
      after()
      if (!keepDim) poweringOff.value = false
    }, 950)
  }
  onUnmounted(() => clearTimeout(powerTimer))

  const shutdown = () => powerOff(() => void router.push('/'), true)
  // reboot swaps to the boot screen (v-if) in the same flush that clears the
  // class, so the desktop is already gone — no flash to guard against.
  const reboot = () => powerOff(() => {
    deps.booting.value = true
  })

  return { locked, lock, logout, poweringOff, shutdown, reboot }
}
