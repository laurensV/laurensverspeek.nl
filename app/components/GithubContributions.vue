<template>
  <div class="gh-contrib">
    <div class="gh-contrib-scroll">
      <div class="gh-contrib-grid" role="img" :aria-label="`${total} GitHub contributions in the last year`">
        <div v-for="(week, w) in cal.grid" :key="w" class="gh-week">
          <span
            v-for="day in week"
            :key="day.date"
            class="gh-day"
            :class="{ 'is-future': day.future }"
            :style="day.future ? undefined : { background: colorFor(day.count) }"
            :title="`${day.count} on ${day.date}`"
          />
        </div>
      </div>
    </div>
    <div class="gh-contrib-legend is-family-code is-size-7 has-text-grey">
      <span>{{ total }} contributions in the last year</span>
      <span class="gh-scale">
        less
        <span v-for="lvl in 5" :key="lvl" class="gh-day" :style="{ background: colorForLevel(lvl - 1) }" />
        more
      </span>
      <span v-if="generatedAt">updated {{ generatedAt }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shadeLevel } from '~/utils/terminal/contribGraph'

// The GitHub contribution calendar (the green squares), baked at build time and
// drawn as an amber heatmap. Anchored to the snapshot's own date so the SSR and
// client renders always agree (no day-boundary hydration drift).
const { data } = useGithubStats()

const total = computed(() => data.value.totalContributions)
const generatedAt = computed(() => data.value.generatedAt)

const WEEKS = 53

const cal = computed(() => {
  const map = new Map(data.value.contributions.map((d) => [d.date, d.count]))
  const anchor = generatedAt.value ? new Date(`${generatedAt.value}T00:00:00Z`) : new Date()
  // end on the Saturday of the anchor week so columns are whole weeks
  const end = new Date(anchor)
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1))

  const grid: { date: string, count: number, future: boolean }[][] = []
  const cursor = new Date(start)
  let max = 0
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string, count: number, future: boolean }[] = []
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10)
      const count = map.get(iso) ?? 0
      max = Math.max(max, count)
      col.push({ date: iso, count, future: cursor > anchor })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    grid.push(col)
  }
  return { grid, max }
})

const ALPHAS = [0.06, 0.3, 0.5, 0.72, 1]
const colorForLevel = (level: number) => `hsla(var(--lv-primary-hsl), ${ALPHAS[level] ?? 0.06})`
const colorFor = (count: number) => colorForLevel(shadeLevel(count, cal.value.max))
</script>

<style scoped lang="scss">
.gh-contrib {
  margin-top: 1rem;
}

.gh-contrib-scroll {
  overflow-x: auto;
  padding-bottom: 0.35rem;
}

.gh-contrib-grid {
  display: flex;
  gap: 3px;
  min-width: max-content;
}

.gh-week {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gh-day {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  // a hairline so level-0 cells still read as a grid in both themes
  box-shadow: inset 0 0 0 1px hsla(var(--lv-scheme-hs), 50%, 0.06);

  &.is-future {
    background: transparent;
    box-shadow: none;
  }
}

.gh-contrib-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 1rem;
  margin-top: 0.5rem;

  .gh-scale {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
}
</style>
