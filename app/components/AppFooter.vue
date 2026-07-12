<template>
  <footer class="footer app-footer">
    <div class="content has-text-centered">
      <div class="mb-3 is-flex is-justify-content-center" style="gap: 1rem">
        <a
          v-for="social in profile.socials"
          :key="social.label"
          :href="social.url"
          :title="social.label"
          target="_blank"
          rel="noopener"
          class="social-link"
        >
          <AppIcon :name="(social.icon as IconName)" :size="20" />
        </a>
      </div>
      <p class="mb-1">&copy; {{ new Date().getFullYear() }} <b>{{ profile.domain }}</b></p>
      <p class="is-family-code is-size-7 has-text-weight-normal terminal-hint">
        press <kbd>~</kbd> or
        <button type="button" class="is-family-code footer-action" @click="open">click here</button> for terminal mode
        · <button type="button" class="is-family-code footer-action" @click="bootDesktop">boot lvOS</button>
      </p>
      <p class="is-family-code is-size-7 build-stamp">
        built {{ config.public.buildDate }} ·
        <button class="build-hash" :title="`git show ${config.public.buildHash}`" @click="showBuild">
          {{ config.public.buildHash }}
        </button>
        · <NuxtLink to="/changelog" class="build-changelog">changelog</NuxtLink>
        · <NuxtLink to="/keyboard" class="build-shortcuts">shortcuts</NuxtLink>
        · <NuxtLink to="/til" class="build-til">til</NuxtLink>
        · <button type="button" class="build-bug" @click="reportBug">found a bug?</button>
      </p>
      <RetroHitCounter />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'
import type { IconName } from '~/utils/icons'
import { bugReportUrl } from '~/utils/bugReport'

const { open, run } = useTerminal()
const bootDesktop = () => navigateTo('/desktop')

const config = useRuntimeConfig()
// the build stamp doubles as a door into the terminal's git command
const showBuild = () => {
  open()
  run(`git show ${config.public.buildHash}`)
}

// a prefilled GitHub issue with the page, viewport and build hash filled in
const reportBug = () => {
  const url = bugReportUrl({
    page: useRoute().path,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    version: config.public.buildHash,
    userAgent: navigator.userAgent
  })
  window.open(url, '_blank', 'noopener')
}
</script>

<style scoped lang="scss">
.app-footer {
  background: none;
  border-top: 1px solid var(--bulma-border-weak);

  .social-link {
    color: var(--bulma-text-weak);
    transition: color 0.2s, transform 0.2s;

    &:hover {
      color: var(--bulma-primary-on-scheme);
      transform: translateY(-2px);
    }
  }

  .terminal-hint {
    color: var(--bulma-text-weak);
  }

  // link-styled buttons, so keyboards can reach the terminal and lvOS too;
  // the dotted-underline affordance comes from the global .content link style
  .footer-action {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    cursor: pointer;
  }

  .build-stamp {
    margin-top: 0.35rem;
    color: var(--bulma-text-weak);
    opacity: 0.75;

    .build-hash {
      border: none;
      background: none;
      padding: 0;
      color: var(--bulma-primary-on-scheme);
      font: inherit;
      cursor: pointer;

      &:hover,
      &:focus-visible {
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }
    }

    .build-changelog,
    .build-shortcuts,
    .build-til,
    .build-bug {
      color: inherit;

      &:hover,
      &:focus-visible {
        color: var(--bulma-primary-on-scheme);
      }
    }

    .build-bug {
      border: none;
      background: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
    }
  }

}
</style>
