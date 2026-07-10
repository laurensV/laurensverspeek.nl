import { createTicker, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const TOP_PROCESSES = [
  { pid: 1, user: 'root', cmd: '/sbin/init' },
  { pid: 142, user: 'visitor', cmd: 'nuxt dev --turbo' },
  { pid: 256, user: 'visitor', cmd: 'node terminal.js' },
  { pid: 404, user: 'visitor', cmd: 'chrome --renderer' },
  { pid: 512, user: 'visitor', cmd: 'lvsh' },
  { pid: 666, user: 'visitor', cmd: 'dot-grid.css' },
  { pid: 777, user: 'root', cmd: 'crypto-miner (jk)' },
  { pid: 1024, user: 'visitor', cmd: 'vite hmr-server' },
  { pid: 2048, user: 'visitor', cmd: 'game-of-life' }
]

export function createTopGame(
  { onFrame, onEnd }: GameCallbacks,
  /** Real processes (lvOS windows, running effects) merged into the theater */
  liveProcs?: () => { pid: number, cmd: string }[]
): GameHandle {
  const start = Date.now()

  const render = () => {
    const live = (liveProcs?.() ?? []).map((p) => ({ ...p, user: 'visitor' }))
    const rows = [...TOP_PROCESSES, ...live]
      .map((p) => ({ ...p, cpu: Math.random() * (p.cmd.includes('chrome') ? 60 : 25), mem: Math.random() * 12 }))
      .sort((a, b) => b.cpu - a.cpu)
    const totalCpu = rows.reduce((sum, r) => sum + r.cpu, 0)
    const upSecs = Math.floor((Date.now() - start) / 1000)

    const header = [
      `top - lvsh session, up ${upSecs}s,  1 user,  load average: ${(totalCpu / 100).toFixed(2)}, 0.42, 0.13`,
      `Tasks: ${rows.length} total,  ${rows.filter((r) => r.cpu > 20).length} running`,
      `%Cpu(s): ${totalCpu.toFixed(1).padStart(4)} us   (q to quit)`,
      '',
      '  PID USER      %CPU  %MEM  COMMAND'
    ]
    const body = rows.map(
      (r) =>
        `${String(r.pid).padStart(5)} ${r.user.padEnd(8)} ${r.cpu.toFixed(1).padStart(5)} ${r.mem.toFixed(1).padStart(5)}  ${r.cmd}`
    )
    onFrame([...header, ...body].join('\n'))
  }

  render()
  const ticker = createTicker(render, () => 1200)
  ticker.start()

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd(['top: exited'])
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}
