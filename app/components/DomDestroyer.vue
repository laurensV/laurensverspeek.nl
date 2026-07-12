<template>
  <div class="destroyer" role="application" aria-label="Destroy mode — Escape ends and repairs the site">
    <canvas ref="fxRef" class="destroyer-fx" aria-hidden="true" />
    <div class="destroyer-hud is-family-code">
      <span class="destroyer-score">☠ {{ score }} destroyed</span>
      <span class="destroyer-hint destroyer-hint-keys"><kbd>↑</kbd>/<kbd>w</kbd> thrust · <kbd>←</kbd><kbd>→</kbd> rotate · <kbd>space</kbd> fires · <kbd>esc</kbd> ends &amp; repairs</span>
      <span class="destroyer-hint destroyer-hint-touch">drag to fly · tap (or hold fire) to shoot · ✕ repairs</span>
      <button class="destroyer-exit" aria-label="End destroy mode and repair the site" title="End & repair" @click="endMode">✕</button>
    </div>
    <button
      class="destroyer-fire"
      aria-label="Hold to fire"
      @pointerdown.prevent="setFiring(true)"
      @pointerup="setFiring(false)"
      @pointercancel="setFiring(false)"
      @pointerleave="setFiring(false)"
      @contextmenu.prevent
    >fire</button>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { stepShip, steerToward } from '~/utils/shipPhysics'

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

// ---- ship physics (the pure flight model lives in utils/shipPhysics) ----
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

// does this element still have visible element children? a container is only
// destroyable once its children are cleared — so you dismantle inner-to-outer
const hasVisibleChildren = (el: HTMLElement): boolean => {
  for (const child of el.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.style.visibility === 'hidden') continue
    if (child.closest('.destroyer')) continue
    const rect = child.getBoundingClientRect()
    if (rect.width >= 2 && rect.height >= 2) return true
  }
  return false
}

// something worth shooting under (x, y): the single topmost element (a cheap
// elementFromPoint, since the overlay is pointer-transparent), but ONLY when
// it's a leaf — a big parent full of children survives until they're gone, so
// bullets chew through the small/nested bits first.
const findTarget = (x: number, y: number): HTMLElement | null => {
  const el = document.elementFromPoint(x, y)
  if (!(el instanceof HTMLElement)) return null
  if (el.closest('.destroyer')) return null
  if (['HTML', 'BODY', 'MAIN', 'SECTION', 'NAV', 'FOOTER'].includes(el.tagName)) return null
  if (el.classList.contains('site-shell') || el.classList.contains('site-content') || el.classList.contains('container')) return null
  const rect = el.getBoundingClientRect()
  if (rect.width * rect.height > window.innerWidth * window.innerHeight * 0.5) return null
  if (rect.width < 4 || rect.height < 4) return null
  if (hasVisibleChildren(el)) return null // clear the inner elements first
  return el
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

const thrustingForward = () => anyHeld(FORWARD) || touchSteer?.moved === true

const moveShip = (dt: number) => {
  // touch aims the nose toward the finger; keys rotate ← / →
  if (touchSteer?.moved) {
    ship.angle = steerToward(ship, touchPoint.x, touchPoint.y, dt)
  }
  const turn = touchSteer?.moved ? 0 : (anyHeld(RIGHT) ? 1 : 0) - (anyHeld(LEFT) ? 1 : 0)
  // the pure Asteroids model advances heading + momentum (utils/shipPhysics)
  const next = stepShip(ship, { thrust: thrustingForward(), turn, dt })
  Object.assign(ship, next)

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

// the thumb fire button drives the same auto-fire flag as a held space key
const setFiring = (value: boolean) => {
  firing = value
}

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
  if ((event.target as HTMLElement).closest('.destroyer-hud, .destroyer-fire')) return
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
// the overlay is pointer-transparent (so hit-testing is cheap), so swallow page
// clicks in the capture phase — a shot must never also follow a link
useEventListener(window, 'click', (event: MouseEvent) => {
  const target = event.target
  if (target instanceof HTMLElement && target.closest('.destroyer-hud, .destroyer-fire')) return
  event.preventDefault()
  event.stopPropagation()
}, { capture: true })

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
  // pointer-transparent so elementFromPoint reaches the page beneath (cheap
  // hit-testing); shooting + page-click suppression run on window listeners
  pointer-events: none;

  // only the HUD (and the touch fire button) is interactive
  .destroyer-hud,
  .destroyer-fire {
    pointer-events: auto;
  }
}

// a thumb-sized held-to-fire button, only where fingers are the pointer
.destroyer-fire {
  display: none;

  @media (pointer: coarse) {
    display: block;
    position: absolute;
    right: 1.1rem;
    bottom: 5.5rem;
    width: 4.4rem;
    height: 4.4rem;
    border: 2px solid hsla(var(--lv-primary-hsl), 0.7);
    border-radius: 50%;
    background-color: hsla(var(--lv-scheme-hs), 6%, 0.8);
    color: var(--bulma-primary);
    font: inherit;
    font-weight: 700;
    letter-spacing: 0.05em;
    touch-action: none;
    user-select: none;

    &:active {
      background-color: hsla(var(--lv-primary-hsl), 0.3);
    }
  }
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

    // keyboard hint for mice, drag hint for fingers
    &.destroyer-hint-touch {
      display: none;
    }

    @media (pointer: coarse) {
      &.destroyer-hint-keys {
        display: none;
      }

      &.destroyer-hint-touch {
        display: inline;
      }
    }

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
