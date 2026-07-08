import { execSync } from 'node:child_process'
import { parseGitNumstat, GIT_LOG_ARGS } from '../../app/utils/terminal/gitLog'

// Prerendered at generate time (see nitro.prerender.routes): bakes the repo's
// real commit history into a static JSON file for the terminal's `git`
// command. CI checks out with fetch-depth: 0 so the log is complete.
export default defineEventHandler((event) => {
  const raw = execSync(`git log -n 40 ${GIT_LOG_ARGS}`, { encoding: 'utf8' })
  const commits = parseGitNumstat(raw).map((commit) => {
    if (commit.files.length <= 12) return commit
    return { ...commit, files: commit.files.slice(0, 12), truncated: commit.files.length - 12 }
  })
  setHeader(event, 'content-type', 'application/json')
  return commits
})
