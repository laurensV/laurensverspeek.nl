// Shareable time-travel links: visiting laurensverspeek.nl/?v=v2.0.3 (or a date
// like ?v=2026-07-01, or a commit/deploy sha) auto-travels to that past build on
// load, so a link can drop someone straight into the site as it was. Reuses the
// same useTimeMachine the terminal `git checkout` and the lvOS app use; travelTo
// reloads onto '/' (dropping the ?v=), so it fires exactly once.
export default defineNuxtPlugin(() => {
  const route = useRoute()
  const raw = route.query.v
  const ref = Array.isArray(raw) ? raw[0] : raw
  if (!ref) return

  const timeMachine = useTimeMachine()
  if (!timeMachine.isAvailable()) return

  void (async () => {
    const deploys = await timeMachine.load()
    // the full baked log lets a commit that wasn't itself a deploy tip resolve
    // to the deploy that shipped it — same as the terminal's `git checkout`
    // (without it, most /changelog hashes pasted into ?v= would silently no-op)
    const commits = await $fetch<{ hash: string }[]>('/git-log.json', { timeout: 10_000 }).catch(() => [])
    const target = timeMachine.resolveRef(ref, deploys, commits)
    // only travel to a real past snapshot — 'present'/null just means "stay"
    if (target && target !== 'present') await timeMachine.travelTo(target)
  })()
})
