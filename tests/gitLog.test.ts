import { describe, it, expect } from 'vitest'
import { parseGitNumstat, formatGitLog, formatGitShow, findCommit } from '../app/utils/terminal/gitLog'

const RS = '\x1e'
const US = '\x1f'

const RAW = [
  `${RS}abc1234${US}2026-07-08${US}add a <git> command`,
  '10\t2\tapp/utils/terminal/gitLog.ts',
  '5\t0\ttests/gitLog.test.ts',
  `${RS}def5678${US}2026-07-07${US}tweak styles`,
  '-\t-\tpublic/og.png',
  '3\t3\tapp/assets/scss/global.scss',
  `${RS}0a1b2c3${US}2026-07-01${US}initial commit`
].join('\n')

describe('parseGitNumstat', () => {
  it('parses commits with their file stats', () => {
    const commits = parseGitNumstat(RAW)
    expect(commits).toHaveLength(3)
    expect(commits[0]).toMatchObject({ hash: 'abc1234', date: '2026-07-08', subject: 'add a <git> command' })
    expect(commits[0]!.files).toEqual([
      { path: 'app/utils/terminal/gitLog.ts', add: 10, del: 2 },
      { path: 'tests/gitLog.test.ts', add: 5, del: 0 }
    ])
  })

  it('treats binary numstat markers as zero', () => {
    const binary = parseGitNumstat(RAW)[1]!.files[0]!
    expect(binary).toEqual({ path: 'public/og.png', add: 0, del: 0 })
  })

  it('handles commits without file changes and empty input', () => {
    expect(parseGitNumstat(RAW)[2]!.files).toEqual([])
    expect(parseGitNumstat('')).toEqual([])
  })
})

describe('formatGitLog', () => {
  const commits = parseGitNumstat(RAW)

  it('renders full entries with hash, date and subject', () => {
    const lines = formatGitLog(commits)
    expect(lines[0]).toEqual({ type: 'primary', text: 'commit abc1234' })
    expect(lines[1]!.text).toBe('Date:   2026-07-08')
    expect(lines[2]!.text).toContain('add a <git> command')
  })

  it('caps output at the limit and points to --oneline', () => {
    const lines = formatGitLog(commits, { limit: 1 })
    expect(lines.filter((line) => line.text.startsWith('commit '))).toHaveLength(1)
    expect(lines.at(-1)!.text).toContain('2 older commits')
  })

  it('escapes html in oneline subjects', () => {
    const lines = formatGitLog(commits, { oneline: true })
    expect(lines).toHaveLength(3)
    expect(lines[0]!.html).toBe(true)
    expect(lines[0]!.text).toContain('&lt;git&gt;')
    expect(lines[0]!.text).not.toContain('<git>')
  })
})

describe('findCommit', () => {
  const commits = parseGitNumstat(RAW)

  it('resolves HEAD, prefixes and misses', () => {
    expect(findCommit(commits, 'HEAD')!.hash).toBe('abc1234')
    expect(findCommit(commits, '')!.hash).toBe('abc1234')
    expect(findCommit(commits, 'def')!.hash).toBe('def5678')
    expect(findCommit(commits, 'ffffff')).toBeUndefined()
  })
})

describe('formatGitShow', () => {
  const commits = parseGitNumstat(RAW)

  it('renders a diffstat with +/- bars and a summary', () => {
    const lines = formatGitShow(commits[0]!)
    const stat = lines.find((line) => line.text.includes('gitLog.ts'))!
    expect(stat.text).toContain('|   12')
    expect(stat.text).toContain('term-green')
    expect(stat.text).toContain('term-red')
    expect(lines.at(-1)!.text).toBe(' 2 files changed, 15 insertions(+), 2 deletions(-)')
  })

  it('mentions files omitted from the payload', () => {
    const truncated = { ...commits[0]!, truncated: 4 }
    const lines = formatGitShow(truncated)
    expect(lines.some((line) => line.text.includes('4 more files'))).toBe(true)
    expect(lines.at(-1)!.text).toContain('6 files changed')
  })
})
