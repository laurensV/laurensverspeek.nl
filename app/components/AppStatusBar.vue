<template>
  <div class="status-bar is-family-code no-print" role="contentinfo">
    <div class="status-group">
      <a
        class="status-item"
        href="https://github.com/laurensV/laurensverspeek.nl"
        target="_blank"
        rel="noopener"
        title="View source on GitHub"
      >
        <AppIcon name="code" :size="11" /> main*
      </a>
      <span class="status-item is-hidden-mobile">v2.0.0</span>
      <button
        class="status-item status-button status-online"
        :class="{ 'is-pinging': pinging }"
        :title="`presence: ${presence.label} — click to change`"
        @click="cyclePresence"
      >
        <span class="online-dot" :style="{ '--dot': presence.color }" /> {{ presence.label }}
      </button>
    </div>

    <div class="status-group">
      <span v-if="pendingKey" class="status-item status-pending" aria-hidden="true">{{ pendingKey }}-</span>
      <span class="status-item is-hidden-touch">Ln {{ line }}, Col {{ column }}</span>
      <span class="status-item is-hidden-touch">UTF-8</span>
      <button class="status-item status-button status-eol is-hidden-touch" title="Line endings" @click="toggleEol">{{ eol }}</button>
      <button class="status-item status-button status-lang is-hidden-mobile" title="Language mode" @click="cycleLang">{{ LANGS[lang] }}</button>
      <button class="status-item status-button is-hidden-mobile" title="Command palette" @click="palette.open()">
        ctrl+k
      </button>
      <button class="status-item status-button" title="Open terminal (~)" @click="terminal.open()">
        <AppIcon name="terminal" :size="11" /> zsh
      </button>
      <button class="status-item status-button" title="Toggle theme" @click="toggleTheme">
        <ClientOnly>
          <AppIcon :name="colorMode.value === 'dark' ? 'sun' : 'moon'" :size="11" />
          <template #fallback><AppIcon name="moon" :size="11" /></template>
        </ClientOnly>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const terminal = useTerminal()
const palette = useCommandPalette()
const colorMode = useColorMode()
const route = useRoute()

// which-key: shows "g-" while a vim go-to chord is waiting for its second key
const pendingKey = useState('vim-pending-key', () => '')

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// ---- bottom-bar easter eggs ----
// presence, the Slack/Discord way — click the dot to cycle status
const PRESENCE = [
  { label: 'online', color: 'var(--bulma-success)' },
  { label: 'away', color: 'var(--bulma-warning)' },
  { label: 'busy', color: 'var(--bulma-danger)' },
  { label: 'invisible', color: 'var(--bulma-text-weak)' }
] as const
const presenceIndex = ref(0)
const presence = computed(() => PRESENCE[presenceIndex.value]!)
const pinging = ref(false)
let pingTimer: ReturnType<typeof setTimeout> | undefined
const cyclePresence = () => {
  presenceIndex.value = (presenceIndex.value + 1) % PRESENCE.length
  // a quick radar ping on every change
  pinging.value = false
  requestAnimationFrame(() => (pinging.value = true))
  clearTimeout(pingTimer)
  pingTimer = setTimeout(() => (pinging.value = false), 600)
}
onBeforeUnmount(() => clearTimeout(pingTimer))

// classic editor toggle: LF ⇄ CRLF
const eol = ref('LF')
const toggleEol = () => (eol.value = eol.value === 'LF' ? 'CRLF' : 'LF')

// the language-mode indicator, cycled like clicking it in a real editor
const LANGS = ['Vue', 'TypeScript', 'SCSS', 'Markdown', 'Rust', 'JSON'] as const
const lang = ref(0)
const cycleLang = () => (lang.value = (lang.value + 1) % LANGS.length)

// A cursor position that "moves" as you browse — purely for vibes
const line = ref(1)
const column = ref(1)
watch(
  () => route.path,
  (path) => {
    line.value = (path.length * 7) % 120 + 1
    column.value = (path.length * 3) % 40 + 1
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 1.65rem;
  padding: 0 0.5rem;
  font-size: 0.72rem;
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-bis-l),
    0.92
  );
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text-weak);
}

.status-group {
  display: flex;
  align-items: center;
  height: 100%;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
  padding: 0 0.55rem;
  color: inherit;
  white-space: nowrap;
}

// the pending vim chord ("g-") flashes in accent while it waits
.status-pending {
  color: var(--bulma-primary);
  font-weight: 700;
}

a.status-item:hover,
.status-button:hover {
  background-color: hsla(var(--lv-primary-hsl), 0.15);
  color: var(--bulma-text-strong);
}

.status-button {
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
}

.status-online {
  position: relative;

  .online-dot {
    position: relative;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background-color: var(--dot, var(--bulma-success));
    box-shadow: 0 0 6px var(--dot, var(--bulma-success));
  }

  // radar ping ring that expands and fades on each presence change
  &.is-pinging .online-dot::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 1px solid var(--dot, var(--bulma-success));
    animation: status-ping 0.6s ease-out;
  }
}

@keyframes status-ping {
  from {
    transform: scale(1);
    opacity: 0.8;
  }
  to {
    transform: scale(3.2);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-online.is-pinging .online-dot::after {
    animation: none;
  }
}
</style>
