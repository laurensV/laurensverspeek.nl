<template>
  <div class="error-page">
    <div class="error-shell is-family-code" @click="focusInput">
      <span class="corner is-tl" aria-hidden="true" /><span class="corner is-tr" aria-hidden="true" /><span class="corner is-bl" aria-hidden="true" /><span class="corner is-br" aria-hidden="true" />

      <p class="error-code has-text-primary-on-scheme">{{ error?.statusCode ?? 500 }}</p>
      <p class="error-headline">
        <template v-if="error?.statusCode === 404">
          bash: {{ path }}: No such file or directory
        </template>
        <template v-else>
          segmentation fault (core dumped)
        </template>
      </p>

      <pre class="error-trace" aria-hidden="true">{{ trace }}</pre>

      <p class="error-help">// this page doesn't exist, but the shell does — type <b>help</b> or <b>cd ~</b></p>

      <div class="error-log">
        <template v-for="line in lines" :key="line.id">
          <p v-if="line.type === 'input'" class="line"><span class="prompt">{{ prompt }}</span> {{ line.text }}</p>
          <p v-else class="line" :class="`is-${line.type}`" v-html="line.text" />
        </template>
      </div>

      <div class="error-input-row">
        <span class="prompt">{{ prompt }}</span>
        <input
          ref="inputRef"
          v-model="input"
          class="error-input is-family-code"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          aria-label="Recovery shell input"
          @keydown.enter="submit"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error?: NuxtError }>()

const path = useRoute().path
const prompt = 'visitor@lv:~$'
const input = ref('')
const inputRef = ref<HTMLInputElement>()

const trace = computed(() =>
  [
    `Traceback (most recent request):`,
    `  File "router.ts", line 404, in resolve`,
    `    return routes.match(${JSON.stringify(path)})`,
    `RouteNotFoundError: ${path} is not on the map`
  ].join('\n')
)

interface Line { id: number, type: 'input' | 'output' | 'muted' | 'error', text: string }
let lineId = 0
const lines = ref<Line[]>([])
const push = (type: Line['type'], text: string) => lines.value.push({ id: lineId++, type, text })

const focusInput = () => inputRef.value?.focus()

const go = (route: string) => clearError({ redirect: route })

const commands: Record<string, () => void> = {
  help: () =>
    push('output', 'available: <b>ls</b> · <b>cd ~</b> · <b>cd /projects</b> · <b>cd /blog</b> · <b>whoami</b> · <b>clear</b>'),
  ls: () => push('output', 'home/  projects/  blog/  about/  uses/  contact/'),
  whoami: () => push('muted', 'a lost visitor — let me get you home: try `cd ~`'),
  clear: () => (lines.value = []),
  pwd: () => push('output', '/dev/null (you are nowhere)'),
  sudo: () => push('error', 'nice try. even root can\'t find this page.')
}

const submit = () => {
  const value = input.value.trim()
  input.value = ''
  if (!value) return
  push('input', value)

  const [name = '', arg] = value.split(/\s+/)
  const lower = name.toLowerCase()

  if (lower === 'cd') {
    const target = (arg ?? '~').replace(/^\/|\/$/g, '')
    if (!arg || arg === '~' || target === '') return go('/')
    return go(`/${target}`)
  }
  const command = commands[lower]
  if (command) command()
  else push('error', `lvsh: command not found: ${name} (try 'help')`)
}

onMounted(focusInput)
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background-color: var(--bulma-scheme-main);
}

.error-shell {
  position: relative;
  width: min(42rem, 100%);
  padding: 2rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.3);
  border-radius: 2px;
  background-color: var(--bulma-scheme-main-bis);
  cursor: text;

  .corner {
    position: absolute;
    width: 0.7rem;
    height: 0.7rem;
    border: 0 solid var(--bulma-primary);
    pointer-events: none;
  }

  .is-tl { top: -2px; left: -2px; border-top-width: 2px; border-left-width: 2px; }
  .is-tr { top: -2px; right: -2px; border-top-width: 2px; border-right-width: 2px; }
  .is-bl { bottom: -2px; left: -2px; border-bottom-width: 2px; border-left-width: 2px; }
  .is-br { bottom: -2px; right: -2px; border-bottom-width: 2px; border-right-width: 2px; }
}

.error-code {
  font-size: clamp(3rem, 12vw, 5.5rem);
  font-weight: 700;
  line-height: 1;
}

.error-headline {
  margin-bottom: 1rem;
  color: var(--bulma-text-strong);
}

.error-trace {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-left: 2px solid var(--bulma-danger);
  background-color: var(--bulma-scheme-main-ter);
  color: var(--bulma-text-weak);
  font-size: 0.78rem;
  overflow-x: auto;
}

.error-help {
  margin-bottom: 1rem;
  color: var(--bulma-text-weak);
  font-size: 0.85rem;

  b {
    color: var(--bulma-primary-on-scheme);
  }
}

.error-log {
  font-size: 0.88rem;
  line-height: 1.7;
}

.line {
  color: var(--bulma-text);
  word-break: break-word;

  &.is-muted {
    color: var(--bulma-text-weak);
  }
  &.is-error {
    color: var(--bulma-danger);
  }

  :deep(b) {
    color: var(--bulma-primary-on-scheme);
    font-weight: 600;
  }
}

.prompt {
  color: var(--bulma-primary);
  font-weight: 600;
}

.error-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
  font-size: 0.88rem;
}

.error-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  color: var(--bulma-text-strong);
  font-size: inherit;
  caret-color: var(--bulma-primary);
}
</style>
