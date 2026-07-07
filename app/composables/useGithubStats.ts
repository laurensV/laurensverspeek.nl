export const GITHUB_USER = 'laurensV'

interface GithubUser {
  followers: number
  public_repos: number
}

interface GithubRepo {
  name: string
  stargazers_count: number
}

export interface GithubStats {
  followers: number
  publicRepos: number
  totalStars: number
  starsByRepo: Record<string, number>
}

/** Extracts `repo` from a github.com/<user>/<repo> URL owned by GITHUB_USER */
export function githubRepoFromUrl(url?: string): string | undefined {
  const match = url?.match(new RegExp(`github\\.com/${GITHUB_USER}/([^/#?]+)`, 'i'))
  return match?.[1]
}

/**
 * Public GitHub stats, fetched client-side so the static site always shows live data.
 * Shared across components through the asyncData key.
 */
export function useGithubStats() {
  return useLazyAsyncData<GithubStats>(
    'github-stats',
    async () => {
      const [user, repos] = await Promise.all([
        $fetch<GithubUser>(`https://api.github.com/users/${GITHUB_USER}`),
        $fetch<GithubRepo[]>(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`)
      ])

      const starsByRepo: Record<string, number> = {}
      let totalStars = 0
      for (const repo of repos) {
        starsByRepo[repo.name] = repo.stargazers_count
        totalStars += repo.stargazers_count
      }

      return {
        followers: user.followers,
        publicRepos: user.public_repos,
        totalStars,
        starsByRepo
      }
    },
    { server: false }
  )
}
