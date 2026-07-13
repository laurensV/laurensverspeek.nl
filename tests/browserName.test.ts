import { describe, it, expect } from 'vitest'
import { browserName } from '../app/utils/browserName'

// representative UA fragments (real strings all carry "Chrome/" in the Chromium
// family, which is exactly why branch order matters)
const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const EDGE = `${CHROME} Edg/120.0.0.0`
const OPERA = `${CHROME} OPR/106.0.0.0`
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

describe('browserName', () => {
  it('detects the major browsers', () => {
    expect(browserName(CHROME)).toBe('Chrome')
    expect(browserName(FIREFOX)).toBe('Firefox')
    expect(browserName(SAFARI)).toBe('Safari')
  })

  it('picks Edge and Opera before Chrome despite their Chrome/ token', () => {
    expect(browserName(EDGE)).toBe('Edge')
    // the divergence this helper unifies: Opera used to be mislabelled Chrome
    expect(browserName(OPERA)).toBe('Opera')
  })

  it('falls back for anything unrecognised', () => {
    expect(browserName('Some/1.0 unknown agent')).toBe('an exotic browser')
  })
})
