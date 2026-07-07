import { PAGES, type TerminalCommand, type TerminalContext } from '~/utils/terminal/types'
import { projects, categories, type ProjectCategory } from '~/data/projects'
import { profile } from '~/data/profile'
import { uses as usesData } from '~/data/uses'
import { now as nowData } from '~/data/now'
import { renderMarkdownToTerminal } from '~/utils/terminalMarkdown'

// Commands about the site's content: pages, projects, blog, profile.

const postSlug = (path: string) => path.split('/').pop() ?? path

const projectSlugs = () => projects.map((p) => p.slug)

// filled after the first fetch, so tab completion for post names can be sync
let cachedPostSlugs: string[] = []

export function createContentCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, link } = ctx

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
        out('visitor')
        muted(`(I'm ${profile.name} though — try 'about')`)
      }
    },
    projects: {
      usage: 'projects [category]',
      description: `List projects (${categories.map((c) => c.value).join(', ')})`,
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
      usage: 'cat <project|post>',
      description: 'Read all about a project (or a blog post)',
      argCandidates: () => [...projectSlugs(), ...cachedPostSlugs],
      exec: (args) => {
        if (!args[0]) {
          error(`Usage: cat <name> — run 'projects' or 'blog' to see what's readable.`)
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
      usage: 'cd <page>',
      description: `Go to a page (${PAGES.join(', ')})`,
      argCandidates: () => [...PAGES],
      exec: (args) => {
        const page = (args[0] ?? 'home').replace(/^\/|\/$/g, '').toLowerCase() || 'home'
        if (page !== '~' && !PAGES.includes(page as (typeof PAGES)[number])) {
          error(`cd: no such page: ${args[0]}`)
          return
        }
        ctx.navigate(page)
      }
    },
    ls: {
      description: 'List pages',
      exec: () => out(PAGES.map((p) => `${p}/`).join('  '))
    },
    cv: {
      description: 'View my CV (printable)',
      exec: () => ctx.navigate('cv')
    },
    blog: {
      usage: 'blog [post]',
      description: 'List blog posts — or read one right here',
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
    now: {
      description: `What I'm doing these days`,
      exec: () => {
        muted(`last updated ${nowData.updated}`)
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
      description: 'How to reach me',
      exec: () => {
        link(`mail    ${profile.email}`, `mailto:${profile.email}`)
        for (const social of profile.socials.filter((s) => !s.url.startsWith('mailto:'))) {
          link(`${social.label.toLowerCase().padEnd(8, ' ')}${social.url}`, social.url)
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
