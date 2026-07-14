// Typed view over the build-time GitHub snapshot. scripts/fetch-github.mjs
// regenerates github.generated.json before every `nuxt generate`; this module
// gives it a stable shape the composable and the terminal can rely on.
import raw from './github.generated.json'

export interface GithubContribDay {
  /** YYYY-MM-DD */
  date: string
  count: number
}

export interface GithubSnapshot {
  /** Date the snapshot was baked (YYYY-MM-DD) — shown as the "updated" stamp */
  generatedAt: string
  user: string
  followers: number
  publicRepos: number
  totalStars: number
  starsByRepo: Record<string, number>
  /** Total contributions over the last year, per the profile calendar */
  totalContributions: number
  /** One entry per day of the last ~year */
  contributions: GithubContribDay[]
}

export const githubSnapshot = raw as GithubSnapshot
