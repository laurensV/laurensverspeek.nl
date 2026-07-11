import { createTicker, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

export interface TopProc {
  pid: number
  cmd: string
  /** Unkillable set dressing (init & friends) — rendered as sleeping */
  system: boolean
}

export function createTopGame(
  { onFrame, onEnd }: GameCallbacks,
  /** The unified process table (same rows as ps and the lvOS task manager) */
  procs: () => TopProc[]
): GameHandle {
  const start = Date.now()

  const render = () => {
    const rows = procs()
      .map((p) => ({
        ...p,
        user: p.system ? 'root' : 'visitor',
        cpu: p.system ? Math.random() * 3 : Math.random() * 25,
        mem: Math.random() * 12
      }))
      .sort((a, b) => b.cpu - a.cpu)
    const totalCpu = rows.reduce((sum, r) => sum + r.cpu, 0)
    const upSecs = Math.floor((Date.now() - start) / 1000)

    const header = [
      `top - lvsh session, up ${upSecs}s,  1 user,  load average: ${(totalCpu / 100).toFixed(2)}, 0.42, 0.13`,
      `Tasks: ${rows.length} total,  ${rows.filter((r) => !r.system).length} running,  ${rows.filter((r) => r.system).length} sleeping`,
      `%Cpu(s): ${totalCpu.toFixed(1).padStart(4)} us   (q to quit — kill <pid> works on anything running)`,
      '',
      '  PID USER      %CPU  %MEM  S  COMMAND'
    ]
    const body = rows.map(
      (r) =>
        `${String(r.pid).padStart(5)} ${r.user.padEnd(8)} ${r.cpu.toFixed(1).padStart(5)} ${r.mem.toFixed(1).padStart(5)}  ${r.system ? 'S' : 'R'}  ${r.cmd}`
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
