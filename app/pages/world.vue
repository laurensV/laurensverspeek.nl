<template>
  <section class="section world-page">
    <div class="container">
      <p class="overline mb-2">world $ ./place --together</p>
      <div class="is-flex is-align-items-baseline is-justify-content-space-between is-flex-wrap-wrap mb-4" style="gap: 0.75rem">
        <h1 class="title is-3 mb-0">The Pixel World</h1>
        <p class="is-family-code is-size-7 has-text-grey">
          one shared 128×128 canvas · one pixel at a time · be kind
        </p>
      </div>
      <ClientOnly>
        <WorldCanvas class="world-frame" />
      </ClientOnly>
      <p class="is-family-code is-size-7 has-text-grey mt-3">
        // also lives on the lvOS desktop, and the terminal speaks
        <code>world</code> and <code>pixel place &lt;x&gt; &lt;y&gt; &lt;color&gt;</code>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
// A hidden corner: not in the nav, not in the sitemap — found through the
// terminal (`world open`), the museum, or word of mouth.
useHead({
  title: 'The Pixel World — Laurens Verspeek',
  meta: [{ name: 'robots', content: 'noindex' }]
})
const ogImage = `${SITE_URL}/og/page-world.png`
useSeoMeta({
  description: 'A hidden, shared pixel canvas. One pixel at a time.',
  ogTitle: 'The Pixel World',
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})
</script>

<style scoped lang="scss">
.world-frame {
  height: min(65vh, 40rem);
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: var(--bulma-radius-large);
  padding: 0.5rem;

  // on phones use min-height (not a fixed height) so the frame grows to fit the
  // canvas's own palette/coords rows + the stage's floor instead of starving the
  // stage; the page scrolls, and the rows clear the fixed mobile tab bar
  @media (max-width: 768px) {
    height: auto;
    min-height: min(58vh, 40rem);
  }
}
</style>
