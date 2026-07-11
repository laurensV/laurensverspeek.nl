import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { projects } from '~/data/projects'
import { resolvePath, dirEntries, isGlob, expandGlob, formatLongListing, pathCandidates } from '~/utils/terminal/filesystem'
import { postSlugCandidates, createPostTools } from '~/utils/terminal/postHelpers'

// Commands over the home filesystem — which holds the site's own pages as
// real folders (see utils/terminal/siteFs) alongside whatever the visitor
// makes. `cat` still falls back to project/post names typed without a path.

export function createFileCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, link } = ctx
  const { readPost } = createPostTools(ctx)

  // directory memory: `cd -` returns here, pushd/popd keep a stack
  let previousDir: string | null = null
  const dirStack: string[] = []
  const changeDir = (target: string) => {
    previousDir = ctx.fsCwd.value
    ctx.fsCwd.value = target
  }
  const dirLabel = (dir: string) => (dir === '' ? '~' : `~/${dir}`)

  return {
    cat: {
      category: 'files',
      usage: 'cat <file>',
      description: 'Read a file (blog posts and projects are files too)',
      argCandidates: (partial) => [
        ...pathCandidates(ctx.files.value, ctx.fsCwd.value, partial),
        ...(partial.includes('/') ? [] : [...projects.map((p) => p.slug), ...postSlugCandidates()])
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
      category: 'files',
      usage: 'cd <dir|->',
      description: `Change directory — the site's pages are real folders here`,
      examples: ['cd blog', 'cat blog/rebuilding-this-site.md', `cd -  (back to where you were; 'goto <page>' navigates the site)`],
      argCandidates: (partial) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial, { dirsOnly: true }),
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
        // cd / cd ~ : back to the home directory
        if (!arg || arg === '~' || arg === '/') {
          changeDir('')
          return
        }
        // resolve inside the home filesystem — cd never leaves the terminal
        const target = resolvePath(ctx.fsCwd.value, arg)
        if (target === '') {
          changeDir('')
          return
        }
        const node = ctx.files.value[target]
        if (node?.dir) {
          changeDir(target)
          return
        }
        if (node) return error(`cd: not a directory: ${arg}`)
        error(`cd: no such file or directory: ${arg}`)
      }
    },
    pushd: {
      hidden: true,
      usage: 'pushd <dir>',
      description: 'Push the current directory onto the stack and hop',
      argCandidates: (partial) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial, { dirsOnly: true }),
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
      category: 'files',
      usage: 'ls [-l] [dir|pattern]',
      description: 'List a directory (the current one by default)',
      argCandidates: (partial) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial),
      exec: (args) => {
        const long = args.includes('-l') || args.includes('-la') || args.includes('-al')
        const target = args.find((a) => !a.startsWith('-'))
        // `ls *.txt` narrows to glob matches
        if (target && isGlob(target)) {
          const matches = expandGlob(ctx.files.value, ctx.fsCwd.value, target)
            .map((path) => (ctx.files.value[path]?.dir ? `${path}/` : path))
          if (!matches.length) return error(`ls: ${target}: No such file or directory`)
          out(matches.join('  '))
          return
        }
        // `ls <dir>` lists that directory; `ls <file>` echoes the file
        let dir = ctx.fsCwd.value
        if (target && !(target === '~' || target === '/')) {
          const resolved = resolvePath(ctx.fsCwd.value, target)
          const node = ctx.files.value[resolved]
          if (resolved !== '' && !node) return error(`ls: ${target}: No such file or directory`)
          if (resolved !== '' && !node!.dir) {
            if (long) formatLongListing([{ name: target.replace(/\/+$/, ''), dir: false, size: node!.content.length }]).slice(1).forEach(out)
            else out(target)
            return
          }
          dir = resolved
        } else if (target) {
          dir = ''
        }
        const entries = dirEntries(ctx.files.value, dir)
          .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
        // `ls -l`: a long listing with (playful) perms, sizes and dates
        if (long) {
          const rows = entries.map((e) => ({
            name: e.name,
            dir: e.dir,
            size: ctx.files.value[dir ? `${dir}/${e.name}` : e.name]?.content.length ?? 0
          }))
          formatLongListing(rows).forEach(out)
          return
        }
        out(entries.length ? entries.map((e) => (e.dir ? `${e.name}/` : e.name)).join('  ') : '(empty)')
      }
    },
    tail: {
      usage: 'tail [-f] <file>',
      description: 'Show the end of a file (-f follows it live)',
      argCandidates: (partial) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial),
      exec: (args) => {
        const follow = args.includes('-f')
        const name = args.find((arg) => !arg.startsWith('-'))
        if (!name) return error('tail: usage: tail [-f] <file>')
        const node = ctx.files.value[resolvePath(ctx.fsCwd.value, name)]
        if (!node) return error(`tail: cannot open '${name}' for reading: No such file or directory`)
        if (node.dir) return error(`tail: error reading '${name}': Is a directory`)
        const lines = node.content ? node.content.split('\n') : []
        lines.slice(-10).forEach(out)
        if (!follow) return
        // follow mode: stream plausible log lines until the visitor quits
        muted(`==> following ${name} (a friendly daemon writes to it) — press q to stop <==`)
        const events = [
          'GET /  200  12ms',
          'terminal.service: command executed',
          'flow-field: repainted 1 frame',
          'cache: HIT /rss.xml',
          'visitor: still reading, nice',
          'gc: swept 0 easter eggs (all still hidden)'
        ]
        ctx.startGame((callbacks) => {
          const stamp = () => new Date().toLocaleTimeString('en-GB')
          // stream accumulating log lines into the real output (not the single
          // game frame), with a small "following" hint pinned below
          callbacks.onFrame('(following… press q to stop)')
          const timer = setInterval(() => {
            out(`[${stamp()}] ${events[Math.floor(Math.random() * events.length)]}`)
          }, 850)
          return {
            onKey: (key) => {
              if (key.toLowerCase() === 'q' || key === 'Escape') {
                clearInterval(timer)
                callbacks.onEnd([`tail: stopped following ${name}`])
                return true
              }
              return false
            },
            stop: () => clearInterval(timer)
          }
        }, `tail -f ${name}`)
      }
    }
  }
}
