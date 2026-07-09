import { PAGES, type TerminalCommand, type TerminalContext } from '~/utils/terminal/types'
import { projects, categories, type ProjectCategory } from '~/data/projects'
import { profile } from '~/data/profile'
import { uses as usesData } from '~/data/uses'
import { now as nowData } from '~/data/now'
import { renderMarkdownToTerminal } from '~/utils/terminalMarkdown'
import { resolvePath, dirEntries, isGlob, expandGlob, formatLongListing } from '~/utils/terminal/filesystem'
import { searchSections } from '~/utils/terminal/search'

// Commands about the site's content: pages, projects, blog, profile.

const postSlug = (path: string) => path.split('/').pop() ?? path

const projectSlugs = () => projects.map((p) => p.slug)

// filled after the first fetch, so tab completion for post names can be sync
let cachedPostSlugs: string[] = []

export function createContentCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, link } = ctx
  // captured at factory time (inside the composable), since command exec
  // handlers run outside the Nuxt instance
  const { nowUpdated, goatcounter } = useRuntimeConfig().public

  // directory memory: `cd -` returns here, pushd/popd keep a stack
  let previousDir: string | null = null
  const dirStack: string[] = []
  const changeDir = (target: string) => {
    previousDir = ctx.fsCwd.value
    ctx.fsCwd.value = target
  }
  const dirLabel = (dir: string) => (dir === '' ? '~' : `~/${dir}`)

  const fetchPosts = () =>
    ctx.fetchPosts().then((posts) => {
      cachedPostSlugs = posts.map((p) => postSlug(p.path))
      return posts
    })

  const listProjects = (category?: ProjectCategory) => {
    const list = category ? projects.filter((p) => p.category === category) : projects
    if (!list.length) {
      muted(`No projects in category '${category}'.`)
      return
    }
    for (const p of list) {
      push(
        'output',
        `<span class="term-accent">${p.slug.padEnd(28, ' ')}</span> [${p.category}] ${p.title}`,
        true
      )
    }
    muted(`\nUse 'open <name>' to visit a project, e.g. 'open ${list[0]!.slug}'.`)
  }

  const readPost = (query: string, notFound: (query: string) => void) => {
    const q = query.toLowerCase().replace(/\.md$/, '')
    return fetchPosts()
      .then((posts) => {
        const post =
          posts.find((p) => postSlug(p.path) === q)
          ?? posts.find((p) => postSlug(p.path).includes(q) || p.title.toLowerCase().includes(q))
        if (!post) {
          notFound(query)
          return
        }
        push('primary', `# ${post.title}`)
        muted(`${post.date}${post.tags?.length ? ` · ${post.tags.map((t) => `#${t}`).join(' ')}` : ''}`)
        for (const line of renderMarkdownToTerminal(post.body)) {
          push(line.type, line.text, line.html)
        }
        out('')
        link(`Read in style → ${post.path}`, post.path)
      })
      .catch(() => error('blog: failed to load posts'))
  }

  return {
    about: {
      description: 'Who is Laurens?',
      exec: () => profile.bio.forEach(out)
    },
    whoami: {
      description: 'Who are you?',
      exec: () => {
        out(ctx.identity.name.value)
        muted(`(change it with 'nick <name>' — I'm ${profile.name} though, try 'about')`)
      }
    },
    nick: {
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
    projects: {
      usage: 'projects [category]',
      description: `List projects (${categories.map((c) => c.value).join(', ')})`,
      examples: ['projects', 'projects work', 'projects | grep vue'],
      argCandidates: () => categories.map((c) => c.value),
      exec: (args) => {
        const cat = args[0]?.toLowerCase() as ProjectCategory | undefined
        if (cat && !categories.some((c) => c.value === cat)) {
          error(`Unknown category '${cat}'. Try: ${categories.map((c) => c.value).join(', ')}`)
          return
        }
        listProjects(cat)
      }
    },
    open: {
      usage: 'open <project>',
      description: 'Open a project in a new tab',
      argCandidates: projectSlugs,
      exec: (args) => {
        if (!args[0]) {
          error(`Usage: open <project> — run 'projects' to see the list.`)
          return
        }
        const query = args[0].toLowerCase()
        const project = projects.find(
          (p) => p.slug === query || p.title.toLowerCase().includes(query)
        )
        if (!project) {
          error(`Project '${args[0]}' not found. Run 'projects' to see the list.`)
          return
        }
        const url = project.url ?? project.source
        if (!url) {
          error(`No link available for ${project.title}.`)
          return
        }
        out(`Opening ${project.title} ...`)
        window.open(url, '_blank', 'noopener')
      }
    },
    cat: {
      usage: 'cat <file|project|post>',
      description: 'Read a file you made (or a project / blog post)',
      argCandidates: () => [
        ...dirEntries(ctx.files.value, ctx.fsCwd.value).map((e) => e.name),
        ...projectSlugs(),
        ...cachedPostSlugs
      ],
      exec: (args) => {
        if (!args[0]) {
          error(`Usage: cat <name> — run 'ls', 'projects' or 'blog' to see what's readable.`)
          return
        }
        // globs read every match, head-style headers between files
        if (isGlob(args[0])) {
          const matches = expandGlob(ctx.files.value, ctx.fsCwd.value, args[0])
            .filter((path) => !ctx.files.value[path]?.dir)
          if (!matches.length) return error(`cat: ${args[0]}: No such file or directory`)
          for (const path of matches) {
            if (matches.length > 1) push('primary', `==> ${path} <==`)
            const content = ctx.files.value[path]?.content
            if (content) content.split('\n').forEach(out)
            else muted('(empty file)')
          }
          return
        }
        // a file the visitor created in their filesystem takes precedence
        const node = ctx.files.value[resolvePath(ctx.fsCwd.value, args[0])]
        if (node) {
          if (node.dir) error(`cat: ${args[0]}: Is a directory`)
          else if (node.content) node.content.split('\n').forEach(out)
          else muted('(empty file)')
          return
        }
        const query = args[0].toLowerCase().replace(/\.md$/, '')
        const project = projects.find(
          (p) => p.slug === query || p.title.toLowerCase().includes(query)
        )
        if (!project) {
          // not a project — maybe it's a blog post
          return readPost(query, (q) => error(`cat: ${q}: No such file or directory`))
        }
        push('primary', `# ${project.title}`)
        muted(`${project.year ?? ''}${project.year && project.role ? ' · ' : ''}${project.role ?? ''}`)
        for (const paragraph of project.story ?? [project.description]) {
          out('')
          out(paragraph)
        }
        out('')
        link(`Read in style → /projects/${project.slug}`, `/projects/${project.slug}`)
      }
    },
    cd: {
      usage: 'cd <dir|page|->',
      description: `Enter a folder you made, or go to a page (${PAGES.join(', ')})`,
      argCandidates: () => [
        ...PAGES,
        ...dirEntries(ctx.files.value, ctx.fsCwd.value).filter((e) => e.dir).map((e) => e.name)
      ],
      exec: (args) => {
        const arg = args[0]
        // cd - : back to the previous directory, like a real shell
        if (arg === '-') {
          if (previousDir === null) return error('cd: OLDPWD not set')
          const back = previousDir
          changeDir(back)
          out(dirLabel(back))
          return
        }
        // cd / cd ~ : back to the home directory (and the home page)
        if (!arg || arg === '~' || arg === '/') {
          changeDir('')
          ctx.navigate('home')
          return
        }
        // a known site page → navigate there and leave the filesystem
        const page = arg.replace(/^\/|\/$/g, '').toLowerCase()
        if (PAGES.includes(page as (typeof PAGES)[number])) {
          changeDir('')
          ctx.navigate(page)
          return
        }
        // otherwise resolve inside the home filesystem
        const target = resolvePath(ctx.fsCwd.value, arg)
        if (target === '') {
          changeDir('')
          return
        }
        if (ctx.files.value[target]?.dir) {
          changeDir(target)
          return
        }
        error(`cd: no such file or directory: ${arg}`)
      }
    },
    pushd: {
      hidden: true,
      usage: 'pushd <dir>',
      description: 'Push the current directory onto the stack and hop',
      argCandidates: () => dirEntries(ctx.files.value, ctx.fsCwd.value).filter((e) => e.dir).map((e) => e.name),
      exec: (args) => {
        const arg = args[0]
        if (!arg) return error('pushd: usage: pushd <dir>')
        const target = arg === '~' || arg === '/' ? '' : resolvePath(ctx.fsCwd.value, arg)
        if (target !== '' && !ctx.files.value[target]?.dir) {
          return error(`pushd: no such directory: ${arg}`)
        }
        dirStack.push(ctx.fsCwd.value)
        changeDir(target)
        out([target, ...[...dirStack].reverse()].map(dirLabel).join(' '))
      }
    },
    popd: {
      hidden: true,
      description: 'Pop back to the last pushed directory',
      exec: () => {
        const top = dirStack.pop()
        if (top === undefined) return error('popd: directory stack empty')
        changeDir(top)
        out([top, ...[...dirStack].reverse()].map(dirLabel).join(' '))
      }
    },
    ls: {
      usage: 'ls [-l] [pattern]',
      description: 'List the current directory (pages + your files at home)',
      exec: (args) => {
        const long = args.includes('-l') || args.includes('-la') || args.includes('-al')
        // `ls -l`: a long listing with (playful) perms, sizes and dates
        if (long) {
          const here = dirEntries(ctx.files.value, ctx.fsCwd.value)
            .map((e) => ({ name: e.name, dir: e.dir, size: ctx.files.value[ctx.fsCwd.value ? `${ctx.fsCwd.value}/${e.name}` : e.name]?.content.length ?? 0 }))
          const pages = ctx.fsCwd.value ? [] : PAGES.map((p) => ({ name: p, dir: true, size: 0 }))
          formatLongListing([...pages, ...here]).forEach(out)
          return
        }
        const pattern = args.find((a) => !a.startsWith('-'))
        // `ls *.txt` narrows to glob matches
        if (pattern && isGlob(pattern)) {
          const matches = expandGlob(ctx.files.value, ctx.fsCwd.value, pattern)
            .map((path) => (ctx.files.value[path]?.dir ? `${path}/` : path))
          if (!matches.length) return error(`ls: ${pattern}: No such file or directory`)
          out(matches.join('  '))
          return
        }
        const entries = dirEntries(ctx.files.value, ctx.fsCwd.value).map((e) => (e.dir ? `${e.name}/` : e.name))
        // at home the site's pages sit alongside your files
        const pages = ctx.fsCwd.value ? [] : PAGES.map((p) => `${p}/`)
        const all = [...pages, ...entries]
        out(all.length ? all.join('  ') : '(empty)')
      }
    },
    tree: {
      description: 'Show the whole site as a directory tree',
      exec: () => {
        push('primary', '~')
        // top-level pages, then projects/ and blog/ as expandable branches
        const topPages = PAGES.filter((p) => p !== 'home' && p !== 'projects' && p !== 'blog')
        const branches = ['projects', 'blog', ...topPages]

        const projectLines = projects.map((p, i, arr) => {
          const last = i === arr.length - 1
          return `│   ${last ? '└──' : '├──'} ${p.slug}.md`
        })
        out('├── projects/')
        projectLines.forEach(out)

        fetchPosts()
          .then((posts) => {
            out('├── blog/')
            posts.forEach((post, i) => {
              const last = i === posts.length - 1
              out(`│   ${last ? '└──' : '├──'} ${postSlug(post.path)}.md`)
            })
            topPages.forEach((page, i) => {
              const last = i === topPages.length - 1
              out(`${last ? '└──' : '├──'} ${page}/`)
            })
            const fileCount = projects.length + posts.length
            muted(`\n${branches.length} directories, ${fileCount} files`)
          })
          .catch(() => {
            topPages.forEach((page, i) => {
              const last = i === topPages.length - 1
              out(`${last ? '└──' : '├──'} ${page}/`)
            })
          })
      }
    },
    cv: {
      description: 'View my CV (printable)',
      exec: () => ctx.navigate('cv')
    },
    blog: {
      usage: 'blog [post]',
      description: 'List blog posts — or read one right here',
      examples: ['blog', 'blog snake-in-the-terminal', 'blog | grep terminal'],
      argCandidates: () => cachedPostSlugs,
      exec: (args) => {
        if (args[0]) {
          return readPost(args.join(' '), (query) =>
            error(`blog: post '${query}' not found — run 'blog' for the list.`)
          )
        }
        return fetchPosts()
          .then((posts) => {
            if (!posts.length) {
              muted('ls: blog/: empty directory')
              return
            }
            for (const post of posts) {
              push(
                'output',
                `<span class="term-accent">${postSlug(post.path).padEnd(28, ' ')}</span> ${post.date}  ${post.title}`,
                true
              )
            }
            muted(`\nUse 'blog <name>' to read a post here, or 'cd blog' for the styled version.`)
          })
          .catch(() => error('blog: failed to load posts'))
      }
    },
    search: {
      usage: 'search <term>',
      description: 'Full-text search across the blog',
      examples: ['search canvas', 'search game of life', `search vue | head -3`],
      exec: (args) => {
        const term = args.join(' ').trim()
        if (!term) return error('search: give me something to look for')
        muted(`grep -ri '${term}' ~/blog ...`)
        return ctx.fetchSearchSections()
          .then((sections) => {
            const hits = searchSections(sections, term)
            if (!hits.length) {
              muted(`no matches for '${term}'`)
              return
            }
            for (const hit of hits) {
              push('output', `<span class="term-accent">${hit.slug}</span>  ${hit.heading}`, true)
              push('muted', `  ${hit.snippetHtml}`, true)
            }
            muted(`\n${hits.length} match${hits.length === 1 ? '' : 'es'} — read one with 'blog <name>'.`)
          })
          .catch(() => error('search: failed to load the blog index'))
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
        muted(`Full list at /uses — or run 'cd uses'.`)
      }
    },
    contact: {
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
      description: 'Visitor stats (public GoatCounter counters)',
      exec: async () => {
        if (!goatcounter) {
          muted('analytics is not enabled on this build — no tracking, and therefore no stats.')
          muted(`(enable by building with NUXT_PUBLIC_GOATCOUNTER=<code>)`)
          return
        }
        muted(`Fetching from ${goatcounter}.goatcounter.com ...`)
        try {
          const total = await $fetch<{ count: string }>(
            `https://${goatcounter}.goatcounter.com/counter/TOTAL.json`
          )
          push('output', `<span class="term-accent">site total</span>  ${total.count} views`, true)
          const path = window.location.pathname.replace(/\/$/, '') || '/'
          const here = await $fetch<{ count: string }>(
            `https://${goatcounter}.goatcounter.com/counter/${encodeURIComponent(path)}.json`
          ).catch(() => null)
          if (here) push('output', `<span class="term-accent">this page</span>   ${here.count} views`, true)
          muted('(public counters — no cookies, no fingerprints)')
        } catch {
          error('stats: could not reach goatcounter (are public counters switched on?)')
        }
      }
    },
    github: {
      description: 'Live stats from the GitHub API',
      exec: () => {
        muted('Fetching from api.github.com ...')
        return $fetch<{ followers: number, public_repos: number }>(
          `https://api.github.com/users/${GITHUB_USER}`
        )
          .then((user) => {
            push('output', `<span class="term-accent">user</span>       ${GITHUB_USER}`, true)
            push('output', `<span class="term-accent">repos</span>      ${user.public_repos}`, true)
            push('output', `<span class="term-accent">followers</span>  ${user.followers}`, true)
            link(`profile    github.com/${GITHUB_USER}`, `https://github.com/${GITHUB_USER}`)
          })
          .catch(() => error('github: API unreachable (rate limit or offline)'))
      }
    }
  }
}
