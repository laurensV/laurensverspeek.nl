<template>
  <div class="contact-terminal is-family-code" @click="focusInput">
    <TuiFrame />
    <div class="contact-titlebar">
      <span class="dot dot-r" /><span class="dot dot-y" /><span class="dot dot-g" />
      <span class="contact-title">{{ name }}@{{ profile.domain }}: ~/contact</span>
    </div>

    <div ref="bodyRef" class="contact-body">
      <p class="line"><span class="prompt">$</span> ./contact.sh</p>
      <p class="line muted">// answers a few questions, then opens your mail client — nothing is sent behind your back</p>

      <template v-for="(entry, i) in history" :key="i">
        <p class="line accent">? {{ entry.prompt }}</p>
        <p class="line"><span class="prompt">></span> {{ entry.answer || '(skipped)' }}</p>
      </template>

      <template v-if="phase === 'asking'">
        <p class="line accent">
          ? <span class="step-count">[{{ stepIndex + 1 }}/{{ steps.length }}]</span> {{ currentStep.prompt }}
        </p>
        <p v-if="hint" class="line error">{{ hint }}</p>
      </template>

      <template v-else-if="phase === 'confirm'">
        <p class="line accent">? send it to {{ profile.email }}?</p>
        <p class="line">
          <button class="confirm-button" @click.stop="sendMail">[Y] open mail client</button>
          <button class="confirm-button is-muted" @click.stop="reset">[n] start over</button>
        </p>
      </template>

      <template v-else>
        <p class="line success">✓ opening your mail client...</p>
        <p class="line muted">nothing happened? mail me directly:</p>
        <p class="line">
          <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
          <button class="copy-button" @click.stop="copyEmail">
            {{ copied ? '[copied!]' : '[copy]' }}
          </button>
        </p>
        <p class="line muted mt-2">
          <button type="button" class="wizard-again" @click="reset">$ ./contact.sh --again</button>
        </p>
      </template>

      <div v-if="phase !== 'done'" class="contact-input-row">
        <span class="prompt">></span>
        <input
          ref="inputRef"
          v-model="input"
          class="contact-input is-family-code"
          type="text"
          :placeholder="phase === 'confirm' ? 'Y' : currentStep.placeholder"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="submit"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'
import { writeClipboard } from '~/utils/clipboard'

const { name } = useIdentity()

// A terminal-style contact wizard. Composes a mailto: locally — no backend, no tracking.

interface Step {
  key: 'name' | 'email' | 'message'
  prompt: string
  placeholder: string
  optional?: boolean
}

const steps: Step[] = [
  { key: 'name', prompt: 'what should I call you?', placeholder: 'your name', optional: true },
  { key: 'email', prompt: 'where can I reach you?', placeholder: 'you@example.com (optional)', optional: true },
  { key: 'message', prompt: "what's on your mind?", placeholder: 'the message' }
]

const stepIndex = ref(0)
const phase = ref<'asking' | 'confirm' | 'done'>('asking')
const history = ref<{ prompt: string, answer: string }[]>([])
const answers = reactive({ name: '', email: '', message: '' })
const input = ref('')
const hint = ref('')
const copied = ref(false)

const inputRef = ref<HTMLInputElement>()
const bodyRef = ref<HTMLElement>()

const currentStep = computed(() => steps[stepIndex.value] ?? steps[0]!)

const focusInput = () => inputRef.value?.focus()

const scrollDown = () => {
  void nextTick(() => bodyRef.value?.scrollTo({ top: bodyRef.value.scrollHeight }))
}

const submit = () => {
  const value = input.value.trim()
  hint.value = ''

  if (phase.value === 'confirm') {
    if (value === '' || /^y(es)?$/i.test(value)) {
      sendMail()
    } else {
      reset()
    }
    input.value = ''
    return
  }

  const step = currentStep.value
  if (!value && !step.optional) {
    hint.value = '! a message would help — I can\'t read minds (yet)'
    scrollDown()
    return
  }

  answers[step.key] = value
  history.value.push({ prompt: step.prompt, answer: value })
  input.value = ''

  if (stepIndex.value < steps.length - 1) {
    stepIndex.value++
  } else {
    phase.value = 'confirm'
  }
  scrollDown()
  focusInput()
}

const sendMail = () => {
  const name = answers.name || 'anonymous visitor'
  const signature = answers.email ? `\n\n— ${name} (${answers.email})` : `\n\n— ${name}`
  const subject = encodeURIComponent(`Hello from ${name}`)
  const body = encodeURIComponent(`${answers.message}${signature}`)
  phase.value = 'done'
  scrollDown()
  window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`
}

const reset = () => {
  stepIndex.value = 0
  phase.value = 'asking'
  history.value = []
  answers.name = ''
  answers.email = ''
  answers.message = ''
  hint.value = ''
  scrollDown()
  void nextTick(focusInput)
}

const copyEmail = async () => {
  if (!await writeClipboard(profile.email)) return
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

onMounted(focusInput)
</script>

<style scoped lang="scss">
.contact-terminal {
  position: relative;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: 2px;
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.96);
  box-shadow: 0 0 60px hsla(var(--lv-primary-hsl), 0.1);
  text-align: left;
  cursor: text;
}

.step-count {
  opacity: 0.6;
}

.confirm-button {
  border: none;
  background: none;
  padding: 0;
  margin-right: 1.25rem;
  font: inherit;
  color: var(--bulma-primary);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &.is-muted {
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.contact-titlebar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);

  .dot {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
  }
  .dot-r {
    background-color: var(--bulma-danger);
  }
  .dot-y {
    background-color: var(--bulma-warning);
  }
  .dot-g {
    background-color: var(--bulma-success);
  }

  .contact-title {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.contact-body {
  padding: 1.25rem;
  max-height: 24rem;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.8;
}

.line {
  color: hsl(var(--lv-scheme-hs), 88%);
  overflow-wrap: break-word;

  &.muted {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.78rem;
  }
  &.accent {
    color: var(--bulma-primary);
  }
  &.error {
    color: var(--bulma-danger);
    font-size: 0.8rem;
  }
  &.success {
    color: var(--bulma-success);
  }

  a,
  .wizard-again {
    padding: 0;
    border: none;
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
}

.prompt {
  color: var(--bulma-primary);
  font-weight: 600;
}

.contact-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.contact-input {
  flex: 1;
  // without min-width:0 a flex item can't shrink below its intrinsic content
  // width, so at 320px the input's right edge was clipped ~18px by the card
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-size: 0.9rem;
  color: hsl(var(--lv-scheme-hs), 92%);
  caret-color: var(--bulma-primary);

  // 16px on touch so iOS Safari doesn't zoom the page when the field is focused
  @media (pointer: coarse) {
    font-size: 16px;
  }

  &::placeholder {
    color: hsl(var(--lv-scheme-hs), 40%);
  }
}

.copy-button {
  margin-left: 0.75rem;
  border: none;
  background: none;
  font: inherit;
  color: var(--bulma-primary);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}
</style>
