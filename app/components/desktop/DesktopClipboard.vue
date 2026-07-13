<template>
  <div class="clip is-family-code">
    <div class="clip-head">
      <span>clipboard history</span>
      <button v-if="items.length" class="clip-clear" title="Forget everything copied" @click="clear">clear</button>
    </div>

    <p v-if="!items.length" class="clip-empty">
      nothing copied yet — copy a terminal line, a code block, the vCard or a colour and it lands here.
    </p>
    <ul v-else class="clip-list">
      <li v-for="(entry, i) in items" :key="`${entry.at}-${i}`">
        <button class="clip-item" :title="`click to copy again — ${entry.text}`" @click="recopy(entry.text)">
          <span class="clip-text">{{ preview(entry.text) }}</span>
          <span class="clip-when">{{ justCopied === entry.text ? 'copied ✓' : ago(entry.at) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { writeClipboard } from '~/utils/clipboard'

// The lvOS Clipboard app: a rolling list of what the site has copied (terminal
// `| copy`, blog code/inline copy, the vCard email, the colour picker, the
// palette share link — every copy flows through writeClipboard). Click an entry
// to copy it again, which also bumps it back to the top.
const { items, clear } = useClipboardHistory()

const justCopied = ref('')
let flashTimer: ReturnType<typeof setTimeout> | undefined
const recopy = (text: string) => {
  void writeClipboard(text)
  justCopied.value = text
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (justCopied.value = ''), 1200)
}
onUnmounted(() => clearTimeout(flashTimer))

const preview = (text: string) => {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > 64 ? `${oneLine.slice(0, 61)}…` : oneLine
}

const now = useNow({ interval: 30_000 })
const ago = (at: number) => {
  const s = Math.max(0, Math.round((now.value.getTime() - at) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
</script>

<style scoped lang="scss">
.clip {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  min-height: 0;
  font-size: 0.78rem;
}

.clip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: hsl(var(--lv-scheme-hs), 80%);
}

.clip-clear {
  padding: 0.2rem 0.55rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 70%);
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.6);
    color: hsl(var(--lv-scheme-hs), 95%);
  }

  @media (pointer: coarse) {
    min-height: 2.2rem;
    padding: 0.25rem 0.8rem;
  }
}

.clip-empty {
  color: hsl(var(--lv-scheme-hs), 55%);
  line-height: 1.4;
}

.clip-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  min-height: 0;
  list-style: none;
  margin: 0;
  padding: 0;
}

.clip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.22);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 85%);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.6);
    background-color: hsla(var(--lv-primary-hsl), 0.08);
  }

  @media (pointer: coarse) {
    min-height: 2.6rem;
  }
}

.clip-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.clip-when {
  flex-shrink: 0;
  color: hsl(var(--lv-scheme-hs), 52%);
  font-size: 0.7rem;
}
</style>
