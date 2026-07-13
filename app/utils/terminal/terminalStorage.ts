import { effectScope, watch } from 'vue'
import type { Ref } from 'vue'
import { loadFs, saveFs } from './filesystem'
import type { Filesystem } from './filesystem'
import { applySeeds, siteSeeds, blogSeeds } from './siteFs'
import type { SeedablePost } from './siteFs'
import { loadAliases, saveAliases, loadEnvExtras, saveEnvExtras } from './shellState'
import { storageDegraded } from './storageHealth'
import { persistState } from '~/utils/persistState'
import type { TerminalContext } from './types'

// The terminal's persistence + site-seeding, lifted out of useTerminal so the
// composable stays about the interpreter. These module flags fire once per
// visit across every useTerminal() caller.
let fsInited = false
let warnedStorageFull = false
let wiredSync = false

/**
 * Restore the home filesystem from storage (and keep saving it), then seed the
 * site's pages and blog posts as sys nodes. Runs exactly once per app lifetime.
 *
 * This is called BOTH from a client plugin on every page (see
 * `plugins/terminalFs.client.ts`) and from the terminal when it opens: the
 * terminal overlay is lazily mounted now, so without the plugin a plain blog
 * page would have an empty VFS — breaking blog overrides, `reseed` and the
 * Files app, all of which read this shared state directly. Only the FS lives
 * here; aliases/env stay with the terminal (they only matter once it's open).
 */
export function initTerminalFs(fetchPosts: () => Promise<SeedablePost[]>): void {
  if (fsInited) return
  fsInited = true

  const files = useState<Filesystem>(STATE_KEYS.terminalFs, () => ({}))

  // restore the saved home filesystem once, then persist changes across visits
  persistState(files, 'terminal-fs', {
    deep: true,
    restore: () => {
      const savedFs = loadFs()
      if (savedFs && Object.keys(savedFs).length) files.value = savedFs
    },
    persist: (fs) => saveFs(fs)
  })

  if (import.meta.client) {
    files.value = applySeeds(files.value, siteSeeds())
    void fetchPosts()
      .then((posts) => {
        files.value = applySeeds(files.value, blogSeeds(posts))
      })
      .catch(() => {
        fsInited = false // let a later caller retry the posts
      })
  }
}

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
  // restore + seed the home filesystem (shared with the client plugin, wires once)
  initTerminalFs(ctx.fetchPosts)

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
