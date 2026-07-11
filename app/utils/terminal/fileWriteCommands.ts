import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { parseRedirect, resolvePath, expandFileArgs, writeFileAt, pathCandidates } from '~/utils/terminal/filesystem'
import { removalPlan } from '~/utils/terminal/siteFs'
import { createNanoEditor, createVimEditor, type EditorIO } from '~/utils/terminalEditors'

// The writing half of the virtual filesystem: creating, copying, removing and
// editing files. (The reading half — cat/ls/cd — lives in fileCommands.)
// Site pages live here as seeded `sys` nodes: editable (the edit becomes a
// persisted override), but rm/mv-protected; removing an override restores
// the original underneath.

export function createFileWriteCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { out, muted, error } = ctx
  // rm moves things to the lvOS recycle bin (factory-time: valid Nuxt context)
  const trash = useTrash()

  // a path can only be created if its parent directory already exists
  const parentExists = (path: string) => {
    const parent = path.split('/').slice(0, -1).join('/')
    return parent === '' || ctx.files.value[parent]?.dir === true
  }
  // path completion for the file-writing commands
  const completePaths = (partial: string) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial)

  // file access for the editors (nano/vim) over the home filesystem
  const editorIo = (name: string): EditorIO | { error: string } => {
    const path = resolvePath(ctx.fsCwd.value, name)
    if (!path || ctx.files.value[path]?.dir) return { error: `${name}: is a directory` }
    return {
      filename: name,
      read: () => ctx.files.value[path]?.content ?? '',
      write: (content) => {
        const written = writeFileAt(ctx.files.value, ctx.fsCwd.value, name, content)
        if ('error' in written) return false
        ctx.files.value = written.files
        return true
      }
    }
  }

  const openVim = (args: string[]) => {
    const name = args[0]
    if (!name) {
      muted('vim: which file? this vim is real now — try `vim todo.txt` (and yes, :q! works)')
      return
    }
    const io = editorIo(name)
    if ('error' in io) return error(`vim: ${io.error}`)
    muted(`Opening ${name} — i inserts, Esc then :wq writes & quits.`)
    ctx.startGame((callbacks) => createVimEditor(io, callbacks), `vim ${name}`)
  }

  // shared cp/mv (files only): copy a node to dest, and for mv drop the source
  const copyOrMoveOne = (cmd: 'cp' | 'mv', srcName: string, dstName: string) => {
    const src = resolvePath(ctx.fsCwd.value, srcName)
    const node = ctx.files.value[src]
    if (!node) return error(`${cmd}: cannot stat '${srcName}': No such file or directory`)
    if (node.dir) return error(`${cmd}: omitting directory '${srcName}'`)
    if (cmd === 'mv' && node.sys) return error(`mv: cannot move '${srcName}': site content is welded down (cp works, or just edit it)`)
    let dst = resolvePath(ctx.fsCwd.value, dstName)
    // a directory destination keeps the source's filename
    if (ctx.files.value[dst]?.dir) dst = `${dst}/${src.split('/').pop()}`
    if (!dst) return error(`${cmd}: cannot write to the home directory`)
    if (src === dst) return
    if (!parentExists(dst)) return error(`${cmd}: cannot create '${dstName}': No such file or directory`)
    const withDest = { ...ctx.files.value, [dst]: { dir: false, content: node.content } }
    ctx.files.value = cmd === 'mv'
      ? Object.fromEntries(Object.entries(withDest).filter(([key]) => key !== src))
      : withDest
  }

  // globs expand to multiple sources; then the destination must be a directory
  const copyOrMove = (cmd: 'cp' | 'mv', args: string[]) => {
    const expanded = expandFileArgs(ctx.files.value, ctx.fsCwd.value, args)
    if (expanded.length < 2) return error(`${cmd}: missing file operand`)
    const dstName = expanded.at(-1)!
    const sources = expanded.slice(0, -1)
    if (sources.length > 1 && !ctx.files.value[resolvePath(ctx.fsCwd.value, dstName)]?.dir) {
      return error(`${cmd}: target '${dstName}' is not a directory`)
    }
    for (const srcName of sources) copyOrMoveOne(cmd, srcName, dstName)
  }

  return {
    pwd: {
      category: 'files',
      description: 'Print the working directory',
      exec: () => out(ctx.cwd.value.replace(/^~/, ctx.env.value.HOME ?? '/home/visitor'))
    },
    echo: {
      category: 'system',
      usage: 'echo <text> [> file]',
      description: 'Print text — or write it to a file with >',
      exec: (args) => {
        const { text, file } = parseRedirect(args)
        if (file) {
          const path = resolvePath(ctx.fsCwd.value, file)
          if (!path) return error('echo: cannot write to the home directory')
          if (!parentExists(path)) return error(`echo: ${file}: No such file or directory`)
          ctx.files.value = { ...ctx.files.value, [path]: { dir: false, content: text } }
          return
        }
        out(text)
      }
    },
    mkdir: {
      category: 'files',
      usage: 'mkdir <name>',
      description: 'Create a directory',
      exec: (args) => {
        const name = args[0]
        if (!name) return error('mkdir: missing operand')
        const path = resolvePath(ctx.fsCwd.value, name)
        if (!path) return error('mkdir: cannot create the home directory')
        if (ctx.files.value[path]) return error(`mkdir: cannot create directory '${name}': File exists`)
        if (!parentExists(path)) return error(`mkdir: cannot create directory '${name}': No such file or directory`)
        ctx.files.value = { ...ctx.files.value, [path]: { dir: true, content: '' } }
      }
    },
    chmod: {
      hidden: true,
      usage: 'chmod <mode> <file>',
      description: 'Change file permissions (in spirit)',
      argCandidates: completePaths,
      exec: (args) => {
        const [mode, name] = args
        if (!mode || !name) return error('chmod: usage: chmod <mode> <file>')
        const path = resolvePath(ctx.fsCwd.value, name)
        if (!path || !ctx.files.value[path]) return error(`chmod: cannot access '${name}': No such file or directory`)
        if (mode === '777') muted(`chmod: '${name}' is now world-writable. living dangerously, i see.`)
        else if (mode === '000') muted(`chmod: '${name}' locked down to nobody. not even you. brave.`)
        else out(`chmod: set mode ${mode} on ${name} (well, this is a browser, but the vibe is set)`)
      }
    },
    touch: {
      category: 'files',
      usage: 'touch <name>',
      description: 'Create an empty file',
      exec: (args) => {
        const name = args[0]
        if (!name) return error('touch: missing file operand')
        const path = resolvePath(ctx.fsCwd.value, name)
        if (!path) return error('touch: cannot touch the home directory')
        if (!parentExists(path)) return error(`touch: cannot touch '${name}': No such file or directory`)
        if (!ctx.files.value[path]) {
          ctx.files.value = { ...ctx.files.value, [path]: { dir: false, content: '' } }
        }
      }
    },
    rm: {
      category: 'files',
      usage: 'rm <file>',
      description: 'Remove a file or directory (into the lvOS recycle bin)',
      argCandidates: completePaths,
      exec: (args) => {
        const rawName = args.find((arg) => !arg.startsWith('-'))
        // keep the classic joke for the classic mistake (checked pre-expansion)
        if (args.join(' ').includes('-rf') && /^[~/*]/.test(rawName ?? '')) {
          return error('Nice try. I only just finished this website.')
        }
        const names = expandFileArgs(ctx.files.value, ctx.fsCwd.value, args).filter((arg) => !arg.startsWith('-'))
        if (!names.length) return error('rm: missing operand')
        for (const name of names) {
          const path = resolvePath(ctx.fsCwd.value, name)
          const plan = removalPlan(ctx.files.value, path || '/')
          if (!path || plan === 'missing') {
            error(`rm: cannot remove '${name}': No such file or directory`)
            continue
          }
          // the site's own pages are welded down (edits, however, are welcome)
          if (plan === 'protected') {
            error(`rm: cannot remove '${name}': site content — edit it instead, edits do stick`)
            continue
          }
          // removed things land in the recycle bin (restorable on the desktop)
          trash.discard(path)
          // deleting an edit of a site file brings the original back
          if (plan.restoreSeed !== null) {
            ctx.files.value = { ...ctx.files.value, [path]: { dir: false, content: plan.restoreSeed, sys: true } }
            muted(`rm: your edit moved to the recycle bin — the original ${name} is back`)
          }
          // if we removed the directory we're standing in, walk back to home
          if (ctx.fsCwd.value === path || ctx.fsCwd.value.startsWith(`${path}/`)) ctx.fsCwd.value = ''
        }
      }
    },
    cp: {
      category: 'files',
      usage: 'cp <source> <dest>',
      description: 'Copy a file',
      argCandidates: completePaths,
      exec: (args) => copyOrMove('cp', args)
    },
    mv: {
      category: 'files',
      usage: 'mv <source> <dest>',
      description: 'Move or rename a file',
      argCandidates: completePaths,
      exec: (args) => copyOrMove('mv', args)
    },
    vim: {
      category: 'files',
      usage: 'vim <file>',
      description: 'A real modal editor. You can even quit it',
      argCandidates: completePaths,
      exec: openVim
    },
    vi: {
      hidden: true,
      description: 'Alias for vim',
      argCandidates: completePaths,
      exec: openVim
    },
    nano: {
      category: 'files',
      usage: 'nano <file>',
      description: 'Edit a file, the friendly way',
      argCandidates: completePaths,
      exec: (args) => {
        const name = args[0]
        if (!name) return error('nano: usage: nano <file>')
        const io = editorIo(name)
        if ('error' in io) return error(`nano: ${io.error}`)
        muted(`Editing ${name} — ^S saves, ^X exits.`)
        ctx.startGame((callbacks) => createNanoEditor(io, callbacks), `nano ${name}`)
      }
    }
  }
}
