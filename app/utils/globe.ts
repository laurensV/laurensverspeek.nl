// A spinning ASCII earth, rendered the teapot way: pure math, no deps.
// Front-face sphere sampling against a coarse continent model — every cell of
// the disc maps to a lat/lon, land gets ink, sea gets mist, and visitor
// markers ride the surface (longitude from their timezone, latitude by vibes).

export interface GlobeMarker {
  /** degrees, +north */
  lat: number
  /** degrees, +east */
  lon: number
  /** true for the viewer's own marker (drawn distinct) */
  self?: boolean
}

const DEG = Math.PI / 180

// continents as rough lat/lon ellipses+boxes — recognizable at 40 columns,
// which is all a terminal globe owes the cartographers
const LAND: { lat: number, lon: number, latR: number, lonR: number }[] = [
  { lat: 48, lon: -100, latR: 22, lonR: 32 }, // north america
  { lat: 62, lon: -42, latR: 8, lonR: 8 }, // greenland
  { lat: 8, lon: -78, latR: 10, lonR: 8 }, // central america bridge
  { lat: -14, lon: -60, latR: 22, lonR: 18 }, // south america
  { lat: 52, lon: 18, latR: 14, lonR: 24 }, // europe
  { lat: 4, lon: 20, latR: 34, lonR: 24 }, // africa
  { lat: 52, lon: 90, latR: 22, lonR: 52 }, // siberia + central asia
  { lat: 22, lon: 92, latR: 18, lonR: 28 }, // india / southeast asia
  { lat: -25, lon: 134, latR: 12, lonR: 18 }, // australia
  { lat: -84, lon: 0, latR: 8, lonR: 180 } // antarctica
]

/** True when the coarse continent model calls this coordinate land. */
export function isLand(lat: number, lon: number): boolean {
  for (const blob of LAND) {
    // wrap longitude distance around the date line
    let dLon = Math.abs(lon - blob.lon)
    if (dLon > 180) dLon = 360 - dLon
    const dLat = lat - blob.lat
    if ((dLat / blob.latR) ** 2 + (dLon / blob.lonR) ** 2 <= 1) return true
  }
  return false
}

/**
 * Render one frame of the globe. `spin` in radians (grows = eastward turn),
 * `width`/`height` in character cells (terminal cells are ~2:1 tall).
 */
export function renderGlobe(spin: number, width: number, height: number, markers: GlobeMarker[] = []): string[] {
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const radius = Math.min(cx / 2, cy) // ×2 horizontally to counter cell aspect
  const rows: string[][] = []

  for (let py = 0; py < height; py++) {
    const row: string[] = []
    for (let px = 0; px < width; px++) {
      const x = (px - cx) / (radius * 2)
      const y = (py - cy) / radius
      const rr = x * x + y * y
      if (rr > 1) {
        row.push(' ')
        continue
      }
      const z = Math.sqrt(1 - rr) // front hemisphere
      const lat = Math.asin(-y) / DEG
      const lon = (Math.atan2(x, z) + spin) / DEG
      const norm = ((lon + 540) % 360) - 180 // wrap into [-180, 180)
      if (isLand(lat, norm)) {
        // limb shading: land dims toward the edge of the disc
        row.push(z > 0.55 ? '@' : z > 0.25 ? '%' : '*')
      } else {
        row.push(z > 0.4 ? '·' : ' ')
      }
    }
    rows.push(row)
  }

  // markers overwrite the surface when they face the camera
  for (const marker of markers) {
    const latR = marker.lat * DEG
    const lonR = marker.lon * DEG - spin
    const y = -Math.sin(latR)
    const x = Math.cos(latR) * Math.sin(lonR)
    const z = Math.cos(latR) * Math.cos(lonR)
    if (z <= 0.05) continue // on the far side
    const px = Math.round(cx + x * radius * 2)
    const py = Math.round(cy + y * radius)
    if (py >= 0 && py < height && px >= 0 && px < width) {
      rows[py]![px] = marker.self ? '◉' : '●'
    }
  }

  return rows.map((row) => row.join(''))
}

/** Longitude implied by a UTC offset in minutes (15° per hour). */
export function tzToLon(offsetMinutes: number): number {
  return Math.max(-180, Math.min(180, (offsetMinutes / 60) * 15))
}

/** A deterministic "latitude by vibes" for a visitor id — stable per visitor. */
export function vibeLat(id: number): number {
  return ((id * 37) % 66) - 16 // -16°..49°, where most people live
}
