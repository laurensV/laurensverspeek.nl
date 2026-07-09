import type { AnalyticsEvent } from '~/utils/analyticsEvents'

// Privacy-first analytics via GoatCounter (no cookies, no personal data).
// Disabled unless NUXT_PUBLIC_GOATCOUNTER is set to your GoatCounter code,
// e.g. NUXT_PUBLIC_GOATCOUNTER=laurensverspeek → laurensverspeek.goatcounter.com

interface GoatCounter {
  count: (options: { path: string, event?: boolean }) => void
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

export function useAnalytics() {
  const { goatcounter } = useRuntimeConfig().public

  const enabled = computed(() => Boolean(goatcounter))

  /** Count a custom event — only paths built by the analyticsEvents catalog */
  const trackEvent = (name: AnalyticsEvent) => {
    if (!import.meta.client || !goatcounter) return
    window.goatcounter?.count({ path: name, event: true })
  }

  return { enabled, trackEvent }
}
