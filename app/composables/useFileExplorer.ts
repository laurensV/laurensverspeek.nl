import { useEventListener } from '@vueuse/core'
import { dirEntries, renamePath } from '~/utils/terminal/filesystem'
import { seedFor, isSysPath, markSeedsDeleted } from '~/utils/terminal/siteFs'

// The lvOS file explorer's model over THE filesystem — the same one the
// terminal's cd/ls/cat/vim walk, holding the site's pages as seeded folders
// next to whatever the visitor created. DesktopFiles.vue is just the view;
// every operation (navigate, rename, delete, drag-move, right-click) lives here.

export interface VfsEntry { name: string, dir: boolean, sys: boolean, edited: boolean }
interface FileProps { name: string, kind: string, size: string, lines: number | null, path: string, perms: string }

interface ExplorerCallbacks {
  /** open a desktop window by id (e.g. the resume viewer) */
  window: (id: string) => void
  /** open a blog post in the reader */
  post: (path: string) => void
  /** open a file in the vim window */
  edit: (path: string) => void
}

export const FILE_SIDEBAR = [
  { label: '~', dir: '' },
  { label: '~/blog', dir: 'blog' },
  { label: '~/projects', dir: 'projects' }
]

export function useFileExplorer(cb: ExplorerCallbacks) {
  const { files } = useTerminal()
  const trash = useTrash()

  // current position inside the home filesystem
  const vfsDir = ref('')
  const preview = ref<{ name: string, content: string } | null>(null)
  const actionError = ref('')

  const entryPath = (name: string) => (vfsDir.value ? `${vfsDir.value}/${name}` : name)

  // deleting from the explorer follows the same rules as `rm`: everything goes
  // to the bin, deleted site content stays deleted (reseed brings it back)
  const deleteVfsEntry = (entry: VfsEntry) => {
    const path = entryPath(entry.name)
    actionError.value = ''
    trash.discard(path)
    if (preview.value?.name === entry.name) preview.value = null
  }

  // ---- right-click menu + inline rename ----
  const fileMenu = ref<{ entry: VfsEntry, x: number, y: number } | null>(null)
  const renaming = ref<string | null>(null)
  const renameValue = ref('')
  const renameRef = ref<HTMLInputElement[]>()

  const openFileMenu = (entry: VfsEntry, event: MouseEvent) => {
    // position relative to the files pane (the window content scrolls with it)
    const host = (event.currentTarget as HTMLElement).closest('.files')?.getBoundingClientRect()
    fileMenu.value = {
      entry,
      x: event.clientX - (host?.left ?? 0),
      y: event.clientY - (host?.top ?? 0)
    }
  }
  useEventListener('click', () => (fileMenu.value = null))

  const menuOpenEntry = () => {
    if (fileMenu.value) openVfsEntry(fileMenu.value.entry)
    fileMenu.value = null
  }
  const menuEdit = () => {
    if (fileMenu.value && !fileMenu.value.entry.dir) {
      cb.edit(entryPath(fileMenu.value.entry.name))
    }
    fileMenu.value = null
  }
  const menuDelete = () => {
    if (fileMenu.value) deleteVfsEntry(fileMenu.value.entry)
    fileMenu.value = null
  }
  const properties = ref<FileProps | null>(null)
  const menuProperties = () => {
    if (!fileMenu.value) return
    const entry = fileMenu.value.entry
    const path = entryPath(entry.name)
    const node = files.value[path]
    const content = node?.content ?? ''
    const bytes = content.length
    properties.value = {
      name: entry.name,
      kind: entry.dir ? 'directory' : (entry.name.match(/\.(\w+)$/)?.[1] ?? 'file') + ' file',
      size: bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`,
      lines: entry.dir ? null : (content ? content.split('\n').length : 0),
      path,
      perms: entry.sys
        ? '-rw-r--r--  (site content — edit, delete, reseed at will)'
        : entry.dir ? 'drwxr-xr-x  (yours, all of it)' : '-rw-r--r--  (read, write, dream)'
    }
    fileMenu.value = null
  }

  const menuRename = () => {
    if (!fileMenu.value) return
    renaming.value = fileMenu.value.entry.name
    renameValue.value = fileMenu.value.entry.name
    actionError.value = ''
    fileMenu.value = null
    void nextTick(() => renameRef.value?.[0]?.select())
  }

  const applyRename = (entry: VfsEntry) => {
    const oldPath = entryPath(entry.name)
    // renaming site content away counts as deleting the original paths
    const oldPaths = Object.keys(files.value)
      .filter((key) => key === oldPath || key.startsWith(`${oldPath}/`))
    const result = renamePath(files.value, oldPath, renameValue.value)
    if ('error' in result) {
      actionError.value = `rename: ${result.error}`
      renaming.value = null
      return
    }
    files.value = result.files
    markSeedsDeleted(oldPaths)
    actionError.value = ''
    renaming.value = null
  }

  const switchDir = (dir: string) => {
    vfsDir.value = dir
    preview.value = null
  }

  // clickable path segments: ~ / dir / subdir (the current one is inert)
  const crumbs = computed(() => {
    const segments = vfsDir.value ? vfsDir.value.split('/') : []
    return segments.map((name, i) => ({ name, path: segments.slice(0, i + 1).join('/') }))
  })

  const vfsEntries = computed<VfsEntry[]>(() =>
    dirEntries(files.value, vfsDir.value)
      .map((entry) => {
        const path = entryPath(entry.name)
        const sys = isSysPath(files.value, path)
        return {
          ...entry,
          sys,
          // a user-owned node where a seed exists is a local edit of site content
          edited: !entry.dir && !sys && typeof seedFor(path) === 'string'
        }
      })
      .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
  )

  const openVfsEntry = (entry: VfsEntry) => {
    const path = entryPath(entry.name)
    if (entry.dir) {
      vfsDir.value = path
      preview.value = null
      return
    }
    // blog posts open in the reader app; the resume opens the PDF viewer;
    // right-click → "edit in vim" works on any of them
    const post = /^blog\/(.+)\.md$/.exec(path)
    if (post) return cb.post(`/blog/${post[1]}`)
    if (path.endsWith('.pdf')) return cb.window('cv')
    if (path === 'notes.txt') return cb.edit(path)
    preview.value = { name: entry.name, content: files.value[path]?.content ?? '' }
  }

  // ---- keyboard navigation (the list is a listbox) ----
  const listRef = ref<HTMLElement>()
  const selected = ref(0)
  // keep the selection in range as the directory's contents change
  watch(vfsEntries, (entries) => {
    if (selected.value >= entries.length) selected.value = Math.max(0, entries.length - 1)
  })
  watch(vfsDir, () => (selected.value = 0))

  const parentDir = () => vfsDir.value.split('/').slice(0, -1).join('/')

  const onListKeydown = (event: KeyboardEvent) => {
    // ignore keys that came from the inline rename input — its own handlers own
    // them, and by the time this bubbled handler runs `renaming` may already be
    // cleared (applyRename ran first), so guard on the event target, not state
    if (event.target instanceof HTMLElement && event.target.closest('.files-rename')) return
    const entries = vfsEntries.value
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selected.value = Math.min(selected.value + 1, entries.length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        selected.value = Math.max(selected.value - 1, 0)
        break
      case 'Enter':
      case 'ArrowRight': {
        event.preventDefault()
        const entry = entries[selected.value]
        if (entry) openVfsEntry(entry)
        break
      }
      case 'Backspace':
      case 'ArrowLeft':
        if (vfsDir.value) {
          event.preventDefault()
          vfsDir.value = parentDir()
        }
        break
      case 'Delete': {
        event.preventDefault()
        const entry = entries[selected.value]
        if (entry) deleteVfsEntry(entry)
        break
      }
    }
  }

  // ---- drag to move files/folders between directories ----
  const dragPath = ref<string | null>(null)
  const dropTarget = ref<string | null>(null)

  const onDragStart = (entry: VfsEntry, event: DragEvent) => {
    dragPath.value = entryPath(entry.name)
    event.dataTransfer?.setData('text/plain', dragPath.value)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  const dropInto = (destDir: string) => {
    const from = dragPath.value
    dragPath.value = null
    dropTarget.value = null
    if (!from) return
    const name = from.split('/').pop()!
    const fromParent = from.split('/').slice(0, -1).join('/')
    if (destDir === fromParent) return // already there
    if (destDir === from || destDir.startsWith(`${from}/`)) {
      actionError.value = `can't move ${name} into itself`
      return
    }
    const target = destDir ? `${destDir}/${name}` : name
    if (files.value[target]) {
      actionError.value = `${name} already exists in that folder`
      return
    }
    // remap the node (and any subtree) to the new path; a moved copy is the
    // visitor's own (drops the sys flag), and moving site content tombstones it
    const moved: typeof files.value = {}
    const origins: string[] = []
    for (const [key, node] of Object.entries(files.value)) {
      if (key === from || key.startsWith(`${from}/`)) {
        moved[`${target}${key.slice(from.length)}`] = { dir: node.dir, content: node.content }
        origins.push(key)
      } else {
        moved[key] = node
      }
    }
    files.value = moved
    markSeedsDeleted(origins)
    actionError.value = ''
  }

  return {
    vfsDir, preview, actionError, entryPath,
    deleteVfsEntry,
    fileMenu, renaming, renameValue, renameRef, openFileMenu,
    menuOpenEntry, menuEdit, menuDelete, properties, menuProperties, menuRename, applyRename,
    switchDir, crumbs, vfsEntries, openVfsEntry,
    listRef, selected, onListKeydown,
    dragPath, dropTarget, onDragStart, dropInto
  }
}
