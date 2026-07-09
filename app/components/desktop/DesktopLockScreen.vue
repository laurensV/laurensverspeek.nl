<template>
  <div class="lock is-family-code" role="dialog" aria-modal="true" aria-label="lvOS lock screen">
    <div class="lock-box">
      <p class="lock-time">{{ clock }}</p>
      <p class="lock-user"><span class="lock-glyph" aria-hidden="true">>_</span> {{ name }}</p>
      <form class="lock-form" @submit.prevent="attempt">
        <input
          ref="field"
          v-model="password"
          type="password"
          class="lock-input"
          placeholder="password"
          aria-label="Password"
          autocomplete="off"
        >
      </form>
      <p class="lock-hint">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'

// The lock is strictly ceremonial: any password works, but it gets judged.

const emit = defineEmits<{ unlock: [] }>()

const { name } = useIdentity()
const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)

const password = ref('')
const hint = ref('locked — type anything to get back in')
const field = ref<HTMLInputElement>()
let unlockTimer: ReturnType<typeof setTimeout> | undefined

const JUDGEMENTS = [
  (pw: string) => (pw.length < 4 ? 'that would take seconds to crack. in you go.' : null),
  (pw: string) => (/^[0-9]+$/.test(pw) ? 'all digits? bold. unlocked anyway.' : null),
  (pw: string) => (pw.toLowerCase().includes('password') ? 'seriously? fine, welcome back.' : null),
  (pw: string) => (pw.length > 16 ? 'now that is a passphrase. respect. unlocked.' : null)
]

const attempt = () => {
  if (!password.value) {
    hint.value = 'empty? even this lock has standards. type anything.'
    return
  }
  hint.value = JUDGEMENTS.map((judge) => judge(password.value)).find(Boolean)
    ?? 'correct! (everything is correct here)'
  unlockTimer = setTimeout(() => emit('unlock'), 900)
}

onMounted(() => field.value?.focus())
onUnmounted(() => clearTimeout(unlockTimer))
</script>

<style scoped lang="scss">
.lock {
  position: absolute;
  inset: 0;
  z-index: 60; // above every window and the taskbar
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsla(var(--lv-scheme-hs), 3%, 0.82);
  backdrop-filter: blur(14px);
}

.lock-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.lock-time {
  font-size: 3rem;
  font-weight: 600;
  color: hsl(var(--lv-scheme-hs), 92%);
  letter-spacing: 0.05em;
}

.lock-user {
  color: var(--bulma-primary);
  font-size: 0.95rem;

  .lock-glyph {
    opacity: 0.8;
    margin-right: 0.3rem;
  }
}

.lock-input {
  margin-top: 0.6rem;
  padding: 0.45rem 0.9rem;
  width: 15rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: 2px;
  background: hsla(var(--lv-scheme-hs), 10%, 0.8);
  color: hsl(var(--lv-scheme-hs), 92%);
  font: inherit;
  text-align: center;

  &:focus {
    outline: none;
    border-color: var(--bulma-primary);
  }
}

.lock-hint {
  min-height: 1.2em;
  color: hsl(var(--lv-scheme-hs), 60%);
  font-size: 0.75rem;
}
</style>
