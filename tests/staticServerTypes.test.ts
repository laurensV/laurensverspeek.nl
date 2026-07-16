import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TYPES } from '../scripts/static-server.mjs'

// the e2e static server and the time-machine service worker each keep an
// extension→MIME map; they drifted once (webm/mp4/webmanifest missing from the
// server, so the PWA manifest and project videos shipped as octet-stream in
// e2e runs) — this pins the two together and the must-serve set

const swSource = readFileSync(
  fileURLToPath(new URL('../public/sw-timemachine.js', import.meta.url)),
  'utf8'
)

const tmTypes = (): Record<string, string> => {
  const block = /const TM_TYPES = \{([\s\S]*?)\}/.exec(swSource)?.[1] ?? ''
  const map: Record<string, string> = {}
  for (const [, ext, type] of block.matchAll(/^\s*(\w+): '([^']+)'/gm)) {
    map[ext!] = type!
  }
  return map
}

describe('static-server / sw-timemachine MIME maps', () => {
  it('the static server covers every extension the service worker knows', () => {
    const tm = tmTypes()
    expect(Object.keys(tm).length).toBeGreaterThan(15)
    for (const ext of Object.keys(tm)) {
      expect(TYPES[`.${ext}`], `.${ext} missing from static-server TYPES`).toBeDefined()
    }
  })

  it('both maps agree on the types the build actually ships', () => {
    const tm = tmTypes()
    for (const ext of ['webmanifest', 'webm', 'mp4', 'wasm', 'woff2', 'png', 'svg', 'html']) {
      expect(TYPES[`.${ext}`], `.${ext} missing from static-server TYPES`).toBeDefined()
      expect(tm[ext], `${ext} missing from TM_TYPES`).toBeDefined()
      // charset suffixes may differ; the base MIME type must match
      expect(TYPES[`.${ext}`]!.split(';')[0]).toBe(tm[ext]!.split(';')[0])
    }
  })
})
