import { tzToLon, vibeLat, type GlobeMarker } from '~/utils/globe'

// The markers for the visitor globe, assembled from ONE source: the same live
// visitor geo that LiveCursors publishes and the status-bar badge counts. Your
// own marker always shows (even with no relay); other visitors appear by their
// timezone when the relay is on. Privacy-safe: only a UTC offset crosses the
// wire, never a location.
export function useVisitorGlobe() {
  const { geo, enabled, count } = useLiveVisitors()
  // -getTimezoneOffset(): minutes to add to local time to reach UTC, our sign
  const myTz = import.meta.client ? -new Date().getTimezoneOffset() : 0

  const markers = computed<GlobeMarker[]>(() => {
    const me: GlobeMarker = { lat: vibeLat(0), lon: tzToLon(myTz), self: true }
    const others = geo.value.map((visitor) => ({
      lat: vibeLat(visitor.id),
      lon: tzToLon(visitor.tz)
    }))
    return [me, ...others]
  })

  // reuse the ONE count the status-bar badge shows, rather than recomputing it,
  // so the two can never disagree (e.g. on a relay drop)
  return { markers, enabled, count }
}
