<template>
  <div class="mail is-family-code">
    <div class="mail-toolbar">
      <button class="mail-compose-btn" @click="composing = !composing">
        [{{ composing ? 'back to inbox' : '✎ compose' }}]
      </button>
    </div>
    <div v-if="composing" class="mail-composer">
      <label class="mail-field">
        <span>to:</span>
        <input :value="profile.email" readonly aria-label="Recipient">
      </label>
      <label class="mail-field">
        <span>subject:</span>
        <input v-model="draftSubject" maxlength="120" placeholder="hello from lvOS" aria-label="Subject" @input="keyClick.click()">
      </label>
      <textarea
        v-model="draftBody"
        class="mail-draft"
        rows="6"
        placeholder="dear laurens, your operating system delivered this…"
        aria-label="Message"
        @input="keyClick.click()"
      />
      <div class="mail-send-row">
        <button class="mail-send" @click="send">[send →]</button>
        <span class="mail-send-note">opens your real mail app — lvOS has no outbound SMTP (yet)</span>
      </div>
    </div>
    <div v-else class="mail-list">
      <button
        v-for="msg in mails"
        :key="msg.id"
        class="mail-row"
        :class="{ 'is-unread': !read.has(msg.id), 'is-open': openId === msg.id }"
        @click="openMail(msg.id)"
      >
        <span class="mail-dot" aria-hidden="true">{{ read.has(msg.id) ? '·' : '●' }}</span>
        <span class="mail-meta">
          <span class="mail-from">{{ msg.from }}</span>
          <span class="mail-subject">{{ msg.subject }}</span>
        </span>
        <span class="mail-date">{{ msg.date }}</span>
      </button>
      <p class="mail-count">{{ unread }} unread · inbox zero is a lifestyle</p>
    </div>
    <div v-if="current && !composing" class="mail-body">
      <p class="mail-body-head">
        <b>{{ current.subject }}</b><br>
        <span class="mail-body-from">from: {{ current.from }} &lt;{{ current.address }}&gt;</span>
      </p>
      <p v-for="(line, i) in current.body" :key="i" class="mail-body-line">{{ line }}</p>
      <button v-if="current.postPath" class="mail-open-post" @click="emit('post', current.postPath)">
        [read the full post →]
      </button>
    </div>
    <p v-else-if="!composing" class="mail-empty">select a message — the prince can wait, but not forever</p>
  </div>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

// The lvOS mail client: real blog posts arrive as newsletter mails on top of
// the lovingly fake inbox. Read state lives in useLvosMail (shared with the
// desktop icon's badge). Compose finally exists: it drafts a REAL mail to the
// contact address via mailto:, because the inbox deserved a reply button.

const emit = defineEmits<{ post: [path: string] }>()

// the messages themselves live in useLvosMail, next to the read-state,
// so the icon badge and the inbox can never disagree
const { read, markRead, unread, mails } = useLvosMail()
// the shared `keyclick` typing sound ticks here too, not just in the terminal
const keyClick = useKeyClick()
const openId = ref<string | null>(null)

const current = computed(() => mails.value.find((msg) => msg.id === openId.value))

const openMail = (id: string) => {
  openId.value = id
  markRead(id)
}

// ---- compose: a mailto draft to the real contact address ----
const composing = ref(false)
const draftSubject = ref('')
const draftBody = ref('')

const send = () => {
  const params = new URLSearchParams()
  if (draftSubject.value.trim()) params.set('subject', draftSubject.value.trim())
  if (draftBody.value.trim()) params.set('body', draftBody.value.trim())
  const query = params.toString().replace(/\+/g, '%20')
  window.location.href = `mailto:${profile.email}${query ? `?${query}` : ''}`
}
</script>

<style scoped lang="scss">
.mail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: min(24rem, 100%);
  min-height: 14rem;
  font-size: 0.75rem;
}

.mail-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.mail-toolbar {
  display: flex;
  justify-content: flex-end;
}

.mail-compose-btn,
.mail-send {
  border: none;
  background: none;
  padding: 0.15rem 0.2rem;
  color: var(--bulma-primary);
  font: inherit;
  cursor: pointer;

  // ~18px was well under the ~40px the rest of lvOS enforces on touch
  @media (pointer: coarse) {
    display: inline-flex;
    align-items: center;
    min-height: 2.4rem;
    padding: 0.3rem 0.6rem;
  }

  &:hover {
    text-decoration: underline;
  }
}

.mail-composer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  .mail-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    span {
      width: 4em;
      color: hsl(var(--lv-scheme-hs), 55%);
    }

    input {
      flex: 1;
      min-width: 0;
      padding: 0.25rem 0.4rem;
      border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
      border-radius: var(--bulma-radius-small);
      background: hsla(var(--lv-scheme-hs), 50%, 0.08);
      color: hsl(var(--lv-scheme-hs), 92%);
      font: inherit;

      // 16px on touch so focusing the field doesn't zoom the desktop on iOS
      @media (pointer: coarse) {
        font-size: 16px;
      }

      &[readonly] {
        color: hsl(var(--lv-scheme-hs), 60%);
      }
    }
  }

  .mail-draft {
    padding: 0.4rem 0.5rem;
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
    border-radius: var(--bulma-radius-small);
    background: hsla(var(--lv-scheme-hs), 50%, 0.08);
    color: hsl(var(--lv-scheme-hs), 92%);
    font: inherit;
    resize: vertical;

    @media (pointer: coarse) {
      font-size: 16px;
    }
  }

  .mail-send-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mail-send-note {
    color: hsl(var(--lv-scheme-hs), 50%);
    font-size: 0.68rem;
  }
}

.mail-open-post {
  margin-top: 0.5rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.mail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.45rem;
  border: none;
  border-radius: var(--bulma-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &.is-open {
    background-color: hsla(var(--lv-primary-hsl), 0.12);
  }

  &.is-unread .mail-meta {
    color: hsl(var(--lv-scheme-hs), 92%);
    font-weight: 600;
  }

  .mail-dot {
    color: var(--bulma-primary);
  }

  .mail-meta {
    display: flex;
    gap: 0.6rem;
    min-width: 0;
    overflow: hidden;

    .mail-from {
      flex-shrink: 0;
      width: 9em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mail-subject {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: hsl(var(--lv-scheme-hs), 65%);
    }
  }

  .mail-date {
    margin-left: auto;
    color: hsl(var(--lv-scheme-hs), 50%);
  }
}

.mail-count {
  padding: 0.25rem 0.45rem;
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.68rem;
}

.mail-body {
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  padding-top: 0.6rem;

  .mail-body-head {
    margin-bottom: 0.5rem;
  }

  .mail-body-from {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.68rem;
  }

  .mail-body-line {
    line-height: 1.55;
  }
}

.mail-empty {
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  padding-top: 0.6rem;
  color: hsl(var(--lv-scheme-hs), 50%);
}
</style>
