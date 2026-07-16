import { describe, it, expect, vi } from 'vitest'
import { effectProcs, SYSTEM_PROCS, killByPid, killByName, windowPid, windowProcs, lvshProc, lvosSessionProc, gameProc, LVSH_PID, registerSaverProc, unregisterSaverProc, saverProcs, SAVER_PID } from '../app/utils/terminal/effectProcs'
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

describe('killByName', () => {
  it('kills every running process matching the name, exact match first', () => {
    const fx = makeEffects()
    fx.party.value = true
    const procs = effectProcs(fx as never)
    const result = killByName(procs, SYSTEM_PROCS, 'party-mode')
    expect(result).toEqual({ ok: true, killed: [{ pid: 217, name: 'party-mode' }] })
    expect(fx.party.value).toBe(false)
  })

  it('falls back to a prefix match and is case-insensitive', () => {
    const fx = makeEffects()
    fx.fireworks.value = true
    const procs = effectProcs(fx as never)
    const result = killByName(procs, SYSTEM_PROCS, 'FIRE')
    expect(result.ok).toBe(true)
    expect(fx.fireworks.value).toBe(false)
  })

  it('kills all matches at once', () => {
    let stops = 0
    const procs = [
      { pid: 11, name: 'demo.app', running: () => true, stop: () => stops++ },
      { pid: 12, name: 'demo.app', running: () => true, stop: () => stops++ },
      { pid: 13, name: 'other.app', running: () => true, stop: () => stops++ }
    ]
    const result = killByName(procs, SYSTEM_PROCS, 'demo.app')
    expect(result.ok && result.killed).toHaveLength(2)
    expect(stops).toBe(2)
  })

  it('reports not-running, not-permitted and no-such-process', () => {
    const fx = makeEffects()
    const procs = effectProcs(fx as never)
    expect(killByName(procs, SYSTEM_PROCS, 'matrix-rain')).toEqual({ ok: false, reason: 'not-running' })
    expect(killByName(procs, SYSTEM_PROCS, SYSTEM_PROCS[0]!.name)).toEqual({ ok: false, reason: 'not-permitted' })
    expect(killByName(procs, SYSTEM_PROCS, 'nonexistent')).toEqual({ ok: false, reason: 'no-such-process' })
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

  it('the screensaver is a killable proc while the desktop has one registered', () => {
    expect(saverProcs()).toEqual([]) // nothing registered: no ghost process
    let awake = false
    let saverOn = true
    registerSaverProc({ running: () => saverOn, wake: () => { awake = true; saverOn = false } })
    expect(killByPid(saverProcs(), SYSTEM_PROCS, SAVER_PID)).toEqual({ ok: true, name: 'screensaver.scr' })
    expect(awake).toBe(true)
    // once woken it reads as not-running, like any dormant effect
    expect(killByPid(saverProcs(), SYSTEM_PROCS, SAVER_PID)).toEqual({ ok: false, reason: 'not-running' })
    unregisterSaverProc()
    expect(saverProcs()).toEqual([])
  })
})
