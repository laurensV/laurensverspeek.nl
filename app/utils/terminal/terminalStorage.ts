import { effectScope, watch } from 'vue'
import type { Ref } from 'vue'
import { loadFs, saveFs } from './filesystem'
import { applySeeds, siteSeeds, blogSeeds } from './siteFs'
import { loadAliases, saveAliases, loadEnvExtras, saveEnvExtras } from './shellState'
import { storageDegraded } from './storageHealth'
import { persistState } from '~/utils/persistState'
import type { TerminalContext } from './types'

// The terminal's persistence + site-seeding, lifted out of useTerminal so the
// composable stays about the interpreter. These module flags fire once per
// visit across every useTerminal() caller.
let seededSite = false
let warnedStorageFull = false
let wiredSync = false

/**
 * Restore the home filesystem, aliases and exported env from storage and keep
 * saving them; seed the site's pages as folders once per visit (sys nodes,
 * never persisted, visitor edits layered on top); keep $USER/$HOME/$PWD in sync;
 * and surface a storage-full warning in the transcript the moment a write drops.
 *
 * All of it wires exactly ONCE per app lifetime even though every
 * useTerminal() caller runs through here: a per-caller deep watch on the
 * shared filesystem meant N open desktop apps = N full-filesystem
 * serializations per keystroke, and writers died with their first component.
 */
export function wireTerminalStorage(
  ctx: TerminalContext,
  deps: { identityName: Ref<string>, cwd: Ref<string> }
): void {
  // restore the saved home filesystem once, then persist changes across visits
  persistState(ctx.files, 'terminal-fs', {
    deep: true,
    restore: () => {
      const savedFs = loadFs()
      if (savedFs && Object.keys(savedFs).length) ctx.files.value = savedFs
    },
    persist: (fs) => saveFs(fs)
  })

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
  persistState(ctx.aliases, 'terminal-aliases', {
    deep: true,
    restore: () => {
      const savedAliases = loadAliases()
      if (savedAliases) ctx.aliases.value = savedAliases
    },
    persist: (aliases) => saveAliases(aliases)
  })
  persistState(ctx.env, 'terminal-env', {
    deep: true,
    restore: () => {
      const savedEnv = loadEnvExtras()
      if (savedEnv) ctx.env.value = { ...ctx.env.value, ...savedEnv }
    },
    persist: (env) => saveEnvExtras(env)
  })

  if (!import.meta.client || wiredSync) return
  wiredSync = true
  // detached scope: these watch shared state, so the first caller unmounting
  // must not dispose them
  effectScope(true).run(() => {
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
  })
}
