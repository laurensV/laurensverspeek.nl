<template>
  <div class="sysmon is-family-code">
    <div v-for="metric in metrics" :key="metric.key" class="sysmon-panel">
      <div class="sysmon-head">
        <span class="sysmon-label">{{ metric.label }}</span>
        <span class="sysmon-value">{{ Math.round(metric.samples[metric.samples.length - 1] ?? 0) }}{{ metric.unit }}</span>
      </div>
      <svg class="sysmon-graph" :viewBox="`0 0 ${SPAN} 30`" preserveAspectRatio="none" role="img" :aria-label="`${metric.label} graph`">
        <polygon class="sysmon-area" :points="areaPoints(metric.samples)" />
        <polyline class="sysmon-line" :points="linePoints(metric.samples)" />
      </svg>
      <div class="sysmon-scale">
        <span>0</span><span>{{ metric.peak }}{{ metric.unit }} peak</span>
      </div>
    </div>
    <p class="sysmon-foot">reading real signals: open windows drive load, localStorage drives memory</p>
  </div>
</template>

<script setup lang="ts">
import type { DesktopWindow } from '~/composables/useWindowManager'

// A live system monitor for lvOS: rolling CPU / memory / network sparklines.
// The numbers aren't invented from nothing — CPU tracks how many windows are
// actually open, memory is the site's real localStorage footprint, and network
// idles with the occasional blip. Same spirit as the task manager, graphed.

const SAMPLES = 48
const SPAN = SAMPLES - 1

const windows = useState<DesktopWindow[]>(STATE_KEYS.lvosWindows, () => [])

const usedBytes = () => {
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) total += key.length + (localStorage.getItem(key)?.length ?? 0)
    }
  } catch { /* storage blocked — report 0 */ }
  return total
}
const MEM_BUDGET = 5 * 1024 * 1024 // the ~5MB localStorage ceiling browsers give

const cpuSample = () => {
  const load = 6 + windows.value.filter((win) => !win.minimized).length * 9
  return Math.min(100, load + Math.random() * 8)
}
const memSample = () => Math.min(100, (usedBytes() / MEM_BUDGET) * 100)
const netSample = () => 2 + Math.random() * 10 + (Math.random() < 0.12 ? Math.random() * 40 : 0)

interface Metric { key: string, label: string, unit: string, sample: () => number, samples: number[], peak: number }
const metrics = reactive<Metric[]>([
  { key: 'cpu', label: 'CPU', unit: '%', sample: cpuSample, samples: Array<number>(SAMPLES).fill(0), peak: 0 },
  { key: 'mem', label: 'Memory', unit: '%', sample: memSample, samples: Array<number>(SAMPLES).fill(0), peak: 0 },
  { key: 'net', label: 'Network', unit: 'kb/s', sample: netSample, samples: Array<number>(SAMPLES).fill(0), peak: 0 }
])

const tick = () => {
  for (const metric of metrics) {
    const value = metric.sample()
    metric.samples = [...metric.samples.slice(1), value]
    metric.peak = Math.max(metric.peak, Math.round(value))
  }
}

// map a sample value (0–100 / kb) to a y in the 30-tall viewBox (0 at top)
const yFor = (value: number) => 30 - Math.min(30, (value / 100) * 30)
const linePoints = (samples: number[]) => samples.map((value, i) => `${i},${yFor(value).toFixed(1)}`).join(' ')
const areaPoints = (samples: number[]) => `0,30 ${linePoints(samples)} ${SPAN},30`

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tick()
  timer = setInterval(tick, 800)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped lang="scss">
.sysmon {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 15rem;
  font-size: 0.72rem;
}

.sysmon-panel {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sysmon-head {
  display: flex;
  justify-content: space-between;

  .sysmon-label {
    color: hsl(var(--lv-scheme-hs), 88%);
  }

  .sysmon-value {
    color: var(--bulma-primary);
    font-weight: 600;
  }
}

.sysmon-graph {
  width: 100%;
  height: 3rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
  border-radius: var(--bulma-radius-small);
  background:
    repeating-linear-gradient(0deg, hsla(var(--lv-primary-hsl), 0.05) 0 1px, transparent 1px 25%);
}

.sysmon-area {
  fill: hsla(var(--lv-primary-hsl), 0.14);
}

.sysmon-line {
  fill: none;
  stroke: var(--bulma-primary);
  stroke-width: 0.8;
  vector-effect: non-scaling-stroke;
}

.sysmon-scale {
  display: flex;
  justify-content: space-between;
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.6rem;
}

.sysmon-foot {
  margin-top: 0.2rem;
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.62rem;
}
</style>
