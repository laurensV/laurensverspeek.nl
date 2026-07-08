<template>
  <section class="section cv-page">
    <div class="container cv-container">
      <div class="is-flex is-justify-content-space-between is-align-items-center mb-2 no-print">
        <p class="overline mb-0">cv $ lpr resume.pdf</p>
        <CmdButton
          variant="primary"
          href="/laurens-verspeek-resume.pdf"
          download="laurens-verspeek-resume.pdf"
        >
          <AppIcon name="file" :size="15" />
          download résumé (.pdf)
        </CmdButton>
      </div>
      <p class="is-family-code is-size-7 has-text-grey mb-4 no-print cv-meta">
        -rw-r--r-- 1 laurens staff {{ profile.name.split(' ')[0]!.toLowerCase() }}-resume.pdf · print or ⌘P to save as PDF
      </p>

      <div class="cv-sheet">
        <TuiFrame class="no-print" />
        <header class="cv-header">
          <div>
            <h1 class="title is-2 mb-1">{{ profile.name }}</h1>
            <p class="is-size-5 cv-subtitle">Full-stack developer & blockchain engineer</p>
          </div>
          <div class="cv-contact is-family-code is-size-7">
            <p>{{ profile.email }}</p>
            <p>{{ profile.domain }}</p>
            <p>github.com/laurensV</p>
            <p>{{ profile.location }}</p>
          </div>
        </header>

        <section class="cv-section">
          <h2 class="cv-heading">Profile</h2>
          <p v-for="(paragraph, i) in profile.bio" :key="i" class="mb-2">{{ paragraph }}</p>
        </section>

        <section class="cv-section">
          <h2 class="cv-heading">Experience & Education</h2>
          <div v-for="entry in profile.timeline" :key="entry.title" class="cv-entry">
            <div class="cv-entry-head">
              <p class="has-text-weight-semibold">{{ entry.title }}</p>
              <p class="is-family-code is-size-7 cv-period">{{ entry.period }}</p>
            </div>
            <p class="is-size-6">{{ entry.description }}</p>
          </div>
        </section>

        <section class="cv-section">
          <h2 class="cv-heading">Selected projects</h2>
          <div v-for="project in cvProjects" :key="project.slug" class="cv-entry">
            <div class="cv-entry-head">
              <p class="has-text-weight-semibold">{{ project.title }}</p>
              <p class="is-family-code is-size-7 cv-period">{{ project.year }}</p>
            </div>
            <p class="is-size-6">{{ project.description }}</p>
          </div>
        </section>

        <section class="cv-section">
          <h2 class="cv-heading">Skills</h2>
          <div v-for="group in profile.skills" :key="group.group" class="cv-skills-row">
            <span class="is-family-code is-size-7 cv-skills-label">{{ group.group }}</span>
            <span class="is-size-6">{{ group.items.join(' · ') }}</span>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'

useHead({ title: 'CV — Laurens Verspeek' })
useSeoMeta({ description: 'Curriculum vitae of Laurens Verspeek.' })

const cvProjects = projects.filter((p) => p.category === 'work' || p.featured)

// Print in light theme regardless of the site theme, then restore
const colorMode = useColorMode()
let themeBeforePrint: string | undefined

const forceLightForPrint = () => {
  if (themeBeforePrint === undefined && colorMode.preference !== 'light') {
    themeBeforePrint = colorMode.preference
    colorMode.preference = 'light'
  }
}

// the download button serves the pre-built PDF; native Ctrl+P still works and
// these keep it in the light, print-optimized theme
useEventListener('beforeprint', forceLightForPrint)
useEventListener('afterprint', () => {
  if (themeBeforePrint !== undefined) {
    colorMode.preference = themeBeforePrint
    themeBeforePrint = undefined
  }
})
</script>

<style scoped lang="scss">
.cv-container {
  max-width: 52rem;
}

.cv-sheet {
  position: relative;
  padding: 3rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background-color: var(--bulma-scheme-main);
}

.cv-meta {
  margin-top: -0.25rem;
}

.cv-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--bulma-primary);
}

.cv-subtitle {
  color: var(--bulma-text-weak);
}

.cv-contact {
  text-align: right;
  color: var(--bulma-text-weak);
}

.cv-section {
  margin-top: 2rem;
}

.cv-heading {
  font-family: var(--bulma-family-code, monospace);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--bulma-primary-on-scheme);
  margin-bottom: 0.75rem;
}

.cv-entry {
  margin-bottom: 1rem;
  break-inside: avoid;
}

.cv-entry-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.cv-period {
  color: var(--bulma-text-weak);
}

.cv-skills-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.35rem;

  .cv-skills-label {
    flex: 0 0 7rem;
    color: var(--bulma-text-weak);
  }
}

@media print {
  .cv-page {
    padding: 0;
  }

  .cv-sheet {
    border: none;
    padding: 0;
    font-size: 0.85rem;
  }

  .cv-section {
    margin-top: 1.25rem;
  }
}

@media screen and (max-width: 768px) {
  .cv-sheet {
    padding: 1.5rem;
  }

  .cv-contact {
    text-align: left;
  }
}
</style>
