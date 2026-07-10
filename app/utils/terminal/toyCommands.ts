import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import type { GameHandle } from '~/utils/terminalGames'
import { cowsay, fortune, figlet } from '~/utils/terminalToys'
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

export function createToyCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error } = ctx

  return {
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
