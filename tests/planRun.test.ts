import { describe, it, expect } from 'vitest'
import { planRun } from '../app/utils/terminal/planRun'

const base = { aliases: {}, env: {}, history: ['ls', 'git log'] }

describe('planRun', () => {
  it('parses a plain command', () => {
    const plan = planRun('echo hi', base)
    expect(plan).toMatchObject({ name: 'echo', args: ['hi'], pipeStages: [], toClipboard: false, redirectFile: null })
  })

  it('expands aliases and env vars', () => {
    const plan = planRun('g $USER', { aliases: { g: 'github' }, env: { USER: 'lv' }, history: [] })
    expect(plan).toMatchObject({ name: 'github', args: ['lv'] })
  })

  it('splits pipe stages and detects a trailing copy sink', () => {
    const plan = planRun('help | grep blog | copy', base)
    if ('error' in plan) throw new Error('unexpected error')
    expect(plan.name).toBe('help')
    expect(plan.pipeStages).toEqual(['grep blog'])
    expect(plan.toClipboard).toBe(true)
  })

  it('routes a trailing | less / | more to the pager', () => {
    const lessPlan = planRun('help | grep blog | less', base)
    if ('error' in lessPlan) throw new Error('unexpected error')
    expect(lessPlan.pipeStages).toEqual(['grep blog'])
    expect(lessPlan.toPager).toBe(true)
    expect(lessPlan.toClipboard).toBe(false)
    expect(planRun('help | more', base)).toMatchObject({ toPager: true })
  })

  it('captures output redirection', () => {
    const plan = planRun('echo hi > a.txt', base)
    expect(plan).toMatchObject({ redirectFile: 'a.txt', append: false })
    expect(planRun('echo hi >> a.txt', base)).toMatchObject({ append: true })
  })

  it('applies history expansion and flags the echo', () => {
    const plan = planRun('!!', base)
    expect(plan).toMatchObject({ commandLine: 'git log', expanded: true, name: 'git' })
  })

  it('bubbles a history-expansion error', () => {
    expect(planRun('!nope', base)).toEqual({ error: 'lvsh: !nope: event not found' })
  })
})
