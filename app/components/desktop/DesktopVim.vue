<template>
  <div class="vim is-family-code">
    <textarea
      ref="bufferRef"
      v-model="buffer"
      class="vim-buffer"
      spellcheck="false"
      :readonly="mode !== 'insert'"
      @keydown="onKey"
    />
    <div class="vim-statusline">
      <span class="vim-mode" :class="`is-${mode}`">
        {{ mode === 'insert' ? '-- INSERT --' : mode === 'command' ? `:${command}` : 'NORMAL' }}
      </span>
      <span class="vim-file">~/{{ path }} {{ dirty ? '[+]' : '' }}</span>
      <span class="vim-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// A lovingly reduced vim: i/a/o insert, hjkl motion, x delete, :w :q :wq.
// It edits any file in the shared home filesystem — the Files app's
// "edit in vim" hands it a path; without one it opens the classic notes.txt.
// The one thing it does better than real vim: you already know how to quit.

import { storageGet, storageRemove } from '~/utils/safeStorage'
import { writeFileAt } from '~/utils/terminal/filesystem'

const props = defineProps<{ openPath?: string | null }>()
const emit = defineEmits<{ close: [] }>()

const LEGACY_KEY = 'lvos-vim-buffer'
const { files } = useTerminal()
const DEFAULT_BUFFER = `# notes.txt

todo:
- [x] rebuild the website
- [x] hide a terminal in it
- [x] hide an OS in the website
- [ ] hide a website in the OS (done? check lv browser)
- [ ] finally learn how to exit vim

(psst: you can actually edit this file — press i)
(it saves with :w and remembers your changes)`

const path = computed(() => props.openPath ?? 'notes.txt')

const buffer = ref('')
const savedBuffer = ref('')
const mode = ref<'normal' | 'insert' | 'command'>('normal')
const command = ref('')
const hint = ref(`:q quits — you know this one`)
const bufferRef = ref<HTMLTextAreaElement>()

const dirty = computed(() => buffer.value !== savedBuffer.value)

const loadFile = () => {
  const fallback = path.value === 'notes.txt' ? DEFAULT_BUFFER : ''
  const saved = files.value[path.value]?.content
  buffer.value = saved ?? fallback
  savedBuffer.value = buffer.value
  mode.value = 'normal'
}

// switching files through the Files app reloads the buffer
watch(path, () => {
  loadFile()
  hint.value = `"~/${path.value}" opened`
})

onMounted(() => {
  // migrate a pre-unification notes buffer once, then load whatever we edit
  const legacy = storageGet(LEGACY_KEY)
  if (legacy !== null) {
    if (!files.value['notes.txt']) {
      const written = writeFileAt(files.value, '', 'notes.txt', legacy)
      if (!('error' in written)) files.value = written.files
    }
    storageRemove(LEGACY_KEY)
  }
  loadFile()
  bufferRef.value?.focus()
})

const write = () => {
  const written = writeFileAt(files.value, '', path.value, buffer.value)
  if ('error' in written) {
    hint.value = 'E212: cannot open file for writing'
    return
  }
  files.value = written.files
  savedBuffer.value = buffer.value
  hint.value = `"~/${path.value}" ${buffer.value.split('\n').length}L written`
}

const runCommand = () => {
  const cmd = command.value.trim()
  command.value = ''
  mode.value = 'normal'
  switch (cmd) {
    case 'q':
      if (dirty.value) {
        hint.value = 'E37: no write since last change (add ! to override)'
        return
      }
      emit('close')
      return
    case 'q!':
      buffer.value = savedBuffer.value
      emit('close')
      return
    case 'w':
      write()
      return
    case 'wq':
    case 'x':
      write()
      emit('close')
      return
    case 'help':
      hint.value = 'i insert · Esc normal · hjkl move · x delete · :w :q :wq'
      return
    default:
      hint.value = cmd ? `E492: not an editor command: ${cmd}` : ''
  }
}

const moveCursor = (delta: number) => {
  const el = bufferRef.value
  if (!el) return
  const pos = Math.max(0, Math.min(buffer.value.length, el.selectionStart + delta))
  el.setSelectionRange(pos, pos)
}

const moveLine = (direction: 1 | -1) => {
  const el = bufferRef.value
  if (!el) return
  const pos = el.selectionStart
  const lines = buffer.value.split('\n')
  let index = 0
  let offset = pos
  while (index < lines.length && offset > lines[index]!.length) {
    offset -= lines[index]!.length + 1
    index++
  }
  const target = index + direction
  if (target < 0 || target >= lines.length) return
  let newPos = 0
  for (let i = 0; i < target; i++) newPos += lines[i]!.length + 1
  newPos += Math.min(offset, lines[target]!.length)
  el.setSelectionRange(newPos, newPos)
}

const onKey = (event: KeyboardEvent) => {
  const el = bufferRef.value
  if (!el) return

  if (mode.value === 'insert') {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      mode.value = 'normal'
      hint.value = ''
    }
    return
  }

  event.preventDefault()
  if (event.key !== 'Escape') event.stopPropagation()

  if (mode.value === 'command') {
    if (event.key === 'Enter') runCommand()
    else if (event.key === 'Escape') {
      command.value = ''
      mode.value = 'normal'
    } else if (event.key === 'Backspace') command.value = command.value.slice(0, -1)
    else if (event.key.length === 1) command.value += event.key
    return
  }

  // normal mode
  switch (event.key) {
    case 'i':
      mode.value = 'insert'
      break
    case 'a':
      moveCursor(1)
      mode.value = 'insert'
      break
    case 'o': {
      const pos = buffer.value.indexOf('\n', el.selectionStart)
      const insertAt = pos === -1 ? buffer.value.length : pos
      buffer.value = `${buffer.value.slice(0, insertAt)}\n${buffer.value.slice(insertAt)}`
      void nextTick(() => el.setSelectionRange(insertAt + 1, insertAt + 1))
      mode.value = 'insert'
      break
    }
    case 'x': {
      const pos = el.selectionStart
      if (pos < buffer.value.length) {
        buffer.value = buffer.value.slice(0, pos) + buffer.value.slice(pos + 1)
        void nextTick(() => el.setSelectionRange(pos, pos))
      }
      break
    }
    case 'h':
    case 'ArrowLeft':
      moveCursor(-1)
      break
    case 'l':
    case 'ArrowRight':
      moveCursor(1)
      break
    case 'j':
    case 'ArrowDown':
      moveLine(1)
      break
    case 'k':
    case 'ArrowUp':
      moveLine(-1)
      break
    case ':':
      mode.value = 'command'
      command.value = ''
      break
  }
}
</script>

<style scoped lang="scss">
.vim {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 16rem;
  font-size: 0.78rem;
}

.vim-buffer {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 0.25rem;
  background: none;
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  line-height: 1.5;
  caret-color: var(--bulma-primary);
}

.vim-statusline {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: hsla(var(--lv-primary-hsl), 0.12);
  border-radius: var(--bulma-radius-small);
  font-size: 0.7rem;

  .vim-mode {
    font-weight: 700;
    color: hsl(var(--lv-scheme-hs), 70%);

    &.is-insert {
      color: var(--bulma-primary);
    }

    &.is-command {
      color: hsl(var(--lv-scheme-hs), 95%);
    }
  }

  .vim-file {
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  .vim-hint {
    margin-left: auto;
    color: hsl(var(--lv-scheme-hs), 55%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
