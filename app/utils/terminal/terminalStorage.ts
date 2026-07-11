import { watch } from 'vue'
import type { Ref } from 'vue'
import { loadFs, saveFs } from './filesystem'
import { applySeeds, siteSeeds, blogSeeds } from './siteFs'
import { loadAliases, saveAliases, loadEnvExtras, saveEnvExtras } from './shellState'
import { storageDegraded } from './storageHealth'
import type { TerminalContext } from './types'

// The terminal's persistence + site-seeding, lifted out of useTerminal so the
// composable stays about the interpreter. These module flags fire once per
// visit across every useTerminal() caller.
let seededSite = false
let warnedStorageFull = false

/**
 * Restore the home filesystem, aliases and exported env from storage and keep
 * saving them; seed the site's pages as folders once per visit (sys nodes,
 * never persisted, visitor edits layered on top); keep $USER/$HOME/$PWD in sync;
 * and surface a storage-full warning in the transcript the moment a write drops.
 */
export function wireTerminalStorage(
  ctx: TerminalContext,
  deps: { identityName: Ref<string>, cwd: Ref<string> }
): void {
  // restore the saved home filesystem once, then persist changes across visits
  const savedFs = loadFs()
  if (savedFs && Object.keys(savedFs).length) ctx.files.value = savedFs
  if (import.meta.client) watch(ctx.files, (fs) => saveFs(fs), { deep: true })

  if (import.meta.client && !seededSite) {
    seededSite = true
    ctx.files.value = applySeeds(ctx.files.value, siteSeeds())
    void ctx.fetchPosts()
      .then((posts) => {
        ctx.files.value = applySeeds(ctx.files.value, blogSeeds(posts))
      })
      .catch(() => {
        seededSite = false // let a later terminal open retry the posts
      })
  }

  // aliases and exported env vars get the same treatment
  const savedAliases = loadAliases()
  if (savedAliases) ctx.aliases.value = savedAliases
  const savedEnv = loadEnvExtras()
  if (savedEnv) ctx.env.value = { ...ctx.env.value, ...savedEnv }
  if (import.meta.client) {
    watch(ctx.aliases, (aliases) => saveAliases(aliases), { deep: true })
    watch(ctx.env, (env) => saveEnvExtras(env), { deep: true })
  }

  // keep $USER / $HOME in sync when the visitor renames themselves, $PWD with cd
  watch(deps.identityName, (n) => {
    ctx.env.value = { ...ctx.env.value, USER: n, HOME: `/home/${n}` }
  })
  watch(deps.cwd, (dir) => {
    ctx.env.value = { ...ctx.env.value, PWD: dir }
  })

  // a full localStorage must never be silent: the moment a filesystem or
  // tombstone write gets dropped, say so in the transcript
  watch(storageDegraded, (degraded) => {
    if (!degraded || warnedStorageFull) return
    warnedStorageFull = true
    ctx.error('lvsh: browser storage is full (or blocked) — your file changes are NOT being saved!')
    ctx.muted(`free some space: 'df' shows usage, the gallery hoards screenshots, 'factory-reset' nukes it all`)
  })
}
