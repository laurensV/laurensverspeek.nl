import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { formatGitLog, formatGitShow, findCommit, type GitCommit } from '~/utils/terminal/gitLog'
import { runJq } from '~/utils/terminal/jq'
import { buildJsonResume } from '~/utils/resume'
import { bugReportUrl } from '~/utils/bugReport'
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
  if (!gitHistory) gitHistory = await $fetch<GitCommit[]>('/git-log.json')
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
  // captured at factory time for the `bug` command's issue context
  const buildHash = useRuntimeConfig().public.buildHash

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
      usage: 'colorscheme <name>',
      description: `Change the accent color (${ctx.accent.names.join(', ')})`,
      examples: ['colorscheme emerald', 'colorscheme cyan'],
      argCandidates: () => ctx.accent.names,
      exec: (args) => {
        const name = args[0]?.toLowerCase()
        if (!name) {
          out(`Current accent: ${ctx.accent.current.value}`)
          muted(`Available: ${ctx.accent.names.join(', ')}`)
          return
        }
        if (ctx.accent.set(name)) out(`Accent set to ${name}.`)
        else error(`colorscheme: unknown accent '${args[0]}'. Try: ${ctx.accent.names.join(', ')}`)
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
    hire: {
      hidden: true,
      description: 'The console-hunt reward',
      exec: () => {
        push('primary', 'Nice — you finished the console hunt. 🕵️')
        out('If you build things you are proud of, I would love to hear from you.')
        link(`  → ${profile.email}`, `mailto:${profile.email}`)
        muted('(the invitation stands whether or not you found the hunt)')
      }
    }
  }
}
