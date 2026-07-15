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
useSeo({
  title: 'Projects — Laurens Verspeek',
  description: 'Selected projects by Laurens Verspeek — web apps, blockchain tooling and playful web experiments, each with the story behind it.',
  path: '/projects',
  image: ogImage,
  ogTitle: 'Projects'
})
</script>
