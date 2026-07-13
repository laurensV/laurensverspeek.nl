import type { Ref } from 'vue'
import type { DesktopWindow } from '~/composables/useWindowManager'
import type { Wallpaper } from '~/composables/useWallpaper'
import { renderDesktopShot } from '~/utils/desktopShot'
import { addToGallery } from '~/utils/gallery'

// The two "IO" actions the lvOS taskbar offers — the lvos.iso joke download and
// the desktop screenshot → Gallery — pulled out of WebDesktop so the shell
// component stays about windows and apps.

interface DesktopIoDeps {
  windows: Ref<DesktopWindow[]>
  icons: { label: string }[]
  wallpapers: Ref<Wallpaper[]>
  wallpaper: Ref<number>
  battery: ReturnType<typeof useBattery>
  terminal: ReturnType<typeof useTerminal>
  notify: (icon: string, title: string, body?: string) => void
}

export function useDesktopIo(deps: DesktopIoDeps) {
  const { windows, icons, wallpapers, wallpaper, battery, terminal, notify } = deps

  // a tiny, very real file with very unreal contents
  const downloadIso = () => {
    const iso = [
      '            ⚡ lvOS 2.0 — installation media ⚡',
      '',
      '  congratulations on downloading an operating system that',
      '  only runs inside a portfolio website.',
      '',
      '  RELEASE NOTES',
      '  • everything is a process, including your regrets (kill 7)',
      '  • the recycle bin forgives; the grue does not',
      '  • a tamagotchi may imprint on you. this is permanent.',
      '',
      '  INSTALLATION',
      '  1. do not burn this to a disc',
      '  2. visit https://laurensverspeek.nl/desktop instead',
      '  3. that was the whole installation',
      '',
      '  md5: d41d8cd98f00b204e9800998ecf8427e (of nothing, fittingly)',
      ''
    ].join('\n')
    const url = URL.createObjectURL(new Blob([iso], { type: 'application/octet-stream' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'lvos-2.0.iso'
    a.click()
    URL.revokeObjectURL(url)
    notify('⤓', 'lvos-2.0.iso downloaded', 'boot media for a computer that lives in a browser')
  }

  // renders the desktop's real state (wallpaper, icons, windows incl. the
  // terminal transcript, taskbar) and files it into the Gallery via localStorage
  const takeScreenshot = async () => {
    const measure = (id: string, fallbackW: number, fallbackH: number) => {
      const el = document.querySelector<HTMLElement>(`.lvos-window[data-win="${id}"]`)
      return { width: el?.offsetWidth ?? fallbackW, height: el?.offsetHeight ?? fallbackH }
    }
    const shot = await renderDesktopShot({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      windows: windows.value.map((win) => ({
        id: win.id,
        title: win.title,
        x: win.x,
        y: win.y,
        z: win.z + (win.pinned ? 1000 : 0),
        minimized: win.minimized,
        maximized: win.maximized,
        ...measure(win.id, win.width ?? 420, win.height ?? 320)
      })),
      icons: icons.map((icon) => icon.label),
      wallpaper: wallpapers.value[wallpaper.value]?.name ?? 'amber void',
      customWallpaper: wallpapers.value[wallpaper.value]?.name === 'your masterpiece'
        ? wallpapers.value[wallpaper.value]?.css.match(/url\("(.+?)"\)/)?.[1]
        : undefined,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--bulma-primary').trim() || '#ffba00',
      clock: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      battery: battery.supported.value && battery.percent.value !== null
        ? `${battery.charging.value ? '⚡' : '▮'}${battery.percent.value}%`
        : '',
      terminalLines: terminal.lines.value.slice(-40).map((line) =>
        line.type === 'input' ? `$ ${line.text}` : line.text.replace(/<[^>]+>/g, ''))
    })
    if (!addToGallery(shot)) {
      notify('⌜⌟', 'Screenshot failed', 'localStorage is full — empty the gallery a little')
      return
    }
    notify('⌜⌟', 'Screenshot saved', 'open the gallery to admire your desktop')
  }

  return { downloadIso, takeScreenshot }
}
