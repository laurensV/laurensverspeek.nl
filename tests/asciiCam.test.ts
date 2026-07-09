import { describe, it, expect } from 'vitest'
import { luminanceToChar, framePixelsToAscii, ASCII_RAMP } from '../app/utils/asciiCam'

describe('luminanceToChar', () => {
  it('maps the luminance range across the ramp', () => {
    expect(luminanceToChar(0)).toBe(ASCII_RAMP[0])
    expect(luminanceToChar(255)).toBe(ASCII_RAMP.at(-1))
    expect(luminanceToChar(128)).toBe(ASCII_RAMP[Math.floor((128 / 255) * ASCII_RAMP.length)])
  })
})

describe('framePixelsToAscii', () => {
  // 2×1 image: left pixel black, right pixel white
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])

  it('renders one char per pixel, mirrored horizontally', () => {
    const out = framePixelsToAscii(pixels, 2, 1)
    // mirrored: white (index high) comes first, black last
    expect(out).toHaveLength(2)
    expect(out[0]).toBe(ASCII_RAMP.at(-1)) // white
    expect(out[1]).toBe(ASCII_RAMP[0]) // black
  })

  it('invert flips the ramp for dark backgrounds', () => {
    const out = framePixelsToAscii(pixels, 2, 1, true)
    expect(out[0]).toBe(ASCII_RAMP[0]) // white now maps to the dark-ramp start
    expect(out[1]).toBe(ASCII_RAMP.at(-1))
  })
})
