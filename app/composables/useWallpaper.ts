// lvOS wallpaper: the selectable backdrops plus the persisted choice.
// Extracted from WebDesktop; the taskbar's swatches and the desktop background
// both read from here.

import { storageGet, storageSet } from '~/utils/safeStorage'

export interface Wallpaper {
  name: string
  swatch: string
  css: string
  /** Rendered by a live component (Game of Life) on top of the base css */
  live?: boolean
}

export const WALLPAPERS: Wallpaper[] = [
  {
    name: 'amber void',
    swatch: 'linear-gradient(135deg, #2a1e00, #0a0a0a)',
    css:
      'radial-gradient(60rem 40rem at 70% 20%, hsla(var(--lv-primary-hsl), 0.14), transparent),'
      + ' linear-gradient(160deg, hsl(var(--lv-scheme-hs), 8%), hsl(var(--bulma-scheme-h), 40%, 4%))'
  },
  {
    name: 'grid',
    swatch: 'linear-gradient(135deg, #0d0d0d, #1a1a1a)',
    css:
      'linear-gradient(hsla(var(--lv-primary-hsl), 0.06) 1px, transparent 1px) 0 0 / 2rem 2rem,'
      + ' linear-gradient(90deg, hsla(var(--lv-primary-hsl), 0.06) 1px, transparent 1px) 0 0 / 2rem 2rem,'
      + ' hsl(var(--lv-scheme-hs), 6%)'
  },
  {
    name: 'aurora',
    swatch: 'linear-gradient(135deg, #001a1a, #1a0033)',
    css:
      'radial-gradient(50rem 30rem at 20% 30%, hsla(180, 60%, 30%, 0.25), transparent),'
      + ' radial-gradient(50rem 30rem at 80% 70%, hsla(280, 60%, 30%, 0.25), transparent),'
      + ' hsl(var(--lv-scheme-hs), 5%)'
  },
  {
    name: 'game of life',
    swatch: 'radial-gradient(circle at 30% 30%, #3a2c00 15%, #0a0a0a 60%)',
    css: 'hsl(var(--lv-scheme-hs), 5%)',
    live: true
  }
]

const WALLPAPER_KEY = 'lvos-wallpaper'
let restored = false

export function useWallpaper() {
  const wallpaper = useState('lvos-wallpaper', () => 0)
  if (import.meta.client && !restored) {
    restored = true
    const saved = Number(storageGet(WALLPAPER_KEY))
    if (Number.isInteger(saved) && saved >= 0 && saved < WALLPAPERS.length) wallpaper.value = saved
    watch(wallpaper, (index) => storageSet(WALLPAPER_KEY, String(index)))
  }
  const wallpaperStyle = computed(() => ({ background: WALLPAPERS[wallpaper.value]?.css }))

  // advance to the next wallpaper, returning its name (handy for a toast)
  const cycleWallpaper = () => {
    wallpaper.value = (wallpaper.value + 1) % WALLPAPERS.length
    return WALLPAPERS[wallpaper.value]!.name
  }

  return { wallpapers: WALLPAPERS, wallpaper, wallpaperStyle, cycleWallpaper }
}
