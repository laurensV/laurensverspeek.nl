// One static file server for the generated site, shared by the E2E server
// (serve-static.mjs) and the resume PDF step (generate-resume.mjs). Serves a
// directory with GitHub Pages' clean-URL behavior and a 200.html SPA fallback.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

// keep in sync with TM_TYPES in public/sw-timemachine.js —
// tests/staticServerTypes.test.ts asserts the two maps can't drift
/** @type {Record<string, string>} */
export const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.vcf': 'text/vcard; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  // without this the SQLite content engine can't streaming-compile and falls
  // back to slower ArrayBuffer instantiation on every e2e run
  '.wasm': 'application/wasm',
  // the build ships these (PWA manifest, project hover videos) — they were
  // served as application/octet-stream in e2e/local runs
  '.webmanifest': 'application/manifest+json',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4'
}

/** @param {string} path @returns {Promise<string | null>} */
const tryFile = async (path) => {
  try {
    const s = await stat(path)
    if (s.isFile()) return path
    if (s.isDirectory()) return tryFile(join(path, 'index.html'))
  } catch { /* not found */ }
  return null
}

/** @param {string} root the directory to serve */
export function createStaticServer(root) {
  return createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    const candidate = join(root, url)

    // resolve the file, or fall back through index.html → 200.html SPA shell.
    // Extensionless paths also try `<path>.html` — GitHub Pages' clean-URL
    // behavior, which the service worker's precache manifest relies on.
    let file = await tryFile(candidate)
    if (!file && !extname(url)) file = await tryFile(join(candidate, 'index.html'))
    if (!file && !extname(url)) file = await tryFile(`${candidate}.html`)
    if (!file) file = join(root, '200.html')

    try {
      const body = await readFile(file)
      res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream')
      res.end(body)
    } catch {
      res.statusCode = 404
      res.end('not found')
    }
  })
}
