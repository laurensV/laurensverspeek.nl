<template>
  <div class="lvos-calendar is-family-code">
    <p class="lvos-calendar-title">{{ monthLabel }}</p>
    <div class="lvos-calendar-grid">
      <span v-for="(d, di) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="di" class="lvos-cal-dow">{{ d }}</span>
      <span v-for="blank in leadingBlanks" :key="`b${blank}`" />
      <span
        v-for="day in daysInMonth"
        :key="day"
        class="lvos-cal-day"
        :class="{ 'is-today': day === today }"
      >{{ day }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { monthGrid } from '~/utils/terminal/calendar'

// The taskbar clock's calendar popover. Its month geometry (Monday-first
// leading blanks, days-in-month) comes from the shared monthGrid() core the
// terminal `cal` command also builds from, so the two never disagree.

const now = useNow({ interval: 1000 })
const today = computed(() => now.value.getDate())
const monthLabel = computed(() =>
  now.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)
const grid = computed(() => monthGrid(now.value))
const daysInMonth = computed(() => grid.value.daysInMonth)
const leadingBlanks = computed(() => grid.value.leadingBlanks)
</script>

<style scoped lang="scss">
.lvos-calendar {
  position: absolute;
  bottom: 2.6rem;
  right: 0.5rem;
  // match the sibling tray popovers so a maximized window can't cover this
  z-index: 10000;
  width: 15rem;

  // clear the taller touch taskbar, like the start menu and volume popover
  @media (pointer: coarse) {
    bottom: 3.3rem;
  }
  padding: 0.75rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);

  .lvos-calendar-title {
    margin-bottom: 0.5rem;
    color: var(--bulma-primary);
    font-size: 0.78rem;
  }

  .lvos-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.15rem;
    text-align: center;
    font-size: 0.7rem;
  }

  .lvos-cal-dow {
    color: hsl(var(--lv-scheme-hs), 50%);
    padding-bottom: 0.2rem;
  }

  .lvos-cal-day {
    padding: 0.2rem 0;
    color: hsl(var(--lv-scheme-hs), 82%);
    border-radius: 2px;

    &.is-today {
      background-color: var(--bulma-primary);
      color: var(--bulma-primary-invert);
      font-weight: 700;
    }
  }
}
</style>
