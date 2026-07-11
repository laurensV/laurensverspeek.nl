<template>
  <section class="section">
    <div class="container">
      <p class="overline mb-2">projects $ ls -la</p>
      <h1 class="title is-2">Projects</h1>
      <p class="subtitle is-5 has-text-grey mb-6">
        A mix of work, hobby experiments and academic research.
      </p>
      <ProjectsGrid :projects="projects" with-filters />
    </div>
  </section>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

const ogImage = `${SITE_URL}/og/page-projects.png`
useHead({ title: 'Projects — Laurens Verspeek' })
useSeoMeta({
  ogTitle: 'Projects',
  ogUrl: `${SITE_URL}/projects`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})
</script>
