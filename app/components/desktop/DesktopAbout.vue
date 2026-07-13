<template>
  <div class="lvos-about is-family-code is-size-7">
    <p class="lvos-about-logo" aria-hidden="true">⚡</p>
    <p><b>lvOS 2.0</b> — a very serious operating system</p>
    <table class="lvos-about-specs">
      <tbody>
        <tr><th>kernel</th><td>nuxt 4 (vue 3), fully static</td></tr>
        <tr><th>uptime</th><td>{{ uptime }}</td></tr>
        <tr><th>display</th><td>{{ specs.display }}</td></tr>
        <tr><th>browser</th><td>{{ specs.browser }}</td></tr>
        <tr><th>memory</th><td>enough</td></tr>
        <tr><th>storage</th><td>{{ specs.storage }} of localStorage in use</td></tr>
      </tbody>
    </table>
    <p class="lvos-about-foot">© {{ new Date().getFullYear() }} laurensverspeek.nl</p>
  </div>
</template>

<script setup lang="ts">
// About This Computer: real specs, lovingly framed. WebDesktop passes its
// mount time so uptime is the desktop session's, like a real machine's.
const props = defineProps<{ since: number }>()
const now = ref(props.since)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => clearInterval(timer))

const uptime = computed(() => {
  const total = Math.floor((now.value - props.since) / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`
})

const specs = computed(() => {
  // `now` keeps this fresh if storage changes while the window sits open
  void now.value
  if (!import.meta.client) return { display: '—', browser: '—', storage: '—' }
  let bytes = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      bytes += key.length + (localStorage.getItem(key)?.length ?? 0)
    }
  } catch { /* locked-down browser: leave it at zero */ }
  return {
    display: `${window.screen.width}×${window.screen.height} (a lovely resolution)`,
    browser: browserName(navigator.userAgent),
    storage: bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
  }
})
</script>

<style scoped lang="scss">
.lvos-about {
  .lvos-about-logo {
    font-size: 1.6rem;
    line-height: 1;
    margin-bottom: 0.35rem;
  }

  .lvos-about-specs {
    margin: 0.6rem 0;
    border-collapse: collapse;

    th {
      padding: 0.12rem 1rem 0.12rem 0;
      color: hsl(var(--lv-scheme-hs), 55%);
      font-weight: normal;
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
    }

    td {
      padding: 0.12rem 0;
      color: hsl(var(--lv-scheme-hs), 88%);
    }
  }

  .lvos-about-foot {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.68rem;
  }
}
</style>
