import { githubSnapshot, type GithubContribDay } from '~/data/github'

export const GITHUB_USER = 'laurensV'

export interface GithubStats {
  followers: number
  publicRepos: number
  totalStars: number
  starsByRepo: Record<string, number>
  contributions: GithubContribDay[]
  totalContributions: number
  /** When the snapshot was baked at build time (YYYY-MM-DD) */
  generatedAt: string
}

/** Extracts `repo` from a github.com/<user>/<repo> URL owned by GITHUB_USER */
export function githubRepoFromUrl(url?: string): string | undefined {
  const match = url?.match(new RegExp(`github\\.com/${GITHUB_USER}/([^/#?]+)`, 'i'))
  return match?.[1]
}

/**
 * GitHub stats + the last-year contribution calendar, baked into the static
 * build by scripts/fetch-github.mjs. Previously this fetched live from every
 * visitor's browser (rate-limited, and the events feed only ever saw ~90 days);
 * now the whole site shares one honest snapshot with an "updated" date. The
 * `{ data, pending, error }` shape is kept so existing callers don't change.
 */
export function useGithubStats() {
  const data = useState<GithubStats>('github-stats', () => ({
    followers: githubSnapshot.followers,
    publicRepos: githubSnapshot.publicRepos,
    totalStars: githubSnapshot.totalStars,
    starsByRepo: githubSnapshot.starsByRepo,
    contributions: githubSnapshot.contributions,
    totalContributions: githubSnapshot.totalContributions,
    generatedAt: githubSnapshot.generatedAt
  }))
  return { data, pending: ref(false), error: ref(false) }
}
