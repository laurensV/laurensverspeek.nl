import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { profile } from '~/data/profile'
import { uses as usesData } from '~/data/uses'
import { now as nowData } from '~/data/now'
import { buildContribGraph } from '~/utils/terminal/contribGraph'

// Commands about me and the site itself: profile, contact, live stats.

export function createSiteCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, link } = ctx
  // captured at factory time (inside the composable), since command exec
  // handlers run outside the Nuxt instance
  const { nowUpdated, goatcounter } = useRuntimeConfig().public
  const leaderboard = useLeaderboard()

  return {
    about: {
      category: 'content',
      description: 'Who is Laurens?',
      exec: () => profile.bio.forEach(out)
    },
    whoami: {
      category: 'system',
      description: 'Who are you?',
      exec: () => {
        out(ctx.identity.name.value)
        muted(`(change it with 'nick <name>' — I'm ${profile.name} though, try 'about')`)
      }
    },
    nick: {
      category: 'system',
      usage: 'nick <name>',
      description: 'Set your display name (used in the prompt & live cursors)',
      exec: (args) => {
        if (!args[0]) {
          out(`Your name is '${ctx.identity.name.value}'.`)
          muted('Usage: nick <name>')
          return
        }
        const applied = ctx.identity.set(args.join(' '))
        if (applied) out(`Nice to meet you, ${applied}.`)
        else error('nick: please pick a name with letters or numbers.')
      }
    },
    cv: {
      category: 'content',
      description: 'View my CV (printable)',
      exec: () => ctx.navigate('cv')
    },
    museum: {
      hidden: true,
      description: 'Tour every feature and easter egg, as exhibits',
      exec: () => {
        muted('unlocking the museum after hours ...')
        ctx.navigate('museum')
      }
    },
    say: {
      hidden: true,
      usage: 'say <message>',
      description: 'Say something to other live visitors',
      exec: (args) => {
        const message = args.join(' ').trim()
        if (!message) return error('say: usage: say <message>')
        const { enabled, say } = useLiveVisitors()
        if (!enabled.value) {
          muted('say: nobody is listening — live cursors are not enabled on this build.')
          return
        }
        say(message.slice(0, 80))
        muted(`(said to everyone browsing right now: "${message.slice(0, 80)}")`)
      }
    },
    now: {
      category: 'content',
      description: `What I'm doing these days`,
      exec: () => {
        muted(`last updated ${nowUpdated}`)
        for (const section of nowData.sections) {
          push('primary', `./${section.title.toLowerCase()}`)
          section.items.forEach((item) => out(`- ${item}`))
        }
      }
    },
    uses: {
      category: 'content',
      description: 'Gear, software and stack I use',
      exec: () => {
        for (const group of usesData) {
          push('primary', `./${group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
          for (const item of group.items) {
            push(
              'output',
              `<span class="term-accent">${item.name.padEnd(24, ' ')}</span> ${item.note ?? ''}`,
              true
            )
          }
          out('')
        }
        muted(`Full list at /uses — or run 'goto uses'.`)
      }
    },
    contact: {
      category: 'content',
      usage: 'contact [--qr]',
      description: 'How to reach me',
      examples: ['contact', 'contact --qr  (a scannable contact card, right in the terminal)'],
      exec: (args) => {
        if (args.includes('--qr')) {
          // lazy: the QR encoder only loads if someone actually asks for it
          return import('~/utils/qrAscii').then(({ qrAsciiLines }) => {
            const lines = qrAsciiLines(`https://${profile.domain}/contact.vcf`).join('\n')
            push('output', `<pre class="term-qr">${lines}</pre>`, true)
            muted('scan to save my contact card (links to /contact.vcf)')
          })
        }
        link(`mail    ${profile.email}`, `mailto:${profile.email}`)
        for (const social of profile.socials.filter((s) => !s.url.startsWith('mailto:'))) {
          link(`${social.label.toLowerCase().padEnd(8, ' ')}${social.url}`, social.url)
        }
        muted(`\nTip: 'contact --qr' prints a scannable contact card.`)
      }
    },
    stats: {
      category: 'content',
      description: 'Visitor stats (public GoatCounter counters)',
      exec: async () => {
        if (!goatcounter) {
          muted('analytics is not enabled on this build — no tracking, and therefore no stats.')
          muted(`(enable by building with NUXT_PUBLIC_GOATCOUNTER=<code>)`)
          return
        }
        const stopSpin = ctx.spin(`fetching from ${goatcounter}.goatcounter.com ...`)
        try {
          const total = await $fetch<{ count: string }>(
            `https://${goatcounter}.goatcounter.com/counter/TOTAL.json`,
            { timeout: 10_000 }
          )
          push('output', `<span class="term-accent">site total</span>  ${total.count} views`, true)
          const path = window.location.pathname.replace(/\/$/, '') || '/'
          const here = await $fetch<{ count: string }>(
            `https://${goatcounter}.goatcounter.com/counter/${encodeURIComponent(path)}.json`,
            { timeout: 10_000 }
          ).catch(() => null)
          if (here) push('output', `<span class="term-accent">this page</span>   ${here.count} views`, true)
          muted('(public counters — no cookies, no fingerprints)')
          muted(`the /stats page draws these as bars — try 'goto stats'`)
        } catch {
          error('stats: could not reach goatcounter (are public counters switched on?)')
        } finally {
          stopSpin()
        }
      }
    },
    github: {
      category: 'content',
      description: 'Live stats from the GitHub API',
      exec: () => {
        const stopSpin = ctx.spin('fetching from api.github.com ...')
        return $fetch<{ followers: number, public_repos: number }>(
          `https://api.github.com/users/${GITHUB_USER}`,
          { timeout: 10_000 }
        )
          .then((user) => {
            push('output', `<span class="term-accent">user</span>       ${GITHUB_USER}`, true)
            push('output', `<span class="term-accent">repos</span>      ${user.public_repos}`, true)
            push('output', `<span class="term-accent">followers</span>  ${user.followers}`, true)
            link(`profile    github.com/${GITHUB_USER}`, `https://github.com/${GITHUB_USER}`)
          })
          .catch(() => error('github: API unreachable (rate limit or offline)'))
          .finally(stopSpin)
      }
    },
    leaderboard: {
      category: 'games',
      usage: 'leaderboard [game]',
      description: 'Global high scores (when a relay is configured)',
      argCandidates: () => [...leaderboard.GAMES],
      exec: (args) => {
        if (!leaderboard.enabled.value) {
          muted('leaderboard: no relay on this build — scores stay local.')
          muted(`(the lvOS 'scores' app shows your personal hall of fame)`)
          return
        }
        leaderboard.enter()
        const games = args[0] && leaderboard.GAMES.includes(args[0]) ? [args[0]] : leaderboard.GAMES
        if (!leaderboard.connected.value) muted('connecting to the leaderboard ...')
        for (const game of games) {
          push('primary', `## ${game}`)
          const board = leaderboard.boards.value[game] ?? []
          if (!board.length) {
            muted('  no scores yet — be the first')
            continue
          }
          board.slice(0, 10).forEach((entry, i) => {
            out(`${String(i + 1).padStart(2)}. ${entry.name.padEnd(16)} ${entry.score}`)
          })
        }
      }
    },
    contributions: {
      category: 'content',
      description: 'Recent GitHub activity as a heatmap',
      examples: ['contributions', 'contributions | less'],
      exec: () => {
        const stopSpin = ctx.spin('fetching public events from api.github.com ...')
        // the events API is keyless but only covers ~90 days / 300 events, so
        // this is an honest recent-activity graph, not the full-year calendar
        return $fetch<{ type: string, created_at: string, payload?: { size?: number } }[]>(
          `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`,
          { timeout: 10_000 }
        )
          .then((events) => {
            const perDay = new Map<string, number>()
            for (const event of events) {
              const day = event.created_at.slice(0, 10)
              const weight = event.type === 'PushEvent' ? (event.payload?.size ?? 1) : 1
              perDay.set(day, (perDay.get(day) ?? 0) + weight)
            }
            const days = [...perDay].map(([date, count]) => ({ date, count }))
            push('primary', `${GITHUB_USER} — recent contributions`)
            for (const gline of buildContribGraph(days, new Date())) out(gline)
            muted(`(GitHub's public events feed — the last ~90 days, not the full calendar)`)
          })
          .catch(() => error('contributions: API unreachable (rate limit or offline)'))
          .finally(stopSpin)
      }
    }
  }
}
