import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import type { GameHandle } from '~/utils/terminalGames'
import { cowsay, fortune, figlet } from '~/utils/terminalToys'
import { PET_SHOP, SNACK_COST } from '~/utils/pet'
import { formatWeather } from '~/utils/terminal/weather'
import { framePixelsToAscii } from '~/utils/asciiCam'

// ASCII toys: cowsay & friends, live weather and the webcam.

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
  }, 'asciicam')
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

export function createToyCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error } = ctx
  // the status-bar tamagotchi (factory-time: exec handlers run outside setup)
  const tamagotchi = usePet()

  return {
    pet: {
      category: 'toys',
      usage: 'pet [adopt <name>|feed|play|coins|buy <item>|snack|release]',
      description: 'Your status-bar tamagotchi (high scores mint its coins)',
      examples: ['pet adopt pixel', 'pet feed', 'pet coins', 'pet buy hat'],
      argCandidates: () => ['adopt', 'feed', 'play', 'coins', 'buy', 'snack', 'release'],
      exec: (args) => {
        const action = args[0]?.toLowerCase()
        const view = tamagotchi.view.value
        if (action === 'adopt') {
          if (view) return error(`pet: you already have ${view.name}. one pixel mouth to feed is plenty.`)
          const name = args.slice(1).join(' ').trim().slice(0, 16)
          if (!name) return error('pet: usage: pet adopt <name>')
          tamagotchi.adopt(name)
          push('primary', `  (○)  an egg!`)
          out(`${name} has been adopted. it lives in the status bar now.`)
          muted(`feed it with 'pet feed' — it hatches within the hour, and remembers neglect.`)
          return
        }
        if (!view) {
          muted(`no pet yet. adopt one with 'pet adopt <name>' — it lives in the status bar.`)
          return
        }
        if (action === 'feed') {
          tamagotchi.feed()
          out(`${view.name} munches happily. ${tamagotchi.view.value!.face}`)
          return
        }
        if (action === 'play') {
          tamagotchi.play()
          out(`you play fetch with the cursor. ${view.name} wins. ${tamagotchi.view.value!.face}`)
          return
        }
        if (action === 'release') {
          tamagotchi.release()
          muted(`${view.name} waddles off into the scrollback. it waves. you wave back.`)
          return
        }
        if (action === 'coins') {
          push('primary', `  ⛁ ${tamagotchi.coins.value} coins (${tamagotchi.earned.value} earned, ${tamagotchi.wallet.value.spent} spent)`)
          out('high scores mint coins: snake /10 · tetris /100 · 2048 /100 · wpm /5 · 15 per minesweeper best')
          out(`the shop: ${PET_SHOP.map((item) => `${item.glyph} ${item.id} (${item.cost})`).join(' · ')} — snack ${SNACK_COST}`)
          muted(`'pet buy <item>' dresses the sprite · 'pet snack' feeds AND plays`)
          return
        }
        if (action === 'buy') {
          const failure = tamagotchi.buy(args[1]?.toLowerCase() ?? '')
          if (failure) return error(`pet: ${failure}`)
          out(`purchased! ${view.name} wears it immediately: ${tamagotchi.view.value!.face}`)
          return
        }
        if (action === 'snack') {
          const failure = tamagotchi.snack()
          if (failure) return error(`pet: ${failure}`)
          out(`a premium snack. ${view.name} is beside itself. ${tamagotchi.view.value!.face}`)
          return
        }
        push('primary', `  ${view.face}  ${view.name}`)
        out(`stage: ${view.stage} · ${view.age} · ⛁ ${tamagotchi.coins.value} coins`)
        out(`mood:  ${view.moodLine}`)
        muted(`'pet feed' · 'pet play' · 'pet coins' · 'pet release'`)
      }
    },
    tips: {
      category: 'toys',
      description: 'A random tip — the site has more than fits in help',
      exec: () => {
        const deck = [
          'chain commands with && / || / ; — cd blog && ls',
          'ctrl+b then % or " splits the terminal into tmux panes',
          'pipe anything: help | grep game | sort',
          '| copy sends a command\'s output to your clipboard',
          'write a script with echo and run it: echo fortune > x.sh; sh x.sh',
          'secrets lists the hidden commands. there are a lot.',
          'ctrl+r searches your command history, shell-style',
          'the desktop lives at startx — and its terminal is this one',
          'adventure is a whole text game. so is the museum you can walk.',
          'ps and kill are real: kill 7 ends this very shell',
          'ask for coffee. the site is, technically, a teapot.',
          'world open drops you into a shared pixel canvas'
        ]
        muted('💡 ' + deck[Math.floor(Math.random() * deck.length)]!)
      }
    },
    cowsay: {
      category: 'toys',
      usage: 'cowsay <text>',
      description: 'A cow says your text',
      exec: (args) => out(cowsay(args.join(' ')))
    },
    figlet: {
      category: 'toys',
      usage: 'figlet <text>',
      description: 'Big ASCII banner text',
      exec: (args) => push('primary', figlet(args.join(' ')))
    },
    fortune: {
      category: 'toys',
      description: 'Words of dubious wisdom',
      exec: () => out(fortune())
    },
    weather: {
      category: 'toys',
      usage: 'weather [city]',
      description: 'Live weather, wttr.in style (open-meteo)',
      examples: ['weather', 'weather amsterdam', 'weather tokyo'],
      exec: async (args) => {
        const query = args.join(' ').trim() || 'Amsterdam'
        const stopSpin = ctx.spin(`asking open-meteo about ${query} ...`)
        try {
          const geo = await $fetch<GeoResult>('https://geocoding-api.open-meteo.com/v1/search', {
            query: { name: query, count: 1 },
            timeout: 10_000
          })
          const spot = geo.results?.[0]
          if (!spot) return error(`weather: unknown place '${query}'`)
          const forecast = await $fetch<ForecastResult>('https://api.open-meteo.com/v1/forecast', {
            timeout: 10_000,
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
        } finally {
          stopSpin()
        }
      }
    },
    asciicam: {
      hidden: true,
      description: 'Your webcam, rendered in ASCII (asks permission)',
      exec: () => {
        muted('asciicam: requesting camera... (press q to stop)')
        return startAsciiCam(ctx)
      }
    }
  }
}
