// Persistence for shell customizations: user-defined aliases and exported env
// vars survive visits, like the command history and home filesystem already do.

import { storageGetJson, storageSetJson } from '~/utils/safeStorage'

const ALIAS_KEY = 'lv-terminal-aliases'
const ENV_KEY = 'lv-terminal-env'

// managed by the shell itself (identity sync, cd, boot) — never persisted
const BUILTIN_ENV = new Set(['USER', 'HOME', 'PWD', 'SHELL', 'HOST'])

let restoredAliases = false
let restoredEnv = false

const isStringRecord = (value: unknown): value is Record<string, string> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
  && Object.values(value).every((entry) => typeof entry === 'string')

/** Only the user's own exports; builtins stay derived at runtime. */
export function envExtras(env: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !BUILTIN_ENV.has(key)))
}

/** Restore saved aliases once per session (the whole record, so unalias sticks). */
export function loadAliases(): Record<string, string> | null {
  if (restoredAliases) return null
  restoredAliases = true
  return storageGetJson(ALIAS_KEY, isStringRecord)
}

export function saveAliases(aliases: Record<string, string>): void {
  storageSetJson(ALIAS_KEY, aliases) // safeStorage already no-ops off-client
}

/** Restore the user's exported vars once per session. */
export function loadEnvExtras(): Record<string, string> | null {
  if (restoredEnv) return null
  restoredEnv = true
  const saved = storageGetJson(ENV_KEY, isStringRecord)
  return saved ? envExtras(saved) : null
}

export function saveEnvExtras(env: Record<string, string>): void {
  storageSetJson(ENV_KEY, envExtras(env))
}
