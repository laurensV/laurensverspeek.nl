import { describe, it, expect, vi } from 'vitest'
import { effectProcs, SYSTEM_PROCS, killByPid } from '../app/utils/terminal/effectProcs'
import { ref } from 'vue'

const makeEffects = () => ({
  matrix: ref(false),
  party: ref(false),
  train: ref(false),
  crt: ref(false),
  destruct: ref(false),
  bootReplay: ref(false),
  toggleCrt: vi.fn((on?: boolean) => (on ?? true))
})

describe('effectProcs / killByPid', () => {
  it('maps each effect flag to a stoppable process', () => {
    const fx = makeEffects()
    fx.matrix.value = true
    const procs = effectProcs(fx as never)
    const matrix = procs.find((p) => p.name === 'matrix-rain')!
    expect(matrix.running()).toBe(true)
    matrix.stop()
    expect(fx.matrix.value).toBe(false)
  })

  it('kills a running effect', () => {
    const fx = makeEffects()
    fx.party.value = true
    const procs = effectProcs(fx as never)
    expect(killByPid(procs, SYSTEM_PROCS, 217)).toEqual({ ok: true, name: 'party-mode' })
    expect(fx.party.value).toBe(false)
  })

  it('reports a not-running effect and forbidden system pids', () => {
    const fx = makeEffects()
    const procs = effectProcs(fx as never)
    expect(killByPid(procs, SYSTEM_PROCS, 314)).toEqual({ ok: false, reason: 'not-running' })
    expect(killByPid(procs, SYSTEM_PROCS, 1)).toEqual({ ok: false, reason: 'not-permitted' })
    expect(killByPid(procs, SYSTEM_PROCS, 9999)).toEqual({ ok: false, reason: 'no-such-process' })
  })
})
