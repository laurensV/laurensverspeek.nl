<template>
  <section class="section">
    <div class="container">
      <p class="overline mb-2">about $ cat README.md</p>
      <div class="is-flex is-align-items-center is-justify-content-space-between is-flex-wrap-wrap" style="gap: 1rem">
        <h1 class="title is-2 mb-0">About me</h1>
        <div class="is-flex" style="gap: 0.75rem">
          <CmdButton to="/now">now</CmdButton>
          <CmdButton to="/cv" variant="primary">
            <AppIcon name="file" :size="15" />
            view cv
          </CmdButton>
        </div>
      </div>

      <div class="columns mt-2">
        <div class="column is-7">
          <div class="content is-medium">
            <p v-for="(paragraph, i) in profile.bio" :key="i">{{ paragraph }}</p>
            <p>
              When I'm not building products, I'm probably experimenting with a side project —
              like a website that <a href="https://laurensv.github.io/self-coding-website/" target="_blank" rel="noopener">codes itself</a>,
              or the terminal hiding behind the <kbd>~</kbd> key on this very page.
            </p>
          </div>

          <RevealBlock>
            <h2 class="title is-4 mt-6 mb-4">GitHub</h2>
            <GithubStats />
          </RevealBlock>

          <RevealBlock>
            <h2 class="title is-4 mt-6 mb-2">Timeline</h2>
            <p class="is-family-code is-size-7 has-text-grey mb-4">$ git log --graph career</p>
            <AboutTimeline />
          </RevealBlock>
        </div>

        <div class="column is-4 is-offset-1">
          <AboutSkills />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

const ogImage = `${SITE_URL}/og/page-about.png`
useHead({ title: 'About — Laurens Verspeek' })
useSeoMeta({
  ogTitle: 'About Laurens',
  ogUrl: `${SITE_URL}/about`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})
</script>
