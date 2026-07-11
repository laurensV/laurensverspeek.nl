// The lvOS "screenshot" renderer: draws the desktop's real state — wallpaper,
// icons, window chrome, the terminal's actual transcript, the taskbar — onto a
// canvas. Not a pixel capture (the DOM can't be rasterized without a library),
// but a faithful portrait: every window, title and taskbar button is yours.

export interface ShotWindow {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
}

export interface ShotOptions {
  /** Source viewport size (the canvas scales everything from it) */
  viewport: { width: number, height: number }
  windows: ShotWindow[]
  /** Desktop icon labels, in grid order */
  icons: string[]
  /** Active wallpaper name (drawn by look-alike, not by CSS) */
  wallpaper: string
  /** Custom wallpaper data URL, when "your masterpiece" is active */
  customWallpaper?: string | undefined
  accent: string
  clock: string
  /** Battery tray text ('' hides it) */
  battery: string
  /** The terminal's recent transcript, drawn inside its window */
  terminalLines: string[]
}

const OUT_W = 1200
const TASKBAR = 34

/** Deterministic per-seed widths for the fake content lines. */
const seededWidths = (seed: string, count: number): number[] => {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return Array.from({ length: count }, (_, i) => {
    hash = (hash * 1103515245 + 12345) >>> 0
    return 0.3 + ((hash >> 8) % 60) / 100 + (i % 3 === 0 ? 0.1 : 0)
  })
}

function drawWallpaper(c: CanvasRenderingContext2D, w: number, h: number, name: string, accent: string) {
  // base: the dark scheme every wallpaper sits on
  c.fillStyle = '#0c0c10'
  c.fillRect(0, 0, w, h)

  if (name === 'grid') {
    c.fillStyle = '#101014'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = 'rgba(255, 186, 0, 0.07)'
    c.lineWidth = 1
    const step = 32
    for (let x = 0; x <= w; x += step) {
      c.beginPath()
      c.moveTo(x + 0.5, 0)
      c.lineTo(x + 0.5, h)
      c.stroke()
    }
    for (let y = 0; y <= h; y += step) {
      c.beginPath()
      c.moveTo(0, y + 0.5)
      c.lineTo(w, y + 0.5)
      c.stroke()
    }
    return
  }
  if (name === 'aurora') {
    const teal = c.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, w * 0.45)
    teal.addColorStop(0, 'rgba(20, 120, 120, 0.3)')
    teal.addColorStop(1, 'transparent')
    c.fillStyle = teal
    c.fillRect(0, 0, w, h)
    const purple = c.createRadialGradient(w * 0.8, h * 0.7, 0, w * 0.8, h * 0.7, w * 0.45)
    purple.addColorStop(0, 'rgba(110, 40, 160, 0.3)')
    purple.addColorStop(1, 'transparent')
    c.fillStyle = purple
    c.fillRect(0, 0, w, h)
    return
  }
  if (name === 'game of life') {
    c.fillStyle = 'rgba(255, 186, 0, 0.18)'
    let hash = 1337
    for (let i = 0; i < 260; i++) {
      hash = (hash * 1103515245 + 12345) >>> 0
      const x = (hash >> 8) % Math.floor(w / 10)
      hash = (hash * 1103515245 + 12345) >>> 0
      const y = (hash >> 8) % Math.floor(h / 10)
      c.fillRect(x * 10, y * 10, 8, 8)
    }
    return
  }
  // default: amber void (the boot wallpaper)
  const glow = c.createRadialGradient(w * 0.7, h * 0.2, 0, w * 0.7, h * 0.2, w * 0.55)
  glow.addColorStop(0, 'rgba(255, 186, 0, 0.16)')
  glow.addColorStop(1, 'transparent')
  const base = c.createLinearGradient(0, 0, w * 0.4, h)
  base.addColorStop(0, '#17171d')
  base.addColorStop(1, '#0b0b0e')
  c.fillStyle = base
  c.fillRect(0, 0, w, h)
  c.fillStyle = glow
  c.fillRect(0, 0, w, h)
  void accent
}

function drawIcons(c: CanvasRenderingContext2D, labels: string[], accent: string) {
  c.textAlign = 'center'
  labels.forEach((label, i) => {
    const col = Math.floor(i / 6)
    const x = 26 + col * 92
    const y = 22 + (i % 6) * 78
    c.fillStyle = 'rgba(255, 255, 255, 0.05)'
    c.strokeStyle = 'rgba(255, 186, 0, 0.35)'
    c.lineWidth = 1
    c.beginPath()
    c.roundRect(x, y, 40, 40, 8)
    c.fill()
    c.stroke()
    c.fillStyle = accent
    c.fillRect(x + 14, y + 14, 12, 12)
    c.fillStyle = '#c9c9cf'
    c.font = '10px monospace'
    c.fillText(label.slice(0, 12), x + 20, y + 54)
  })
  c.textAlign = 'left'
}

function drawWindow(
  c: CanvasRenderingContext2D,
  win: { x: number, y: number, w: number, h: number, title: string, id: string },
  accent: string,
  terminalLines: string[]
) {
  const { x, y, w, h } = win
  // frame
  c.fillStyle = 'rgba(21, 21, 27, 0.97)'
  c.strokeStyle = 'rgba(255, 186, 0, 0.45)'
  c.lineWidth = 1
  c.beginPath()
  c.roundRect(x, y, w, h, 8)
  c.fill()
  c.stroke()
  // titlebar
  c.save()
  c.beginPath()
  c.roundRect(x, y, w, h, 8)
  c.clip()
  c.fillStyle = 'rgba(255, 186, 0, 0.12)'
  c.fillRect(x, y, w, 24)
  c.fillStyle = '#e8e8ea'
  c.font = '11px monospace'
  c.fillText(win.title.slice(0, Math.floor(w / 8)), x + 10, y + 16)
  // window buttons (– □ ×)
  c.fillStyle = 'rgba(232, 232, 234, 0.8)'
  c.font = '11px monospace'
  c.textAlign = 'right'
  c.fillText('–  □  ×', x + w - 10, y + 16)
  c.textAlign = 'left'

  // body content
  const pad = 12
  const lineH = 13
  const maxLines = Math.max(0, Math.floor((h - 24 - pad * 2) / lineH))
  if (win.id === 'terminal') {
    // the real transcript, most recent lines that fit
    c.font = '10px monospace'
    const lines = terminalLines.slice(-maxLines)
    lines.forEach((line, i) => {
      c.fillStyle = line.startsWith('$') ? accent : '#b9b9c1'
      c.fillText(line.slice(0, Math.floor((w - pad * 2) / 6)), x + pad, y + 24 + pad + i * lineH)
    })
  } else {
    // abstract but stable content: seeded text bars, like a thumbnail preview
    const widths = seededWidths(win.id, Math.min(maxLines, 9))
    widths.forEach((frac, i) => {
      c.fillStyle = i === 0 ? 'rgba(255, 186, 0, 0.5)' : 'rgba(200, 200, 210, 0.22)'
      c.beginPath()
      c.roundRect(x + pad, y + 24 + pad + i * lineH, Math.min(w - pad * 2, (w - pad * 2) * frac), 7, 3)
      c.fill()
    })
  }
  c.restore()
}

function drawTaskbar(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  windows: { title: string }[],
  accent: string,
  clock: string,
  battery: string
) {
  c.fillStyle = 'rgba(13, 13, 17, 0.96)'
  c.fillRect(0, h - TASKBAR, w, TASKBAR)
  c.strokeStyle = 'rgba(255, 186, 0, 0.3)'
  c.beginPath()
  c.moveTo(0, h - TASKBAR + 0.5)
  c.lineTo(w, h - TASKBAR + 0.5)
  c.stroke()
  // start button
  c.strokeStyle = 'rgba(255, 186, 0, 0.4)'
  c.beginPath()
  c.roundRect(8, h - TASKBAR + 6, 62, TASKBAR - 12, 4)
  c.stroke()
  c.fillStyle = accent
  c.font = 'bold 11px monospace'
  c.fillText('⚡ lvOS', 14, h - TASKBAR + 21)
  // window buttons
  let bx = 80
  c.font = '10px monospace'
  for (const win of windows) {
    const label = win.title.slice(0, 14)
    const bw = 14 + label.length * 6
    if (bx + bw > w - 140) break
    c.fillStyle = 'rgba(255, 186, 0, 0.12)'
    c.beginPath()
    c.roundRect(bx, h - TASKBAR + 7, bw, TASKBAR - 14, 3)
    c.fill()
    c.fillStyle = '#d9d9df'
    c.fillText(label, bx + 7, h - TASKBAR + 20)
    bx += bw + 6
  }
  // tray: battery + clock at the right
  c.textAlign = 'right'
  c.fillStyle = '#9d9da6'
  c.font = '11px monospace'
  c.fillText(clock, w - 12, h - TASKBAR + 21)
  if (battery) c.fillText(battery, w - 58, h - TASKBAR + 21)
  c.textAlign = 'left'
}

/** Render the whole desktop state to a PNG data URL. */
export async function renderDesktopShot(options: ShotOptions): Promise<string> {
  const { viewport } = options
  const outH = Math.max(400, Math.round(OUT_W * (viewport.height / viewport.width)))
  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = outH
  const c = canvas.getContext('2d')!
  const sx = OUT_W / viewport.width
  const sy = outH / viewport.height

  drawWallpaper(c, OUT_W, outH, options.wallpaper, options.accent)
  // a custom (Paint) wallpaper is a data URL — draw the real thing
  if (options.wallpaper === 'your masterpiece' && options.customWallpaper) {
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        c.drawImage(img, 0, 0, OUT_W, outH)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = options.customWallpaper!
    })
  }

  drawIcons(c, options.icons, options.accent)

  const frames = [...options.windows]
    .filter((win) => !win.minimized)
    .sort((a, b) => a.z - b.z)
    .map((win) => ({
      id: win.id,
      title: win.title,
      x: win.maximized ? 0 : win.x * sx,
      y: win.maximized ? 0 : win.y * sy,
      w: win.maximized ? OUT_W : win.width * sx,
      h: win.maximized ? outH - TASKBAR : win.height * sy
    }))
  for (const frame of frames) drawWindow(c, frame, options.accent, options.terminalLines)

  drawTaskbar(c, OUT_W, outH, options.windows, options.accent, options.clock, options.battery)
  return canvas.toDataURL('image/png')
}
