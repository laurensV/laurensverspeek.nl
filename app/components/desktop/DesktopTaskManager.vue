<template>
  <div class="taskmgr is-family-code">
    <div class="taskmgr-meters">
      <div v-for="meter in meters" :key="meter.label" class="taskmgr-meter">
        <span class="taskmgr-meter-label">{{ meter.label }}</span>
        <span class="taskmgr-meter-bar">[<span class="taskmgr-meter-fill">{{ '|'.repeat(meter.ticks) }}</span>{{ ' '.repeat(20 - meter.ticks) }}]</span>
        <span class="taskmgr-meter-pct">{{ meter.pct }}%</span>
      </div>
    </div>

    <table class="taskmgr-table">
      <thead>
        <tr><th>PID</th><th>NAME</th><th>STATE</th><th class="is-num">CPU%</th><th class="is-num">MEM</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="proc in processes" :key="proc.pid" :class="{ 'is-system': proc.system }">
          <td>{{ proc.pid }}</td>
          <td class="taskmgr-name">{{ proc.name }}</td>
          <td>{{ proc.state }}</td>
          <td class="is-num">{{ proc.cpu.toFixed(1) }}</td>
          <td class="is-num">{{ proc.mem }}M</td>
          <td>
            <button class="taskmgr-kill" :aria-label="`Kill ${proc.name}`" @click="kill(proc)">kill</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="taskmgr-note">{{ denied || `${processes.length} tasks · windows, terminal effects and games really die here` }}</p>
  </div>
</template>

<script setup lang="ts">
import { windowPid } from '~/utils/terminal/effectProcs'

// htop cosplay over real state: the exact same unified process table the
// terminal's ps/top render — system daemons, lvOS windows, running effects,
// the active game/editor, the shell — and kill actually stops each of them.

const terminal = useTerminal()

// the same table (and the same pids) ps and top see
const table = useProcessTable({
  effects: useEffectFlags(),
  game: terminal.game,
  closeShell: terminal.close
})

// smooth fake load per process, reseeded gently every tick
const jitter = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (jitter.value = (jitter.value + 1) % 1000), 1200)
})
onUnmounted(() => clearInterval(timer))

const fakeCpu = (seed: string) => {
  let hash = jitter.value
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return (hash % 180) / 10
}

interface Proc {
  pid: number
  name: string
  state: string
  cpu: number
  mem: number
  system: boolean
  stop?: () => void
}

const processes = computed<Proc[]>(() => [
  ...table.system.map((proc) => ({
    pid: proc.pid,
    name: proc.name,
    state: 'S',
    cpu: fakeCpu(proc.name),
    mem: 4 + (proc.pid % 12),
    system: true
  })),
  ...table.running().map((proc) => {
    // a minimized window is stopped (T), everything else runs
    const win = table.windows.value.find((candidate) => windowPid(candidate.id) === proc.pid)
    return {
      pid: proc.pid,
      name: proc.name,
      state: win?.minimized ? 'T' : 'R',
      cpu: fakeCpu(proc.name) + (win?.minimized ? 0 : 2),
      mem: 18 + (proc.pid % 30),
      system: false,
      stop: proc.stop
    }
  })
])

const meters = computed(() => {
  const cpu = Math.min(97, Math.round(processes.value.reduce((sum, proc) => sum + proc.cpu, 0)))
  const mem = Math.min(97, Math.round(processes.value.reduce((sum, proc) => sum + proc.mem, 0) / 3))
  return [
    { label: 'CPU', pct: cpu, ticks: Math.max(1, Math.round(cpu / 5)) },
    { label: 'MEM', pct: mem, ticks: Math.max(1, Math.round(mem / 5)) }
  ]
})

const denied = ref('')
let deniedTimer: ReturnType<typeof setTimeout> | undefined
const kill = (proc: Proc) => {
  if (proc.system) {
    denied.value = `kill: (${proc.pid}) — operation not permitted. nice try.`
    clearTimeout(deniedTimer)
    deniedTimer = setTimeout(() => (denied.value = ''), 2500)
    return
  }
  proc.stop?.()
}
onUnmounted(() => clearTimeout(deniedTimer))
</script>

<style scoped lang="scss">
.taskmgr {
  min-width: 24rem;
  font-size: 0.75rem;
}

.taskmgr-meters {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.6rem;
}

.taskmgr-meter {
  display: flex;
  gap: 0.5rem;
  white-space: pre;

  .taskmgr-meter-label {
    color: var(--bulma-primary);
    width: 2.2rem;
  }

  .taskmgr-meter-fill {
    color: var(--bulma-primary);
  }

  .taskmgr-meter-pct {
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.taskmgr-table {
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    color: var(--bulma-primary);
    font-weight: 600;
    padding: 0.15rem 0.5rem 0.15rem 0;
    border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  }

  td {
    padding: 0.18rem 0.5rem 0.18rem 0;
  }

  .is-num {
    text-align: right;
  }

  .is-system td {
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  .taskmgr-name {
    max-width: 13rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.taskmgr-kill {
  border: 1px solid transparent;
  border-radius: var(--bulma-radius-small);
  background: none;
  padding: 0 0.4rem;
  color: var(--bulma-danger);
  font: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--bulma-danger);
  }
}

.taskmgr-note {
  margin-top: 0.6rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}
</style>
