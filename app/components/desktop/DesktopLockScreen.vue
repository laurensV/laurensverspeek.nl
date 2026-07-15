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

// The one real password on the site: hunter2, the most famous password on IRC.
// Wrong guesses get judged rather than just rejected. It's still not security —
// `locked` isn't persisted, so a reload walks right past it.

const PASSWORD = 'hunter2'
const MASKED = '*******'

const emit = defineEmits<{ unlock: [] }>()

const { name } = useIdentity()
const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)

const password = ref('')
const hint = ref('locked — hint: the most famous password on IRC')
const field = ref<HTMLInputElement>()
let unlockTimer: ReturnType<typeof setTimeout> | undefined

// wrong guesses still get an opinion; the last one is the bash.org punchline
const JUDGEMENTS = [
  (pw: string) => (/^[0-9]+$/.test(pw) ? 'all digits? bold. still not it.' : null),
  (pw: string) => (pw.toLowerCase().includes('password') ? 'seriously? no.' : null),
  (pw: string) => (pw.length > 16 ? 'now that is a passphrase. wrong one, though.' : null),
  (pw: string) => (pw.length < 4 ? 'that would take seconds to crack. it is also wrong.' : null)
]

const attempt = () => {
  // any new attempt revokes a pending unlock — a wrong guess fired inside the
  // 900ms grace window must not still open the desktop
  clearTimeout(unlockTimer)
  const guess = password.value.trim()
  if (!guess) {
    hint.value = 'empty? even this lock has standards.'
    return
  }
  if (guess.toLowerCase() === PASSWORD) {
    hint.value = 'correct. welcome back.'
    unlockTimer = setTimeout(() => emit('unlock'), 900)
    return
  }
  hint.value = JUDGEMENTS.map((judge) => judge(guess)).find(Boolean)
    ?? `access denied — everyone can see it's ${MASKED} though`
  password.value = ''
}

onMounted(() => field.value?.focus())
onUnmounted(() => clearTimeout(unlockTimer))
</script>

<style scoped lang="scss">
.lock {
  position: absolute;
  inset: 0;
  z-index: 10060; // above every window, pinned windows (z+1000), the taskbar (10000) and toasts (10002)
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsla(var(--lv-scheme-hs), 3%, 0.82);
  backdrop-filter: blur(14px);

  // on touch the on-screen keyboard covers a vertically-centred input, so sit
  // the box up in the top third where it stays visible while typing
  @media (pointer: coarse) {
    align-items: flex-start;
    padding-top: 14vh;
  }
}

.lock-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  // the judged-guess hint line runs wide — keep it off the edges at 320px
  padding: 0 1.25rem;
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
