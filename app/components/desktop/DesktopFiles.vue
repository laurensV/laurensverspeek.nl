<template>
  <div class="files is-family-code">
    <div class="files-body">
      <div class="files-dirs">
        <button
          v-for="dir in SIDEBAR"
          :key="dir"
          :class="{ 'is-active': dir === activeDir }"
          @click="switchDir(dir)"
        >
          {{ dir }}/
        </button>
      </div>
      <div class="files-list">
        <template v-if="activeDir === '~'">
          <button v-if="vfsDir" class="files-file is-dir" @click="vfsDir = parentDir">
            <span class="files-glyph" aria-hidden="true">▸</span>
            <span>..</span>
          </button>
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
              </button>
              <button
                class="files-delete"
                :aria-label="`Move ${entry.name} to the recycle bin`"
                title="Move to recycle bin"
                @click="deleteVfsEntry(entry)"
              >×</button>
            </template>
          </div>
          <p v-if="renameError" class="files-error">{{ renameError }}</p>
        </template>
        <button v-for="file in curated" :key="file.name" class="files-file" @click="file.open()">
          <AppIcon name="file" :size="13" />
          <span>{{ file.name }}</span>
        </button>
        <p v-if="activeDir === '~' && !vfsDir" class="files-hint">
          files you create in the terminal (touch, echo &gt;, mkdir) show up here
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
      <button @click="menuRename">rename</button>
      <button class="is-danger" @click="menuDelete">move to bin</button>
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
import { projects } from '~/data/projects'
import { dirEntries, renamePath } from '~/utils/terminal/filesystem'

// lvOS file explorer over the site's content AND the terminal's persistent
// home filesystem — the same one mkdir/touch/echo> write to (shared useState).

const emit = defineEmits<{
  route: [path: string]
  window: [id: string]
  post: [path: string]
}>()

interface FileEntry {
  name: string
  open: () => void
}

const SIDEBAR = ['~', '~/projects', '~/blog']
const activeDir = ref('~')
// current position inside the home filesystem while browsing `~`
const vfsDir = ref('')
const preview = ref<{ name: string, content: string } | null>(null)

const { files } = useTerminal()
const trash = useTrash()

const entryPath = (name: string) => (vfsDir.value ? `${vfsDir.value}/${name}` : name)

// deleting from the explorer goes through the same recycle bin as `rm`
const deleteVfsEntry = (entry: { name: string, dir: boolean }) => {
  trash.discard(entryPath(entry.name))
  if (preview.value?.name === entry.name) preview.value = null
}

// ---- right-click menu + inline rename ----
interface VfsEntry { name: string, dir: boolean }
const fileMenu = ref<{ entry: VfsEntry, x: number, y: number } | null>(null)
const renaming = ref<string | null>(null)
const renameValue = ref('')
const renameError = ref('')
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
const menuDelete = () => {
  if (fileMenu.value) deleteVfsEntry(fileMenu.value.entry)
  fileMenu.value = null
}
const menuRename = () => {
  if (!fileMenu.value) return
  renaming.value = fileMenu.value.entry.name
  renameValue.value = fileMenu.value.entry.name
  renameError.value = ''
  fileMenu.value = null
  void nextTick(() => renameRef.value?.[0]?.select())
}

const applyRename = (entry: VfsEntry) => {
  const result = renamePath(files.value, entryPath(entry.name), renameValue.value)
  if ('error' in result) {
    renameError.value = `rename: ${result.error}`
    renaming.value = null
    return
  }
  files.value = result.files
  renameError.value = ''
  renaming.value = null
}

const { data: posts } = useLazyAsyncData('desktop-posts', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const switchDir = (dir: string) => {
  activeDir.value = dir
  vfsDir.value = ''
  preview.value = null
}

const parentDir = computed(() => vfsDir.value.split('/').slice(0, -1).join('/'))

const vfsEntries = computed(() => {
  if (activeDir.value !== '~') return []
  return dirEntries(files.value, vfsDir.value)
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
})

const openVfsEntry = (entry: { name: string, dir: boolean }) => {
  const path = vfsDir.value ? `${vfsDir.value}/${entry.name}` : entry.name
  if (entry.dir) {
    vfsDir.value = path
    preview.value = null
    return
  }
  preview.value = { name: entry.name, content: files.value[path]?.content ?? '' }
}

const curated = computed<FileEntry[]>(() => {
  if (activeDir.value === '~/projects') {
    return projects.map((p) => ({
      name: `${p.slug}.md`,
      open: () => emit('route', `/projects/${p.slug}`)
    }))
  }
  if (activeDir.value === '~/blog') {
    return (posts.value ?? []).map((post) => ({
      name: `${post.path.split('/').pop()}.md`,
      open: () => emit('post', post.path)
    }))
  }
  // home shows the curated site files only at the top level; a curated name
  // yields to a real VFS file of the same name (notes.txt after a vim :w)
  if (vfsDir.value) return []
  return [
    { name: 'readme.md', open: () => emit('window', 'readme') },
    { name: 'notes.txt', open: () => emit('window', 'vim') },
    { name: 'uses.txt', open: () => emit('route', '/uses') },
    { name: 'now.txt', open: () => emit('route', '/now') },
    { name: 'resume.pdf', open: () => emit('route', '/cv') }
  ].filter((file) => !files.value[file.name])
})
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
