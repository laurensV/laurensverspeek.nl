// Pure helpers for the asciicam toy: map image luminance to ASCII glyphs.
// The camera plumbing lives in the terminal command; this stays testable.

// dark → light ramp (space is darkest)
export const ASCII_RAMP = ' .:-=+*#%@'

/** Luminance (0–255) → a ramp glyph. */
export function luminanceToChar(lum: number, ramp = ASCII_RAMP): string {
  const i = Math.min(ramp.length - 1, Math.max(0, Math.floor((lum / 255) * ramp.length)))
  return ramp[i]!
}

/**
 * Convert RGBA pixel data (row-major, `width` wide) to ASCII rows. Mirrored
 * horizontally so it reads like a mirror. `invert` flips the ramp for dark UIs.
 */
export function framePixelsToAscii(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  invert = false
): string {
  const ramp = invert ? [...ASCII_RAMP].reverse().join('') : ASCII_RAMP
  const rows: string[] = []
  for (let y = 0; y < height; y++) {
    let row = ''
    for (let x = width - 1; x >= 0; x--) {
      const i = (y * width + x) * 4
      // Rec. 601 luma
      const lum = 0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!
      row += luminanceToChar(lum, ramp)
    }
    rows.push(row)
  }
  return rows.join('\n')
}
