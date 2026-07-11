import { effectScope, watch } from 'vue'
import type { Ref } from 'vue'

// One correct way to persist a shared useState ref to localStorage.
//
// The trap this avoids: registering the persistence `watch` inside a
// composable's setup means Vue binds it to the FIRST caller's component scope
// and disposes it when that component unmounts — after which the ref keeps
// changing but nothing writes it (settings silently stop saving once their
// window has closed once). Running the watch in a DETACHED effect scope, guarded
// by a module-level key set, keeps exactly one app-lifetime writer per key.
//
// Storage shapes vary (a number, a '1'/'0' flag, a JSON array), so each caller
// supplies its own `restore` (hydrate the ref from storage) and `persist`.

const wiredKeys = new Set<string>()

export function persistState<T>(
  state: Ref<T>,
  key: string,
  handlers: {
    /** hydrate the ref from storage — runs once, on the first client caller */
    restore: () => void
    /** write the ref's value to storage — runs on every change, forever */
    persist: (value: T) => void
    /** deep-watch for arrays/objects (default false) */
    deep?: boolean
  }
): void {
  if (!import.meta.client || wiredKeys.has(key)) return
  wiredKeys.add(key)
  handlers.restore()
  // detached (true) so a component unmount never disposes the writer
  effectScope(true).run(() => {
    watch(state, handlers.persist, { deep: handlers.deep ?? false })
  })
}
