// lvOS Time Machine — the app-side half (the service worker is
// public/sw-timemachine.js). Shared state so the terminal `git checkout` command
// and the lvOS Time Machine app drive the exact same thing: one deploy manifest,
// one "travel" mechanism. Travelling just tells the service worker which past
// build to serve, then reloads onto it.

export interface Deploy {
  /** Full gh-pages commit SHA — the ref the service worker feeds to jsDelivr */
  sha: string
  /** Deploy date (when this version went live), YYYY-MM-DD */
  date: string
  /** Short source-commit SHA that shipped in this deploy */
  source: string
  /** The source commit's subject — what changed in this version */
  subject: string
  /** The release tag (v2.0.x) on this deploy's commit, if it has one */
  tag?: string
}

/** A resolved `git checkout` target: a past build, or a return to the live site. */
export type TravelTarget = Deploy | 'present' | null

const REFS_TO_PRESENT = new Set(['main', 'master', 'head', '-', 'present', 'live', 'now', 'tip'])

/** Two SHA prefixes refer to the same commit if either abbreviation contains the other. */
const sameCommit = (a: string, b: string) => a.startsWith(b) || b.startsWith(a)

/**
 * The deploy that shipped a given commit: most source commits were never a
 * deploy point of their own (deploys batch several commits), so a hash from
 * `git log` maps to the first deploy cut at-or-after it. `commits` is the full
 * newest-first history; `i` is the target commit's index in it.
 */
function deployForCommitIndex(deploys: Deploy[], commits: { hash: string }[], i: number): Deploy | null {
  let best: Deploy | null = null
  let bestIndex = -1
  for (const deploy of deploys) {
    const di = commits.findIndex((c) => sameCommit(c.hash, deploy.source))
    // newest-first indexing: a smaller index is newer. The shipping deploy is
    // the newest one that is still older-or-equal to the commit (largest di ≤ i).
    if (di >= 0 && di <= i && di > bestIndex) {
      bestIndex = di
      best = deploy
    }
  }
  // commit newer than every deploy (not shipped yet) → the newest build we have
  return best ?? deploys[0] ?? null
}

/**
 * Resolve a terminal ref (hash, HEAD~n, date, branch name) to a deploy. Pass the
 * `git log` history so a commit that wasn't itself a deploy still resolves to
 * the deploy that shipped it.
 */
export function resolveDeployRef(rawRef: string, deploys: Deploy[], commits: { hash: string }[] = []): TravelTarget {
  const ref = rawRef.trim().toLowerCase()
  if (!ref || REFS_TO_PRESENT.has(ref)) return 'present'

  // HEAD~N / @~N / ~N — N deploys back (0 = newest)
  const rel = /^(?:head|@)?~(\d+)$/.exec(ref)
  if (rel) return deploys[Number(rel[1])] ?? null

  // a date — the version that was live on (or most recently before) that day
  if (/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return deploys.find((d) => d.date <= ref) ?? deploys.at(-1) ?? null
  }

  // an exact deploy: its release tag (v2.0.4), gh-pages sha, or source commit
  const exact = deploys.find(
    (d) => d.tag?.toLowerCase() === ref || d.sha.startsWith(ref) || d.source.startsWith(ref)
  )
  if (exact) return exact

  // any other real commit from the log → the deploy that shipped it
  const i = commits.findIndex((c) => sameCommit(c.hash, ref))
  if (i >= 0) return deployForCommitIndex(deploys, commits, i)

  return null
}

async function messageServiceWorker(message: unknown): Promise<{ ok?: boolean } | null> {
  if (!import.meta.client || !('serviceWorker' in navigator)) return null
  let reg: ServiceWorkerRegistration
  try {
    reg = await navigator.serviceWorker.ready
  } catch {
    return null
  }
  const worker = reg.active ?? navigator.serviceWorker.controller
  if (!worker) return null
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => resolve(null), 4000)
    channel.port1.onmessage = (event) => {
      clearTimeout(timer)
      resolve(event.data as { ok?: boolean } | null)
    }
    worker.postMessage(message, [channel.port2])
  })
}

export function useTimeMachine() {
  const deploys = useState<Deploy[]>(STATE_KEYS.timeMachineDeploys, () => [])
  // reflects what the SW reports; mostly null in the present (travel replaces the
  // whole running app), but useful for the app to show the current state
  const active = useState<Deploy | null>(STATE_KEYS.timeMachineTarget, () => null)

  /** Load the deploy manifest once (newest-first). */
  async function load(): Promise<Deploy[]> {
    if (deploys.value.length) return deploys.value
    try {
      deploys.value = await $fetch<Deploy[]>('/time-machine.json', { timeout: 10_000 })
    } catch {
      deploys.value = []
    }
    return deploys.value
  }

  /** Is the Time Machine usable here? (needs the service worker, i.e. the built site.) */
  function isAvailable(): boolean {
    return import.meta.client && 'serviceWorker' in navigator
  }

  /** Travel to a past build: point the SW at it, then reload onto the old home page. */
  async function travelTo(deploy: Deploy): Promise<boolean> {
    const ack = await messageServiceWorker({
      type: 'tm-travel',
      sha: deploy.sha,
      date: deploy.date,
      source: deploy.source,
      subject: deploy.subject
    })
    if (!ack?.ok) return false
    active.value = deploy
    window.location.assign('/')
    return true
  }

  /** Return to the live present. */
  async function returnToPresent(): Promise<boolean> {
    const ack = await messageServiceWorker({ type: 'tm-return' })
    active.value = null
    if (!ack?.ok) return false
    window.location.assign('/')
    return true
  }

  return { deploys, active, load, isAvailable, travelTo, returnToPresent, resolveRef: resolveDeployRef }
}
