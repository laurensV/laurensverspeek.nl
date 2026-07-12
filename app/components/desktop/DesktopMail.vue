<template>
  <div class="mail is-family-code">
    <div class="mail-list">
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
    <div v-if="current" class="mail-body">
      <p class="mail-body-head">
        <b>{{ current.subject }}</b><br>
        <span class="mail-body-from">from: {{ current.from }} &lt;{{ current.address }}&gt;</span>
      </p>
      <p v-for="(line, i) in current.body" :key="i" class="mail-body-line">{{ line }}</p>
    </div>
    <p v-else class="mail-empty">select a message — the prince can wait, but not forever</p>
  </div>
</template>

<script setup lang="ts">
import { LVOS_MAILS } from '~/composables/useLvosMail'

// The lvOS mail client: a lovingly fake inbox. Read state lives in
// useLvosMail (shared with the desktop icon's badge); replies do not exist,
// the prince remains hopeful.

// the messages themselves live in useLvosMail, next to the read-state,
// so the icon badge and the inbox can never disagree
const mails = LVOS_MAILS

const { read, markRead, unread } = useLvosMail()
const openId = ref<string | null>(null)

const current = computed(() => mails.find((msg) => msg.id === openId.value))

const openMail = (id: string) => {
  openId.value = id
  markRead(id)
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
