<template>
  <div ref="gridRoot" class="lvos-icons" @keydown="onKey">
    <button v-for="icon in icons" :key="icon.id" class="lvos-icon is-family-code" @click="icon.action">
      <span class="lvos-icon-glyph">
        <AppIcon :name="icon.icon" :size="26" />
        <span v-if="badges?.[icon.id]" class="lvos-icon-badge">{{ badges[icon.id] }}</span>
      </span>
      <span class="lvos-icon-label">{{ icon.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from '~/utils/icons'

interface DesktopIconItem { id: string, label: string, icon: IconName, action: () => void }

defineProps<{ icons: DesktopIconItem[], badges?: Record<string, number> }>()

// arrow keys walk the icon grid like a real desktop (Files already had this);
// the column-wrap layout is measured, not assumed, so wrapping still works
const gridRoot = ref<HTMLElement>()

const moveFocus = (dx: number, dy: number) => {
  const buttons = [...(gridRoot.value?.querySelectorAll<HTMLButtonElement>('.lvos-icon') ?? [])]
  if (!buttons.length) return
  const current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
  if (!current || !buttons.includes(current)) {
    buttons[0]?.focus()
    return
  }
  const from = current.getBoundingClientRect()
  let best: HTMLButtonElement | undefined
  let bestScore = Infinity
  for (const candidate of buttons) {
    if (candidate === current) continue
    const rect = candidate.getBoundingClientRect()
    const ddx = rect.left - from.left
    const ddy = rect.top - from.top
    if (dx && Math.sign(ddx) !== dx) continue
    if (dy && Math.sign(ddy) !== dy) continue
    // primary-axis distance plus a heavy penalty for drifting sideways
    const score = dx
      ? Math.abs(ddx) + Math.abs(ddy) * 2.5
      : Math.abs(ddy) + Math.abs(ddx) * 2.5
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  best?.focus()
}

const DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
}

const onKey = (event: KeyboardEvent) => {
  const dir = DIRECTIONS[event.key]
  if (!dir) return
  event.preventDefault()
  event.stopPropagation()
  moveFocus(dir[0], dir[1])
}
</script>

<style scoped lang="scss">
.lvos-icons {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  bottom: 4rem;
  display: flex;
  flex-flow: column wrap;
  align-content: flex-start;
  gap: 0.75rem;
}

.lvos-icon-glyph {
  position: relative;
}

.lvos-icon-badge {
  position: absolute;
  top: -0.35rem;
  right: -0.6rem;
  min-width: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 0.6rem;
  background-color: var(--bulma-primary);
  color: hsl(240, 11%, 8%);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
}

.lvos-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: 5.5rem;
  padding: 0.6rem 0.25rem;
  border: 1px solid transparent;
  border-radius: var(--bulma-radius);
  background: none;
  color: hsl(var(--lv-scheme-hs), 90%);
  font-size: 0.7rem;
  cursor: pointer;

  .lvos-icon-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: var(--bulma-radius);
    background-color: hsla(var(--lv-primary-hsl), 0.15);
    color: var(--bulma-primary);
  }

  &:hover,
  &:focus-visible {
    border-color: hsla(var(--lv-primary-hsl), 0.4);
    background-color: hsla(var(--lv-primary-hsl), 0.08);
  }
}
</style>
