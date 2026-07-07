<template>
  <div class="mines is-family-code">
    <div class="mines-status">
      <span>⚑ {{ minesLeft }}</span>
      <button class="mines-face" title="Restart" @click="reset">
        {{ status === 'lost' ? '×_×' : status === 'won' ? '^_^' : 'o_o' }}
      </button>
      <span>{{ status === 'won' ? 'gg!' : status === 'lost' ? 'oops' : '...' }}</span>
    </div>
    <div class="mines-grid" @contextmenu.prevent>
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
    <p class="mines-hint">left-click: dig · right-click: flag</p>
  </div>
</template>

<script setup lang="ts">
// Minesweeper for lvOS: 9×9, 10 mines, first click is always safe.

const W = 9
const H = 9
const MINES = 10

interface Cell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  count: number
}

const cells = ref<Cell[]>([])
const status = ref<'fresh' | 'playing' | 'won' | 'lost'>('fresh')

const minesLeft = computed(
  () => MINES - cells.value.filter((c) => c.flagged).length
)

const neighbors = (i: number): number[] => {
  const x = i % W
  const y = Math.floor(i / W)
  const result: number[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) result.push(ny * W + nx)
    }
  }
  return result
}

const reset = () => {
  cells.value = Array.from({ length: W * H }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    count: 0
  }))
  status.value = 'fresh'
}

const placeMines = (safe: number) => {
  let placed = 0
  while (placed < MINES) {
    const i = Math.floor(Math.random() * W * H)
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
  }
  if (cell.mine) {
    status.value = 'lost'
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
  if (cells.value.filter((c) => !c.revealed).length === MINES) {
    status.value = 'won'
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
  grid-template-columns: repeat(9, 1.7rem);
}

.mines-cell {
  width: 1.7rem;
  height: 1.7rem;
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
