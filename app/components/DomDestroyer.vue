<template>
  <div class="destroyer" role="application" aria-label="Destroy mode — Escape ends and repairs the site">
    <canvas ref="fxRef" class="destroyer-fx" aria-hidden="true" />
    <div class="destroyer-hud is-family-code">
      <span class="destroyer-score">☠ {{ score }} destroyed</span>
      <span class="destroyer-hint"><kbd>↑</kbd>/<kbd>w</kbd> thrust · <kbd>←</kbd><kbd>→</kbd> rotate · <kbd>space</kbd> fires · <kbd>esc</kbd> ends &amp; repairs</span>
      <button class="destroyer-exit" aria-label="End destroy mode and repair the site" title="End & repair" @click="endMode">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// Destroy mode: an Asteroids-style ship — rotate with ←→, thrust forward with
// ↑, fire with space — flies the page and shoots the actual DOM to pieces.
// Momentum is heavy (slow to speed up, slow to shed), so you commit to a
// heading rather than snapping between directions. Everything it destroys is
// only visibility:hidden, so ending the mode repairs the site.

const { destructActive } = useSiteEffects()

const fxRef = ref<HTMLCanvasElement>()
const score = ref(0)

interface Particle { x: number, y: number, vx: number, vy: number, life: number, color: string }
interface Bullet { x: number, y: number, dx: number, dy: number }

let particles: Particle[] = []
let bullets: Bullet[] = []
let destroyed: { el: HTMLElement, visibility: string }[] = []
let raf = 0
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---- ship physics ----
// low thrust + low drag = heavy momentum: slow acceleration, a long glide, and
// direction changes that take real commitment (à la kickassapp.com / Asteroids)
const ACCEL = 900 // forward thrust, px/s²
const DRAG = 0.7 // exponential drag, 1/s — top speed ≈ ACCEL/DRAG, and the glide is long
const ROT_SPEED = 3.2 // turn rate while a rotate key is held, rad/s
const BULLET_SPEED = 1400 // px/s
const BULLET_STEP = 9 // collision sampling distance, px
const SCROLL_EDGE = 130 // px from top/bottom where the ship starts flying the page
const EDGE_PUSH = 5 // px/s of intent needed before the ship drives the page scroll
const FIRE_CADENCE = 170 // ms between shots while space (or the pointer) is held

// heading 0 points right; the ship starts nose-up
const ship = { x: window.innerWidth / 2, y: window.innerHeight - 80, vx: 0, vy: 0, angle: -Math.PI / 2 }

// held controls: forward thrust and rotation (wasd + arrows)
const FORWARD = new Set(['w', 'arrowup'])
const LEFT = new Set(['a', 'arrowleft'])
const RIGHT = new Set(['d', 'arrowright'])
const CONTROL_KEYS = new Set([...FORWARD, ...LEFT, ...RIGHT])
const held = new Set<string>()
const anyHeld = (keys: Set<string>) => [...keys].some((key) => held.has(key))

// firing: space (held → auto-fire cadence) or a pointer press
let firing = false
let lastShot = 0

// touch flies by dragging: the ship turns toward the finger and thrusts (a tap fires)
let touchSteer: { id: number, startX: number, startY: number, moved: boolean } | null = null
let touchPoint = { x: 0, y: 0 }

// something worth shooting: visible, not our overlay, not a page-sized container
const findTarget = (x: number, y: number): HTMLElement | null => {
  const viewportArea = window.innerWidth * window.innerHeight
  for (const el of document.elementsFromPoint(x, y)) {
    if (!(el instanceof HTMLElement)) continue
    if (el.closest('.destroyer')) continue
    if (['HTML', 'BODY', 'MAIN', 'SECTION', 'NAV', 'FOOTER'].includes(el.tagName)) continue
    if (el.classList.contains('site-shell') || el.classList.contains('site-content') || el.classList.contains('container')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width * rect.height > viewportArea * 0.5) continue
    if (rect.width < 4 || rect.height < 4) continue
    return el
  }
  return null
}

const explode = (rect: DOMRect) => {
  if (reduced) return
  const colors = ['#ffba00', '#ff6b35', '#fff3d6', '#c9a24d']
  for (let i = 0; i < 26; i++) {
    particles.push({
      x: rect.left + Math.random() * rect.width,
      y: rect.top + Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.7) * 9,
      life: 1,
      color: colors[i % colors.length]!
    })
  }
}

const destroy = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  destroyed.push({ el, visibility: el.style.visibility })
  el.style.visibility = 'hidden'
  score.value++
  explode(rect)
}

// fire a bullet straight out of the nose, along the ship's heading
const shootForward = () => {
  const dx = Math.cos(ship.angle)
  const dy = Math.sin(ship.angle)
  bullets.push({ x: ship.x + dx * 24, y: ship.y + dy * 24, dx, dy })
}

const repair = () => {
  for (const { el, visibility } of destroyed) el.style.visibility = visibility
  destroyed = []
}

const endMode = () => {
  repair()
  destructActive.value = false
}

// advance a bullet, sampling the path so fast shots can't tunnel through
// a target between frames; true when the bullet is spent
const flyBullet = (bullet: Bullet, dt: number): boolean => {
  let distance = BULLET_SPEED * dt
  while (distance > 0) {
    const step = Math.min(BULLET_STEP, distance)
    bullet.x += bullet.dx * step
    bullet.y += bullet.dy * step
    distance -= step
    if (bullet.x < 0 || bullet.y < 0 || bullet.x > window.innerWidth || bullet.y > window.innerHeight) {
      return true
    }
    const target = findTarget(bullet.x, bullet.y)
    if (target) {
      destroy(target)
      return true
    }
  }
  return false
}

// smallest signed angle difference, normalized to [-π, π]
const angleDelta = (from: number, to: number): number => {
  let diff = (to - from + Math.PI) % (Math.PI * 2)
  if (diff < 0) diff += Math.PI * 2
  return diff - Math.PI
}

const thrustingForward = () => anyHeld(FORWARD) || touchSteer?.moved === true

const moveShip = (dt: number) => {
  // rotation: hold ← / → to turn (touch aims toward the finger instead)
  if (touchSteer?.moved) {
    const desired = Math.atan2(touchPoint.y - ship.y, touchPoint.x - ship.x)
    const turn = Math.max(-ROT_SPEED * dt, Math.min(ROT_SPEED * dt, angleDelta(ship.angle, desired)))
    ship.angle += turn
  } else {
    if (anyHeld(LEFT)) ship.angle -= ROT_SPEED * dt
    if (anyHeld(RIGHT)) ship.angle += ROT_SPEED * dt
  }

  // thrust only ever pushes forward along the heading
  if (thrustingForward()) {
    ship.vx += Math.cos(ship.angle) * ACCEL * dt
    ship.vy += Math.sin(ship.angle) * ACCEL * dt
  }

  // low drag → a long, heavy glide that resists sudden direction changes
  const drag = Math.exp(-DRAG * dt)
  ship.vx *= drag
  ship.vy *= drag
  ship.x += ship.vx * dt
  ship.y += ship.vy * dt

  // FLYING into the top/bottom edge zone scrolls the page until the document
  // runs out — the whole page is the arena, the viewport just the camera.
  // Gated on moving toward the edge, so a ship resting in the zone (e.g. at
  // spawn) doesn't auto-scroll. (behavior: instant — the site's smooth
  // scroll-behavior would fight these per-frame nudges.)
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  if (ship.y > window.innerHeight - SCROLL_EDGE && ship.vy > EDGE_PUSH && window.scrollY < maxScroll - 0.5) {
    const overshoot = ship.y - (window.innerHeight - SCROLL_EDGE)
    window.scrollBy({ top: Math.min(overshoot, maxScroll - window.scrollY), behavior: 'instant' })
    ship.y = window.innerHeight - SCROLL_EDGE
  } else if (ship.y < SCROLL_EDGE && ship.vy < -EDGE_PUSH && window.scrollY > 0.5) {
    const overshoot = SCROLL_EDGE - ship.y
    window.scrollBy({ top: -Math.min(overshoot, window.scrollY), behavior: 'instant' })
    ship.y = SCROLL_EDGE
  }

  // the document ends here — bump the walls, shedding velocity into them
  const margin = 18
  if (ship.x < margin) { ship.x = margin; ship.vx = 0 }
  if (ship.x > window.innerWidth - margin) { ship.x = window.innerWidth - margin; ship.vx = 0 }
  if (ship.y < margin) { ship.y = margin; ship.vy = 0 }
  if (ship.y > window.innerHeight - margin) { ship.y = window.innerHeight - margin; ship.vy = 0 }
}

let lastTime = 0
const draw = (time: number) => {
  raf = requestAnimationFrame(draw)
  const canvas = fxRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  // clamp dt so a background tab doesn't teleport everything on return
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016
  lastTime = time

  moveShip(dt)
  if (firing && time - lastShot >= FIRE_CADENCE) {
    shootForward()
    lastShot = time
  }
  bullets = bullets.filter((bullet) => !flyBullet(bullet, dt))

  context.clearRect(0, 0, canvas.width, canvas.height)

  // bullets: short tracers along their direction of travel
  context.strokeStyle = '#ffba00'
  context.lineWidth = 3
  context.lineCap = 'round'
  for (const bullet of bullets) {
    context.beginPath()
    context.moveTo(bullet.x - bullet.dx * 12, bullet.y - bullet.dy * 12)
    context.lineTo(bullet.x, bullet.y)
    context.stroke()
  }

  // debris
  for (const particle of particles) {
    context.globalAlpha = particle.life
    context.fillStyle = particle.color
    context.fillRect(particle.x, particle.y, 4, 4)
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vy += 0.25
    particle.life -= 0.025
  }
  context.globalAlpha = 1
  particles = particles.filter((particle) => particle.life > 0)

  // the ship: a small triangle pointing along its heading
  context.save()
  context.translate(ship.x, ship.y)
  context.rotate(ship.angle + Math.PI / 2) // the triangle is drawn nose-up
  // a little exhaust flame while thrusting, flickering with speed
  if (thrustingForward() && !reduced) {
    const flame = 8 + Math.random() * 8
    context.fillStyle = 'rgba(255, 107, 53, 0.85)'
    context.beginPath()
    context.moveTo(-4, 12)
    context.lineTo(0, 12 + flame)
    context.lineTo(4, 12)
    context.closePath()
    context.fill()
  }
  context.fillStyle = '#ffba00'
  context.beginPath()
  context.moveTo(0, -18)
  context.lineTo(11, 12)
  context.lineTo(0, 6)
  context.lineTo(-11, 12)
  context.closePath()
  context.fill()
  context.restore()
}

const fit = () => {
  const canvas = fxRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

onMounted(() => {
  fit()
  raf = requestAnimationFrame(draw)
})
useEventListener('resize', fit)

// pointer: mouse click fires along the current heading (no mouse-aiming); touch
// drags to steer, a tap fires
useEventListener('pointermove', (event: PointerEvent) => {
  if (touchSteer && event.pointerId === touchSteer.id) {
    touchPoint = { x: event.clientX, y: event.clientY }
    if (Math.hypot(event.clientX - touchSteer.startX, event.clientY - touchSteer.startY) > 12) {
      touchSteer.moved = true
    }
  }
})
useEventListener('pointerdown', (event: PointerEvent) => {
  // the HUD is neutral ground
  if ((event.target as HTMLElement).closest('.destroyer-hud')) return
  if (event.pointerType === 'touch') {
    // wait and see: a drag flies the ship, a tap fires (decided on release)
    touchSteer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false }
    touchPoint = { x: event.clientX, y: event.clientY }
    return
  }
  shootForward() // mouse: one shot straight ahead
})
const endTouch = (event: PointerEvent) => {
  if (!touchSteer || event.pointerId !== touchSteer.id) return
  if (!touchSteer.moved) shootForward() // it was a tap
  touchSteer = null
}
useEventListener('pointerup', endTouch)
useEventListener('pointercancel', endTouch)

// keys the browser would scroll with, beyond the ship's own controls
const SCROLL_KEYS = new Set(['pageup', 'pagedown', 'home', 'end'])

useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    endMode()
    return
  }
  const key = event.key.toLowerCase()
  if (key === ' ' || key === 'spacebar') {
    event.preventDefault() // space fires, never scrolls the wreckage
    firing = true
  } else if (CONTROL_KEYS.has(key)) {
    event.preventDefault() // arrows fly the ship, not the page
    held.add(key)
  } else if (SCROLL_KEYS.has(key)) {
    event.preventDefault()
  }
})
useEventListener('keyup', (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  if (key === ' ' || key === 'spacebar') firing = false
  else held.delete(key)
})
// while the ship flies, it owns the scroll — wheel and touch are grounded
useEventListener(window, 'wheel', (event: Event) => event.preventDefault(), { passive: false })
useEventListener(window, 'touchmove', (event: Event) => event.preventDefault(), { passive: false })
// a lost window drops every control, so nothing stays stuck flying/firing
useEventListener(window, 'blur', () => {
  held.clear()
  firing = false
  touchSteer = null
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  repair() // never leave the site broken behind us
})
</script>

<style scoped lang="scss">
.destroyer {
  position: fixed;
  inset: 0;
  z-index: 300;
  cursor: crosshair;
}

.destroyer-fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.destroyer-hud {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: 2px;
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.92);
  font-size: 0.78rem;

  .destroyer-score {
    color: var(--bulma-primary);
    font-weight: 700;
  }

  .destroyer-hint {
    color: hsl(var(--lv-scheme-hs), 60%);

    kbd {
      padding: 0 0.3em;
      border: 1px solid hsl(var(--lv-scheme-hs), 30%);
      border-radius: 2px;
      font-family: inherit;
    }
  }

  // the escape hatch for keyboards-less pilots (touch has no esc key)
  .destroyer-exit {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.4);
    border-radius: 2px;
    background: none;
    color: hsl(var(--lv-scheme-hs), 70%);
    font: inherit;
    cursor: pointer;

    &:hover {
      border-color: var(--bulma-danger);
      color: var(--bulma-danger);
    }
  }
}
</style>
