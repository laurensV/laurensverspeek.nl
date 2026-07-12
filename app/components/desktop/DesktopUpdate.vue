<template>
  <div class="update is-family-code" role="dialog" aria-label="System update">
    <div class="update-box">
      <p class="update-glyph" :class="{ 'is-working': working }" aria-hidden="true">{{ working ? '⟳' : '✓' }}</p>
      <p class="update-title">{{ checking ? 'checking for updates…' : working ? 'installing updates' : 'lvOS is up to date' }}</p>
      <template v-if="working && current">
        <p class="update-item">update {{ index + 1 }} of {{ queue.length }} — KB{{ kbOf(current.hash) }}</p>
        <p class="update-name">{{ current.subject }}</p>
      </template>
      <p v-if="!working && !checking && installedCount" class="update-name">
        {{ installedCount }} update{{ installedCount === 1 ? '' : 's' }} installed. a reboot is, astonishingly, not required.
      </p>
      <p v-if="!working && !checking && !installedCount" class="update-name">no new updates — this machine ships them the moment they're committed.</p>
      <div v-if="working" class="update-bar">
        <div class="update-fill" :style="{ width: `${pct}%` }" />
      </div>
      <p v-if="working" class="update-pct">{{ Math.floor(pct) }}%</p>
      <p class="update-warn">{{ working ? 'do not turn off your computer' : ' ' }}</p>
      <button v-if="working && !checking" class="update-btn" @click="finish">[skip the theatrics]</button>
      <button v-else-if="!working" class="update-btn" @click="emit('done')">[back to desktop]</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GitCommit } from '~/utils/terminal/gitLog'
import { storageGet, storageSet } from '~/utils/safeStorage'

// "System Update": theatrically installs this repo's REAL recent commits —
// fetched from the same baked git-log.json the changelog and `git log` use.
// Installing remembers the newest hash, so the boot nudge only reappears
// when new commits have actually shipped.

const emit = defineEmits<{ done: [] }>()

const INSTALLED_KEY = 'lv-updates-hash'
const MAX_BATCH = 8

const queue = ref<GitCommit[]>([])
const index = ref(0)
const pct = ref(0)
const checking = ref(true)
const working = ref(true)
const installedCount = ref(0)
const current = computed(() => queue.value[index.value])

// a Windows-flavored KB number, derived from the hash so it's stable
const kbOf = (hash: string) => String(parseInt(hash.slice(0, 5), 16) % 90000 + 10000)

let timer: ReturnType<typeof setInterval> | undefined
let newestHash = ''
// the true number of commits behind — the animation is capped, the count isn't,
// so this screen and the boot nudge/what's-new toast always report one number
let pendingTotal = 0

const finish = () => {
  clearInterval(timer)
  installedCount.value = pendingTotal || queue.value.length
  if (newestHash) storageSet(INSTALLED_KEY, newestHash)
  working.value = false
}

onMounted(async () => {
  let commits: GitCommit[] = []
  try {
    commits = await $fetch<GitCommit[]>('/git-log.json')
  } catch {
    // offline: nothing to install, curtain call
    checking.value = false
    working.value = false
    return
  }
  checking.value = false
  newestHash = commits[0]?.hash ?? ''
  const seen = storageGet(INSTALLED_KEY)
  const seenIndex = seen ? commits.findIndex((c) => c.hash === seen) : -1
  // everything since the last install; first visit gets the latest few
  const pending = seenIndex > 0 ? commits.slice(0, seenIndex) : commits
  pendingTotal = pending.length
  queue.value = pending.slice(0, MAX_BATCH)
  if (!queue.value.length || newestHash === seen) {
    working.value = false
    return
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish()
    return
  }

  timer = setInterval(() => {
    // crawl near the end of each update, the way updates do
    pct.value += pct.value > 88 ? 0.6 : Math.random() * 6 + 2
    if (pct.value >= 100) {
      if (index.value < queue.value.length - 1) {
        index.value++
        pct.value = 0
      } else {
        finish()
      }
    }
  }, 120)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped lang="scss">
.update {
  position: fixed;
  inset: 0;
  z-index: 10045; // above the taskbar band, below the lock screen (10060)
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(215deg 55% 22%); // the ceremonial update blue
  color: hsl(215deg 30% 92%);
}

.update-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: min(30rem, 88vw);
  text-align: center;
}

.update-glyph {
  font-size: 2.4rem;

  &.is-working {
    animation: update-spin 2.4s linear infinite;
  }
}

@keyframes update-spin {
  to {
    transform: rotate(360deg);
  }
}

.update-title {
  font-size: 1.1rem;
  letter-spacing: 0.04em;
}

.update-item {
  font-size: 0.72rem;
  opacity: 0.75;
}

.update-name {
  font-size: 0.82rem;
  max-width: 100%;
  overflow-wrap: break-word;
}

.update-bar {
  width: 100%;
  height: 0.5rem;
  margin-top: 0.4rem;
  border: 1px solid hsl(215deg 30% 60%);
  border-radius: 999px;
  overflow: hidden;
}

.update-fill {
  height: 100%;
  background-color: hsl(215deg 65% 72%);
  transition: width 0.12s linear;
}

.update-pct {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.update-warn {
  min-height: 1.2em;
  margin-top: 0.6rem;
  font-size: 0.72rem;
  opacity: 0.8;
}

.update-btn {
  margin-top: 0.4rem;
  padding: 0.2rem 0.4rem;
  border: none;
  background: none;
  color: hsl(215deg 65% 78%);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;

  &:hover {
    color: hsl(215deg 80% 90%);
  }
}
</style>
