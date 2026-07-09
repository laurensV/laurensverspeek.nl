import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { renderCalendar } from '~/utils/terminal/calendar'
import { collectStorageSlices, dfLines, duLines } from '~/utils/terminal/storageUsage'
import { profile } from '~/data/profile'

// The lv "logo", shared by neofetch and sysinfo.
const ASCII_LOGO = String.raw`
 _    __      __
| |   \ \    / /
| |    \ \  / /
| |___  \ \/ /
|_____|  \__/
`

// System-info commands: id, hostname, uptime, neofetch, sysinfo, uname, date,
// cal and the localStorage usage tools (df/du). Split out of systemCommands to
// keep each factory focused.
export function createInfoCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted } = ctx

  return {
    id: {
      description: 'Print your terminal user identity',
      exec: () => {
        const name = ctx.identity.name.value
        out(`uid=1000(${name}) gid=1000(${name}) groups=1000(${name}),27(sudo… just kidding),100(visitors)`)
      }
    },
    hostname: {
      description: 'Show the hostname',
      exec: () => out(profile.domain)
    },
    uptime: {
      description: 'How long this page has been up',
      exec: () => {
        const secs = Math.round(performance.now() / 1000)
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60
        const clock = `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        // a load average that is pure vibes, gently rising with tab age
        const load = (Math.min(2.5, 0.2 + secs / 600)).toFixed(2)
        out(` ${now}  up ${clock},  1 user,  load average: ${load}, ${(+load * 0.8).toFixed(2)}, ${(+load * 0.6).toFixed(2)}`)
      }
    },
    neofetch: {
      description: 'System information',
      exec: () => {
        push('primary', ASCII_LOGO)
        const info: [string, string][] = [
          ['host', `${ctx.identity.name.value}@${profile.domain}`],
          ['os', 'Nuxt 4 (Vue 3) x86_64'],
          ['shell', 'lvsh 2.0.0'],
          ['theme', ctx.colorMode.value],
          ['location', profile.location],
          ['work', 'Head of Dev @ Nosana, co-founder @ Effect.AI'],
          ['uptime', `${new Date().getFullYear() - 2022} years (site v1 shipped in 2022)`]
        ]
        for (const [key, value] of info) {
          push('output', `<span class="term-accent">${key.padEnd(10, ' ')}</span> ${value}`, true)
        }
      }
    },
    date: {
      description: 'Print the current date',
      exec: () => out(new Date().toString())
    },
    cal: {
      description: 'Show a calendar of the current month',
      exec: () => {
        const lines = renderCalendar(new Date())
        lines.forEach((line, i) => push(i === 0 ? 'primary' : i === 1 ? 'muted' : 'output', line))
      }
    },
    uname: {
      usage: 'uname [-a]',
      description: 'Print system information',
      argCandidates: () => ['-a'],
      exec: (args) =>
        out(args.includes('-a')
          ? `lvsh ${profile.domain} 2.0.0 #1 SMP Vue3 x86_64 lvOS`
          : 'lvsh')
    },
    sysinfo: {
      description: 'A neofetch for your browser session',
      exec: () => {
        const ua = navigator.userAgent
        const browser = /Firefox\//.test(ua) ? 'Firefox'
          : /Edg\//.test(ua) ? 'Edge'
            : /Chrome\//.test(ua) ? 'Chrome'
              : /Safari\//.test(ua) ? 'Safari' : 'a browser'
        const storageKb = (collectStorageSlices().reduce((sum, slice) => sum + slice.bytes, 0) / 1024).toFixed(1)
        const uptime = Math.round(performance.now() / 1000)
        const rows: [string, string][] = [
          ['host', `${ctx.identity.name.value}@${profile.domain}`],
          ['browser', browser],
          ['resolution', `${window.innerWidth}×${window.innerHeight}`],
          ['theme', `${ctx.colorMode.value} · accent ${ctx.accent.current.value}`],
          ['dpr', String(window.devicePixelRatio)],
          ['storage', `${storageKb} KB in localStorage`],
          ['uptime', `${uptime}s on this page`],
          ['shell', 'lvsh 2.0']
        ]
        const logo = ASCII_LOGO.split('\n').filter(Boolean)
        const maxRows = Math.max(logo.length, rows.length)
        for (let i = 0; i < maxRows; i++) {
          const art = (logo[i] ?? '').padEnd(14)
          const row = rows[i]
          if (row) push('output', `<span class="term-accent">${art}${row[0].padEnd(12)}</span> ${row[1]}`, true)
          else push('primary', art)
        }
      }
    },
    df: {
      description: 'How much localStorage this site really uses',
      exec: () => {
        for (const line of dfLines(collectStorageSlices())) push(line.type, line.text, line.html)
        muted(`\nEverything here lives in YOUR browser — nothing is stored server-side.`)
      }
    },
    du: {
      hidden: true,
      description: 'Disk usage, sorted (see also df)',
      exec: () => {
        for (const line of duLines(collectStorageSlices())) push(line.type, line.text, line.html)
      }
    },
  }
}
