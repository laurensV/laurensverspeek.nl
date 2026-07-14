import { execSync } from 'node:child_process'

// Prerendered at generate time (see nitro.prerender.routes): bakes the list of
// every *deployed* version of this site into a static JSON file for the Time
// Machine (terminal `git checkout` + the lvOS app).
//
// The built output of every deploy lives in the `gh-pages` branch history — one
// commit per deploy, each message `deploy: <source-sha>`. The Time Machine's
// service worker pulls those old builds from jsDelivr by their gh-pages SHA, so
// this manifest is the map from "a moment in the site's life" to that SHA.
//
// CI checks out with fetch-depth: 0 (all branches), so origin/gh-pages is
// present; locally we fetch it on demand. If it can't be read, the feature just
// degrades to an empty list rather than failing the build.

interface Deploy {
  /** Full gh-pages commit SHA — the ref the service worker feeds to jsDelivr */
  sha: string
  /** Deploy date (when this version went live), YYYY-MM-DD */
  date: string
  /** Short source-commit SHA that shipped in this deploy */
  source: string
  /** The source commit's subject line — what actually changed */
  subject: string
}

function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
}

function readDeploys(): Deploy[] {
  // make sure the gh-pages ref exists (present in CI; fetch locally if missing)
  try {
    sh('git rev-parse --verify origin/gh-pages')
  } catch {
    try {
      sh('git fetch --no-tags --quiet origin gh-pages:refs/remotes/origin/gh-pages')
    } catch {
      return []
    }
  }

  // source-sha → subject, so the manifest can say what each deploy shipped
  const subjects = new Map<string, string>()
  try {
    for (const line of sh('git log --pretty=format:%H%x1f%s').split('\n')) {
      const [hash = '', subject = ''] = line.split('\x1f')
      if (hash) subjects.set(hash, subject)
    }
  } catch {
    // no main history to join against — deploys still list, just without subjects
  }

  const raw = sh('git log origin/gh-pages --pretty=format:%H%x1f%cs%x1f%s')
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): Deploy | null => {
      const [sha = '', date = '', message = ''] = line.split('\x1f')
      const sourceSha = /deploy:\s*([0-9a-f]{7,40})/i.exec(message)?.[1] ?? ''
      if (!sha || !sourceSha) return null
      return {
        sha,
        date,
        source: sourceSha.slice(0, 7),
        subject: subjects.get(sourceSha) ?? ''
      }
    })
    .filter((deploy): deploy is Deploy => deploy !== null)
}

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/json')
  return readDeploys()
})
