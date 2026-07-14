<template>
  <button
    class="hero-terminal is-family-code"
    title="Open interactive terminal — or just start typing"
    @click="open"
    @keydown="onKey"
  >
    <span class="hero-terminal-bar">
      <span class="dot" /><span class="dot" /><span class="dot" />
      <span class="hero-terminal-title">laurens@{{ profile.domain }}</span>
    </span>
    <span class="hero-terminal-body">
      <!-- every command here really works in the terminal it opens -->
      <span class="line"><span class="prompt">$</span> whoami</span>
      <span class="line output">{{ profile.name }} — full-stack &amp; blockchain dev</span>
      <span class="line"><span class="prompt">$</span> ls projects</span>
      <span class="line output">nosana.md&nbsp;&nbsp;effect-ai.md&nbsp;&nbsp;…</span>
      <span class="line"><span class="prompt">$</span> cat mission.txt</span>
      <span class="line output">decentralize compute, ship cool things</span>
      <span class="line"><span class="prompt">$</span> {{ demoText }}<span class="blink-cursor" /></span>
      <span class="line hint">// click — or just start typing — to open the terminal</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { useIdle } from '@vueuse/core'
import { profile } from '~/data/profile'

// the lightweight launcher (open/isOpen only) instead of the full useTerminal():
// this card renders on the home page, so pulling the whole ~45KB command registry
// here would drag it back into the most-visited page's initial bundle and undo
// R33's lazy-mount win. Keystrokes are carried in via the DOM input below, not run().
const { open, isOpen } = useTerminalLauncher()

// ---- idle demo reel ----
// leave the homepage alone for a bit and the card starts window-shopping:
// it types a real command (they all work in the terminal it opens), holds it,
// backspaces, tries the next. Any activity stops the show instantly.
const DEMO_COMMANDS = ['neofetch', 'cowsay moo', 'snake', 'matrix', 'adventure', 'music play', 'fireworks']
const demoText = ref('')
const { idle } = useIdle(8_000)
let demoTimer: ReturnType<typeof setTimeout> | undefined
let demoIndex = 0

const stepDemo = (target: string, len: number, phase: 'type' | 'hold' | 'erase') => {
  demoText.value = target.slice(0, len)
  const next = (delay: number, l: number, p: typeof phase) => {
    demoTimer = setTimeout(() => stepDemo(target, l, p), delay)
  }
  if (phase === 'type') {
    if (len < target.length) return next(110, len + 1, 'type')
    return next(1_800, len, 'hold')
  }
  if (phase === 'hold') return next(0, len - 1, 'erase')
  if (len > 0) return next(55, len - 1, 'erase')
  demoIndex = (demoIndex + 1) % DEMO_COMMANDS.length
  demoTimer = setTimeout(() => stepDemo(DEMO_COMMANDS[demoIndex]!, 1, 'type'), 700)
}

watch(idle, (isIdle) => {
  clearTimeout(demoTimer)
  if (isIdle && !isOpen.value && !prefersReducedMotion()) {
    stepDemo(DEMO_COMMANDS[demoIndex]!, 1, 'type')
  } else {
    demoText.value = ''
  }
})
onUnmounted(() => clearTimeout(demoTimer))

// typing a printable key on the focused hero card opens the real terminal and
// carries the keystroke in as the start of a command
const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') return // let the button click
  if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
  event.preventDefault()
  const key = event.key
  open()
  // the terminal overlay is now lazily mounted, so its input can be a few frames
  // away (chunk load + mount), not just one tick — poll for it before filling
  const fill = (attempts = 0) => {
    const input = document.querySelector<HTMLInputElement>('#terminal-input')
    if (input) {
      input.value = key
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.focus()
    } else if (attempts < 60) {
      requestAnimationFrame(() => fill(attempts + 1))
    }
  }
  void nextTick(() => fill())
}
</script>

<style scoped lang="scss">
.hero-terminal {
  display: block;
  width: 100%;
  max-width: 26rem;
  padding: 0;
  text-align: left;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.9);
  box-shadow: 0 0 50px
    hsla(var(--lv-primary-hsl), 0.1);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 0 70px
      hsla(var(--lv-primary-hsl), 0.2);
  }
}

.hero-terminal-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);

  .dot {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background-color: hsl(var(--lv-scheme-hs), 30%);
  }

  .hero-terminal-title {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.hero-terminal-body {
  display: block;
  padding: 1rem;
  line-height: 1.7;

  .line {
    display: block;
    color: hsl(var(--lv-scheme-hs), 88%);
  }

  .prompt {
    color: var(--bulma-primary);
    font-weight: 600;
  }

  .output {
    color: hsl(var(--lv-scheme-hs), 65%);
  }

  .hint {
    margin-top: 0.5rem;
    font-size: 0.72rem;
    color: var(--bulma-primary);
    opacity: 0.7;
  }
}
</style>
