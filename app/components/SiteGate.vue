<template>
  <div v-if="!unlocked" class="gate is-family-code" role="dialog" aria-label="Private preview login">
    <div class="gate-box">
      <p class="gate-title">laurensverspeek.nl — private preview</p>
      <p class="gate-line">This site isn't public yet. It's not locked very hard either.</p>
      <p class="gate-line gate-prompt">login: <span class="gate-user">guest</span></p>
      <form class="gate-line gate-prompt" @submit.prevent="attempt">
        <label for="gate-password">password:</label>
        <input
          id="gate-password"
          ref="inputRef"
          v-model="password"
          class="gate-input"
          type="password"
          autocomplete="off"
          spellcheck="false"
        >
      </form>
      <p v-if="denied" class="gate-denied">access denied — everyone can see it's {{ MASKED }} though</p>
      <p class="gate-hint">// hint: the most famous password on IRC</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storageGet, storageSet } from '~/utils/safeStorage'

// A deliberately flimsy front door while the site is in private preview: the
// overlay ships in the prerendered HTML (so nothing flashes), and the correct
// password sets a localStorage flag that keeps the door open. This is a
// curtain, not a lock — and it knows it.
const PASSWORD = 'hunter2'
const MASKED = '*******'
const KEY = 'lv-gate-open'

const unlocked = ref(false)
const password = ref('')
const denied = ref(false)
const inputRef = ref<HTMLInputElement>()

onMounted(() => {
  unlocked.value = storageGet(KEY) === '1'
  if (!unlocked.value) inputRef.value?.focus()
})

const attempt = () => {
  if (password.value === PASSWORD) {
    storageSet(KEY, '1')
    unlocked.value = true
    return
  }
  denied.value = true
  password.value = ''
}

// while the gate is up, keep the page behind it from scrolling
watch(unlocked, (open) => {
  if (import.meta.client) document.documentElement.classList.toggle('is-gated', !open)
}, { immediate: import.meta.client })
</script>

<style scoped lang="scss">
.gate {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-color: hsl(240, 11%, 6%);
  color: hsl(240, 8%, 88%);
}

.gate-box {
  width: min(30rem, 100%);
  padding: 1.5rem 1.75rem;
  border: 1px solid hsla(45, 100%, 50%, 0.4);
  border-radius: 0.5rem;
}

.gate-title {
  margin-bottom: 0.75rem;
  color: #ffba00;
  font-weight: 700;
}

.gate-line {
  margin: 0.3rem 0;
  font-size: 0.85rem;
}

.gate-prompt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gate-user {
  color: hsl(240, 8%, 65%);
}

.gate-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  color: inherit;
  font: inherit;
  caret-color: #ffba00;
}

.gate-denied {
  margin-top: 0.6rem;
  color: hsl(348, 86%, 61%);
  font-size: 0.8rem;
}

.gate-hint {
  margin-top: 0.9rem;
  color: hsl(240, 8%, 45%);
  font-size: 0.72rem;
}
</style>

<style lang="scss">
// the page behind the curtain holds still
html.is-gated {
  overflow: hidden;
}
</style>
