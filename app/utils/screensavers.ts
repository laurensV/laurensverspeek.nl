// The lvOS screensaver gallery. Each saver is a canvas renderer created by
// createSaver(); DesktopScreensaver runs the chosen one, Settings picks it.
// Pure module — no Vue, no DOM beyond the 2d context it's handed — so the
// geometry helpers and the registry are unit-testable.

export const SAVER_IDS = ['starfield', 'toasters', 'mystify'] as const
export type SaverId = (typeof SAVER_IDS)[number]

export const SAVER_NAMES: Record<SaverId, string> = {
  starfield: 'starfield',
  toasters: 'flying toasters',
  mystify: 'mystify'
}

export const isSaverId = (value: unknown): value is SaverId =>
  typeof value === 'string' && (SAVER_IDS as readonly string[]).includes(value)

/** One bounce step: advance by vel, reflect off [min, max]. Returns [pos, vel]. */
export function bounce(pos: number, vel: number, min: number, max: number): [number, number] {
  let next = pos + vel
  let v = vel
  if (next < min) {
    next = min + (min - next)
    v = -v
  } else if (next > max) {
    next = max - (next - max)
    v = -v
  }
  return [next, v]
}

export interface SaverRenderer {
  tick: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

// -- starfield: points streaking outward from center (the classic) ----------

function createStarfield(primary: string): SaverRenderer {
  interface Star { x: number, y: number, z: number }
  let stars: Star[] = []
  const seed = (w: number, h: number): Star => ({
    x: (Math.random() - 0.5) * w,
    y: (Math.random() - 0.5) * h,
    z: Math.random() * w
  })
  return {
    tick(ctx, w, h) {
      if (!stars.length) stars = Array.from({ length: 220 }, () => seed(w, h))
      ctx.fillStyle = 'rgba(6,6,8,0.35)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = primary
      for (const s of stars) {
        s.z -= 6
        if (s.z <= 1) Object.assign(s, seed(w, h), { z: w })
        const k = 128 / s.z
        const size = (1 - s.z / w) * 2.4
        ctx.globalAlpha = Math.min(1, (1 - s.z / w) * 1.5)
        ctx.fillRect(w / 2 + s.x * k, h / 2 + s.y * k, size, size)
      }
      ctx.globalAlpha = 1
    }
  }
}

// -- flying toasters: the After Dark homage, drawn from chunky rects --------

function createToasters(primary: string): SaverRenderer {
  interface Flyer { x: number, y: number, speed: number, scale: number, bread: boolean, phase: number }
  let flyers: Flyer[] = []
  let frame = 0
  const seed = (w: number, h: number, initial: boolean): Flyer => ({
    // spawn along the top/right edge band and glide down-left
    x: initial ? rand(0, w * 1.4) : rand(w * 0.3, w * 1.4),
    y: initial ? rand(-h * 0.4, h) : rand(-h * 0.4, h * 0.4) - 80,
    speed: rand(1.2, 2.6),
    scale: rand(0.7, 1.3),
    bread: Math.random() < 0.35,
    phase: Math.floor(rand(0, 2))
  })

  const drawToaster = (ctx: CanvasRenderingContext2D, f: Flyer, wingUp: boolean) => {
    const s = f.scale
    ctx.save()
    ctx.translate(f.x, f.y)
    ctx.scale(s, s)
    if (f.bread) {
      // a drifting slice of toast
      ctx.fillStyle = '#d9a05b'
      ctx.fillRect(-14, -16, 28, 32)
      ctx.fillStyle = '#f0c98d'
      ctx.fillRect(-10, -12, 20, 24)
    } else {
      // wing (flaps above the body)
      ctx.fillStyle = '#e8e8ee'
      if (wingUp) ctx.fillRect(-4, -34, 8, 18)
      else ctx.fillRect(-4, -24, 8, 8)
      // chrome body + slot + foot
      ctx.fillStyle = '#c8c8d2'
      ctx.fillRect(-20, -16, 40, 28)
      ctx.fillStyle = '#9a9aa6'
      ctx.fillRect(-14, -20, 28, 6)
      ctx.fillStyle = '#5c5c66'
      ctx.fillRect(-16, 12, 32, 4)
    }
    ctx.restore()
  }

  return {
    tick(ctx, w, h) {
      if (!flyers.length) flyers = Array.from({ length: 14 }, () => seed(w, h, true))
      frame++
      ctx.fillStyle = 'rgba(6,6,8,0.5)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = primary
      const wingUp = Math.floor(frame / 12) % 2 === 0
      for (const f of flyers) {
        f.x -= f.speed
        f.y += f.speed * 0.62
        if (f.x < -60 || f.y > h + 60) Object.assign(f, seed(w, h, false))
        drawToaster(ctx, f, (frame + f.phase * 12) % 24 < 12 ? wingUp : !wingUp)
      }
    }
  }
}

// -- mystify: bouncing polygons with fading trails (the Windows one) --------

function createMystify(primary: string): SaverRenderer {
  interface Vertex { x: number, y: number, vx: number, vy: number }
  interface Poly { verts: Vertex[], trail: number[][], color: string }
  let polys: Poly[] = []
  const seed = (w: number, h: number, color: string): Poly => ({
    verts: Array.from({ length: 4 }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(2, 4) * (Math.random() < 0.5 ? -1 : 1),
      vy: rand(2, 4) * (Math.random() < 0.5 ? -1 : 1)
    })),
    trail: [],
    color
  })

  return {
    tick(ctx, w, h) {
      if (!polys.length) polys = [seed(w, h, primary), seed(w, h, '#3fbf7f')]
      ctx.fillStyle = 'rgb(6, 6, 8)'
      ctx.fillRect(0, 0, w, h)
      for (const poly of polys) {
        for (const v of poly.verts) {
          ;[v.x, v.vx] = bounce(v.x, v.vx, 0, w)
          ;[v.y, v.vy] = bounce(v.y, v.vy, 0, h)
        }
        poly.trail.push(poly.verts.flatMap((v) => [v.x, v.y]))
        if (poly.trail.length > 16) poly.trail.shift()
        poly.trail.forEach((shape, i) => {
          ctx.globalAlpha = ((i + 1) / poly.trail.length) * 0.9
          ctx.strokeStyle = poly.color
          ctx.beginPath()
          ctx.moveTo(shape[0]!, shape[1]!)
          for (let p = 2; p < shape.length; p += 2) ctx.lineTo(shape[p]!, shape[p + 1]!)
          ctx.closePath()
          ctx.stroke()
        })
      }
      ctx.globalAlpha = 1
    }
  }
}

export function createSaver(id: SaverId, primary: string): SaverRenderer {
  if (id === 'toasters') return createToasters(primary)
  if (id === 'mystify') return createMystify(primary)
  return createStarfield(primary)
}
