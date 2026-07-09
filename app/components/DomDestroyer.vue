<template>
  <div class="destroyer" role="application" aria-label="Destroy mode — Escape ends and repairs the site">
    <canvas ref="fxRef" class="destroyer-fx" aria-hidden="true" />
    <div class="destroyer-hud is-family-code">
      <span class="destroyer-score">☠ {{ score }} destroyed</span>
      <span class="destroyer-hint">click to fire · <kbd>esc</kbd> ends &amp; repairs the site</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// Destroy mode: a little ship shoots the actual page to pieces. Everything it
// destroys is only visibility:hidden, so ending the mode repairs the site.

const { destructActive } = useSiteEffects()

const fxRef = ref<HTMLCanvasElement>()
const score = ref(0)

interface Particle { x: number, y: number, vx: number, vy: number, life: number, color: string }
interface Beam { x1: number, y1: number, x2: number, y2: number, life: number }

let particles: Particle[] = []
let beams: Beam[] = []
let destroyed: { el: HTMLElement, visibility: string }[] = []
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 3 }
let raf = 0
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const shipPos = () => ({ x: window.innerWidth / 2, y: window.innerHeight - 64 })

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

const shoot = (event: MouseEvent) => {
  const target = findTarget(event.clientX, event.clientY)
  const ship = shipPos()
  beams.push({ x1: ship.x, y1: ship.y - 18, x2: event.clientX, y2: event.clientY, life: 1 })
  if (!target) return
  const rect = target.getBoundingClientRect()
  destroyed.push({ el: target, visibility: target.style.visibility })
  target.style.visibility = 'hidden'
  score.value++
  explode(rect)
}

const repair = () => {
  for (const { el, visibility } of destroyed) el.style.visibility = visibility
  destroyed = []
}

const endMode = () => {
  repair()
  destructActive.value = false
}

const draw = () => {
  const canvas = fxRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)

  // beams fade fast
  for (const beam of beams) {
    context.strokeStyle = `rgba(255, 186, 0, ${beam.life})`
    context.lineWidth = 2.5
    context.beginPath()
    context.moveTo(beam.x1, beam.y1)
    context.lineTo(beam.x2, beam.y2)
    context.stroke()
    beam.life -= 0.12
  }
  beams = beams.filter((beam) => beam.life > 0)

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

  // the ship: a small triangle aimed at the crosshair
  const ship = shipPos()
  const angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x)
  context.save()
  context.translate(ship.x, ship.y)
  context.rotate(angle + Math.PI / 2)
  context.fillStyle = '#ffba00'
  context.beginPath()
  context.moveTo(0, -18)
  context.lineTo(11, 12)
  context.lineTo(0, 6)
  context.lineTo(-11, 12)
  context.closePath()
  context.fill()
  context.restore()

  raf = requestAnimationFrame(draw)
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
useEventListener('pointermove', (event: PointerEvent) => {
  mouse = { x: event.clientX, y: event.clientY }
})
useEventListener('pointerdown', (event: PointerEvent) => {
  // fire on anything except the HUD
  if ((event.target as HTMLElement).closest('.destroyer-hud')) return
  shoot(event)
})
useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    endMode()
  }
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
}
</style>
