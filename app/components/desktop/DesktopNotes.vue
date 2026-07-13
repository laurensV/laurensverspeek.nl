<template>
  <div class="notes is-family-code">
    <div class="notes-bar">
      <button class="notes-new" @click="addNote">+ new note</button>
      <span class="notes-meta">{{ notes.length }} note{{ notes.length === 1 ? '' : 's' }} · these are real files in ~/stickies</span>
    </div>

    <p v-if="!notes.length" class="notes-empty">
      the corkboard is empty.<br>jot a thought — it lands in ~/stickies, the terminal sees it too.
    </p>

    <div v-else class="notes-board">
      <article v-for="note in notes" :key="note.path" class="note">
        <header class="note-head">
          <span class="note-time">{{ note.name }}</span>
          <button class="note-del" :aria-label="`Move ${note.name} to the recycle bin`" @click="removeNote(note)">×</button>
        </header>
        <textarea
          :value="note.text"
          class="note-text"
          rows="5"
          placeholder="type here…"
          spellcheck="false"
          @input="keyClick.click(); writeNote(note, ($event.target as HTMLTextAreaElement).value)"
        />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
// Sticky notes: a corkboard view over real files in ~/stickies — the same
// shared filesystem the terminal and the Files app walk. `echo hi >
// stickies/idea.txt` pins a note; deleting one here goes to the recycle bin.

import { storageGetJson, storageRemove } from '~/utils/safeStorage'
import { dirEntries, writeFileAt } from '~/utils/terminal/filesystem'

const NOTES_DIR = 'stickies'
const LEGACY_KEY = 'lvos-notes'

const { files } = useTerminal()
const trash = useTrash()
// shared opt-in typing sound (the `keyclick` setting) ticks in lvOS text fields
// too, not just the terminal — silent unless the setting is on and unmuted
const keyClick = useKeyClick()

interface LegacyNote { id: number, text: string, updated: number }
const isLegacyNotes = (value: unknown): value is LegacyNote[] =>
  Array.isArray(value) && value.every((n) =>
    !!n && typeof n === 'object' && typeof (n as LegacyNote).text === 'string')

const ensureDir = () => {
  if (!files.value[NOTES_DIR]?.dir) {
    files.value = { ...files.value, [NOTES_DIR]: { dir: true, content: '' } }
  }
}

const writeNote = (note: { path: string }, text: string) => {
  const written = writeFileAt(files.value, '', note.path, text)
  if (!('error' in written)) files.value = written.files
}

// migrate the pre-filesystem corkboard once: each old note becomes a file
if (import.meta.client) {
  const legacy = storageGetJson(LEGACY_KEY, isLegacyNotes)
  if (legacy?.length) {
    ensureDir()
    legacy.forEach((note, i) => {
      const path = `${NOTES_DIR}/note-${legacy.length - i}.txt`
      if (!files.value[path]) {
        const written = writeFileAt(files.value, '', path, note.text)
        if (!('error' in written)) files.value = written.files
      }
    })
  }
  storageRemove(LEGACY_KEY)
}

const notes = computed(() =>
  dirEntries(files.value, NOTES_DIR)
    .filter((entry) => !entry.dir)
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))
    .map((entry) => ({
      name: entry.name,
      path: `${NOTES_DIR}/${entry.name}`,
      text: files.value[`${NOTES_DIR}/${entry.name}`]?.content ?? ''
    }))
)

const addNote = () => {
  ensureDir()
  // first free note-N name (numeric-aware, so note-10 comes after note-9)
  let n = 1
  while (files.value[`${NOTES_DIR}/note-${n}.txt`]) n++
  const written = writeFileAt(files.value, '', `${NOTES_DIR}/note-${n}.txt`, '')
  if (!('error' in written)) files.value = written.files
}

const removeNote = (note: { path: string }) => {
  trash.discard(note.path)
}
</script>

<style scoped lang="scss">
.notes {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 16rem;
}

.notes-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
}

.notes-new {
  padding: 0.25rem 0.7rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-primary-hsl), 0.12);
  color: var(--bulma-primary);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;

  &:hover {
    background: hsla(var(--lv-primary-hsl), 0.22);
  }
}

.notes-meta {
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.68rem;
}

.notes-empty {
  margin: auto;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.8rem;
  text-align: center;
  line-height: 1.6;
}

.notes-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.6rem;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.note {
  display: flex;
  flex-direction: column;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.28);
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-primary-hsl), 0.07);
  // faint "peeled corner" so it reads as paper
  box-shadow: 0 2px 8px hsla(var(--lv-scheme-hs), 4%, 0.3);
}

.note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.45rem;
  border-bottom: 1px solid hsla(var(--lv-primary-hsl), 0.18);

  .note-time {
    color: hsl(var(--lv-scheme-hs), 50%);
    font-size: 0.62rem;
  }

  .note-del {
    border: none;
    background: none;
    padding: 0 0.2rem;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: var(--bulma-primary);
    }
  }
}

.note-text {
  flex: 1;
  width: 100%;
  min-height: 5.5rem;
  padding: 0.5rem;
  border: none;
  background: none;
  resize: vertical;
  color: hsl(var(--lv-scheme-hs), 90%);
  font: inherit;
  font-size: 0.78rem;
  line-height: 1.5;

  // 16px on touch so focusing the note doesn't zoom the desktop on iOS
  @media (pointer: coarse) {
    font-size: 16px;
  }

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: hsl(var(--lv-scheme-hs), 40%);
  }
}
</style>
