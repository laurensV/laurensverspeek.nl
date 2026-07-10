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
import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'

// The lvOS mail client: a lovingly fake inbox. Read state persists, replies
// do not exist, the prince remains hopeful.

interface Mail {
  id: string
  from: string
  address: string
  subject: string
  date: string
  body: string[]
}

const mails: Mail[] = [
  {
    id: 'hr-boss-key',
    from: 'HR',
    address: 'hr@lvos.local',
    subject: 'RE: the "boss key" incident',
    date: 'mon',
    body: [
      'Hi,',
      'It has come to our attention that pressing b twice replaces the entire',
      'workstation with a spreadsheet titled Q3_forecast_v7_FINAL(2).xlsx.',
      'To be clear: this is not a sanctioned productivity tool. It is,',
      'however, a very convincing spreadsheet. The numbers even sum.',
      'Please use it responsibly.',
      '— HR (we see everything, including pid 925)'
    ]
  },
  {
    id: 'newsletter',
    from: 'lvOS weekly',
    address: 'newsletter@lvos.local',
    subject: 'this week in lvOS: everything is a process now',
    date: 'tue',
    body: [
      'IN THIS ISSUE:',
      '• ps now lists your windows. kill closes them. democracy!',
      '• a tamagotchi has been sighted wandering the desktop',
      '• the recycle bin forgives, the recycle bin forgets (when emptied)',
      '• tip of the week: alt+r launches anything, including regret',
      'You are receiving this because you booted an operating system',
      'inside a portfolio website. Unsubscribing is spiritually impossible.'
    ]
  },
  {
    id: 'prince',
    from: 'Prince Adetokunbo',
    address: 'definitely.real@royal.example',
    subject: 'URGENT BUSINESS PROPOSAL (100% legitimate)',
    date: 'wed',
    body: [
      'Dearest friend,',
      'I am writing concerning the sum of 4,700,000 localStorage bytes',
      'currently frozen in an offshore browser profile. I require only a',
      'small advance of trust (and your vim config) to release the funds.',
      'Kindly do not report this message to the easter_eggs.service.',
      'Yours in perpetual sincerity,',
      'A. Prince'
    ]
  },
  {
    id: 'sysadmin',
    from: 'root',
    address: 'root@lvos.local',
    subject: 'fork bomb detected (politely declined)',
    date: 'thu',
    body: [
      'At 03:12 an sh script attempted to run itself recursively.',
      'The shell said, quote, "nice fork bomb though", and stopped it.',
      'No processes were harmed. The uptime remains immaculate.',
      'This message was brought to you by pid 1, who sees all and kills none.'
    ]
  },
  {
    id: 'curator',
    from: 'the museum curator',
    address: 'curator@lvos.local',
    subject: 'your visit left footprints on the gallery floor',
    date: 'fri',
    body: [
      'A visitor was observed walking the museum at an unusual hour,',
      'reading plaques with what witnesses describe as "genuine interest".',
      'The gift shop (see: /contact) remains open. The grue in the basement',
      'sends its regards and, reassuringly, its apologies in advance.'
    ]
  }
]

const READ_KEY = 'lvos-mail-read'
const read = ref(new Set<string>(storageGetJson(READ_KEY, isStringArray) ?? []))
const openId = ref<string | null>(null)

const current = computed(() => mails.find((msg) => msg.id === openId.value))
const unread = computed(() => mails.filter((msg) => !read.value.has(msg.id)).length)

const openMail = (id: string) => {
  openId.value = id
  if (!read.value.has(id)) {
    read.value = new Set(read.value).add(id)
    storageSetJson(READ_KEY, [...read.value])
  }
}
</script>

<style scoped lang="scss">
.mail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 24rem;
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
