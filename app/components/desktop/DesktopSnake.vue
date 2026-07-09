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
  nextTick(() => rootRef.value?.focus())
}

const onKeydown = (event: KeyboardEvent) => {
  if (!game || result.value) return
  if (game.onKey(event.key)) event.preventDefault()
}

onMounted(start)
onUnmounted(() => game?.stop())
</script>

<style scoped lang="scss">
.desktop-snake {
  outline: none;
  padding: 0.5rem;
  min-width: 24rem;
}

.dsnake-frame {
  margin: 0;
  color: var(--bulma-primary);
  line-height: 1.2;
  font-size: 0.8rem;
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
