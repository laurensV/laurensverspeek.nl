<template>
  <div class="tm is-family-code">
    <header class="tm-head">
      <div class="tm-title">
        <AppIcon name="clock" :size="18" />
        <div>
          <p class="tm-h">time machine</p>
          <p class="tm-sub">
            travel to any past version of laurensverspeek.nl —
            <strong>{{ deploys.length }}</strong> deploys, back to {{ oldestDate }}
          </p>
        </div>
      </div>
      <input
        v-model="filter"
        class="tm-search"
        type="search"
        placeholder="filter by date or what changed…"
        aria-label="Filter deploys"
      >
    </header>

    <p v-if="!available" class="tm-note tm-warn">
      the time machine needs the live built site — it won't run in this preview.
    </p>
    <p v-else class="tm-note">
      picking a version reloads the page into that old build; a bar at the bottom brings you back.
    </p>

    <div v-if="loading" class="tm-empty">loading the deploy history…</div>
    <div v-else-if="!deploys.length" class="tm-empty">no deploy snapshots found.</div>
    <div v-else-if="!shown.length" class="tm-empty">nothing matches “{{ filter }}”.</div>

    <ol v-else class="tm-list">
      <template v-for="row in shown" :key="row.deploy.sha">
        <li v-if="row.year" class="tm-year" aria-hidden="true">{{ row.year }}</li>
        <li class="tm-row" :class="{ 'is-latest': row.latest }">
          <span class="tm-dot" aria-hidden="true" />
          <div class="tm-meta">
            <p class="tm-date">
              {{ row.deploy.date }}
              <span v-if="row.latest" class="tm-tag">live now</span>
              <span v-if="row.deploy.tag" class="tm-ver">{{ row.deploy.tag }}</span>
              <span class="tm-hash">{{ row.deploy.source }}</span>
              <button
                v-if="countFor(row.deploy.sha) > 1"
                class="tm-count"
                :aria-expanded="expanded.has(row.deploy.sha)"
                @click="toggle(row.deploy.sha)"
              >
                {{ countFor(row.deploy.sha) }} commits {{ expanded.has(row.deploy.sha) ? '▾' : '▸' }}
              </button>
            </p>
            <p class="tm-subject">{{ row.deploy.subject || '(no message)' }}</p>
          </div>
          <button
            class="tm-go"
            :disabled="!available || busy"
            :title="`Load the site as it was on ${row.deploy.date}`"
            @click="visit(row.deploy)"
          >
            {{ busySha === row.deploy.sha ? 'entering…' : '⏱ visit' }}
          </button>
        </li>
        <li v-if="expanded.has(row.deploy.sha)" class="tm-commits">
          <span v-for="commit in commitsFor(row.deploy.sha)" :key="commit.hash" class="tm-commit">
            <code>{{ commit.hash }}</code> {{ commit.subject }}
          </span>
        </li>
      </template>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { releaseCommits } from '~/composables/useTimeMachine'
import type { Deploy } from '~/composables/useTimeMachine'
import type { GitCommit } from '~/utils/terminal/gitLog'

// lvOS Time Machine: a browsable timeline of every deploy of this site. Picking
// one hands its gh-pages SHA to the service worker (via useTimeMachine) and
// reloads onto that frozen build. Same shared state the terminal `git checkout`
// command drives — one manifest, one travel mechanism. Rows expand to the
// commits each release shipped (a deploy batches several), via the same
// releaseCommits() join the terminal `git show <version>` uses.

const { deploys, load, isAvailable, travelTo } = useTimeMachine()

const loading = ref(true)
const filter = ref('')
const busy = ref(false)
const busySha = ref('')
const available = isAvailable()

// deploy sha → the commits it shipped; and which rows are expanded
const relMap = ref<Map<string, GitCommit[]>>(new Map())
const expanded = ref<Set<string>>(new Set())

onMounted(async () => {
  await load()
  loading.value = false
  try {
    const commits = await $fetch<GitCommit[]>('/git-log.json', { timeout: 10_000 })
    relMap.value = releaseCommits(deploys.value, commits)
  } catch {
    // counts just won't show; travel still works
  }
})

const countFor = (sha: string) => relMap.value.get(sha)?.length ?? 0
const commitsFor = (sha: string) => relMap.value.get(sha) ?? []
function toggle(sha: string) {
  const next = new Set(expanded.value)
  if (next.has(sha)) next.delete(sha)
  else next.add(sha)
  expanded.value = next
}

const oldestDate = computed(() => deploys.value.at(-1)?.date ?? '—')

interface Row {
  deploy: Deploy
  /** year label to print above this row when the year changes */
  year?: string
  latest: boolean
}

const shown = computed<Row[]>(() => {
  const query = filter.value.trim().toLowerCase()
  const list = query
    ? deploys.value.filter(
        (d) => d.subject.toLowerCase().includes(query) || d.date.includes(query) || d.source.includes(query)
      )
    : deploys.value
  let lastYear = ''
  return list.map((deploy) => {
    const year = deploy.date.slice(0, 4)
    const row: Row = { deploy, latest: deploy.sha === deploys.value[0]?.sha }
    if (year !== lastYear) {
      row.year = year
      lastYear = year
    }
    return row
  })
})

async function visit(deploy: Deploy) {
  if (!available || busy.value) return
  busy.value = true
  busySha.value = deploy.sha
  const ok = await travelTo(deploy)
  if (!ok) {
    busy.value = false
    busySha.value = ''
  }
  // on success the page navigates away, so no cleanup needed
}
</script>

<style scoped>
.tm {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bulma-scheme-main);
  color: var(--bulma-text);
  font-size: 0.82rem;
}

.tm-head {
  padding: 0.75rem 0.9rem 0.6rem;
  border-bottom: 1px solid var(--bulma-border-weak);
  flex: 0 0 auto;
}
.tm-title {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  color: var(--bulma-primary);
}
.tm-h {
  font-weight: 700;
  letter-spacing: 0.02em;
}
.tm-sub {
  color: var(--bulma-text-weak);
  font-size: 0.72rem;
}
.tm-sub strong {
  color: var(--bulma-text);
}
.tm-search {
  margin-top: 0.6rem;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--bulma-border);
  border-radius: 6px;
  background: var(--bulma-scheme-main-bis);
  color: var(--bulma-text);
  font: inherit;
  font-size: 0.75rem;
}
.tm-search:focus {
  outline: none;
  border-color: var(--bulma-primary);
}

.tm-note {
  padding: 0.4rem 0.9rem;
  font-size: 0.68rem;
  color: var(--bulma-text-weak);
  border-bottom: 1px solid var(--bulma-border-weak);
  flex: 0 0 auto;
}
.tm-warn {
  color: var(--bulma-warning);
}

.tm-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--bulma-text-weak);
}

.tm-list {
  list-style: none;
  margin: 0;
  padding: 0.3rem 0 1rem;
  overflow-y: auto;
  flex: 1 1 auto;
}

.tm-year {
  padding: 0.5rem 0.9rem 0.2rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--bulma-primary);
  opacity: 0.8;
  letter-spacing: 0.08em;
}

.tm-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.9rem;
  border-left: 2px solid var(--bulma-border-weak);
  margin-left: 1.1rem;
  position: relative;
  transition: background 0.12s ease;
}
.tm-row:hover {
  background: var(--bulma-scheme-main-bis);
}
.tm-row.is-latest .tm-dot {
  background: var(--bulma-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bulma-primary) 30%, transparent);
}
.tm-dot {
  position: absolute;
  left: -5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bulma-border);
  flex: 0 0 auto;
}
.tm-meta {
  flex: 1 1 auto;
  min-width: 0;
}
.tm-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--bulma-text-weak);
}
.tm-hash {
  font-size: 0.68rem;
  opacity: 0.6;
}
.tm-ver {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--bulma-primary);
  border: 1px solid color-mix(in srgb, var(--bulma-primary) 55%, transparent);
  padding: 0.02rem 0.32rem;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.tm-count {
  font: inherit;
  font-size: 0.62rem;
  color: var(--bulma-text-weak);
  background: transparent;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 999px;
  padding: 0.02rem 0.4rem;
  cursor: pointer;
  white-space: nowrap;
}
.tm-count:hover {
  color: var(--bulma-text);
  border-color: var(--bulma-primary);
}

.tm-commits {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0 0 0.3rem 2.3rem;
  padding: 0.3rem 0 0.4rem;
  border-left: 1px dashed var(--bulma-border-weak);
  padding-left: 0.7rem;
}
.tm-commit {
  font-size: 0.7rem;
  color: var(--bulma-text-weak);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tm-commit code {
  color: var(--bulma-primary);
  font-size: 0.66rem;
  margin-right: 0.35rem;
}
.tm-tag {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--bulma-primary);
  color: var(--bulma-primary-invert);
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-weight: 700;
}
.tm-subject {
  color: var(--bulma-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
}

.tm-go {
  flex: 0 0 auto;
  border: 1px solid var(--bulma-primary);
  background: transparent;
  color: var(--bulma-primary);
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease;
}
.tm-go:hover:not(:disabled) {
  background: var(--bulma-primary);
  color: var(--bulma-primary-invert);
}
.tm-go:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .tm-subject {
    white-space: normal;
  }
}
</style>
