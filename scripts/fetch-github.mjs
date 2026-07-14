// Build-time GitHub snapshot. Rather than hitting the GitHub API from every
// visitor's browser (rate-limited, and the events feed only sees ~90 days), bake
// the profile stats and the real last-year contribution calendar into a JSON
// file at build time. Non-fatal: on any network/API failure it keeps the
// previously committed snapshot (or writes an empty stub), so a build never
// breaks over a rate limit or an offline runner.

import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const USER = 'laurensV'
const outFile = fileURLToPath(new URL('../app/data/github.generated.json', import.meta.url))
const today = new Date().toISOString().slice(0, 10)

/** @param {string} url */
const getJson = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': USER, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

const main = async () => {
  const [user, repos, contrib] = await Promise.all([
    getJson(`https://api.github.com/users/${USER}`),
    getJson(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`),
    // keyless third-party mirror of the public contribution calendar (the graph
    // GitHub shows on a profile), which the official REST API doesn't expose
    getJson(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`)
  ])

  /** @type {Record<string, number>} */
  const starsByRepo = {}
  let totalStars = 0
  for (const repo of repos) {
    starsByRepo[repo.name] = repo.stargazers_count
    totalStars += repo.stargazers_count
  }

  const data = {
    generatedAt: today,
    user: USER,
    followers: user.followers,
    publicRepos: user.public_repos,
    totalStars,
    starsByRepo,
    totalContributions: contrib.total?.lastYear ?? 0,
    /** @type {{ date: string, count: number }[]} */
    contributions: (contrib.contributions ?? []).map((/** @type {{ date: string, count: number }} */ d) => ({ date: d.date, count: d.count }))
  }

  await writeFile(outFile, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`fetch-github: baked ${data.contributions.length} days (${data.totalContributions} contributions), ${totalStars} stars, updated ${today}`)
}

main().catch(async (/** @type {Error} */ err) => {
  console.warn(`fetch-github: keeping existing snapshot (${err.message})`)
  // make sure the file at least exists so the app's import never fails a build
  try {
    await readFile(outFile)
  } catch {
    const stub = { generatedAt: today, user: USER, followers: 0, publicRepos: 0, totalStars: 0, starsByRepo: {}, totalContributions: 0, contributions: [] }
    await writeFile(outFile, `${JSON.stringify(stub, null, 2)}\n`)
  }
})
