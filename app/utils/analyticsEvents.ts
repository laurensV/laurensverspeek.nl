// The catalog of every analytics event the site can emit. trackEvent() only
// accepts an AnalyticsEvent, so event paths are built here — they can't typo
// or drift at call sites. Add new event kinds to this catalog, not inline.

/** An event path that provably came from the catalog below */
export type AnalyticsEvent = string & { readonly __brand: 'AnalyticsEvent' }

const event = (path: string) => path as AnalyticsEvent

export const analyticsEvents = {
  /** a terminal command was run — name only, never arguments */
  terminalCommand: (name: string) => event(`terminal/${name.toLowerCase()}`)
}
