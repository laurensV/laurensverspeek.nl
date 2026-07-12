<template>
  <div class="walk">
    <pre class="walk-floor is-family-code" aria-label="The museum floor — arrow keys or WASD to walk">{{ frame }}</pre>

    <div class="walk-hud is-family-code">
      <p class="walk-wing">location: {{ museum[wingIndex]?.title ?? 'the lobby' }}</p>
      <p class="walk-seen">plaques read: {{ seen.size }}/{{ exhibitCount }}<span v-if="seen.size === exhibitCount"> — you've seen the whole museum 🏆</span></p>
    </div>

    <div v-if="plaque" class="walk-plaque">
      <p class="walk-plaque-name">
        {{ exhibit?.name }}
        <span class="walk-plaque-how is-family-code">{{ exhibit?.how }}</span>
      </p>
      <p class="walk-plaque-blurb">{{ exhibit?.blurb }}</p>
    </div>
    <p v-else class="walk-hint is-family-code">// walk up to a ? plaque to read it — arrows or wasd move</p>

    <div class="walk-pad" aria-hidden="true">
      <button @pointerdown.prevent="step(0, -1)">▲</button>
      <div>
        <button @pointerdown.prevent="step(-1, 0)">◀</button>
        <button @pointerdown.prevent="step(0, 1)">▼</button>
        <button @pointerdown.prevent="step(1, 0)">▶</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { museum, exhibitCount } from '~/data/museum'
import { buildMuseumMap, moveVisitor, nearbyPlaque, currentWing, renderMuseum } from '~/utils/museumWalk'

// Walk-the-floor mode for /museum: every wing is a room, every exhibit a
// wall plaque. Discrete, user-initiated movement — reduced motion needs no
// special case.

const map = buildMuseumMap(museum)
const pos = ref(map.spawn)
const seen = ref(new Set<string>())

const plaque = computed(() => nearbyPlaque(map, pos.value))
const exhibit = computed(() =>
  plaque.value ? museum[plaque.value.wing]?.exhibits[plaque.value.exhibit] : undefined
)
const wingIndex = computed(() => currentWing(map, pos.value))
const frame = computed(() => renderMuseum(map, pos.value, 21, plaque.value))

watch(plaque, (ref) => {
  if (ref) seen.value = new Set(seen.value).add(`${ref.wing}:${ref.exhibit}`)
})

const step = (dx: number, dy: number) => {
  pos.value = moveVisitor(map, pos.value, dx, dy)
}

const KEYS: Record<string, [number, number]> = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0]
}
useEventListener('keydown', (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  const dir = KEYS[event.key.toLowerCase()]
  if (!dir) return
  event.preventDefault()
  step(dir[0], dir[1])
})
</script>

<style scoped lang="scss">
.walk-floor {
  margin: 0;
  padding: 1rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: var(--bulma-radius-large);
  background: none;
  color: hsl(var(--lv-scheme-hs), 60%);
  font-size: clamp(0.55rem, 1.6vw, 0.8rem);
  line-height: 1.15;
  overflow-x: auto;
  user-select: none;
}

.walk-hud {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.72rem;

  .walk-wing {
    color: var(--bulma-primary-on-scheme);
  }

  .walk-seen {
    color: var(--bulma-text-weak);
  }
}

.walk-plaque {
  margin-top: 0.75rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--bulma-border-weak);
  border-left: 3px solid hsla(var(--lv-primary-hsl), 0.55);
  border-radius: var(--bulma-radius);

  .walk-plaque-name {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-bottom: 0.3rem;
    font-weight: 600;
    color: var(--bulma-text-strong);
  }

  .walk-plaque-how {
    padding: 0.05rem 0.45rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    color: var(--bulma-primary-on-scheme);
    font-size: 0.68rem;
    font-weight: 400;
    white-space: nowrap;
  }

  .walk-plaque-blurb {
    font-size: 0.85rem;
    line-height: 1.55;
  }
}

.walk-hint {
  margin-top: 0.75rem;
  color: var(--bulma-text-weak);
  font-size: 0.72rem;
}

// touch fallback: a small d-pad, hidden where a keyboard is likely
.walk-pad {
  display: none;
  margin-top: 0.75rem;
  text-align: center;

  button {
    width: 2.6rem;
    height: 2.2rem;
    margin: 0.1rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    cursor: pointer;
  }
}

@media (hover: none) and (pointer: coarse) {
  .walk-pad {
    display: block;
  }
}
</style>
