<template>
  <div class="chat is-family-code">
    <p v-if="!enabled" class="chat-note">
      the chat room needs the live relay — this build has none configured.<br>
      it's just you and the machines today.
    </p>
    <template v-else>
      <p class="chat-head">
        <span>#lounge</span>
        <span class="chat-online">{{ status === 'open' ? `${online} online` : status === 'lost' ? 'connection lost' : 'connecting…' }}</span>
      </p>
      <div ref="feedEl" class="chat-feed" aria-live="polite">
        <p v-if="!messages.length" class="chat-note">nobody has said anything yet. history is short here — the room forgets.</p>
        <p v-for="(msg, i) in messages" :key="`${msg.at}-${i}`" class="chat-line">
          <span class="chat-time">{{ timeOf(msg.at) }}</span>
          <span class="chat-name">&lt;{{ msg.name }}&gt;</span>
          {{ msg.text }}
        </p>
      </div>
      <form class="chat-form" @submit.prevent="submit">
        <input
          v-model="draft"
          class="chat-input"
          maxlength="200"
          :placeholder="`chat as ${name} — enter sends`"
          aria-label="Chat message"
          spellcheck="false"
        >
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
// The lvOS face of the chat room. Same feed as the terminal `chat` command
// (useChat's shared state); mounting takes a socket lease, closing the
// window returns it.

const { enabled, messages, online, status, join, send } = useChat()
const { name } = useIdentity()
const draft = ref('')
const feedEl = ref<HTMLElement>()

let release: (() => void) | undefined
onMounted(() => {
  release = join()
})
onUnmounted(() => release?.())

const submit = () => {
  send(draft.value)
  draft.value = ''
}

const timeOf = (at: number) =>
  new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// keep the feed pinned to the newest line
watch(() => messages.value.length, async () => {
  await nextTick()
  feedEl.value?.scrollTo({ top: feedEl.value.scrollHeight })
})
</script>

<style scoped lang="scss">
.chat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 16rem;
  font-size: 0.75rem;
}

.chat-head {
  display: flex;
  justify-content: space-between;
  color: var(--bulma-primary);

  .chat-online {
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.chat-feed {
  flex: 1;
  min-height: 0;
  max-height: 16rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.chat-line {
  overflow-wrap: break-word;

  .chat-time {
    margin-right: 0.35rem;
    color: hsl(var(--lv-scheme-hs), 40%);
    font-size: 0.65rem;
  }

  .chat-name {
    margin-right: 0.35rem;
    color: var(--bulma-primary);
  }
}

.chat-note {
  color: hsl(var(--lv-scheme-hs), 55%);
}

.chat-input {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 6%);
  color: hsl(var(--lv-scheme-hs), 90%);
  font: inherit;

  &:focus {
    outline: none;
    border-color: hsla(var(--lv-primary-hsl), 0.6);
  }
}
</style>
