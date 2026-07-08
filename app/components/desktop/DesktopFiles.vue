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
          <button
            v-for="entry in vfsEntries"
            :key="entry.name"
            class="files-file"
            :class="{ 'is-dir': entry.dir }"
            @click="openVfsEntry(entry)"
          >
            <span v-if="entry.dir" class="files-glyph" aria-hidden="true">▸</span>
            <AppIcon v-else name="file" :size="13" />
            <span>{{ entry.name }}{{ entry.dir ? '/' : '' }}</span>
          </button>
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
import { projects } from '~/data/projects'
import { dirEntries } from '~/utils/terminal/filesystem'

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
  // home shows the curated site files only at the top level
  if (vfsDir.value) return []
  return [
    { name: 'readme.md', open: () => emit('window', 'readme') },
    { name: 'notes.txt', open: () => emit('window', 'vim') },
    { name: 'uses.txt', open: () => emit('route', '/uses') },
    { name: 'now.txt', open: () => emit('route', '/now') },
    { name: 'resume.pdf', open: () => emit('route', '/cv') }
  ]
})
</script>

<style scoped lang="scss">
.files {
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
    word-break: break-word;
  }
}
</style>
