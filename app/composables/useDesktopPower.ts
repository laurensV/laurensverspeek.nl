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
  const powerOff = (after: () => void) => {
    closeMenus()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return after()
    poweringOff.value = true
    powerTimer = setTimeout(() => {
      poweringOff.value = false
      after()
    }, 950)
  }
  onUnmounted(() => clearTimeout(powerTimer))

  const shutdown = () => powerOff(() => void router.push('/'))
  const reboot = () => powerOff(() => {
    deps.booting.value = true
  })

  return { locked, lock, logout, poweringOff, shutdown, reboot }
}
