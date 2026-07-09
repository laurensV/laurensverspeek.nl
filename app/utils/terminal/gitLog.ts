// Pure helpers for the terminal's `git` command. The commit history itself is
// baked at generate time by server/routes/git-log.json.ts (prerendered, like
// rss.xml), so the deployed static site ships a real snapshot of this repo.

import { escapeHtml } from '~/utils/escapeHtml'

export interface GitFileStat {
  path: string
  add: number
  del: number
}

export interface GitCommit {
  hash: string
  date: string
  subject: string
  files: GitFileStat[]
  /** How many changed files were omitted from `files` to keep the payload small */
  truncated?: number
}

/** Matches the --pretty format below: \x1e starts a commit, \x1f separates fields. */
export const GIT_LOG_ARGS = '--date=short --numstat --pretty=format:%x1e%h%x1f%ad%x1f%s'

export function parseGitNumstat(raw: string): GitCommit[] {
  return raw
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [head = '', ...rest] = record.split('\n')
      const [hash = '', date = '', subject = ''] = head.split('\x1f')
      const files = rest
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [add = '', del = '', ...path] = line.split('\t')
          // binary files report "-" for both counts
          return { path: path.join('\t'), add: Number(add) || 0, del: Number(del) || 0 }
        })
      return { hash, date, subject, files }
    })
    .filter((commit) => commit.hash)
}

export interface GitOutLine {
  type: 'output' | 'muted' | 'primary'
  text: string
  html?: boolean
}


export function formatGitLog(commits: GitCommit[], opts: { oneline?: boolean, limit?: number } = {}): GitOutLine[] {
  const shown = commits.slice(0, opts.limit ?? commits.length)
  const lines: GitOutLine[] = []
  for (const commit of shown) {
    if (opts.oneline) {
      lines.push({
        type: 'output',
        text: `<span class="term-accent">${commit.hash}</span> ${escapeHtml(commit.subject)}`,
        html: true
      })
      continue
    }
    lines.push({ type: 'primary', text: `commit ${commit.hash}` })
    lines.push({ type: 'muted', text: `Date:   ${commit.date}` })
    lines.push({ type: 'output', text: `    ${commit.subject}` })
    lines.push({ type: 'output', text: '' })
  }
  if (shown.length < commits.length) {
    lines.push({ type: 'muted', text: `… ${commits.length - shown.length} older commits (try git log --oneline)` })
  }
  return lines
}

/** hash prefix or HEAD (= newest) → the commit, or undefined */
export function findCommit(commits: GitCommit[], ref: string): GitCommit | undefined {
  if (!ref || ref.toUpperCase() === 'HEAD') return commits[0]
  return commits.find((commit) => commit.hash.startsWith(ref.toLowerCase()))
}

const BAR_WIDTH = 24

export function formatGitShow(commit: GitCommit): GitOutLine[] {
  const lines: GitOutLine[] = [
    { type: 'primary', text: `commit ${commit.hash}` },
    { type: 'muted', text: `Date:   ${commit.date}` },
    { type: 'output', text: `    ${commit.subject}` },
    { type: 'output', text: '' }
  ]
  const pathWidth = Math.min(Math.max(...commit.files.map((file) => file.path.length), 0), 44)
  const biggest = Math.max(...commit.files.map((file) => file.add + file.del), 1)
  for (const file of commit.files) {
    const total = file.add + file.del
    // scale the bar to the largest file in the commit, but never to zero glyphs
    const scale = Math.min(1, BAR_WIDTH / biggest)
    const plus = '+'.repeat(Math.max(file.add > 0 ? 1 : 0, Math.round(file.add * scale)))
    const minus = '-'.repeat(Math.max(file.del > 0 ? 1 : 0, Math.round(file.del * scale)))
    const path = file.path.length > pathWidth ? `…${file.path.slice(-(pathWidth - 1))}` : file.path.padEnd(pathWidth)
    lines.push({
      type: 'output',
      text: ` ${escapeHtml(path)} | ${String(total).padStart(4)} <span class="term-green">${plus}</span><span class="term-red">${minus}</span>`,
      html: true
    })
  }
  if (commit.truncated) lines.push({ type: 'muted', text: ` … and ${commit.truncated} more files` })
  const adds = commit.files.reduce((sum, file) => sum + file.add, 0)
  const dels = commit.files.reduce((sum, file) => sum + file.del, 0)
  lines.push({
    type: 'muted',
    text: ` ${commit.files.length + (commit.truncated ?? 0)} files changed, ${adds} insertions(+), ${dels} deletions(-)`
  })
  return lines
}
