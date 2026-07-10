<template>
  <div class="mines is-family-code">
    <div class="mines-levels">
      <button
        v-for="(config, name) in LEVELS"
        :key="name"
        class="mines-level"
        :class="{ 'is-active': level === name }"
        @click="setLevel(name)"
      >{{ name }}</button>
    </div>
    <div class="mines-status">
      <span>⚑ {{ minesLeft }}</span>
      <button class="mines-face" title="Restart" @click="reset">
        {{ status === 'lost' ? '×_×' : status === 'won' ? '^_^' : 'o_o' }}
      </button>
      <span class="mines-time">{{ seconds }}s</span>
    </div>
    <div class="mines-grid" :style="{ gridTemplateColumns: `repeat(${W}, var(--mines-cell))`, '--mines-cell': W > 16 ? '1.15rem' : W > 9 ? '1.4rem' : '1.7rem' }" @contextmenu.prevent>
      <button
        v-for="(cell, i) in cells"
        :key="i"
        class="mines-cell"
        :class="{ 'is-revealed': cell.revealed, [`count-${cell.count}`]: cell.revealed && cell.count }"
        @click="reveal(i)"
        @contextmenu.prevent="flag(i)"
      >
        <template v-if="cell.revealed">{{ cell.mine ? '✱' : cell.count || '' }}</template>
        <template v-else-if="cell.flagged">⚑</template>
      </button>
    </div>
    <p class="mines-hint">
      left-click: dig · right-click: flag
      <template v-if="best !== null"> · best {{ level }}: {{ best }}s</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { storageGet, storageSet } from '~/utils/safeStorage'

// Minesweeper for lvOS: three board sizes, a timer, a persisted best time per
// level — and the first click is always safe.

const LEVELS = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 12, mines: 28 },
  expert: { w: 22, h: 14, mines: 58 }
} as const
type Level = keyof typeof LEVELS

const level = ref<Level>((storageGet('lvos-mines-level') as Level | null) ?? 'beginner')
const W = computed(() => LEVELS[level.value].w)
const H = computed(() => LEVELS[level.value].h)
const MINES = computed(() => LEVELS[level.value].mines)

interface Cell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  count: number
}

const cells = ref<Cell[]>([])
const status = ref<'fresh' | 'playing' | 'won' | 'lost'>('fresh')

const minesLeft = computed(
  () => MINES.value - cells.value.filter((c) => c.flagged).length
)

// timer + persisted best time per level
const seconds = ref(0)
let ticker: ReturnType<typeof setInterval> | undefined
const best = ref<number | null>(null)
const loadBest = () => {
  const saved = Number(storageGet(`lvos-mines-best-${level.value}`))
  best.value = Number.isFinite(saved) && saved > 0 ? saved : null
}
const stopTimer = () => {
  clearInterval(ticker)
  ticker = undefined
}
onUnmounted(stopTimer)

const setLevel = (name: Level) => {
  level.value = name
  storageSet('lvos-mines-level', name)
  reset()
}

const neighbors = (i: number): number[] => {
  const x = i % W.value
  const y = Math.floor(i / W.value)
  const result: number[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < W.value && ny >= 0 && ny < H.value) result.push(ny * W.value + nx)
    }
  }
  return result
}

const reset = () => {
  cells.value = Array.from({ length: W.value * H.value }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    count: 0
  }))
  status.value = 'fresh'
  stopTimer()
  seconds.value = 0
  loadBest()
}

const placeMines = (safe: number) => {
  let placed = 0
  while (placed < MINES.value) {
    const i = Math.floor(Math.random() * W.value * H.value)
    if (i === safe || cells.value[i]!.mine) continue
    cells.value[i]!.mine = true
    placed++
  }
  cells.value.forEach((cell, i) => {
    cell.count = neighbors(i).filter((n) => cells.value[n]!.mine).length
  })
}

const reveal = (i: number) => {
  const cell = cells.value[i]!
  if (status.value === 'won' || status.value === 'lost' || cell.flagged || cell.revealed) return
  if (status.value === 'fresh') {
    placeMines(i)
    status.value = 'playing'
    ticker = setInterval(() => seconds.value++, 1000)
  }
  if (cell.mine) {
    status.value = 'lost'
    stopTimer()
    cells.value.forEach((c) => (c.revealed = c.mine ? true : c.revealed))
    return
  }
  // flood reveal
  const queue = [i]
  while (queue.length) {
    const idx = queue.pop()!
    const current = cells.value[idx]!
    if (current.revealed || current.flagged) continue
    current.revealed = true
    if (current.count === 0) queue.push(...neighbors(idx))
  }
  if (cells.value.filter((c) => !c.revealed).length === MINES.value) {
    status.value = 'won'
    stopTimer()
    if (best.value === null || seconds.value < best.value) {
      best.value = seconds.value
      storageSet(`lvos-mines-best-${level.value}`, String(seconds.value))
    }
  }
}

const flag = (i: number) => {
  const cell = cells.value[i]!
  if (!cell.revealed && status.value !== 'won' && status.value !== 'lost') {
    cell.flagged = !cell.flagged
  }
}

reset()
</script>

<style scoped lang="scss">
.mines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.mines-status {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 0.8rem;

  .mines-face {
    padding: 0.2rem 0.6rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    cursor: pointer;
  }
}

.mines-grid {
  display: grid;
}

.mines-levels {
  display: flex;
  gap: 0.5rem;

  .mines-level {
    padding: 0.15rem 0.5rem;
    border: 1px solid transparent;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    font-size: 0.68rem;
    cursor: pointer;

    &.is-active {
      border-color: hsla(var(--lv-primary-hsl), 0.4);
      color: var(--bulma-primary);
    }
  }
}

.mines-cell {
  width: var(--mines-cell, 1.7rem);
  height: var(--mines-cell, 1.7rem);
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  background-color: hsla(var(--lv-primary-hsl), 0.12);
  color: inherit;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;

  &:hover:not(.is-revealed) {
    background-color: hsla(var(--lv-primary-hsl), 0.25);
  }

  &.is-revealed {
    background-color: hsla(var(--lv-scheme-hs), 16%, 0.9);
    cursor: default;
  }

  &.count-1 { color: var(--bulma-info); }
  &.count-2 { color: var(--bulma-success); }
  &.count-3 { color: var(--bulma-danger); }
  &.count-4 { color: var(--bulma-primary); }
  &.count-5,
  &.count-6,
  &.count-7,
  &.count-8 { color: var(--bulma-warning); }
}

.mines-hint {
  font-size: 0.65rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
