<template>
  <ClientOnly>
    <WebDesktop />
  </ClientOnly>
</template>

<script setup lang="ts">
// lvOS lives on its own route now (was an overlay toggled by ?desktop). A bare
// layout + locked overflow means there's no dead scrollbar behind it, and the
// URL is shareable.
// no page wipe here — the lvOS BIOS boot sequence is this route's entrance
definePageMeta({ layout: 'desktop', pageTransition: false })

const ogImage = `${SITE_URL}/og/desktop.png`
useHead({
  title: 'lvOS — Laurens Verspeek',
  htmlAttrs: { class: 'is-lvos' }
})
useSeoMeta({
  description: 'lvOS — a tiny operating system in the browser: windows, a taskbar, apps and a terminal.',
  ogTitle: 'lvOS — a desktop in the browser',
  ogDescription: 'Draggable windows, a taskbar, apps and a real terminal — the site’s OS easter egg.',
  ogUrl: `${SITE_URL}/desktop`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})
// the desktop layout has no visible breadcrumb strip; still emit the
// BreadcrumbList structured data every other content page carries
useJsonLd(breadcrumbList([{ name: 'desktop', item: `${SITE_URL}/desktop` }]))
</script>
