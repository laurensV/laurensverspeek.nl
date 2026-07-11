// The visitor's identity: a friendly random handle by default (so not everyone
// is "visitor"), changeable and persisted. Used by the terminal prompt, whoami,
// and the live-cursor labels.

import { storageGet, storageSet } from '~/utils/safeStorage'

const ADJECTIVES = [
  'curious', 'quiet', 'swift', 'clever', 'brave', 'sleepy', 'lucky', 'cosmic',
  'neon', 'retro', 'fuzzy', 'wired', 'silent', 'turbo', 'hyper', 'lofi'
]
const NOUNS = [
  'otter', 'raven', 'fox', 'byte', 'pixel', 'comet', 'ninja', 'goblin',
  'wizard', 'penguin', 'raptor', 'yak', 'moth', 'quokka', 'axolotl', 'daemon'
]

const STORAGE_KEY = 'lv-identity'
const MAX_LEN = 24

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!

/** Sanitize to a shell-friendly handle: lowercase, no spaces/specials. */
export const sanitizeName = (raw: string) =>
  raw.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, MAX_LEN)

export function useIdentity() {
  const name = useState(STATE_KEYS.identityName, () => 'visitor')

  // hydrate from storage (or mint a random handle) once on the client
  if (import.meta.client && name.value === 'visitor') {
    const saved = storageGet(STORAGE_KEY)
    if (saved) {
      // re-sanitize on load: a hand-edited localStorage value shouldn't be
      // trusted just because it was there last time (defense in depth)
      name.value = sanitizeName(saved) || 'visitor'
    } else {
      name.value = `${pick(ADJECTIVES)}-${pick(NOUNS)}`
      storageSet(STORAGE_KEY, name.value)
    }
  }

  /** Change the handle; returns the sanitized value applied, or null if empty. */
  const setName = (raw: string): string | null => {
    const clean = sanitizeName(raw)
    if (!clean) return null
    name.value = clean
    if (import.meta.client) storageSet(STORAGE_KEY, clean)
    return clean
  }

  return { name, setName }
}
