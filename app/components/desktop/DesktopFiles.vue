<template>
  <div class="files is-family-code">
    <div class="files-body">
      <div class="files-dirs">
        <button
          v-for="shortcut in SIDEBAR"
          :key="shortcut.label"
          :class="{ 'is-active': shortcut.dir === vfsDir }"
          @click="switchDir(shortcut.dir)"
        >
          {{ shortcut.label }}/
        </button>
      </div>
      <div class="files-list">
        <nav v-if="vfsDir" class="files-crumbs" aria-label="Current folder path">
          <button class="files-crumb" @click="vfsDir = ''">~</button>
          <template v-for="crumb in crumbs" :key="crumb.path">
            <span class="files-crumb-sep" aria-hidden="true">/</span>
            <button class="files-crumb" :disabled="crumb.path === vfsDir" @click="vfsDir = crumb.path">
              {{ crumb.name }}
            </button>
          </template>
        </nav>
        <div v-for="entry in vfsEntries" :key="entry.name" class="files-row">
          <template v-if="renaming === entry.name">
            <input
              ref="renameRef"
              v-model="renameValue"
              class="files-rename is-family-code"
              :aria-label="`New name for ${entry.name}`"
              spellcheck="false"
              @keydown.enter.prevent="applyRename(entry)"
              @keydown.esc.prevent="renaming = null"
              @blur="renaming = null"
            >
          </template>
          <template v-else>
            <button
              class="files-file"
              :class="{ 'is-dir': entry.dir }"
              @click="openVfsEntry(entry)"
              @contextmenu.prevent.stop="openFileMenu(entry, $event)"
            >
              <span v-if="entry.dir" class="files-glyph" aria-hidden="true">▸</span>
              <AppIcon v-else name="file" :size="13" />
              <span>{{ entry.name }}{{ entry.dir ? '/' : '' }}</span>
              <span v-if="entry.edited" class="files-badge" title="Edited by you — rm restores the original">edited</span>
            </button>
            <button
              class="files-delete"
              :aria-label="`Move ${entry.name} to the recycle bin`"
              title="Move to recycle bin"
              @click="deleteVfsEntry(entry)"
            >×</button>
          </template>
        </div>
        <p v-if="actionError" class="files-error">{{ actionError }}</p>
        <p v-if="!vfsDir" class="files-hint">
          the site's pages live here as real folders — and files you create in
          the terminal (touch, echo &gt;, mkdir) show up alongside them
        </p>
      </div>
    </div>
    <!-- right-click context menu on a file: open / rename / bin -->
    <div
      v-if="fileMenu"
      class="files-menu is-family-code"
      :style="{ left: `${fileMenu.x}px`, top: `${fileMenu.y}px` }"
    >
      <button @click="menuOpenEntry">open</button>
      <button v-if="fileMenu && !fileMenu.entry.dir" @click="menuEdit">edit in vim</button>
      <button @click="menuRename">rename</button>
      <button @click="menuProperties">properties</button>
      <button class="is-danger" @click="menuDelete">move to bin</button>
    </div>

    <!-- file properties dialog -->
    <div v-if="properties" class="files-props is-family-code">
      <div class="files-props-head">
        <span>{{ properties.name }}</span>
        <button aria-label="Close" @click="properties = null">×</button>
      </div>
      <table class="files-props-table">
        <tbody>
          <tr><th>kind</th><td>{{ properties.kind }}</td></tr>
          <tr><th>size</th><td>{{ properties.size }}</td></tr>
          <tr v-if="properties.lines !== null"><th>lines</th><td>{{ properties.lines }}</td></tr>
          <tr><th>path</th><td>~/{{ properties.path }}</td></tr>
          <tr><th>perms</th><td>{{ properties.perms }}</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="preview" class="files-preview">
      <div class="files-preview-head">
        <span>$ cat {{ preview.name }}</span>
        <button aria-label="Close preview" @click="preview = null">×</button>
      </div>
      <pre>{{ preview.content || '(empty file)' }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { dirEntries, renamePath } from '~/utils/terminal/filesystem'
import { seedFor, isSysPath, markSeedsDeleted } from '~/utils/terminal/siteFs'

// lvOS file explorer over THE filesystem — the same one the terminal's
// cd/ls/cat/vim walk, which holds the site's pages as seeded folders next to
// whatever the visitor created. Blog posts open in the blog reader, the
// resume opens the PDF viewer, everything else previews inline.

const emit = defineEmits<{
  window: [id: string]
  post: [path: string]
  /** Open a file in the vim window */
  edit: [path: string]
}>()

const SIDEBAR = [
  { label: '~', dir: '' },
  { label: '~/blog', dir: 'blog' },
  { label: '~/projects', dir: 'projects' }
]

// current position inside the home filesystem
const vfsDir = ref('')
const preview = ref<{ name: string, content: string } | null>(null)

const { files } = useTerminal()
const trash = useTrash()

const entryPath = (name: string) => (vfsDir.value ? `${vfsDir.value}/${name}` : name)

const actionError = ref('')

// deleting from the explorer follows the same rules as `rm`: everything goes
// to the bin, deleted site content stays deleted (reseed brings it back)
const deleteVfsEntry = (entry: VfsEntry) => {
  const path = entryPath(entry.name)
  actionError.value = ''
  trash.discard(path)
  if (preview.value?.name === entry.name) preview.value = null
}

// ---- right-click menu + inline rename ----
interface VfsEntry { name: string, dir: boolean, sys: boolean, edited: boolean }
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
    emit('edit', entryPath(fileMenu.value.entry.name))
  }
  fileMenu.value = null
}
const menuDelete = () => {
  if (fileMenu.value) deleteVfsEntry(fileMenu.value.entry)
  fileMenu.value = null
}
interface Props { name: string, kind: string, size: string, lines: number | null, path: string, perms: string }
const properties = ref<Props | null>(null)
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
  if (post) return emit('post', `/blog/${post[1]}`)
  if (path.endsWith('.pdf')) return emit('window', 'cv')
  if (path === 'notes.txt') return emit('edit', path)
  preview.value = { name: entry.name, content: files.value[path]?.content ?? '' }
}
</script>

<style scoped lang="scss">
.files {
  position: relative; // anchors the right-click file menu
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 11rem;
  font-size: 0.78rem;
}

.files-body {
  display: flex;
  gap: 0.75rem;
  flex: 1;
}

.files-dirs {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-right: 0.75rem;
  border-right: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);

  button {
    padding: 0.3rem 0.6rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;

    &.is-active,
    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
      color: var(--bulma-primary);
    }
  }
}

.files-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.files-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: var(--bulma-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }

  &.is-dir {
    color: var(--bulma-primary);
  }

  .files-badge {
    margin-left: 0.3rem;
    padding: 0 0.3rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
    border-radius: 0.5rem;
    color: var(--bulma-primary);
    font-size: 0.6rem;
    line-height: 1.4;
  }
}

.files-row {
  display: flex;
  align-items: center;

  .files-file {
    flex: 1;
  }

  // the delete affordance only surfaces on hover, keeping the list calm
  .files-delete {
    padding: 0 0.4rem;
    border: none;
    background: none;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
  }

  &:hover .files-delete,
  .files-delete:focus-visible {
    opacity: 1;
  }

  .files-delete:hover {
    color: var(--bulma-danger);
  }
}

.files-glyph {
  width: 13px;
  text-align: center;
}

.files-crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem;
  padding: 0.1rem 0.3rem 0.35rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
  margin-bottom: 0.25rem;

  .files-crumb {
    padding: 0.1rem 0.3rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }

    &:disabled {
      color: hsl(var(--lv-scheme-hs), 80%);
      cursor: default;
    }
  }

  .files-crumb-sep {
    color: hsl(var(--lv-scheme-hs), 45%);
    font-size: 0.72rem;
  }
}

.files-hint {
  margin-top: 0.4rem;
  padding: 0.3rem 0.5rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}

.files-rename {
  flex: 1;
  margin: 0.15rem 0;
  padding: 0.2rem 0.5rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 92%);
  font-size: inherit;
  outline: none;
  caret-color: var(--bulma-primary);
}

.files-error {
  padding: 0.2rem 0.5rem;
  color: var(--bulma-danger);
  font-size: 0.7rem;
}

.files-props {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 31;
  min-width: 14rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 10px 26px hsla(var(--lv-scheme-hs), 2%, 0.5);
  font-size: 0.72rem;

  .files-props-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    color: var(--bulma-primary);

    button {
      border: none;
      background: none;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
  }

  .files-props-table {
    th {
      padding: 0.1rem 0.8rem 0.1rem 0;
      color: hsl(var(--lv-scheme-hs), 55%);
      font-weight: normal;
      text-align: left;
      vertical-align: top;
    }

    td {
      padding: 0.1rem 0;
      color: hsl(var(--lv-scheme-hs), 88%);
      word-break: break-all;
    }
  }
}

.files-menu {
  position: absolute;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 8rem;
  padding: 0.25rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 10px 26px hsla(var(--lv-scheme-hs), 2%, 0.5);

  button {
    padding: 0.35rem 0.6rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 88%);
    font: inherit;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }

    &.is-danger:hover {
      color: var(--bulma-danger);
    }
  }
}

.files-preview {
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  padding-top: 0.4rem;

  .files-preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--bulma-primary);
    margin-bottom: 0.25rem;

    button {
      border: none;
      background: none;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
  }

  pre {
    max-height: 8rem;
    overflow: auto;
    padding: 0.4rem 0.5rem;
    background-color: hsla(var(--lv-scheme-hs), 50%, 0.08);
    border-radius: var(--bulma-radius-small);
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
}
</style>
