<template>
  <div class="notes is-family-code">
    <div class="notes-bar">
      <button class="notes-new" @click="addNote">+ new note</button>
      <span class="notes-meta">{{ notes.length }} note{{ notes.length === 1 ? '' : 's' }} · saved in this browser</span>
    </div>

    <p v-if="!notes.length" class="notes-empty">
      the corkboard is empty.<br>jot a thought — it stays on this device.
    </p>

    <div v-else class="notes-board">
      <article v-for="note in notes" :key="note.id" class="note">
        <header class="note-head">
          <span class="note-time">{{ formatTime(note.updated) }}</span>
          <button class="note-del" :aria-label="`Delete note (${formatTime(note.updated)})`" @click="removeNote(note.id)">×</button>
        </header>
        <textarea
          v-model="note.text"
          class="note-text"
          rows="5"
          placeholder="type here…"
          spellcheck="false"
          @input="note.updated = Date.now()"
        />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
// Sticky notes: a little corkboard that persists to localStorage, so scribbles
// survive logging out of lvOS (and closing the tab). State lives in useState so
// it's shared if the window is reopened during a session.

interface StickyNote { id: number, text: string, updated: number }

const STORAGE_KEY = 'lvos-notes'
const notes = useState<StickyNote[]>('lvos-notes', () => [])

// hydrate from storage the first time the board is opened this session
if (import.meta.client && !notes.value.length) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (Array.isArray(saved)) {
      notes.value = saved.filter((n): n is StickyNote =>
        !!n && typeof n === 'object'
        && typeof (n as StickyNote).id === 'number'
        && typeof (n as StickyNote).text === 'string'
        && typeof (n as StickyNote).updated === 'number')
    }
  } catch { /* corrupted storage — start fresh */ }
}

const persist = () => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.value))
  } catch { /* storage full or blocked */ }
}
watch(notes, persist, { deep: true })

// ids only need to be unique within the session; seed past any restored ids
let seed = Date.now()
const addNote = () => {
  notes.value.unshift({ id: seed++, text: '', updated: Date.now() })
}
const removeNote = (id: number) => {
  notes.value = notes.value.filter((note) => note.id !== id)
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: hsl(var(--lv-scheme-hs), 40%);
  }
}
</style>
