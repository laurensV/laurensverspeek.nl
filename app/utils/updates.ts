import type { GitCommit } from '~/utils/terminal/gitLog'

// One reference point for "what's shipped since you last caught up": the
// WhatsNew toast, the boot nudge and the System Update app all measure progress
// against the same `lv-updates-hash` marker in the newest-first commit log.
// They each apply their own policy on top (stay quiet / nudge / install), but
// the lookup is shared here so the number can't drift between them.

/** How many commits landed since the marker commit — its index in the
 * newest-first log. -1 when there's no marker, or it isn't in the log. */
export function commitsSinceMarker(commits: GitCommit[], marker: string | null | undefined): number {
  if (!marker) return -1
  return commits.findIndex((commit) => commit.hash === marker)
}
