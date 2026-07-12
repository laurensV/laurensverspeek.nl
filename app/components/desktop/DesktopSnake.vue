<template>
  <div
    ref="rootRef"
    class="desktop-snake is-family-code"
    tabindex="0"
    role="application"
    aria-label="Snake"
    @keydown="onKeydown"
  >
    <pre v-if="!result" class="dsnake-frame">{{ frame }}</pre>
    <div v-else class="dsnake-over">
      <pre class="dsnake-frame">{{ frame }}</pre>
      <p v-for="line in result" :key="line" class="dsnake-result">{{ line }}</p>
      <button class="dsnake-again" @click="start">play again</button>
    </div>
    <p class="dsnake-hint">arrows or wasd to move · q ends</p>

    <!-- touch d-pad: the desktop snake was keyboard-only, so unplayable on a
         phone — same pad the terminal snake and museum walk offer -->
    <div class="dsnake-pad" aria-hidden="true">
      <button @pointerdown.prevent="move('ArrowUp')">▲</button>
      <div>
        <button @pointerdown.prevent="move('ArrowLeft')">◀</button>
        <button @pointerdown.prevent="move('ArrowDown')">▼</button>
        <button @pointerdown.prevent="move('ArrowRight')">▶</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createSnakeGame, type GameHandle } from '~/utils/terminalGames'

// Snake as a desktop window, reusing the same engine the terminal uses.

const frame = ref('')
const result = ref<string[] | null>(null)
const rootRef = ref<HTMLElement>()
let game: GameHandle | null = null

const start = () => {
  result.value = null
  game?.stop()
  game = createSnakeGame({
    onFrame: (f) => (frame.value = f),
    onEnd: (lines) => {
      result.value = lines
    }
  })
  void nextTick(() => rootRef.value?.focus())
}

const onKeydown = (event: KeyboardEvent) => {
  if (!game || result.value) return
  if (game.onKey(event.key)) event.preventDefault()
}

// d-pad taps steer through the same engine input the keyboard uses
const move = (key: string) => {
  if (!game || result.value) return
  game.onKey(key)
}

onMounted(start)
onUnmounted(() => game?.stop())
</script>

<style scoped lang="scss">
.desktop-snake {
  outline: none;
  padding: 0.5rem;
  min-width: min(24rem, 100%);
}

.dsnake-frame {
  margin: 0;
  max-width: 100%;
  overflow-x: auto;
  color: var(--bulma-primary);
  line-height: 1.2;
  font-size: 0.8rem;
}

// touch d-pad: hidden where a keyboard is likely, shown on touch screens
.dsnake-pad {
  display: none;
  margin-top: 0.5rem;
  text-align: center;

  button {
    width: 2.6rem;
    height: 2.2rem;
    margin: 0.1rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    cursor: pointer;
  }
}

@media (hover: none) and (pointer: coarse) {
  .dsnake-pad {
    display: block;
  }
}

.dsnake-result {
  margin: 0.1rem 0;
  color: hsl(var(--lv-scheme-hs), 85%);
  font-size: 0.8rem;
}

.dsnake-again {
  margin-top: 0.5rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }
}

.dsnake-hint {
  margin-top: 0.5rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}
</style>
