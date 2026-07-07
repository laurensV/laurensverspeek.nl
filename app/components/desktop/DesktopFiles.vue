<template>
  <div class="files is-family-code">
    <div class="files-dirs">
      <button
        v-for="dir in Object.keys(tree)"
        :key="dir"
        :class="{ 'is-active': dir === activeDir }"
        @click="activeDir = dir"
      >
        {{ dir }}/
      </button>
    </div>
    <div class="files-list">
      <button v-for="file in tree[activeDir]" :key="file.name" class="files-file" @click="file.open()">
        <AppIcon name="file" :size="13" />
        <span>{{ file.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

// lvOS file explorer over the site's actual content.

const emit = defineEmits<{
  route: [path: string]
  window: [id: string]
}>()

interface FileEntry {
  name: string
  open: () => void
}

const activeDir = ref('~')

const { data: posts } = useLazyAsyncData('desktop-posts', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const tree = computed<Record<string, FileEntry[]>>(() => ({
  '~': [
    { name: 'readme.md', open: () => emit('window', 'readme') },
    { name: 'uses.txt', open: () => emit('route', '/uses') },
    { name: 'now.txt', open: () => emit('route', '/now') },
    { name: 'resume.pdf', open: () => emit('route', '/cv') }
  ],
  '~/projects': projects.map((p) => ({
    name: `${p.slug}.md`,
    open: () => emit('route', `/projects/${p.slug}`)
  })),
  '~/blog': (posts.value ?? []).map((post) => ({
    name: `${post.path.split('/').pop()}.md`,
    open: () => emit('route', post.path)
  }))
}))
</script>

<style scoped lang="scss">
.files {
  display: flex;
  gap: 0.75rem;
  min-height: 11rem;
  font-size: 0.78rem;
}

.files-dirs {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-right: 0.75rem;
  border-right: 1px solid hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 50%, 0.2);

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
      background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.15);
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
    background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.15);
  }
}
</style>
