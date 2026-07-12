// The pure pieces of destroy mode (DomDestroyer.vue): which DOM elements are
// shootable, the debris particle system, and the fly-into-the-edge page-scroll
// drive. Kept dependency-free and DOM-free (callers pass primitives) so the
// heuristics that decide what gets destroyed are unit-testable.

export interface DebrisParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

const DEBRIS_COLORS = ['#ffba00', '#ff6b35', '#fff3d6', '#c9a24d']

// containers that are never a leaf target — the arena scaffolding and big
// structural elements survive until their contents are cleared
const STRUCTURAL_TAGS = new Set(['HTML', 'BODY', 'MAIN', 'SECTION', 'NAV', 'FOOTER'])
const STRUCTURAL_CLASSES = new Set(['site-shell', 'site-content', 'container'])

/**
 * Is this element a shootable leaf? Rejects the structural scaffolding, things
 * bigger than half the viewport, and slivers under 4px. Pure: takes the tag,
 * class list and measured rect rather than a live element, so it's testable.
 * (The caller still checks `hasVisibleChildren` — a container only becomes a
 * target once its children are gone, so you dismantle inner-to-outer.)
 */
export function isEligibleTarget(
  tagName: string,
  classNames: readonly string[],
  rect: { width: number, height: number },
  viewport: { w: number, h: number }
): boolean {
  if (STRUCTURAL_TAGS.has(tagName)) return false
  if (classNames.some((name) => STRUCTURAL_CLASSES.has(name))) return false
  if (rect.width * rect.height > viewport.w * viewport.h * 0.5) return false
  if (rect.width < 4 || rect.height < 4) return false
  return true
}

/** A burst of debris over a destroyed element's rect (rand injectable for tests). */
export function spawnDebris(
  rect: { left: number, top: number, width: number, height: number },
  rand: () => number = Math.random
): DebrisParticle[] {
  const particles: DebrisParticle[] = []
  for (let i = 0; i < 26; i++) {
    particles.push({
      x: rect.left + rand() * rect.width,
      y: rect.top + rand() * rect.height,
      vx: (rand() - 0.5) * 9,
      vy: (rand() - 0.7) * 9,
      life: 1,
      color: DEBRIS_COLORS[i % DEBRIS_COLORS.length]!
    })
  }
  return particles
}

/** Advance every particle one frame (gravity + fade) and drop the dead ones. */
export function advanceDebris(particles: DebrisParticle[]): DebrisParticle[] {
  for (const particle of particles) {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vy += 0.25
    particle.life -= 0.025
  }
  return particles.filter((particle) => particle.life > 0)
}

/**
 * Flying into the top/bottom edge zone scrolls the whole page. Returns how far
 * to scroll (px, +down/−up) and where to clamp the ship's y (null = no clamp).
 * Gated on the ship actually moving toward the edge, so a ship resting in the
 * zone (e.g. at spawn) doesn't auto-scroll.
 */
export function edgeScrollDrive(
  shipY: number,
  shipVy: number,
  viewportH: number,
  scrollY: number,
  maxScroll: number,
  edge: number,
  push: number
): { scroll: number, clampY: number | null } {
  if (shipY > viewportH - edge && shipVy > push && scrollY < maxScroll - 0.5) {
    const overshoot = shipY - (viewportH - edge)
    return { scroll: Math.min(overshoot, maxScroll - scrollY), clampY: viewportH - edge }
  }
  if (shipY < edge && shipVy < -push && scrollY > 0.5) {
    const overshoot = edge - shipY
    return { scroll: -Math.min(overshoot, scrollY), clampY: edge }
  }
  return { scroll: 0, clampY: null }
}
