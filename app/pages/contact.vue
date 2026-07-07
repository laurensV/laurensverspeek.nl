<template>
  <section class="section">
    <div class="container contact-container">
      <p class="overline mb-2">contact $ ping laurens</p>
      <h1 class="title is-2">Let's build something</h1>
      <p class="subtitle is-5 has-text-grey mb-5">
        Got a project, an idea, or just want to say hi? Run the script.
      </p>

      <ContactWizard class="mb-5" />

      <div class="is-flex is-align-items-center is-justify-content-space-between is-flex-wrap-wrap contact-alt">
        <p class="is-family-code is-size-7 has-text-grey">
          // allergic to terminals?
          <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
        </p>
        <div class="is-flex" style="gap: 1rem">
          <a
            v-for="social in profile.socials"
            :key="social.label"
            :href="social.url"
            target="_blank"
            rel="noopener"
            class="contact-social is-family-code is-size-7"
          >
            [{{ social.label.toLowerCase() }}]
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

useHead({ title: 'Contact — Laurens Verspeek' })
useSeoMeta({ description: 'Contact Laurens Verspeek — run the contact.sh wizard or send a plain email.' })
</script>

<style scoped lang="scss">
.contact-container {
  max-width: 44rem;
}

.contact-alt {
  gap: 0.75rem;
}

.contact-social {
  color: var(--bulma-text-weak);

  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}
</style>
