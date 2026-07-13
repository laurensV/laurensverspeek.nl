// Brand hover animation: the ~ "expands" into /home character by character,
// the way a shell would, and types back down on leave.
const BRAND_FRAMES = ['~', '/', '/h', '/ho', '/hom', '/home'] as const

export function useBrandTyping() {
  const brandFrame = ref(0)
  const brandTyping = ref(false)
  const brandText = computed(() => `${BRAND_FRAMES[brandFrame.value]}/laurens`)
  const brandExpanded = computed(() => brandFrame.value === BRAND_FRAMES.length - 1)

  let brandTimer: ReturnType<typeof setInterval> | undefined

  const expandBrand = (expand: boolean) => {
    if (brandTimer) clearInterval(brandTimer)
    const target = expand ? BRAND_FRAMES.length - 1 : 0
    if (prefersReducedMotion()) {
      brandFrame.value = target
      return
    }
    if (brandFrame.value === target) return
    brandTyping.value = true
    brandTimer = setInterval(() => {
      brandFrame.value += brandFrame.value < target ? 1 : -1
      if (brandFrame.value === target) {
        clearInterval(brandTimer)
        brandTyping.value = false
      }
    }, 55)
  }

  onUnmounted(() => {
    if (brandTimer) clearInterval(brandTimer)
  })

  return { brandText, brandTyping, brandExpanded, expandBrand }
}
