import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { profile } from '~/data/profile'
import { pgp } from '~/data/pgp'
import { writeFileAt } from '~/utils/terminal/filesystem'

// Network-flavored commands: some real (curl), some theater (ping, telnet).

export function createNetCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error } = ctx

  // captured at factory time (valid Nuxt context): the chat room feed is the
  // SAME shared state the lvOS chat app renders
  const cursorsWs = useRuntimeConfig().public.cursorsWs
  const chatRoom = useChat()
  const { name: identityName } = useIdentity()

  return {
    chat: {
      description: 'The visitor chat room (same #lounge as the lvOS chat app)',
      exec: () => {
        if (!cursorsWs) {
          muted('chat needs the live relay — no relay on this build. just you and the machines today.')
          return
        }
        muted('joining #lounge... enter sends, esc leaves.')
        return import('~/utils/games/chatRoom').then(({ createChatRoom }) =>
          ctx.startGame((callbacks) => createChatRoom({ chat: chatRoom, playerName: identityName.value }, callbacks), 'chat'))
      }
    },
    pair: {
      usage: 'pair [join <code> | allow | revoke | status | stop]',
      description: 'Pair terminal: share this shell live, or watch a friend\'s',
      examples: [
        'pair            # host: start sharing, get a 4-char code',
        'pair join AB2C  # guest: watch that session live',
        'pair allow      # host: let guests type on your shell',
        'pair revoke     # host: take the keyboard back',
        'pair status     # code, watchers, keyboard state',
        'pair stop       # end the session'
      ],
      argCandidates: () => ['join', 'allow', 'revoke', 'status', 'stop'],
      exec: (args) => {
        if (!cursorsWs) {
          muted('pair needs the live relay — no relay on this build. just you and the machines today.')
          return
        }
        const sub = (args[0] ?? '').toLowerCase()
        if (sub === 'join') {
          const code = (args[1] ?? '').toUpperCase()
          if (!/^[A-Z0-9]{4}$/.test(code)) return error('pair: usage: pair join <CODE> (the 4 characters the host is looking at)')
          muted(`joining pair session ${code}... esc leaves.`)
          return import('~/utils/games/pairWatch').then(({ createPairWatch }) =>
            ctx.startGame((callbacks) => createPairWatch({ code, cursorsWs, playerName: identityName.value }, callbacks), 'pair'))
        }
        return import('~/utils/terminal/pairShare').then(({ createPairHost, activePairHost }) => {
          const host = activePairHost()
          if (sub === 'allow' || sub === 'revoke') {
            if (!host) return error(`pair: not hosting — start with 'pair' first`)
            host.allow(sub === 'allow')
            muted(sub === 'allow'
              ? `pair: guests may type on this shell now — 'pair revoke' takes it back`
              : 'pair: keyboard revoked — guests are watch-only again')
            return
          }
          if (sub === 'stop') {
            if (!host) return error('pair: not hosting')
            host.stop()
            return
          }
          if (sub === 'status') {
            if (!host) return muted(`pair: not hosting — 'pair' starts a session, 'pair join <CODE>' watches one`)
            out(`pair session ${host.code.value || '(waiting for a code)'} — ${host.watchers.value} watching · keyboard ${host.granted.value ? 'granted' : 'view-only'}`)
            return
          }
          if (sub) return error(`pair: unknown subcommand '${sub}' — try 'pair', 'pair join <CODE>', 'pair allow', 'pair stop'`)
          if (host) {
            out(`pair: already hosting — code ${host.code.value || '(waiting for a code)'}, ${host.watchers.value} watching. 'pair stop' ends it.`)
            return
          }
          muted('starting pair session...')
          createPairHost({
            lines: ctx.lines,
            run: ctx.run,
            cursorsWs,
            onEvent: (text, style = 'muted') => push(style, text)
          })
        })
      }
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
        const stopSpin = ctx.spin(`waiting for ${url.host} ...`)
        return fetch(url.toString(), {
          headers: { accept: 'text/plain, application/json, */*' },
          // a host that accepts the connection but never answers must not spin forever
          signal: AbortSignal.timeout(10_000)
        })
          .then(async (res) => {
            push('primary', `HTTP ${res.status} ${res.statusText}`.trim())
            const type = res.headers.get('content-type') ?? ''
            out(`content-type: ${type || 'unknown'}`)
            out('')
            const body = await res.text()
            let text = body
            if (type.includes('application/json')) {
              // a mislabeled or truncated JSON body still arrived fine — print it
              // raw rather than blaming the network
              try {
                text = JSON.stringify(JSON.parse(body), null, 2)
              } catch { /* keep the raw body */ }
            }
            text.split('\n').slice(0, 40).forEach(out)
            if (text.split('\n').length > 40) muted('… (truncated)')
          })
          .catch((err: unknown) => error(err instanceof DOMException && err.name === 'TimeoutError'
            ? `curl: (28) connection to ${url.host} timed out after 10s`
            : `curl: (7) couldn't reach ${url.host} — it may block cross-origin requests`))
          .finally(stopSpin)
      }
    },
    wget: {
      usage: 'wget [-O <file>] <url>',
      description: 'Download a URL into the filesystem (CORS permitting)',
      examples: ['wget https://api.github.com/zen', 'wget -O zen.json https://api.github.com/zen'],
      exec: (args) => {
        const oIndex = args.indexOf('-O')
        const nameArg = oIndex >= 0 ? args[oIndex + 1] : undefined
        if (oIndex >= 0 && !nameArg) return error('wget: option requires an argument -- O')
        const raw = args.find((arg, i) => !arg.startsWith('-') && i !== oIndex + 1)
        if (!raw) return error(`wget: missing URL — try 'wget https://api.github.com/zen'`)
        let url: URL
        try {
          url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`)
        } catch {
          return error(`wget: unable to resolve host address '${raw}'`)
        }
        const filename = nameArg ?? url.pathname.split('/').filter(Boolean).at(-1) ?? 'index.html'
        muted(`--${new Date().toISOString().slice(0, 19).replace('T', ' ')}--  ${url.toString()}`)
        muted(`Resolving ${url.host}... connected.`)
        const stopSpin = ctx.spin(`HTTP request sent, awaiting response ...`)
        // same discipline as curl: hard timeout, and a size cap because the VFS
        // lives in localStorage — a big download would eat the whole quota
        const MAX_BYTES = 64 * 1024
        return fetch(url.toString(), {
          headers: { accept: 'text/plain, application/json, */*' },
          signal: AbortSignal.timeout(10_000)
        })
          .then(async (res) => {
            out(`HTTP request sent, awaiting response... ${res.status} ${res.statusText}`.trim())
            if (!res.ok) return error(`wget: server returned error: HTTP ${res.status}`)
            const type = (res.headers.get('content-type') ?? '').split(';')[0]
            const body = await res.text()
            const clipped = body.length > MAX_BYTES
            const content = clipped ? body.slice(0, MAX_BYTES) : body
            out(`Length: ${body.length}${type ? ` [${type}]` : ''}`)
            out(`Saving to: '${filename}'`)
            const written = writeFileAt(ctx.files.value, ctx.fsCwd.value, filename, content)
            if ('error' in written) return error(`wget: ${written.error}`)
            ctx.files.value = written.files
            out('')
            out(`'${filename}' saved [${content.length}${clipped ? ` of ${body.length} — clipped to 64K` : ''}]`)
            muted(`(it's a real file now — try 'cat ${filename}')`)
          })
          .catch((err: unknown) => error(err instanceof DOMException && err.name === 'TimeoutError'
            ? `wget: connection to ${url.host} timed out after 10s`
            : `wget: unable to reach ${url.host} — it may block cross-origin requests`))
          .finally(stopSpin)
      }
    },
    telnet: {
      hidden: true,
      usage: 'telnet <host>',
      description: 'The classic ASCII Star Wars, on the classic host',
      examples: ['telnet towel.blinkenlights.nl'],
      argCandidates: () => ['towel.blinkenlights.nl'],
      exec: (args) => {
        const host = args[0]
        if (!host) {
          error('telnet: usage: telnet <host>')
          return
        }
        if (host.toLowerCase() !== 'towel.blinkenlights.nl') {
          error(`telnet: could not resolve ${host}: only one host still speaks telnet around here`)
          muted('(hint: the towel one)')
          return
        }
        muted(`Trying 176.9.9.172...`)
        muted(`Connected to ${host}. Escape character is 'q'.`)
        // the film's frames are heavy — fetch them only when someone dials in
        return import('~/utils/games/starwars').then(({ createStarwarsGame }) => ctx.startGame(createStarwarsGame, 'telnet'))
      }
    },
    gpg: {
      hidden: true,
      usage: 'gpg [--list-keys | --import]',
      description: 'Show or import my PGP key (when one is published)',
      examples: ['gpg --list-keys', 'gpg --import'],
      exec: (args) => {
        if (!pgp.publicKey) {
          muted(`gpg: keybox '~/.gnupg/pubring.kbx' created`)
          out('gpg: no public key published on this build (yet)')
          return
        }
        if (args.includes('--import')) {
          // actually "import" the published key — the same one /pgp.txt serves
          const keyid = pgp.fingerprint.replace(/\s+/g, '').slice(-16)
          muted(`gpg: keybox '~/.gnupg/pubring.kbx' created`)
          out(`gpg: key ${keyid}: public key "${profile.name} <${profile.email}>" imported`)
          out('gpg: Total number processed: 1')
          out('gpg:               imported: 1')
          return
        }
        out(`pub   ${pgp.fingerprint}`)
        out(`uid   ${profile.name} <${profile.email}>`)
        ctx.link('the armored key lives at /pgp.txt', '/pgp.txt')
      }
    }
  }
}
