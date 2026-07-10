// An ASCII teapot for the 418 page, rendered donut.c style: a point cloud of
// a stylized teapot (body, lid, knob, spout, handle) rotated in software,
// z-buffered, and shaded with an ASCII luminance ramp. Pure — testable, and
// the page just draws frames into a <pre>.

export interface TeapotPoint {
  x: number
  y: number
  z: number
  // unit surface normal, for diffuse shading
  nx: number
  ny: number
  nz: number
}

const RAMP = '.,-~:;=!*#%@'

/** Sample the stylized teapot once; the render rotates this cloud per frame. */
export function teapotPoints(): TeapotPoint[] {
  const points: TeapotPoint[] = []

  // body: a sphere squashed vertically, radius 1, slightly flattened bottom
  for (let i = 0; i < 40; i++) {
    const theta = (Math.PI * (i + 0.5)) / 40 // 0..π from top to bottom
    for (let j = 0; j < 72; j++) {
      const phi = (2 * Math.PI * j) / 72
      const sx = Math.sin(theta) * Math.cos(phi)
      const sy = Math.cos(theta)
      const sz = Math.sin(theta) * Math.sin(phi)
      points.push({ x: sx, y: sy * 0.72, z: sz, nx: sx, ny: sy, nz: sz })
    }
  }

  // lid knob: a small sphere sitting on top
  for (let i = 0; i < 10; i++) {
    const theta = (Math.PI * (i + 0.5)) / 10
    for (let j = 0; j < 20; j++) {
      const phi = (2 * Math.PI * j) / 20
      const sx = Math.sin(theta) * Math.cos(phi)
      const sy = Math.cos(theta)
      const sz = Math.sin(theta) * Math.sin(phi)
      points.push({ x: sx * 0.16, y: 0.82 + sy * 0.16, z: sz * 0.16, nx: sx, ny: sy, nz: sz })
    }
  }

  // spout: a tapering tube leaving the body at +x, rising outward. Rings are
  // built in a frame perpendicular to the spout's direction so the tube reads
  // as a tube from every viewing angle.
  const spoutDir = { x: 0.86, y: 0.51 } // normalized-ish direction in the x/y plane
  for (let i = 0; i <= 26; i++) {
    const t = i / 26
    const cx = 0.72 + t * 0.85 * spoutDir.x
    const cy = -0.28 + t * 0.85 * spoutDir.y + t * t * 0.18 // slight upward curl
    const radius = 0.19 * (1 - t * 0.4)
    // perpendicular frame: u = world z, v = dir × u (in the x/y plane)
    for (let j = 0; j < 20; j++) {
      const phi = (2 * Math.PI * j) / 20
      const uz = Math.cos(phi) // along world z
      const vAmt = Math.sin(phi) // along v = (-dir.y, dir.x, 0)
      const nx = -spoutDir.y * vAmt
      const ny = spoutDir.x * vAmt
      const nz = uz
      points.push({
        x: cx + nx * radius,
        y: cy + ny * radius,
        z: nz * radius,
        nx,
        ny,
        nz
      })
    }
  }

  // handle: a generous half-torus on the -x side, in the x/y plane
  for (let i = 0; i <= 32; i++) {
    const arc = (Math.PI * i) / 32 - Math.PI / 2 // -90°..90°
    const cx = -0.72 - Math.cos(arc) * 0.62
    const cy = Math.sin(arc) * 0.52
    for (let j = 0; j < 16; j++) {
      const phi = (2 * Math.PI * j) / 16
      const ring = 0.1
      const nx = -Math.cos(arc) * Math.cos(phi)
      const ny = Math.sin(arc) * Math.cos(phi)
      const nz = Math.sin(phi)
      points.push({
        x: cx + nx * ring,
        y: cy + ny * ring,
        z: nz * ring,
        nx,
        ny,
        nz
      })
    }
  }

  return points
}

/**
 * Render the cloud at the given rotation into ASCII. Y rotates the pot on its
 * axis (the spin), X tips it toward/away from the viewer (the drag).
 */
export function renderTeapot(
  points: TeapotPoint[],
  angleY: number,
  angleX: number,
  width = 64,
  height = 30
): string {
  const cosY = Math.cos(angleY)
  const sinY = Math.sin(angleY)
  const cosX = Math.cos(angleX)
  const sinX = Math.sin(angleX)
  const buffer = new Array<string>(width * height).fill(' ')
  // smaller z2 = closer to the camera (scale shrinks as z2 grows)
  const zbuf = new Array<number>(width * height).fill(Infinity)

  // light from the upper-left front
  const lx = -0.4
  const ly = 0.7
  const lz = -0.6

  for (const point of points) {
    // rotate around Y, then X
    const x1 = point.x * cosY + point.z * sinY
    const z1 = -point.x * sinY + point.z * cosY
    const y2 = point.y * cosX - z1 * sinX
    const z2 = point.y * sinX + z1 * cosX

    // same rotation for the normal
    const nx1 = point.nx * cosY + point.nz * sinY
    const nz1 = -point.nx * sinY + point.nz * cosY
    const ny2 = point.ny * cosX - nz1 * sinX
    const nz2 = point.ny * sinX + nz1 * cosX

    // weak perspective; terminal cells are ~2:1 so x gets doubled
    const scale = 1 / (2.6 + z2)
    const px = Math.round(width / 2 + x1 * scale * width * 0.72)
    const py = Math.round(height / 2 - y2 * scale * height * 1.05)
    if (px < 0 || px >= width || py < 0 || py >= height) continue

    const idx = py * width + px
    if (z2 >= zbuf[idx]!) continue // a closer point already owns this cell
    zbuf[idx] = z2

    const lum = nx1 * lx + ny2 * ly + nz2 * lz
    const shade = Math.max(0, Math.min(RAMP.length - 1, Math.floor((lum + 1) * 0.5 * RAMP.length)))
    buffer[idx] = RAMP[shade]!
  }

  const rows: string[] = []
  for (let y = 0; y < height; y++) {
    rows.push(buffer.slice(y * width, (y + 1) * width).join(''))
  }
  return rows.join('\n')
}
