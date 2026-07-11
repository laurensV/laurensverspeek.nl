<template>
  <div class="play is-family-code">
    <div class="play-editor">
      <div class="play-tabs">
        <button
          v-for="tab in TABS"
          :key="tab"
          :class="{ 'is-active': active === tab }"
          @click="active = tab"
        >{{ tab }}</button>
        <span class="play-tabs-spacer" />
        <button class="play-reset" title="Reset to the demo" @click="reset">reset</button>
      </div>
      <textarea
        v-model="code[active]"
        class="play-code"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        :aria-label="`${active} source`"
        @keydown.tab.prevent="insertTab"
      />
    </div>
    <div class="play-preview">
      <div class="play-preview-bar">
        <span>preview</span>
        <span class="play-preview-note">sandboxed · runs as you type</span>
      </div>
      <iframe
        ref="frameRef"
        class="play-frame"
        title="Playground preview"
        sandbox="allow-scripts allow-modals"
        :srcdoc="srcdoc"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storageGetJson, storageSetJson } from '~/utils/safeStorage'

// A tiny CodePen inside lvOS: edit HTML / CSS / JS, see it live in a sandboxed
// iframe. Code persists to localStorage. The iframe only gets allow-scripts
// (no same-origin), so nothing here can reach the site around it.

const TABS = ['html', 'css', 'js'] as const
type Tab = (typeof TABS)[number]

const DEMO: Record<Tab, string> = {
  html: '<h1>hello, world</h1>\n<p>edit me — it runs live →</p>\n<button id="go">click</button>',
  css: `body { font-family: system-ui; display: grid; place-content: center;
  height: 100vh; margin: 0; background: #101014; color: #ffba00; }
h1 { font-size: 2.5rem; }
button { margin-top: 1rem; padding: .5rem 1rem; border: 1px solid #ffba00;
  background: none; color: #ffba00; border-radius: 6px; cursor: pointer; }`,
  js: `document.getElementById('go').addEventListener('click', (e) => {
  e.target.textContent = 'clicked ' + (++e.target.dataset.n || (e.target.dataset.n = 1));
});`
}

const STORAGE_KEY = 'lv-playground'
const isCode = (v: unknown): v is Record<Tab, string> =>
  !!v && typeof v === 'object' && TABS.every((t) => typeof (v as Record<string, unknown>)[t] === 'string')

const code = reactive<Record<Tab, string>>({ ...DEMO })
if (import.meta.client) {
  const saved = storageGetJson(STORAGE_KEY, isCode)
  if (saved) Object.assign(code, saved)
}

const active = ref<Tab>('html')

// debounced srcdoc so we don't rebuild the frame on every keystroke
const srcdoc = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
// split the closing script tag so neither the SFC compiler nor the HTML parser
// treats it as the end of this component's own <script setup>
const CLOSE_SCRIPT = '</' + 'script>'
const rebuild = () => {
  srcdoc.value = `<!doctype html><html><head><meta charset="utf-8"><style>${code.css}</style></head>`
    + `<body>${code.html}<script>${code.js}${CLOSE_SCRIPT}</body></html>`
}
watch(code, () => {
  storageSetJson(STORAGE_KEY, { ...code })
  clearTimeout(timer)
  timer = setTimeout(rebuild, 400)
}, { deep: true })
onMounted(rebuild)
onUnmounted(() => clearTimeout(timer))

const reset = () => Object.assign(code, DEMO)

// let Tab indent inside the editor instead of leaving it
const insertTab = (event: KeyboardEvent) => {
  const el = event.target as HTMLTextAreaElement
  const start = el.selectionStart
  code[active.value] = code[active.value].slice(0, start) + '  ' + code[active.value].slice(el.selectionEnd)
  void nextTick(() => el.setSelectionRange(start + 2, start + 2))
}
</script>

<style scoped lang="scss">
.play {
  display: flex;
  gap: 0.5rem;
  height: 100%;
  min-height: 22rem;
  font-size: 0.8rem;
}

.play-editor,
.play-preview {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  overflow: hidden;
}

.play-tabs {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.4rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);

  button {
    padding: 0.15rem 0.6rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    cursor: pointer;

    &.is-active {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
      color: var(--bulma-primary);
    }
  }

  .play-tabs-spacer {
    flex: 1;
  }

  .play-reset {
    color: hsl(var(--lv-scheme-hs), 45%);
  }
}

.play-code {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 0.6rem;
  background: hsl(var(--lv-scheme-hs), 6%);
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  line-height: 1.5;
  tab-size: 2;
  caret-color: var(--bulma-primary);
  white-space: pre;
}

.play-preview-bar {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;

  .play-preview-note {
    color: hsl(var(--lv-scheme-hs), 40%);
  }
}

.play-frame {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}
</style>
