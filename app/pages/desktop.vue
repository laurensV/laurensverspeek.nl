<template>
  <ClientOnly>
    <WebDesktop />
  </ClientOnly>
</template>

<script setup lang="ts">
// lvOS lives on its own route now (was an overlay toggled by ?desktop). A bare
// layout + locked overflow means there's no dead scrollbar behind it, and the
// URL is shareable.
definePageMeta({ layout: 'desktop' })

useHead({
  title: 'lvOS — Laurens Verspeek',
  htmlAttrs: { class: 'is-lvos' }
})
</script>
