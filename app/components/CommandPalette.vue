<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="isOpen" class="palette-backdrop" role="dialog" aria-modal="true" aria-label="Command palette" @click.self="close">
        <div class="palette-window">
          <div class="palette-input-row">
            <AppIcon name="terminal" :size="16" class="palette-input-icon" />
            <input
              ref="inputRef"
              v-model="query"
              class="palette-input"
              type="text"
              placeholder="Search pages, projects, actions..."
              aria-label="Search pages, projects, actions"
              autocomplete="off"
              spellcheck="false"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter.prevent="performActive"
              @keydown.esc="close"
            >
            <span class="tag is-family-code palette-kbd">esc</span>
          </div>

          <div ref="listRef" class="palette-list">
            <template v-for="(group, section) in grouped" :key="section">
              <p class="palette-section is-family-code">{{ section }}</p>
              <button
                v-for="item in group"
                :key="item.id"
                class="palette-item"
                :class="{ 'is-active': item.id === activeId }"
                :data-palette-id="item.id"
                @click="item.perform()"
                @pointermove="activeId = item.id"
              >
                <AppIcon :name="item.icon" :size="16" />
                <span class="palette-label">{{ item.label }}</span>
                <span v-if="item.hint" class="palette-hint is-family-code">{{ item.hint }}</span>
              </button>
            </template>
            <p v-if="!results.length" class="palette-empty is-family-code">
              no results for '{{ query }}'
            </p>
          </div>

          <div class="palette-footer is-family-code">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>ctrl</kbd>+<kbd>k</kbd> toggle</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import type { PaletteAction } from '~/composables/useCommandPalette'

const { isOpen, close, toggle, actions } = useCommandPalette()

const query = ref('')
const activeId = ref('')
const inputRef = ref<HTMLInputElement>()
const listRef = ref<HTMLElement>()

const results = computed(() => {
  const scored = actions.value
    .map((action) => ({
      action,
      score: fuzzyScore(query.value, `${action.label} ${action.keywords ?? ''}`)
    }))
    .filter((entry) => entry.score > 0)
  if (query.value) scored.sort((a, b) => b.score - a.score)
  return scored.map((entry) => entry.action)
})

const grouped = computed(() => {
  const groups: Record<string, PaletteAction[]> = {}
  for (const action of results.value) {
    ;(groups[action.section] ??= []).push(action)
  }
  return groups
})

const performActive = () => {
  results.value.find((a) => a.id === activeId.value)?.perform()
}

const move = (delta: number) => {
  const list = results.value
  if (!list.length) return
  const index = list.findIndex((a) => a.id === activeId.value)
  const next = (index + delta + list.length) % list.length
  activeId.value = list[next]!.id
  nextTick(() => {
    listRef.value
      ?.querySelector(`[data-palette-id="${CSS.escape(activeId.value)}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

onKeyStroke('k', (event) => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    toggle()
  }
})

watch(isOpen, async (open) => {
  if (open) {
    query.value = ''
    activeId.value = results.value[0]?.id ?? ''
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(results, (list) => {
  if (!list.some((a) => a.id === activeId.value)) {
    activeId.value = list[0]?.id ?? ''
  }
})
</script>

<style scoped lang="scss">
.palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12vh 1rem 1rem;
  background-color: hsla(var(--lv-scheme-hs), 4%, 0.55);
  backdrop-filter: blur(4px);
}

.palette-window {
  display: flex;
  flex-direction: column;
  width: min(36rem, 100%);
  max-height: 60vh;
  border: 1px solid var(--bulma-border);
  border-radius: var(--bulma-radius-large);
  background-color: var(--bulma-scheme-main);
  box-shadow: 0 24px 60px hsla(var(--lv-scheme-hs), 2%, 0.5);
  overflow: hidden;
}

.palette-input-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--bulma-border-weak);

  .palette-input-icon {
    color: var(--bulma-primary-on-scheme);
  }
}

.palette-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 1rem;
  font-family: var(--bulma-body-family);
  color: var(--bulma-text-strong);
}

.palette-kbd {
  background-color: var(--bulma-scheme-main-bis);
  border: 1px solid var(--bulma-border-weak);
}

.palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.palette-section {
  padding: 0.5rem 0.75rem 0.25rem;
  font-size: 0.7rem;
  text-transform: lowercase;
  color: var(--bulma-text-weak);

  &::before {
    content: './';
    opacity: 0.6;
  }
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: none;
  border-radius: var(--bulma-radius);
  background: none;
  font-size: 0.95rem;
  text-align: left;
  color: var(--bulma-text);
  cursor: pointer;

  &.is-active {
    background-color: hsla(var(--lv-primary-hsl), 0.12);
    color: var(--bulma-text-strong);
  }

  .palette-label {
    flex: 1;
  }

  .palette-hint {
    font-size: 0.7rem;
    color: var(--bulma-text-weak);
  }
}

.palette-empty {
  padding: 1.25rem 0.75rem;
  font-size: 0.85rem;
  color: var(--bulma-text-weak);
}

.palette-footer {
  display: flex;
  gap: 1.25rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid var(--bulma-border-weak);
  font-size: 0.7rem;
  color: var(--bulma-text-weak);

  kbd {
    padding: 0 0.3em;
    border: 1px solid var(--bulma-border-weak);
    border-radius: var(--bulma-radius-small);
    background-color: var(--bulma-scheme-main-bis);
  }
}

.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.15s ease;

  .palette-window {
    transition: transform 0.15s ease;
  }
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;

  .palette-window {
    transform: translateY(-0.5rem) scale(0.99);
  }
}
</style>
