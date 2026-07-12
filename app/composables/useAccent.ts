// Runtime accent switching. Bulma bakes the primary color at build time, but it
// derives everything from --bulma-primary-h/s/l, and our own --lv-primary-hsl
// token references those — so overriding the three HSL components on <html>
// recolors the whole site (and both themes) live.

import { storageGet, storageSet } from '~/utils/safeStorage'

export interface Accent {
  name: string
  h: number
  s: number
  l: number
  /** Text color that sits on a primary-filled background */
  invert: string
}

export const ACCENTS: Accent[] = [
  { name: 'amber', h: 44, s: 100, l: 50, invert: 'hsl(0, 0%, 4%)' },
  { name: 'emerald', h: 152, s: 63, l: 45, invert: 'hsl(0, 0%, 100%)' },
  { name: 'cyan', h: 190, s: 90, l: 50, invert: 'hsl(0, 0%, 4%)' },
  { name: 'magenta', h: 320, s: 80, l: 60, invert: 'hsl(0, 0%, 4%)' },
  { name: 'crimson', h: 348, s: 83, l: 55, invert: 'hsl(0, 0%, 100%)' }
]

const STORAGE_KEY = 'lv-accent'

export function useAccent() {
  const accent = useState(STATE_KEYS.accent, () => 'amber')

  const applyVars = (a: Accent) => {
    if (!import.meta.client) return
    const root = document.documentElement.style
    const color = `hsl(${a.h}, ${a.s}%, ${a.l}%)`
    // override both primary and link (Bulma keys many derived vars off these)
    for (const key of ['primary', 'link']) {
      root.setProperty(`--bulma-${key}-h`, `${a.h}deg`)
      root.setProperty(`--bulma-${key}-s`, `${a.s}%`)
      root.setProperty(`--bulma-${key}-l`, `${a.l}%`)
      root.setProperty(`--bulma-${key}`, color)
    }
    root.setProperty('--bulma-primary-invert', a.invert)
    root.setProperty('--bulma-link-invert', a.invert)
  }

  /** Switch accent by name; returns the applied accent or undefined if unknown. */
  const setAccent = (name: string): Accent | undefined => {
    const found = ACCENTS.find((a) => a.name === name.toLowerCase())
    if (!found) return undefined
    accent.value = found.name
    applyVars(found)
    if (import.meta.client) storageSet(STORAGE_KEY, found.name)
    return found
  }

  /** Apply an arbitrary HSL colour as the accent (from the colour-picker app).
   * Persisted as `custom:h,s,l` so it survives a reload like a named accent. */
  const applyCustom = (h: number, s: number, l: number) => {
    // white text on dark fills, near-black on light ones
    const custom: Accent = { name: 'custom', h, s, l, invert: l < 55 ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 4%)' }
    accent.value = 'custom'
    applyVars(custom)
    if (import.meta.client) storageSet(STORAGE_KEY, `custom:${h},${s},${l}`)
  }

  /** Restore the persisted accent (called once on client load). */
  const initAccent = () => {
    if (!import.meta.client) return
    const saved = storageGet(STORAGE_KEY)
    if (!saved || saved === 'amber') return
    const custom = saved.match(/^custom:(\d+),(\d+),(\d+)$/)
    if (custom) applyCustom(Number(custom[1]), Number(custom[2]), Number(custom[3]))
    else setAccent(saved)
  }

  return { accent, accents: ACCENTS, setAccent, applyCustom, initAccent }
}
