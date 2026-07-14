import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { formatGitLog, formatGitShow, findCommit, type GitCommit } from '~/utils/terminal/gitLog'
import { runJq } from '~/utils/terminal/jq'
import { buildJsonResume } from '~/utils/resume'
import { bugReportUrl } from '~/utils/bugReport'
import { shellError } from '~/utils/terminal/errors'
import { hexToRgb, rgbToHsl } from '~/utils/color'
import { writeClipboard } from '~/utils/clipboard'
import { escapeHtml } from '~/utils/escapeHtml'
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'

// the JSON documents `jq` can read by name — the site's own data, live
const JQ_SOURCES: Record<string, () => unknown> = {
  resume: () => buildJsonResume(),
  profile: () => profile,
  projects: () => projects.map((p) => ({ slug: p.slug, title: p.title, category: p.category, tech: p.tech, year: p.year }))
}
// strip one pair of matching surrounding quotes (args aren't dequoted upstream)
const dequote = (s: string) =>
  s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))
    ? s.slice(1, -1)
    : s

// Appearance, session theater and the other one-offs: theme, fonts, git, ssh.

// the baked commit history (/git-log.json is prerendered at generate time),
// fetched once and shared by every terminal instance
let gitHistory: GitCommit[] | null = null
const loadGitHistory = async (): Promise<GitCommit[]> => {
  // timeout so a stalled (never-rejecting) request can't wedge the serialized run
  // queue, matching every other terminal $fetch (stats/github/weather/curl)
  if (!gitHistory) gitHistory = await $fetch<GitCommit[]>('/git-log.json', { timeout: 10_000 })
  return gitHistory
}

export function createMiscCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, link } = ctx

  // captured at factory time (valid Nuxt context); command handlers run outside it.
  // Set by the ssh easter egg; the prompt's host segment follows it.
  const sshHost = useState(STATE_KEYS.terminalSshHost, () => '')
  const fontScale = useTermFontScale()
  // the SAME inbox the lvOS mail app renders — reading here clears its badge
  const lvosMail = useLvosMail()
  // the one real volume: taskbar tray, media app and this command share it
  const sound = useVolume()
  // the same wallpaper the lvOS start menu, BIOS and Settings set
  const paper = useWallpaper()
  // the warm-wash night light, shared with Settings/BIOS/Displays
  const nightLight = useNightLight()
  // which idle screensaver the desktop drifts into, shared with Settings/BIOS
  const screensaver = useScreensaverChoice()
  // the manual "reduce motion" switch, shared with the Settings accessibility row
  const motion = useReduceMotion()
  const keyClick = useKeyClick()
  // the same rolling copy history the lvOS Clipboard app shows
  const clipboard = useClipboardHistory()
  // captured at factory time for the `bug` command's issue context
  const buildHash = useRuntimeConfig().public.buildHash
  // the console-hunt win, shared with the devtools plugin that unlocks `backstage`
  const huntSolved = useState<boolean>(STATE_KEYS.huntSolved, () => false)

  return {
    mail: {
      category: 'content',
      usage: 'mail [n]',
      description: 'Read your inbox (shared with the lvOS mail app)',
      examples: ['mail', 'mail 3'],
      argCandidates: () => lvosMail.mails.value.map((_, index) => String(index + 1)),
      exec: (args) => {
        const inbox = lvosMail.mails.value
        const pick = args[0]
        if (!pick) {
          push('primary', `Inbox for you@${profile.domain} — ${lvosMail.unread.value} unread`)
          inbox.forEach((mail, index) => {
            const flag = lvosMail.read.value.has(mail.id) ? ' ' : 'N'
            out(`${flag} ${index + 1}  ${mail.from.padEnd(20)} ${mail.subject}`)
          })
          muted(`'mail <n>' reads a message ('N' = new — same inbox as the lvOS mail app)`)
          return
        }
        const mail = inbox[Number(pick) - 1]
        if (!mail) return error(`mail: no message ${pick} (you have ${inbox.length})`)
        lvosMail.markRead(mail.id)
        push('primary', `From: ${mail.from} <${mail.address}>`)
        out(`Subject: ${mail.subject}`)
        out(`Date: ${mail.date}`)
        out('')
        mail.body.forEach(out)
      }
    },
    theme: {
      category: 'system',
      usage: 'theme <dark|light|system>',
      description: 'Change the color theme',
      examples: ['theme dark', 'theme system'],
      argCandidates: () => ['dark', 'light', 'system'],
      exec: (args) => {
        const value = args[0]?.toLowerCase()
        if (!value || !['dark', 'light', 'system'].includes(value)) {
          out(`Current theme: ${ctx.colorMode.preference}`)
          muted('Usage: theme <dark|light|system>')
          return
        }
        ctx.colorMode.preference = value
        out(`Theme set to ${value}.`)
      }
    },
    colorscheme: {
      category: 'system',
      usage: 'colorscheme <name|#hex|h s l>',
      description: `Change the accent color (${ctx.accent.names.join(', ')}, or any hex)`,
      examples: ['colorscheme emerald', 'colorscheme #ff3e88', 'colorscheme 320 80 60'],
      argCandidates: () => ctx.accent.names,
      exec: (args) => {
        const raw = args[0]
        if (!raw) {
          out(`Current accent: ${ctx.accent.current.value}`)
          muted(`Available: ${ctx.accent.names.join(', ')} — or a custom #hex / h s l`)
          return
        }
        // a custom hex, reaching the same applyCustom the lvOS colour picker uses
        const rgb = hexToRgb(raw)
        if (rgb) {
          const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
          ctx.accent.applyCustom(h, s, l)
          out(`Accent set to ${raw.startsWith('#') ? raw : `#${raw}`}.`)
          return
        }
        // a custom HSL triple: colorscheme 320 80 60
        if (args.length >= 3 && args.slice(0, 3).every(a => /^\d+$/.test(a))) {
          const [h, s, l] = args.slice(0, 3).map(Number)
          ctx.accent.applyCustom(
            Math.min(360, h!), Math.min(100, s!), Math.min(100, l!)
          )
          out(`Accent set to hsl(${Math.min(360, h!)}, ${Math.min(100, s!)}%, ${Math.min(100, l!)}%).`)
          return
        }
        if (ctx.accent.set(raw.toLowerCase())) out(`Accent set to ${raw.toLowerCase()}.`)
        else error(`colorscheme: unknown accent '${raw}'. Try a name (${ctx.accent.names.join(', ')}) or a hex like #ff3e88.`)
      }
    },
    fontsize: {
      category: 'system',
      usage: 'fontsize [0.7–1.6|+|-|reset]',
      description: 'Scale the terminal text (also ctrl+= / ctrl+-)',
      argCandidates: () => ['+', '-', 'reset'],
      exec: (args) => {
        const arg = args[0]
        if (!arg) {
          out(`current scale: ${fontScale.scale.value}× — try 'fontsize 1.2', '+', '-' or 'reset'`)
          return
        }
        if (arg === '+') fontScale.bump(0.1)
        else if (arg === '-') fontScale.bump(-0.1)
        else if (arg === 'reset') fontScale.set(1)
        else {
          const value = Number(arg)
          if (!Number.isFinite(value)) return error(`fontsize: not a number: ${arg}`)
          fontScale.set(value)
        }
        out(`font scale: ${fontScale.scale.value}×`)
      }
    },
    volume: {
      category: 'system',
      usage: 'volume [0–100|mute|unmute]',
      description: 'Set the sound volume (same one as the lvOS tray)',
      examples: ['volume', 'volume 40', 'volume mute'],
      argCandidates: () => ['mute', 'unmute'],
      exec: (args) => {
        const gauge = () => {
          const filled = Math.round(sound.volume.value / 10)
          const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
          return `[${bar}] ${sound.volume.value}%${sound.muted.value ? ' (muted)' : ''}`
        }
        const arg = args[0]?.toLowerCase()
        if (!arg) {
          out(`volume ${gauge()}`)
          muted(`'volume <0–100>' sets it, 'volume mute' silences the chiptunes`)
          return
        }
        if (arg === 'mute') {
          sound.muted.value = true
          return out(`volume ${gauge()}`)
        }
        if (arg === 'unmute') {
          sound.muted.value = false
          return out(`volume ${gauge()}`)
        }
        const value = Number(arg)
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          return error(`volume: give me 0–100, 'mute' or 'unmute'`)
        }
        sound.volume.value = Math.round(value)
        if (sound.volume.value > 0) sound.muted.value = false
        out(`volume ${gauge()}`)
      }
    },
    wallpaper: {
      category: 'system',
      usage: 'wallpaper [next|<n>]',
      description: 'Change the lvOS desktop wallpaper (same one as Settings)',
      examples: ['wallpaper', 'wallpaper next', 'wallpaper 2'],
      argCandidates: () => ['next', ...paper.wallpapers.value.map((_, i) => String(i))],
      exec: (args) => {
        const arg = args[0]?.toLowerCase()
        if (!arg || arg === 'list') {
          paper.wallpapers.value.forEach((p, i) =>
            out(`${i === paper.wallpaper.value ? '›' : ' '} ${i}  ${p.name}`))
          muted(`'wallpaper next' cycles, 'wallpaper <n>' picks one`)
          return
        }
        if (arg === 'next') return out(`wallpaper: ${paper.cycleWallpaper()}`)
        const n = Number(arg)
        if (!Number.isInteger(n) || n < 0 || n >= paper.wallpapers.value.length) {
          return error(`wallpaper: no such wallpaper '${args[0]}' — try next or 0–${paper.wallpapers.value.length - 1}`)
        }
        paper.wallpaper.value = n
        out(`wallpaper: ${paper.wallpapers.value[n]!.name}`)
      }
    },
    screensaver: {
      category: 'system',
      usage: 'screensaver [starfield|toasters|mystify]',
      description: 'Pick the idle screensaver (same one as Settings)',
      argCandidates: () => [...screensaver.saverIds],
      exec: (args) => {
        const arg = args[0]?.toLowerCase()
        if (!arg) {
          out(`screensaver: ${screensaver.saverNames[screensaver.saver.value]}`)
          muted(`available: ${screensaver.saverIds.map((id) => screensaver.saverNames[id]).join(', ')} — drifts in after 45s idle on the desktop`)
          return
        }
        const match = screensaver.saverIds.find((id) => id === arg)
        if (!match) return error(`screensaver: unknown saver '${args[0]}' — try ${screensaver.saverIds.join(', ')}`)
        screensaver.saver.value = match
        out(`screensaver: ${screensaver.saverNames[match]}`)
      }
    },
    nightlight: {
      category: 'system',
      usage: 'nightlight [on|off|<0–100>]',
      description: 'Toggle the lvOS warm night-light wash, or set its warmth',
      examples: ['nightlight', 'nightlight on', 'nightlight 60'],
      argCandidates: () => ['on', 'off'],
      exec: (args) => {
        const arg = args[0]?.toLowerCase()
        if (arg === 'on') nightLight.enabled.value = true
        else if (arg === 'off') nightLight.enabled.value = false
        else if (!arg) nightLight.enabled.value = !nightLight.enabled.value
        else {
          // a number sets the warmth (and switches the wash on)
          const warmth = Number(arg)
          if (!Number.isFinite(warmth) || warmth < 0 || warmth > 100) {
            return error(`nightlight: expected on, off or 0–100, got '${args[0]}'`)
          }
          nightLight.warmth.value = Math.round(warmth)
          nightLight.enabled.value = true
        }
        out(`night light ${nightLight.enabled.value ? 'on' : 'off'} (warmth ${nightLight.warmth.value}%)`)
      }
    },
    reducemotion: {
      category: 'system',
      usage: 'reducemotion [on|off]',
      description: 'Toggle the reduce-motion switch (same one as Settings)',
      examples: ['reducemotion', 'reducemotion on'],
      argCandidates: () => ['on', 'off'],
      exec: (args) => {
        const arg = args[0]?.toLowerCase()
        if (arg === 'on') motion.enabled.value = true
        else if (arg === 'off') motion.enabled.value = false
        else if (!arg) motion.enabled.value = !motion.enabled.value
        else return error(`reducemotion: expected on or off, got '${args[0]}'`)
        out(`reduce motion ${motion.enabled.value ? 'on' : 'off'}`)
        muted('flattens every animation site-wide, on top of your OS setting')
      }
    },
    keyclick: {
      category: 'system',
      usage: 'keyclick [on|off]',
      description: 'Toggle mechanical-keyboard typing sounds (terminal and lvOS text fields)',
      examples: ['keyclick', 'keyclick on'],
      argCandidates: () => ['on', 'off'],
      exec: (args) => {
        const arg = args[0]?.toLowerCase()
        if (arg === 'on') keyClick.toggle(true)
        else if (arg === 'off') keyClick.toggle(false)
        else if (!arg) keyClick.toggle()
        else return error(`keyclick: expected on or off, got '${args[0]}'`)
        out(`keyclick ${keyClick.enabled.value ? 'on' : 'off'}`)
        muted('a subtle tick per keystroke, through the shared volume (silent when muted)')
      }
    },
    clip: {
      category: 'system',
      usage: 'clip [n]',
      description: 'Show the clipboard history (shared with the lvOS Clipboard app), or re-copy entry n',
      examples: ['clip', 'clip 2'],
      argCandidates: () => clipboard.items.value.map((_, index) => String(index + 1)),
      exec: async (args) => {
        const items = clipboard.items.value
        if (!items.length) {
          muted('clipboard: nothing copied yet — pipe something through `| copy` first')
          return
        }
        const pick = args[0]
        if (pick) {
          const n = Number(pick)
          const entry = Number.isInteger(n) && n >= 1 && n <= items.length ? items[n - 1] : undefined
          if (!entry) return error(`clip: no entry ${pick} — run 'clip' to list (1–${items.length})`)
          const ok = await writeClipboard(entry.text)
          if (ok) out(`copied entry ${n} to the clipboard`)
          else error('clip: the clipboard said no')
          return
        }
        push('primary', 'clipboard history — newest first')
        items.forEach((entry, index) => {
          // clipboard text is user-derived, so escape it before out() (v-html)
          const oneLine = entry.text.replace(/\s+/g, ' ').trim()
          const preview = oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine
          out(`  ${String(index + 1).padStart(2)}  ${escapeHtml(preview)}`)
        })
        muted('`clip <n>` copies an entry again')
      }
    },
    clipboard: {
      category: 'system',
      hidden: true,
      description: 'Alias for clip',
      exec: (args) => ctx.getCommands().clip!.exec(args)
    },
    settings: {
      category: 'system',
      description: 'Show every appearance, sound and accessibility setting at a glance',
      exec: () => {
        push('primary', 'lvOS settings — the live state every surface shares')
        const row = (label: string, value: string) => out(`  ${label.padEnd(14)} ${value}`)
        row('theme', ctx.colorMode.preference)
        row('accent', ctx.accent.current.value)
        row('volume', sound.muted.value ? `${sound.volume.value}% (muted)` : `${sound.volume.value}%`)
        row('wallpaper', paper.wallpapers.value[paper.wallpaper.value]?.name ?? '—')
        row('screensaver', screensaver.saverNames[screensaver.saver.value])
        row('night light', nightLight.enabled.value ? `on (warmth ${nightLight.warmth.value}%)` : 'off')
        row('reduce motion', motion.enabled.value ? 'on' : 'off')
        row('keyclick', keyClick.enabled.value ? 'on' : 'off')
        muted('change any of these here (theme/colorscheme/volume/wallpaper/screensaver/nightlight/reducemotion/keyclick) or in lvOS Settings')
      }
    },
    reboot: {
      category: 'system',
      description: 'Replay the boot sequence',
      exec: () => {
        out('Rebooting...')
        setTimeout(() => {
          ctx.isOpen.value = false
          ctx.effects.bootReplay.value = true
        }, 400)
      }
    },
    bug: {
      category: 'system',
      description: 'Report a bug — opens a prefilled GitHub issue',
      exec: () => {
        const url = bugReportUrl({
          page: window.location.pathname,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          version: buildHash,
          userAgent: navigator.userAgent
        })
        out('Found a bug? Opening a prefilled issue on GitHub...')
        muted('the page, viewport and build hash are filled in for you — just describe what broke.')
        window.open(url, '_blank', 'noopener')
      }
    },
    git: {
      usage: 'git <log|show|status>',
      description: "This site's real commit history",
      examples: [
        'git log            recent commits, baked in at build time',
        'git log --oneline  the compact version (pipes well into grep)',
        'git log -n 5       only the last five',
        'git show <hash>    one commit with its file diffstat',
        'git status         you can guess'
      ],
      argCandidates: () => ['log', 'show', 'status', 'blame', 'push'],
      exec: async (args) => {
        const [sub, ...rest] = args
        switch (sub) {
          case undefined:
            out('usage: git <log|show|status|blame|push>')
            muted("this is the real history of this website's repository")
            return
          case 'status':
            out('On branch main')
            out("Your branch is up to date with 'origin/main'.")
            out('')
            out('nothing to commit, working tree clean')
            muted('(the site you are looking at ships as static files — nothing to commit here)')
            return
          case 'blame':
            out('It was laurens. It is always laurens.')
            return
          case 'push':
            error('remote: Permission denied — nice try though.')
            return
          case 'log': {
            const commits = await loadGitHistory().catch(() => null)
            if (!commits) return error('git: could not load the commit history')
            const oneline = rest.includes('--oneline')
            const flagIndex = rest.indexOf('-n')
            const limit = oneline
              ? undefined
              : flagIndex >= 0 ? (Number(rest[flagIndex + 1]) || 15) : 15
            for (const line of formatGitLog(commits, { oneline, limit })) push(line.type, line.text, line.html)
            return
          }
          case 'show': {
            const commits = await loadGitHistory().catch(() => null)
            if (!commits) return error('git: could not load the commit history')
            const commit = findCommit(commits, rest[0] ?? '')
            if (!commit) return error(`fatal: bad revision '${rest[0] ?? ''}'`)
            for (const line of formatGitShow(commit)) push(line.type, line.text, line.html)
            return
          }
          default:
            error(`git: '${sub}' is not a git command. See 'man git'.`)
        }
      }
    },
    jq: {
      category: 'content',
      usage: "jq '<filter>' <resume|profile|projects>",
      description: "Query the site's own JSON (a small jq subset)",
      examples: [
        "jq '.basics.name' resume",
        "jq '.work[].name' resume",
        'jq keys profile',
        "jq '.[].title' projects",
        'curl -s https://laurensverspeek.nl/resume.json | jq .basics'
      ],
      argCandidates: () => [...Object.keys(JQ_SOURCES), '.', 'keys', 'length', 'type'],
      exec: (args) => {
        if (args.length === 0) {
          out('usage: jq \'<filter>\' <source>')
          muted(`sources: ${Object.keys(JQ_SOURCES).join(', ')} — or pipe JSON in: curl -s <url> | jq '.x'`)
          return
        }
        // the source is whichever arg names a known document; the rest is the filter
        const sourceName = [...args].reverse().find((a) => a in JQ_SOURCES)
        if (!sourceName) {
          return error(`jq: no source — name one of ${Object.keys(JQ_SOURCES).join(', ')} (or pipe JSON in from curl/cat)`)
        }
        const filter = dequote(args.filter((a) => a !== sourceName).join(' ').trim()) || '.'
        const json = JSON.stringify(JQ_SOURCES[sourceName]!())
        const result = runJq(filter, json)
        if (!result.ok) return error(result.error)
        for (const line of result.lines) out(line)
      }
    },
    qr: {
      category: 'toys',
      usage: 'qr [text|url]',
      description: 'Turn anything into a scannable QR code',
      examples: ['qr             (encodes the page you are on)', 'qr https://example.com', 'qr any text at all'],
      exec: async (args) => {
        const text = args.join(' ').trim() || (import.meta.client ? window.location.href : '')
        if (!text) return error('qr: nothing to encode')
        // lazy: the encoder only loads when someone asks for a code
        const { qrAsciiLines } = await import('~/utils/qrAscii')
        try {
          push('output', `<pre class="term-qr">${qrAsciiLines(text).join('\n')}</pre>`, true)
          muted(`encodes: ${text.length > 60 ? `${text.slice(0, 57)}...` : text}`)
        } catch {
          error('qr: that is too much data for one code — try something shorter')
        }
      }
    },
    ssh: {
      hidden: true,
      usage: 'ssh <user@host>',
      description: 'Connect to a very real remote server',
      exec: (args) => {
        const target = args[0] ?? ''
        if (!target) {
          error('usage: ssh <user@host> — try ssh guest@laurensverspeek.nl')
          return
        }
        const host = target.includes('@') ? target.split('@')[1]! : target
        if (sshHost.value) return error(`ssh: already connected to ${sshHost.value} — 'exit' first`)
        muted(`Connecting to ${host} (127.0.0.1) port 22 ...`)
        return new Promise<void>((resolve) => {
          setTimeout(() => muted(`Server key fingerprint: SHA256:${'lv'.repeat(3)}...trustme (accepted blindly)`), 350)
          setTimeout(() => out('Authenticated with method "vibes".'), 750)
          setTimeout(() => {
            push('primary', `Welcome to ${host}!`)
            out('  * You were already here, but now it feels more official.')
            out(`  * Last login: just now, from your own browser`)
            muted(`(the prompt now agrees — type 'exit' to disconnect)`)
            sshHost.value = host
            resolve()
          }, 1150)
        })
      }
    },
    sudo: {
      hidden: true,
      description: 'Absolutely not',
      exec: () => error('visitor is not in the sudoers file. This incident will be reported. 😏')
    },
    coffee: {
      hidden: true,
      description: 'Attempt to brew coffee (RFC 2324 compliant)',
      exec: () => {
        muted('BREW /pot-0 HTCPCP/1.0')
        muted('Accept-Additions: milk-type/half-and-half')
        error(`HTTP/1.1 418 I'm a teapot`)
        out('the requested entity is short and stout.')
        ctx.link('  → inspect the teapot at /418', '/418')
      }
    },
    backstage: {
      // The console-hunt reward. Deliberately kept out of `secrets` and shown
      // by name only when the hunt is finished — before that it behaves like a
      // command that doesn't exist, so it can't be found any other way.
      hidden: true,
      description: 'All-access pass — earned in the console hunt',
      exec: () => {
        const solved = huntSolved.value || storageGet(STATE_KEYS.huntSolved) === '1'
        if (!solved) {
          error(shellError('command not found: backstage'))
          muted(`Type 'help' for available commands.`)
          return
        }

        // a deterministic, one-of-one code stamped from the visitor's identity
        const holder = ctx.identity.name.value || 'visitor'
        let h = 0
        for (const ch of `${holder}::backstage`) h = (h * 31 + ch.charCodeAt(0)) >>> 0
        const code = `LV-${h.toString(36).toUpperCase().padStart(4, '0').slice(-4)}`

        ctx.effects.fireworks.value = true

        push('primary', '┌─ LV · ALL-ACCESS BACKSTAGE PASS ───────────┐')
        push('output', '<span class="term-accent">│</span>', true)
        push('output', `<span class="term-accent">│</span>  holder      <span class="term-accent">${holder}</span>`, true)
        push('output', `<span class="term-accent">│</span>  clearance   ROOT — no questions asked`, true)
        push('output', `<span class="term-accent">│</span>  pass code   <span class="term-accent">${code}</span> · one of one`, true)
        push('output', '<span class="term-accent">│</span>', true)
        push('primary', '└─────────────────────────────────────────────┘')
        out('')
        out('You are one of a small number of people who read the source, opened the')
        out('console, and worked all five rounds. That is exactly the kind of stubborn')
        out('curiosity I like building things with.')
        out('')
        out('So here is a real, direct line — not the one on the contact page:')
        const subject = encodeURIComponent(`backstage pass ${code} — let's build something`)
        const body = encodeURIComponent(
          `Hi Laurens,\n\nI finished the console hunt (pass code ${code}). I wanted to reach out because…\n`
        )
        link(`  → email me with your pass`, `mailto:${profile.email}?subject=${subject}&body=${body}`)
        muted(`(the ${code} subject tag jumps this straight to the top of my inbox — I answer these first.)`)
      }
    }
  }
}
