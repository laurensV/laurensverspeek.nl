<template>
  <div class="run is-family-code" role="dialog" aria-label="Run an application">
    <p class="run-title">run</p>
    <div class="run-row" :class="{ 'is-error': errorFlash }">
      <span class="run-prompt" aria-hidden="true">▷</span>
      <input
        ref="inputRef"
        v-model="query"
        class="run-input"
        type="text"
        placeholder="type an app — Tab completes, Enter runs"
        autocomplete="off"
        spellcheck="false"
        @keydown.enter.prevent="launch"
        @keydown.tab.prevent="complete"
        @keydown.esc.prevent="emit('close')"
        @input="errorFlash = false"
      >
    </div>
    <p class="run-hint">
      <template v-if="candidates.length">{{ candidates.slice(0, 6).join(' · ') }}</template>
      <template v-else-if="errorFlash">no such app — try 'files', 'paint' or 'snake'</template>
      <template v-else>alt+r opens this anywhere on the desktop</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { DESKTOP_APPS, matchApp, appCandidates } from '~/utils/desktopApps'

// The Win+R of lvOS: a tiny launcher (Alt+R or the start menu) that opens any
// app by name. Tab cycles through the matching ids.
const emit = defineEmits<{ launch: [id: string], close: [] }>()

const query = ref('')
const errorFlash = ref(false)
const inputRef = ref<HTMLInputElement>()

onMounted(() => inputRef.value?.focus())

const candidates = computed(() => appCandidates(query.value))

let cycle = 0
const complete = () => {
  const list = appCandidates(query.value)
  if (!list.length) return
  // repeated Tab cycles when the field already holds a candidate
  if (list.includes(query.value)) cycle = (cycle + 1) % list.length
  else cycle = 0
  query.value = list[cycle]!
}

const launch = () => {
  const app = matchApp(query.value, DESKTOP_APPS)
  if (!app) {
    errorFlash.value = true
    return
  }
  emit('launch', app.id)
  emit('close')
}
</script>

<style scoped lang="scss">
.run {
  position: absolute;
  left: 50%;
  top: 32%;
  transform: translateX(-50%);
  z-index: 10003;
  width: min(26rem, 90vw);
  padding: 0.8rem 1rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.45);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 18px 50px hsla(var(--lv-scheme-hs), 2%, 0.6);
}

.run-title {
  margin-bottom: 0.4rem;
  color: var(--bulma-primary);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.run-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);

  &.is-error {
    border-color: var(--bulma-danger);
  }

  .run-prompt {
    color: var(--bulma-primary);
  }
}

.run-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 92%);
  font: inherit;
  font-size: 0.85rem;
  caret-color: var(--bulma-primary);
}

.run-hint {
  margin-top: 0.45rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.68rem;
  min-height: 1em;
}
</style>
