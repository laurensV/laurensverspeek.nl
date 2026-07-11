import { describe, it, expect } from 'vitest'
import { expandEnv, parseCommandLine, applyFilter, stripHtml, splitOutputRedirect } from '~/utils/terminal/pipeline'

const line = (text: string) => ({ text })

describe('expandEnv', () => {
  const env = { USER: 'visitor', HOME: '~' }

  it('expands $VAR and ${VAR}', () => {
    expect(expandEnv('hi $USER', env)).toBe('hi visitor')
    expect(expandEnv('cd ${HOME}/projects', env)).toBe('cd ~/projects')
  })

  it('leaves unknown variables untouched', () => {
    expect(expandEnv('echo $NOPE', env)).toBe('echo $NOPE')
  })

  it('handles multiple variables in one string', () => {
    expect(expandEnv('$USER lives at $HOME', env)).toBe('visitor lives at ~')
  })
})

describe('parseCommandLine', () => {
  it('splits command, args and pipe stages', () => {
    const parsed = parseCommandLine('projects work | grep vue | head 3', {})
    expect(parsed.name).toBe('projects')
    expect(parsed.args).toEqual(['work'])
    expect(parsed.pipeStages).toEqual(['grep vue', 'head 3'])
  })

  it('resolves a leading alias to its target', () => {
    const parsed = parseCommandLine('g laurens', { g: 'github' })
    expect(parsed.name).toBe('github')
    expect(parsed.args).toEqual(['laurens'])
  })

  it('only resolves the alias in command position', () => {
    const parsed = parseCommandLine('echo g', { g: 'github' })
    expect(parsed.name).toBe('echo')
    expect(parsed.args).toEqual(['g'])
  })

  it('handles a bare command with no args or pipes', () => {
    expect(parseCommandLine('help', {})).toEqual({ name: 'help', args: [], pipeStages: [] })
  })

  it('does not split a pipe inside quotes', () => {
    const parsed = parseCommandLine('echo "a | b"', {})
    expect(parsed.name).toBe('echo')
    // the pipe survives as a literal token instead of splitting into a stage
    expect(parsed.args).toEqual(['"a', '|', 'b"'])
    expect(parsed.pipeStages).toEqual([])
  })

  it('still splits real pipes outside quotes alongside quoted ones', () => {
    const parsed = parseCommandLine('echo "x|y" | grep x', {})
    expect(parsed.args).toEqual(['"x|y"'])
    expect(parsed.pipeStages).toEqual(['grep x'])
  })
})

describe('splitOutputRedirect', () => {
  it('splits a trailing > file', () => {
    expect(splitOutputRedirect('help > cmds.txt')).toEqual({ command: 'help', file: 'cmds.txt', append: false })
  })

  it('treats >> as append', () => {
    expect(splitOutputRedirect('echo hi >> log.txt')).toEqual({ command: 'echo hi', file: 'log.txt', append: true })
  })

  it('keeps pipes in the command part', () => {
    expect(splitOutputRedirect('help | grep blog > out.txt')).toEqual({ command: 'help | grep blog', file: 'out.txt', append: false })
  })

  it('returns no redirect when there is none', () => {
    expect(splitOutputRedirect('ls -la')).toEqual({ command: 'ls -la', file: null, append: false })
  })

  it('ignores a > that sits inside quotes', () => {
    expect(splitOutputRedirect('echo "a > b"')).toEqual({ command: 'echo "a > b"', file: null, append: false })
    expect(splitOutputRedirect("echo 'x >> y'")).toEqual({ command: "echo 'x >> y'", file: null, append: false })
  })

  it('still redirects when the > is outside the quotes', () => {
    expect(splitOutputRedirect('echo "hi there" > out.txt')).toEqual({ command: 'echo "hi there"', file: 'out.txt', append: false })
  })
})

describe('applyFilter', () => {
  const lines = ['alpha', 'beta', 'gamma', 'delta'].map(line)

  it('greps case-insensitively', () => {
    const out = applyFilter([line('Vue'), line('React'), line('vuex')], 'grep vue', line)
    expect('lines' in out && out.lines.map((l) => l.text)).toEqual(['Vue', 'vuex'])
  })

  it('supports grep -v to invert', () => {
    // keep lines without an 'e': alpha and gamma (beta and delta have one)
    const out = applyFilter(lines, 'grep -v e', line)
    expect('lines' in out && out.lines.map((l) => l.text)).toEqual(['alpha', 'gamma'])
  })

  it('grep -n prefixes matches with their input line number', () => {
    // beta(2) and delta(4) contain an 'e'
    const out = applyFilter(lines, 'grep -n e', line)
    expect('lines' in out && out.lines.map((l) => l.text)).toEqual(['2:beta', '4:delta'])
  })

  it('grep -c counts matching lines into one line', () => {
    const out = applyFilter(lines, 'grep -c e', line)
    expect('lines' in out && out.lines.map((l) => l.text)).toEqual(['2'])
  })

  it('grep combines flags like -vc', () => {
    // count of lines WITHOUT an 'e': alpha and gamma
    const out = applyFilter(lines, 'grep -vc e', line)
    expect('lines' in out && out.lines.map((l) => l.text)).toEqual(['2'])
  })

  it('strips html before matching', () => {
    const out = applyFilter([line('<span class="term-accent">snake</span> game')], 'grep snake', line)
    expect('lines' in out && out.lines.length).toBe(1)
  })

  it('accepts head/tail short -N and -nN forms, and count 0 yields none', () => {
    const t = (out: ReturnType<typeof applyFilter>) => ('lines' in out ? out.lines.map((l) => l.text) : out)
    expect(t(applyFilter(lines, 'head -2', line))).toEqual(['alpha', 'beta'])
    expect(t(applyFilter(lines, 'head -n2', line))).toEqual(['alpha', 'beta'])
    expect(t(applyFilter(lines, 'tail -1', line))).toEqual(['delta'])
    expect(t(applyFilter(lines, 'head 0', line))).toEqual([])
    // tail 0 must NOT keep everything (slice(-0) trap)
    expect(t(applyFilter(lines, 'tail 0', line))).toEqual([])
  })

  it('head and tail slice the list', () => {
    expect(('lines' in applyFilter(lines, 'head 2', line)) && (applyFilter(lines, 'head 2', line) as { lines: { text: string }[] }).lines.map((l) => l.text)).toEqual(['alpha', 'beta'])
    expect((applyFilter(lines, 'tail 1', line) as { lines: { text: string }[] }).lines.map((l) => l.text)).toEqual(['delta'])
  })

  it('wc counts lines into a single new line', () => {
    const out = applyFilter(lines, 'wc', line)
    expect('lines' in out && out.lines.map((l) => l.text)).toEqual(['4'])
  })

  const texts = (out: ReturnType<typeof applyFilter>) =>
    'lines' in out ? out.lines.map((l) => l.text) : out

  it('sorts alphabetically, reverses with -r', () => {
    const shuffled = ['gamma', 'alpha', 'delta', 'beta'].map(line)
    expect(texts(applyFilter(shuffled, 'sort', line))).toEqual(['alpha', 'beta', 'delta', 'gamma'])
    expect(texts(applyFilter(shuffled, 'sort -r', line))).toEqual(['gamma', 'delta', 'beta', 'alpha'])
  })

  it('sort -u drops duplicates', () => {
    const dupes = ['b', 'a', 'b', 'a', 'c'].map(line)
    expect(texts(applyFilter(dupes, 'sort -u', line))).toEqual(['a', 'b', 'c'])
  })

  it('uniq collapses adjacent duplicates, -c counts runs', () => {
    const runs = ['a', 'a', 'b', 'a'].map(line)
    expect(texts(applyFilter(runs, 'uniq', line))).toEqual(['a', 'b', 'a'])
    expect(texts(applyFilter(runs, 'uniq -c', line))).toEqual(['   2 a', '   1 b', '   1 a'])
  })

  it('sort | uniq -c tallies duplicates', () => {
    const data = ['x', 'y', 'x', 'x'].map(line)
    const sorted = applyFilter(data, 'sort', line)
    const counted = 'lines' in sorted ? applyFilter(sorted.lines, 'uniq -c', line) : sorted
    expect(texts(counted)).toEqual(['   3 x', '   1 y'])
  })

  it('errors on a missing grep pattern', () => {
    expect(applyFilter(lines, 'grep', line)).toEqual({ error: 'grep: missing pattern' })
  })

  it('errors on an unknown filter', () => {
    const out = applyFilter(lines, 'awk', line)
    expect('error' in out && out.error).toContain('unknown filter: awk')
  })
})

describe('stripHtml', () => {
  it('removes tags but keeps text', () => {
    expect(stripHtml('<a href="x">link</a> and <b>bold</b>')).toBe('link and bold')
  })
})
