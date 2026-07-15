<template>
  <div>
    <!-- injects the <link rel="manifest"> — without it the PWA is never installable -->
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// A self-referential canonical on every page: search engines get one declared
// URL per route (og:url alone isn't a canonical). Trailing slashes are trimmed
// to match the clean-URL static output.
const route = useRoute()
useHead({
  link: [{
    rel: 'canonical',
    href: computed(() => `${SITE_URL}${route.path.replace(/\/+$/, '') || '/'}`)
  }]
})

// apply the manual "reduce motion" preference across every route (default and
// lvOS desktop layouts alike)
useReduceMotion()
</script>
