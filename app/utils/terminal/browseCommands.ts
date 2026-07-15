import { PAGES, type TerminalCommand, type TerminalContext } from '~/utils/terminal/types'
import { projects, categories, type ProjectCategory } from '~/data/projects'
import { dirEntries, resolvePath, pathCandidates } from '~/utils/terminal/filesystem'
import { searchSections } from '~/utils/terminal/search'
import { postSlug, postSlugCandidates, createPostTools } from '~/utils/terminal/postHelpers'

// pages cd used to warp to; now `goto` does, plus the deeper cuts
const GOTO_PAGES: string[] = [...PAGES, 'stats', 'changelog', 'museum', 'life', 'world', 'desktop', 'keyboard', 'status']

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
    goto: {
      category: 'content',
      usage: 'goto <page>',
      description: `Navigate the site (${PAGES.join(', ')}, …)`,
      examples: ['goto blog', 'goto keyboard', `goto desktop  (cd stays in the shell — goto is the door)`],
      argCandidates: () => [...GOTO_PAGES],
      exec: (args) => {
        const arg = args[0]
        if (!arg) return error(`goto: where to? Try: ${GOTO_PAGES.join(', ')}`)
        const page = arg.replace(/^\/|\/$/g, '').toLowerCase()
        if (!GOTO_PAGES.includes(page)) {
          return error(`goto: no such page: ${arg} — try: ${GOTO_PAGES.join(', ')}`)
        }
        ctx.navigate(page)
      }
    },
    projects: {
      category: 'content',
      usage: 'projects [category]',
      description: `List projects (${categories.map((c) => c.value).join(', ')})`,
      examples: ['projects', 'projects work', 'projects | grep vue'],
      argCandidates: () => categories.map((c) => c.value),
      exec: (args) => {
        const cat = args[0]?.toLowerCase() as ProjectCategory | undefined
        if (cat && !categories.some((c) => c.value === cat)) {
          error(`projects: unknown category '${cat}' — try: ${categories.map((c) => c.value).join(', ')}`)
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
          error(`open: usage: open <project> — run 'projects' to see the list.`)
          return
        }
        const query = args[0].toLowerCase()
        const project = projects.find(
          (p) => p.slug === query || p.title.toLowerCase().includes(query)
        )
        if (!project) {
          error(`open: '${args[0]}': not found — run 'projects' to see the list.`)
          return
        }
        const url = project.url ?? project.source
        if (!url) {
          error(`open: no link available for ${project.title}`)
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
      examples: ['blog', 'blog rebuilding-this-site', 'blog | grep terminal'],
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
            muted(`\nUse 'blog <name>' to read a post here, or 'goto blog' for the styled version.`)
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
      usage: 'tree [dir]',
      description: 'Draw the filesystem as a tree (site pages and your files)',
      argCandidates: (partial) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial, { dirsOnly: true }),
      exec: (args) => {
        // resolve against the cwd, exactly like ls/cd/cat do
        const root = resolvePath(ctx.fsCwd.value, args[0] ?? '.')
        if (root && ctx.files.value[root]?.dir !== true) {
          return error(`tree: ${args[0] ?? root}: No such directory`)
        }
        let dirs = 0
        let fileCount = 0
        const walk = (dir: string, indent: string) => {
          const entries = dirEntries(ctx.files.value, dir)
            .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
          entries.forEach((entry, i) => {
            const last = i === entries.length - 1
            out(`${indent}${last ? '└──' : '├──'} ${entry.name}${entry.dir ? '/' : ''}`)
            if (entry.dir) {
              dirs++
              walk(dir ? `${dir}/${entry.name}` : entry.name, `${indent}${last ? '    ' : '│   '}`)
            } else {
              fileCount++
            }
          })
        }
        push('primary', root ? `~/${root}` : '~')
        walk(root, '')
        muted(`\n${dirs} directories, ${fileCount} files`)
      }
    }
  }
}
