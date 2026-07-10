<template>
  <div class="trash is-family-code">
    <p v-if="!entries.length" class="trash-empty">
      the bin is empty. delete something with <b>rm</b> in the terminal
      (or the × in the file explorer) and it lands here.
    </p>
    <template v-else>
      <div v-for="entry in entries" :key="entry.id" class="trash-row">
        <span class="trash-glyph" aria-hidden="true">{{ entry.dir ? '▸' : '·' }}</span>
        <span class="trash-name">{{ entry.name }}{{ entry.dir ? '/' : '' }}</span>
        <span class="trash-meta">{{ entrySize(entry) }} · {{ age(entry.deletedAt) }}</span>
        <button class="trash-restore" @click="restore(entry.id)">restore</button>
      </div>
      <div class="trash-foot">
        <span>{{ entries.length }} item{{ entries.length === 1 ? '' : 's' }}</span>
        <button class="trash-empty-btn" @click="empty">empty bin</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { entrySize } from '~/utils/trash'

// The lvOS recycle bin: everything rm'd from the virtual filesystem waits
// here until it's restored or the bin is emptied.
const { entries, restore, empty } = useTrash()

const age = (deletedAt: number) => {
  const minutes = Math.floor((Date.now() - deletedAt) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<style scoped lang="scss">
.trash {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-height: 9rem;
  font-size: 0.78rem;
}

.trash-empty {
  margin: auto;
  max-width: 16rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  text-align: center;
  font-size: 0.72rem;
  line-height: 1.6;
}

.trash-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.4rem;
  border-radius: var(--bulma-radius-small);

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.1);
  }
}

.trash-glyph {
  width: 1em;
  text-align: center;
  color: var(--bulma-primary);
}

.trash-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-meta {
  margin-left: auto;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.68rem;
  white-space: nowrap;
}

.trash-restore,
.trash-empty-btn {
  padding: 0.15rem 0.5rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }
}

.trash-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}

.trash-empty-btn {
  border-color: hsla(var(--lv-scheme-hs), 50%, 0.3);
  color: var(--bulma-danger);

  &:hover {
    background-color: hsla(348, 86%, 61%, 0.12);
  }
}
</style>
