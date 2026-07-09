import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createSnakeGame, createHangmanGame, createTetrisGame, create2048Game, createTopGame, createLifeGame, createWpmGame, createPongGame } from '~/utils/terminalGames'
import { profile } from '~/data/profile'
import { cowsay, fortune, figlet } from '~/utils/terminalToys'
import { formatWeather } from '~/utils/terminal/weather'
import { framePixelsToAscii } from '~/utils/asciiCam'
import type { GameHandle } from '~/utils/terminalGames'

const CAM_W = 64
const CAM_H = 36

// asciicam runs as a game (it owns the keyboard for q) drawing webcam frames
async function startAsciiCam(ctx: TerminalContext): Promise<void> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
  } catch {
    ctx.error('asciicam: no camera, or permission denied. (totally fair.)')
    return
  }
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  await video.play().catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = CAM_W
  canvas.height = CAM_H
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  const dark = ctx.colorMode.value !== 'light'

  ctx.startGame((callbacks): GameHandle => {
    let raf = 0
    const tick = () => {
      context.drawImage(video, 0, 0, CAM_W, CAM_H)
      const { data } = context.getImageData(0, 0, CAM_W, CAM_H)
      callbacks.onFrame(framePixelsToAscii(data, CAM_W, CAM_H, dark))
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((track) => track.stop())
    }
    tick()
    return {
      onKey: (key) => {
        if (key.toLowerCase() === 'q' || key === 'Escape') {
          stop()
          callbacks.onEnd(['asciicam: camera off. you looked great.'])
          return true
        }
        return false
      },
      stop
    }
  })
}

interface GeoResult {
  results?: { name: string, country?: string, latitude: number, longitude: number }[]
}
interface ForecastResult {
  current: {
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
    relative_humidity_2m: number
  }
}

// Toys, games, site-wide effects and easter eggs.

export function createFunCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, close } = ctx

  // site effects masquerading as processes: `ps` lists them, `kill` stops them
  const effectProcs = [
    { pid: 314, name: 'matrix-rain', running: () => ctx.effects.matrix.value, stop: () => (ctx.effects.matrix.value = false) },
    { pid: 217, name: 'party-mode', running: () => ctx.effects.party.value, stop: () => (ctx.effects.party.value = false) },
    { pid: 42, name: 'sl-train', running: () => ctx.effects.train.value, stop: () => (ctx.effects.train.value = false) },
    { pid: 101, name: 'crt-filter', running: () => ctx.effects.crt.value, stop: () => void ctx.effects.toggleCrt(false) },
    { pid: 666, name: 'destroy-mode', running: () => ctx.effects.destruct.value, stop: () => (ctx.effects.destruct.value = false) }
  ]
  const systemProcs = [
    { pid: 1, name: 'init' },
    { pid: 7, name: 'lvsh' },
    { pid: 77, name: 'easter_eggs.service' }
  ]

  const commands: Record<string, TerminalCommand> = {
    cowsay: {
      usage: 'cowsay <text>',
      description: 'A cow says your text',
      exec: (args) => out(cowsay(args.join(' ')))
    },
    figlet: {
      usage: 'figlet <text>',
      description: 'Big ASCII banner text',
      exec: (args) => push('primary', figlet(args.join(' ')))
    },
    fortune: {
      description: 'Words of dubious wisdom',
      exec: () => out(fortune())
    },
    snake: {
      description: 'Play snake in the terminal',
      exec: () => {
        muted('Starting snake... arrows/wasd to move, q to quit.')
        ctx.startGame(createSnakeGame)
      }
    },
    hangman: {
      description: 'Play hangman (a 2014 classic, remastered)',
      exec: () => {
        muted('Starting hangman... type letters to guess, q to quit.')
        ctx.startGame(createHangmanGame)
      }
    },
    tetris: {
      description: 'Play tetris in the terminal',
      exec: () => {
        muted('Starting tetris... ←→ move, ↑ rotate, ↓ drop, space slams, q quits.')
        ctx.startGame(createTetrisGame)
      }
    },
    2048: {
      description: 'Slide the tiles, double the numbers',
      exec: () => {
        muted('Starting 2048... arrows/wasd to slide, q to quit.')
        ctx.startGame(create2048Game)
      }
    },
    destroy: {
      hidden: true,
      description: 'Enough talk. Shoot the website.',
      exec: () => {
        muted('Arming ship... click to fire. Esc ends the rampage and repairs the site.')
        ctx.effects.destruct.value = true
        setTimeout(close, 500)
      }
    },
    'barrel-roll': {
      hidden: true,
      description: 'Star Fox taught us well',
      exec: () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          muted('reduced motion is on — please imagine the site doing a 360° 🌀')
          return
        }
        document.documentElement.classList.add('barrel-roll')
        setTimeout(() => document.documentElement.classList.remove('barrel-roll'), 1200)
        out('🌀 weeeeee')
      }
    },
    do: {
      hidden: true,
      usage: 'do a barrel roll',
      description: 'You know what to do',
      exec: (args) => {
        if (args.join(' ').toLowerCase() === 'a barrel roll') {
          void commands['barrel-roll']!.exec([])
          return
        }
        error(`do: I only know one trick. It involves a barrel.`)
      }
    },
    ps: {
      description: 'List running processes (effects included)',
      exec: () => {
        push('output', `<span class="term-accent">${'PID'.padStart(5)}  ${'STAT'.padEnd(5)}COMMAND</span>`, true)
        for (const proc of systemProcs) {
          out(`${String(proc.pid).padStart(5)}  S    ${proc.name}`)
        }
        const running = effectProcs.filter((proc) => proc.running())
        for (const proc of running) {
          out(`${String(proc.pid).padStart(5)}  R    ${proc.name}`)
        }
        if (!running.length) muted(`\nno effects running — start one with 'matrix', 'party', 'sl' or 'crt'.`)
        else muted(`\nStop an effect with 'kill <pid>'.`)
      }
    },
    kill: {
      usage: 'kill <pid>',
      description: 'Stop a process. Yes, kill 314 really stops the rain',
      argCandidates: () => effectProcs.filter((proc) => proc.running()).map((proc) => String(proc.pid)),
      exec: (args) => {
        const pid = Number(args.find((arg) => !arg.startsWith('-')))
        if (!pid) return error('kill: usage: kill <pid> — see ps for the candidates')
        const effect = effectProcs.find((proc) => proc.pid === pid)
        if (effect) {
          if (!effect.running()) return error(`kill: (${pid}) — no such process (it isn't running)`)
          effect.stop()
          out(`[${pid}] ${effect.name} terminated`)
          return
        }
        if (systemProcs.some((proc) => proc.pid === pid)) {
          return error(`kill: (${pid}) — operation not permitted. this site needs that.`)
        }
        error(`kill: (${pid}) — no such process`)
      }
    },
    asciicam: {
      hidden: true,
      description: 'Your webcam, rendered in ASCII (asks permission)',
      exec: () => {
        muted('asciicam: requesting camera... (press q to stop)')
        return startAsciiCam(ctx)
      }
    },
    weather: {
      usage: 'weather [city]',
      description: 'Live weather, wttr.in style (open-meteo)',
      examples: ['weather', 'weather amsterdam', 'weather tokyo'],
      exec: async (args) => {
        const query = args.join(' ').trim() || 'Amsterdam'
        muted(`Asking open-meteo about ${query} ...`)
        try {
          const geo = await $fetch<GeoResult>('https://geocoding-api.open-meteo.com/v1/search', {
            query: { name: query, count: 1 }
          })
          const spot = geo.results?.[0]
          if (!spot) return error(`weather: unknown place '${query}'`)
          const forecast = await $fetch<ForecastResult>('https://api.open-meteo.com/v1/forecast', {
            query: {
              latitude: spot.latitude,
              longitude: spot.longitude,
              current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m'
            }
          })
          const place = spot.country ? `${spot.name}, ${spot.country}` : spot.name
          formatWeather(place, {
            temperature: forecast.current.temperature_2m,
            wind: forecast.current.wind_speed_10m,
            humidity: forecast.current.relative_humidity_2m,
            code: forecast.current.weather_code
          }).forEach(out)
        } catch {
          error('weather: the sky is unreachable right now (network error)')
        }
      }
    },
    pong: {
      description: 'You vs a slightly fallible AI paddle',
      exec: () => {
        muted('Starting pong... w/s or ↑/↓ to move, first to 5, q quits.')
        ctx.startGame(createPongGame)
      }
    },
    wpm: {
      description: 'Typing test — how fast are you really?',
      exec: () => {
        muted('Starting typing test... just start typing, Backspace fixes, Esc quits.')
        ctx.startGame(createWpmGame)
      }
    },
    top: {
      description: 'Live process monitor',
      exec: () => {
        muted('Starting top... q to quit.')
        ctx.startGame(createTopGame)
      }
    },
    life: {
      description: "Conway's Game of Life, in ASCII",
      exec: () => {
        muted('Starting life... space pauses, r reseeds, q quits.')
        ctx.startGame(createLifeGame)
      }
    },
    htop: {
      hidden: true,
      description: 'Alias for top',
      exec: () => ctx.getCommands().top!.exec([])
    },
    ping: {
      usage: 'ping <host>',
      description: 'Send ICMP packets to a host',
      exec: (args) => {
        const host = args[0] ?? profile.domain
        muted(`PING ${host} (127.0.0.1): 56 data bytes`)
        let seq = 0
        const times: number[] = []
        const send = () => {
          if (seq >= 4) {
            const min = Math.min(...times).toFixed(1)
            const max = Math.max(...times).toFixed(1)
            const avg = (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1)
            out('')
            out(`--- ${host} ping statistics ---`)
            out(`4 packets transmitted, 4 received, 0% packet loss`)
            out(`round-trip min/avg/max = ${min}/${avg}/${max} ms`)
            return
          }
          const time = 8 + Math.random() * 30
          times.push(time)
          out(`64 bytes from ${host}: icmp_seq=${seq} ttl=64 time=${time.toFixed(1)} ms`)
          seq++
          setTimeout(send, 420)
        }
        send()
      }
    },
    curl: {
      usage: 'curl <url>',
      description: 'Fetch a URL (really — CORS permitting)',
      examples: ['curl https://api.github.com/zen', 'curl laurensverspeek.nl'],
      exec: (args) => {
        const raw = args.find((arg) => !arg.startsWith('-'))
        if (!raw) return error(`curl: try 'curl https://api.github.com/zen'`)
        // a bare host defaults to https and is treated as our own playful page
        let url: URL
        try {
          url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`)
        } catch {
          return error(`curl: (3) URL malformed: ${raw}`)
        }
        // our own domain keeps the original easter-egg response
        if (/(^|\.)laurensverspeek\.nl$/.test(url.hostname)) {
          push('primary', 'HTTP/2 200')
          out('content-type: text/html; charset=utf-8')
          out('')
          out('<!doctype html><title>Laurens Verspeek</title>')
          out('<!-- psst: the real fun is behind the ~ key -->')
          return
        }
        muted(`* Trying ${url.host}...`)
        return fetch(url.toString(), { headers: { accept: 'text/plain, application/json, */*' } })
          .then(async (res) => {
            push('primary', `HTTP ${res.status} ${res.statusText}`.trim())
            const type = res.headers.get('content-type') ?? ''
            out(`content-type: ${type || 'unknown'}`)
            out('')
            const body = await res.text()
            const text = type.includes('application/json')
              ? JSON.stringify(JSON.parse(body), null, 2)
              : body
            text.split('\n').slice(0, 40).forEach(out)
            if (text.split('\n').length > 40) muted('… (truncated)')
          })
          .catch(() => error(`curl: (7) couldn't reach ${url.host} — it may block cross-origin requests`))
      }
    },
    desktop: {
      description: 'Boot the lvOS desktop environment',
      exec: () => {
        push('primary', 'Booting lvOS 2.0 ...')
        muted('Tip: Esc or the start menu logs you out again.')
        ctx.navigate('desktop')
      }
    },
    startx: {
      hidden: true,
      description: 'Alias for desktop',
      exec: () => ctx.getCommands().desktop!.exec([])
    },
    matrix: {
      description: 'There is no spoon',
      exec: () => {
        push('primary', 'Wake up, Neo...')
        muted('The Matrix has you. Click or press any key to escape.')
        setTimeout(() => {
          ctx.effects.matrix.value = true
          ctx.isOpen.value = false
        }, 900)
      }
    },
    crt: {
      description: 'Toggle retro CRT mode',
      exec: () => {
        const on = ctx.effects.toggleCrt()
        out(on ? 'CRT mode enabled. Welcome back to 1985.' : 'CRT mode disabled. Back to the future.')
      }
    },
    sl: {
      hidden: true,
      description: 'You meant ls. Enjoy the ride.',
      exec: () => {
        muted(`You typed 'sl' instead of 'ls', didn't you? Enjoy the ride.`)
        ctx.effects.train.value = true
        setTimeout(close, 600)
      }
    },
    party: {
      hidden: true,
      description: 'As if you typed the Konami code',
      exec: () => {
        out('🎉 cheat mode activated')
        muted('(the classy way in: ↑↑↓↓←→←→BA)')
        ctx.effects.party.value = true
        setTimeout(close, 400)
      }
    }
  }

  return commands
}
