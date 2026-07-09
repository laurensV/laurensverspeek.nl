<template>
  <div class="error-page">
    <div class="error-shell is-family-code" @click="focusInput">
      <TuiFrame />

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

      <p v-if="suggestion" class="error-suggest">
        did you mean
        <button class="error-suggest-link" @click="go(suggestion.route)">{{ suggestion.route }}</button>?
      </p>

      <p class="error-help">// this page doesn't exist, but the shell does — type <b>help</b> or <b>cd ~</b></p>

      <nav class="error-links" aria-label="Recovery links">
        <button v-for="r in QUICK_LINKS" :key="r.path" class="error-link" @click="go(r.path)">{{ r.label }}</button>
      </nav>

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
          @keydown.tab.prevent="autocomplete"
          @keydown.up.prevent="historyUp"
          @keydown.down.prevent="historyDown"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import type { TerminalCommand } from '~/utils/terminal/types'
import { completeInput } from '~/utils/terminal/completion'

const props = defineProps<{ error?: NuxtError }>()

const path = useRoute().path
const prompt = 'visitor@lv:~$'
const input = ref('')
const inputRef = ref<HTMLInputElement>()

// known pages, used for the "did you mean" hint, quick links and completion
const QUICK_LINKS = [
  { path: '/', label: 'cd ~' },
  { path: '/projects', label: '/projects' },
  { path: '/blog', label: '/blog' },
  { path: '/about', label: '/about' },
  { path: '/uses', label: '/uses' },
  { path: '/contact', label: '/contact' }
]
const ROUTES = ['/', '/projects', '/blog', '/about', '/uses', '/now', '/cv', '/contact']

// only guess a nearest page for a genuine 404 (not a 500)
const suggestion = computed(() =>
  props.error?.statusCode === 404
    ? nearestRoute(path, ROUTES.filter((r) => r !== '/'))
    : null
)

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

// the recovery shell speaks the terminal's own command shape, so it can share
// the real tab-completion module instead of reimplementing it
const commands: Record<string, TerminalCommand> = {
  help: {
    description: 'List available commands',
    exec: () =>
      push('output', 'available: <b>ls</b> · <b>cd &lt;page&gt;</b> · <b>open &lt;page&gt;</b> · <b>whoami</b> · <b>echo</b> · <b>pwd</b> · <b>clear</b> (Tab completes, ↑/↓ history)')
  },
  ls: {
    description: 'List the pages that do exist',
    exec: () => push('output', ROUTES.map((r) => (r === '/' ? 'home/' : `${r.slice(1)}/`)).join('  '))
  },
  cd: {
    description: 'Escape to a real page',
    argCandidates: () => ROUTES,
    exec: (args) => {
      const arg = args.join(' ')
      const target = (arg || '~').replace(/^\/|\/$/g, '')
      if (!arg || arg === '~' || target === '') return go('/')
      go(`/${target}`)
    }
  },
  open: {
    description: 'Same as cd, for the click-inclined',
    argCandidates: () => ROUTES,
    exec: (args) => {
      const arg = args.join(' ')
      if (!arg) return push('error', 'usage: open <page>')
      go(arg.startsWith('/') ? arg : `/${arg}`)
    }
  },
  whoami: {
    description: 'Identify yourself',
    exec: () => push('muted', 'a lost visitor — let me get you home: try `cd ~`')
  },
  echo: {
    description: 'Echo',
    exec: (args) => push('output', args.join(' ') || '(echo needs something to say)')
  },
  clear: {
    description: 'Clear the log',
    exec: () => {
      lines.value = []
    }
  },
  pwd: {
    description: 'Where even are you',
    exec: () => push('output', '/dev/null (you are nowhere)')
  },
  sudo: {
    description: 'No',
    exec: () => push('error', 'nice try. even root can\'t find this page.')
  }
}

const commandNames = Object.keys(commands)

// history for ↑/↓ recall
const history = ref<string[]>([])
let historyIndex = -1

const submit = () => {
  const value = input.value.trim()
  input.value = ''
  if (!value) return
  push('input', value)
  history.value.push(value)
  historyIndex = history.value.length

  const [name = '', ...rest] = value.split(/\s+/)
  const command = commands[name.toLowerCase()]
  if (command) command.exec(rest)
  else push('error', `lvsh: command not found: ${name} (try 'help')`)
}

const autocomplete = () => {
  const [first] = completeInput(input.value, commandNames, commands)
  if (first) input.value = first
}

const historyUp = () => {
  if (!history.value.length) return
  historyIndex = Math.max(0, historyIndex - 1)
  input.value = history.value[historyIndex] ?? ''
}
const historyDown = () => {
  if (!history.value.length) return
  historyIndex = Math.min(history.value.length, historyIndex + 1)
  input.value = history.value[historyIndex] ?? ''
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

.error-suggest {
  margin-bottom: 0.75rem;
  color: var(--bulma-text);
  font-size: 0.9rem;
}

.error-suggest-link {
  padding: 0.05rem 0.35rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: 2px;
  background: hsla(var(--lv-primary-hsl), 0.1);
  color: var(--bulma-primary-on-scheme);
  font: inherit;
  cursor: pointer;

  &:hover {
    background: hsla(var(--lv-primary-hsl), 0.2);
  }
}

.error-help {
  margin-bottom: 1rem;
  color: var(--bulma-text-weak);
  font-size: 0.85rem;

  b {
    color: var(--bulma-primary-on-scheme);
  }
}

.error-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.25rem;

  .error-link {
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: 2px;
    background: none;
    color: var(--bulma-text-weak);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;

    &:hover {
      border-color: hsla(var(--lv-primary-hsl), 0.5);
      color: var(--bulma-primary-on-scheme);
    }
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
