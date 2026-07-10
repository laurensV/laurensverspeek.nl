import { describe, it, expect, vi } from 'vitest'
import { effectProcs, SYSTEM_PROCS, killByPid, windowPid, windowProcs, lvshProc, lvosSessionProc, gameProc, LVSH_PID } from '../app/utils/terminal/effectProcs'
import { ref } from 'vue'

const makeEffects = () => ({
  matrix: ref(false),
  party: ref(false),
  train: ref(false),
  crt: ref(false),
  destruct: ref(false),
  bootReplay: ref(false),
  fireworks: ref(false),
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
    fx.fireworks.value = true
    expect(killByPid(procs, SYSTEM_PROCS, 1231)).toEqual({ ok: true, name: 'fireworks.sh' })
    expect(fx.fireworks.value).toBe(false)
  })

  it('reports a not-running effect and forbidden system pids', () => {
    const fx = makeEffects()
    const procs = effectProcs(fx as never)
    expect(killByPid(procs, SYSTEM_PROCS, 314)).toEqual({ ok: false, reason: 'not-running' })
    expect(killByPid(procs, SYSTEM_PROCS, 1)).toEqual({ ok: false, reason: 'not-permitted' })
    expect(killByPid(procs, SYSTEM_PROCS, 9999)).toEqual({ ok: false, reason: 'no-such-process' })
  })
})

describe('unified process table', () => {
  it('assigns stable, unique pids to lvOS windows', () => {
    expect(windowPid('readme')).toBe(2001)
    expect(windowPid('readme')).toBe(windowPid('readme'))
    const ids = ['readme', 'files', 'browser', 'terminal', 'calc', 'projects', 'about-os']
    const pids = ids.map(windowPid)
    expect(new Set(pids).size).toBe(pids.length)
    // unknown ids get a deterministic pid in the 29xx block
    expect(windowPid('mystery-app')).toBeGreaterThanOrEqual(2900)
    expect(windowPid('mystery-app')).toBe(windowPid('mystery-app'))
  })

  it('turns open windows into killable procs that really close them', () => {
    let closed = ''
    const procs = windowProcs([{ id: 'calc' }, { id: 'files' }], (id) => (closed = id))
    expect(procs).toHaveLength(2)
    expect(procs[0]!.name).toBe('lvos:calc')
    expect(procs[0]!.running()).toBe(true)
    procs[0]!.stop()
    expect(closed).toBe('calc')
  })

  it('lets you kill your own shell and the lvOS session', () => {
    let terminalClosed = false
    let loggedOut = false
    const procs = [lvshProc(() => (terminalClosed = true)), lvosSessionProc(() => (loggedOut = true))]
    expect(killByPid(procs, SYSTEM_PROCS, LVSH_PID)).toEqual({ ok: true, name: 'lvsh' })
    expect(terminalClosed).toBe(true)
    expect(killByPid(procs, SYSTEM_PROCS, 95)).toEqual({ ok: true, name: 'lvos-session' })
    expect(loggedOut).toBe(true)
  })

  it('exposes the active game as a killable proc', () => {
    let stopped = false
    const proc = gameProc('snake', () => (stopped = true))
    expect(killByPid([proc], SYSTEM_PROCS, proc.pid)).toEqual({ ok: true, name: 'snake' })
    expect(stopped).toBe(true)
  })

  it('still protects init and the easter eggs', () => {
    expect(killByPid([], SYSTEM_PROCS, 1)).toEqual({ ok: false, reason: 'not-permitted' })
    expect(killByPid([], SYSTEM_PROCS, 77)).toEqual({ ok: false, reason: 'not-permitted' })
  })
})
