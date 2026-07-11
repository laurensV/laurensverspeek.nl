<template>
  <div class="rss is-family-code">
    <p class="rss-head">subscribed: <span class="rss-feed">{{ FEED }}</span> — eating our own dog food</p>
    <p v-if="pending" class="rss-note">fetching feed …</p>
    <p v-else-if="error" class="rss-note">could not read the feed — even self-hosted dog food goes stale</p>
    <template v-else>
      <button v-for="item in items" :key="item.path" class="rss-item" @click="emit('post', item.path)">
        <span class="rss-title">{{ item.title }}</span>
        <span class="rss-date">{{ item.date }}</span>
        <span class="rss-desc">{{ item.description }}</span>
      </button>
      <p class="rss-note">{{ items.length }} items · opens in the blog reader</p>
    </template>
  </div>
</template>

<script setup lang="ts">
// An RSS reader subscribed to this very site's feed — the feed is real,
// prerendered at build time, and parsed here with nothing but DOMParser.
const emit = defineEmits<{ post: [path: string] }>()

const FEED = '/rss.xml'

interface FeedItem {
  title: string
  path: string
  date: string
  description: string
}

const items = ref<FeedItem[]>([])
const pending = ref(true)
const error = ref(false)
const { setCount, markSeen } = useLvosRss()
onMounted(markSeen) // opening the reader clears the badge

onMounted(async () => {
  try {
    const xml = await $fetch<string>(FEED, { responseType: 'text' })
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    items.value = [...doc.querySelectorAll('item')].map((item) => {
      const link = item.querySelector('link')?.textContent ?? ''
      const pubDate = item.querySelector('pubDate')?.textContent
      return {
        title: item.querySelector('title')?.textContent ?? '(untitled)',
        path: new URL(link, window.location.origin).pathname,
        date: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
        description: (item.querySelector('description')?.textContent ?? '').split('\n')[0]!.slice(0, 120)
      }
    })
    setCount(items.value.length)
    markSeen()
  } catch {
    error.value = true
  } finally {
    pending.value = false
  }
})
</script>

<style scoped lang="scss">
.rss {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 22rem;
  min-height: 12rem;
  font-size: 0.75rem;
}

.rss-head {
  margin-bottom: 0.3rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.68rem;

  .rss-feed {
    color: var(--bulma-primary);
  }
}

.rss-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.6rem;
  padding: 0.35rem 0.45rem;
  border: none;
  border-radius: var(--bulma-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.12);
  }

  .rss-title {
    color: hsl(var(--lv-scheme-hs), 92%);
    font-weight: 600;
  }

  .rss-date {
    color: hsl(var(--lv-scheme-hs), 50%);
  }

  .rss-desc {
    flex-basis: 100%;
    color: hsl(var(--lv-scheme-hs), 60%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.rss-note {
  padding: 0.3rem 0.45rem;
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.68rem;
}
</style>
