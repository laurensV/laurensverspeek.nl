<template>
  <Transition name="whatsnew">
    <NuxtLink v-if="show" to="/changelog" class="whatsnew is-family-code" @click="dismiss">
      <span class="whatsnew-badge">{{ newCommits }}</span>
      <span>
        {{ newCommits }} commit{{ newCommits === 1 ? '' : 's' }} since your last visit
        <span class="whatsnew-cta">→ changelog</span>
      </span>
      <button class="whatsnew-close" aria-label="Dismiss" @click.prevent.stop="dismiss">×</button>
    </NuxtLink>
  </Transition>
</template>

<script setup lang="ts">
import { storageGet, storageSet } from '~/utils/safeStorage'
import type { GitCommit } from '~/utils/terminal/gitLog'

// A quiet returning-visitor nudge: how many commits landed since you were last
// here, computed from the baked git log against a stored timestamp. First-ever
// visit shows nothing; the timestamp updates every visit.
const SEEN_KEY = 'lv-last-visit'

const show = ref(false)
const newCommits = ref(0)

onMounted(async () => {
  const lastSeen = Number(storageGet(SEEN_KEY)) || 0
  // stamp this visit immediately, so the toast only ever shows once per return
  storageSet(SEEN_KEY, String(Date.now()))
  if (!lastSeen) return // first visit: nothing to compare against
  try {
    const commits = await $fetch<GitCommit[]>('/git-log.json')
    const count = commits.filter((commit) => {
      const ms = Date.parse(commit.date)
      return Number.isFinite(ms) && ms > lastSeen
    }).length
    if (count > 0) {
      newCommits.value = count
      show.value = true
      setTimeout(() => (show.value = false), 12_000)
    }
  } catch { /* offline or missing feed: stay quiet */ }
})

const dismiss = () => (show.value = false)
</script>

<style scoped lang="scss">
.whatsnew {
  position: fixed;
  bottom: 2.4rem;
  right: 1rem;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  max-width: 20rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 10px 26px hsla(var(--lv-scheme-hs), 2%, 0.5);
  color: hsl(var(--lv-scheme-hs), 88%);
  font-size: 0.75rem;
  text-decoration: none;
}

.whatsnew-badge {
  flex-shrink: 0;
  min-width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background-color: var(--bulma-primary);
  color: hsl(240, 11%, 8%);
  font-weight: 700;
  line-height: 1.4rem;
  text-align: center;
}

.whatsnew-cta {
  color: var(--bulma-primary);
}

.whatsnew-close {
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.whatsnew-enter-active,
.whatsnew-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.whatsnew-enter-from,
.whatsnew-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .whatsnew-enter-active,
  .whatsnew-leave-active {
    transition: none;
  }
}
</style>
