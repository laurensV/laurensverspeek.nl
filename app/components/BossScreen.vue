<template>
  <Teleport to="body">
    <div v-if="bossActive" class="boss" role="dialog" aria-label="Very important spreadsheet">
      <div class="boss-titlebar">
        <span>Q3_forecast_v7_FINAL(2).xlsx — CalcSheet</span>
        <button class="boss-close" aria-label="Close" @click="bossActive = false">×</button>
      </div>
      <div class="boss-formula">
        <span class="boss-cellref">D7</span>
        <span class="boss-fx">fx</span>
        <span>=SUM(D2:D6)*1.07</span>
      </div>
      <table class="boss-sheet">
        <thead>
          <tr>
            <th />
            <th v-for="col in COLS" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in rows" :key="r">
            <th>{{ r + 1 }}</th>
            <td v-for="(cell, c) in row" :key="c" :class="{ 'is-active': r === 6 && c === 3 }">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
      <p class="boss-status">Sheet1 · Sheet2 · <b>forecast (do not touch)</b> — 100% · press Esc when the coast is clear</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// The boss key: pressing b twice quickly (or `boss` in the terminal) swaps the
// whole site for a gloriously boring spreadsheet until Esc. An arcade classic.
const bossActive = useState(STATE_KEYS.fxBoss, () => false)

const COLS = ['A', 'B', 'C', 'D', 'E', 'F']
const LABELS = ['Region', 'Units', 'Price', 'Revenue', 'YoY %', 'Notes']
const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'Remote', 'Cloud', 'On-prem', 'EMEA', 'APAC', 'LATAM', 'Other']

// deterministic filler so the sheet looks the same every time (and in tests)
const rows = computed(() => {
  const body = REGIONS.map((region, i) => {
    const units = 120 + ((i * 37) % 400)
    const price = 19 + ((i * 13) % 60)
    return [
      region,
      String(units),
      `€ ${price}.00`,
      `€ ${(units * price).toLocaleString('en-US')}`,
      `${((i * 7) % 30) - 9}%`,
      i === 4 ? 'ask finance' : ''
    ]
  })
  return [LABELS, ...body]
})

// b-b within 600ms arms it (outside inputs); Esc dismisses
let lastB = 0
useEventListener('keydown', (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  if (bossActive.value && event.key === 'Escape') {
    event.preventDefault()
    bossActive.value = false
    return
  }
  if (event.key.toLowerCase() !== 'b' || event.ctrlKey || event.metaKey || event.altKey) return
  const now = Date.now()
  if (now - lastB < 600) {
    lastB = 0
    bossActive.value = true
  } else {
    lastB = now
  }
})
</script>

<style scoped lang="scss">
// deliberately NOT the site's design language: a spreadsheet is always beige
.boss {
  position: fixed;
  inset: 0;
  z-index: 10010;
  display: flex;
  flex-direction: column;
  background: #f3f2ee;
  color: #202124;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
  cursor: default;
}

.boss-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #d7e3f4;
  border-bottom: 1px solid #b6c6dd;
  font-weight: bold;

  .boss-close {
    border: 1px solid #b6c6dd;
    background: #eef3fa;
    font: inherit;
    line-height: 1;
    padding: 0 6px;
    cursor: pointer;
  }
}

.boss-formula {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: #fff;
  border-bottom: 1px solid #d0d0d0;

  .boss-cellref {
    border: 1px solid #c0c0c0;
    padding: 1px 10px;
    background: #fafafa;
  }

  .boss-fx {
    font-style: italic;
    color: #5f6368;
  }
}

.boss-sheet {
  flex: 1;
  border-collapse: collapse;
  background: #fff;
  width: 100%;

  th,
  td {
    border: 1px solid #dadce0;
    padding: 3px 8px;
    text-align: left;
    font-weight: normal;
    white-space: nowrap;
  }

  thead th,
  tbody th {
    background: #f1f3f4;
    color: #5f6368;
    text-align: center;
    width: 2.2em;
  }

  td.is-active {
    outline: 2px solid #1a73e8;
    outline-offset: -2px;
  }
}

.boss-status {
  margin: 0;
  padding: 4px 10px;
  background: #f1f3f4;
  border-top: 1px solid #dadce0;
  color: #5f6368;
  font-size: 12px;
}
</style>
