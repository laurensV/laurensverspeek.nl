import { PAGES, type TerminalCommand, type TerminalContext } from '~/utils/terminal/types'
import { projects, categories, type ProjectCategory } from '~/data/projects'
import { searchSections } from '~/utils/terminal/search'
import { postSlug, postSlugCandidates, createPostTools } from '~/utils/terminal/postHelpers'

// Commands for browsing the site's content: projects, blog posts, search.

export function createBrowseCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error } = ctx
  const { fetchPosts, readPost } = createPostTools(ctx)

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

  return {
    projects: {
      category: 'content',
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
      category: 'content',
      usage: 'open <project>',
      description: 'Open a project in a new tab',
      argCandidates: () => projects.map((p) => p.slug),
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
    blog: {
      category: 'content',
      usage: 'blog [post]',
      description: 'List blog posts — or read one right here',
      examples: ['blog', 'blog snake-in-the-terminal', 'blog | grep terminal'],
      argCandidates: postSlugCandidates,
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
      category: 'content',
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
    tree: {
      category: 'files',
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
    }
  }
}
