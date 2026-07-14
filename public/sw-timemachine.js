/* eslint-disable */
/*
 * lvOS Time Machine — service-worker half.
 *
 * This file is IMPORTED into the site's existing Workbox service worker
 * (nuxt.config.ts → pwa.workbox.importScripts), so there is only ever one SW
 * controlling the origin. It stays completely dormant during normal browsing:
 * the fetch listener returns without touching the event unless you are actively
 * "time-travelling", so the PWA's offline behaviour is untouched.
 *
 * When travelling, every same-origin GET is answered from a past *build* of this
 * very site, pulled from jsDelivr by its gh-pages commit SHA and cached. Because
 * we map by pathname, the old build's absolute asset/link URLs (/_nuxt/…, /blog)
 * resolve straight into the snapshot with zero rewriting — you get the real old
 * site, links and all. An overlay bar is injected into every page so you can
 * always return to the present, even if the old build's own JS is broken.
 *
 * The source repo the builds are mirrored from (public → jsDelivr has CORS):
 */
const TM_REPO = 'laurensV/laurensverspeek.nl'
const cdnUrl = (sha, path) => `https://cdn.jsdelivr.net/gh/${TM_REPO}@${sha}${path}`

// current travel target, or null when in the present. Kept in memory for a
// synchronous fetch-handler decision, and mirrored to a cache so it survives the
// SW being killed and restarted mid-visit.
let TM = null

const TM_STATE_CACHE = 'tm-state'
const TM_STATE_KEY = 'https://time-machine.local/state'
const snapCache = (sha) => 'tm-snap-' + sha

// SW machinery that must always come from the LIVE origin, never a snapshot —
// otherwise the SW could never update itself out of a bad old build.
const TM_EXCLUDE = /^\/(sw\.js|sw-timemachine\.js|workbox-[^/]+\.js|registerSW\.js|manifest\.webmanifest|favicon\.ico)$/

async function tmPersist(state) {
  try {
    const cache = await caches.open(TM_STATE_CACHE)
    if (state) await cache.put(TM_STATE_KEY, new Response(JSON.stringify(state)))
    else await cache.delete(TM_STATE_KEY)
  } catch {}
}

async function tmRestore() {
  try {
    const cache = await caches.open(TM_STATE_CACHE)
    const res = await cache.match(TM_STATE_KEY)
    if (res) TM = await res.json()
  } catch {}
}
// best-effort restore on (re)start; a fetch that races ahead of this simply
// falls back to the present for that one request, which is safe.
tmRestore()

const TM_TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
  map: 'application/json',
  wasm: 'application/wasm',
  webmanifest: 'application/manifest+json'
}
const tmContentType = (path) => {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase()
  return ext ? TM_TYPES[ext] : undefined
}

// A path → the snapshot file(s) to try. Navigations resolve to the matching
// static HTML file the way GitHub Pages would (/about → /about/index.html), with
// a couple of fallbacks; assets map 1:1.
function tmCandidates(pathname, isNav) {
  if (!isNav) return [pathname]
  if (pathname === '/') return ['/index.html']
  if (pathname.endsWith('/')) return [pathname + 'index.html', '/404.html']
  if (!/\.[a-z0-9]+$/i.test(pathname)) return [pathname + '/index.html', pathname + '.html', '/404.html']
  return [pathname, '/404.html']
}

function tmOverlay(html, state) {
  const date = (state.date || '').replace(/[<>&"]/g, '')
  const short = (state.sha || '').slice(0, 7)
  const bar =
    '<div id="__tm_bar" role="status" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;' +
    'display:flex;gap:.75rem;align-items:center;justify-content:center;flex-wrap:wrap;' +
    'padding:.5rem .9rem;background:#101014;color:#f5f5f7;border-top:2px solid #ffba00;' +
    "font:600 13px/1.4 'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;" +
    'box-shadow:0 -6px 24px rgba(0,0,0,.35);pointer-events:auto;">' +
    '<span style="opacity:.92">⏱ time machine — viewing this site as it was on ' +
    '<b style="color:#ffba00">' + date + '</b> <span style="opacity:.5">· ' + short + '</span></span>' +
    '<a href="/?__tm_exit=1" style="color:#101014;background:#ffba00;text-decoration:none;' +
    'padding:.28rem .7rem;border-radius:999px;font-weight:700;white-space:nowrap;">↩ return to the present</a>' +
    '</div>'
  if (html.includes('</body>')) return html.replace('</body>', bar + '</body>')
  if (html.includes('</html>')) return html.replace('</html>', bar + '</html>')
  return html + bar
}

async function tmFetchInto(cache, sha, path) {
  const url = cdnUrl(sha, path)
  let res = await cache.match(url)
  if (res) return res
  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch {
    return null
  }
  if (res && res.ok) {
    try { await cache.put(url, res.clone()) } catch {}
    return res
  }
  return null
}

async function tmServe(request, url, state) {
  const isNav = request.mode === 'navigate'
  const cache = await caches.open(snapCache(state.sha))
  for (const path of tmCandidates(url.pathname, isNav)) {
    const res = await tmFetchInto(cache, state.sha, path)
    if (!res) continue
    if (isNav || /\.html$/i.test(path)) {
      const html = tmOverlay(await res.text(), state)
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    const headers = new Headers(res.headers)
    const type = tmContentType(path)
    if (type) headers.set('content-type', type)
    headers.delete('content-security-policy')
    return new Response(res.body, { status: 200, headers })
  }
  if (isNav) {
    return new Response(
      tmOverlay('<!doctype html><meta charset=utf-8><title>not in this snapshot</title>' +
        '<body style="background:#101014;color:#f5f5f7;font-family:monospace;padding:3rem;text-align:center">' +
        '<h1>404 — that page did not exist yet</h1><p>This path was not part of the site on this date.</p></body>', state),
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }
  return new Response('', { status: 404 })
}

async function tmExit() {
  TM = null
  await tmPersist(null)
  return Response.redirect('/', 302)
}

// Nuke the Time Machine entirely (the escape hatch of last resort): drop all its
// caches and unregister the SW, then land on a clean present.
async function tmKill() {
  TM = null
  try {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k === TM_STATE_CACHE || k.startsWith('tm-snap-')).map((k) => caches.delete(k)))
  } catch {}
  try { await self.registration.unregister() } catch {}
  return Response.redirect('/', 302)
}

self.addEventListener('message', (event) => {
  const data = event.data || {}
  const port = event.ports && event.ports[0]
  const reply = (msg) => { if (port) port.postMessage(msg) }
  if (data.type === 'tm-travel' && data.sha) {
    TM = { sha: data.sha, date: data.date || '', source: data.source || '', subject: data.subject || '' }
    event.waitUntil(tmPersist(TM).then(() => reply({ ok: true, active: TM })))
  } else if (data.type === 'tm-return') {
    TM = null
    event.waitUntil(tmPersist(null).then(() => reply({ ok: true, active: null })))
  } else if (data.type === 'tm-status') {
    reply({ ok: true, active: TM })
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  let url
  try { url = new URL(request.url) } catch { return }
  if (url.origin !== self.location.origin) return

  // controls work whether or not we're currently travelling
  if (url.searchParams.has('notimemachine')) {
    event.stopImmediatePropagation()
    event.respondWith(tmKill())
    return
  }
  if (url.searchParams.has('__tm_exit')) {
    event.stopImmediatePropagation()
    event.respondWith(tmExit())
    return
  }

  // the common path: not travelling → hands off entirely to Workbox
  if (!TM) return
  if (TM_EXCLUDE.test(url.pathname)) return

  // claim the event so Workbox's listener (registered after this import) won't
  // also try to respond, then serve the request from the frozen snapshot
  const state = TM
  event.stopImmediatePropagation()
  event.respondWith(tmServe(request, url, state))
})
