<template>
  <section class="section">
    <div class="container has-text-centered contact-container">
      <p class="overline mb-2">contact $ ping laurens</p>
      <h1 class="title is-2">Let's build something</h1>
      <p class="subtitle is-5 has-text-grey">
        Got a project, an idea, or just want to say hi? My inbox is open.
      </p>

      <a :href="`mailto:${profile.email}`" class="button is-primary is-large my-5">
        <span class="icon"><AppIcon name="mail" :size="20" /></span>
        <span>{{ profile.email }}</span>
      </a>

      <div class="columns is-centered mt-4">
        <div v-for="social in externalSocials" :key="social.label" class="column is-3">
          <a :href="social.url" target="_blank" rel="noopener" class="box contact-box">
            <AppIcon :name="(social.icon as IconName)" :size="26" />
            <p class="has-text-weight-semibold mt-2">{{ social.label }}</p>
          </a>
        </div>
      </div>

      <p class="is-family-code is-size-7 has-text-grey mt-6">
        pro tip: you can also run <a @click.prevent="openWithContact">contact</a> in the terminal
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { IconName } from '~/components/AppIcon.vue'
import { profile } from '~/data/profile'

useHead({ title: 'Contact — Laurens Verspeek' })

const { open, run } = useTerminal()

const externalSocials = profile.socials.filter((s) => !s.url.startsWith('mailto:'))

const openWithContact = () => {
  open()
  run('contact')
}
</script>

<style scoped lang="scss">
.contact-container {
  max-width: 48rem;
  padding-top: 4rem;
}

.contact-box {
  display: block;
  color: var(--bulma-text);
  border: 1px solid var(--bulma-border-weak);
  transition: border-color 0.25s ease, transform 0.25s ease;

  &:hover {
    border-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.5);
    transform: translateY(-3px);
    color: var(--bulma-primary-on-scheme);
  }
}
</style>
