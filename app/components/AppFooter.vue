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
        <a class="is-family-code" @click.prevent="open">click here</a> for terminal mode
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'
import type { IconName } from '~/components/AppIcon.vue'

const { open } = useTerminal()
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

  kbd {
    padding: 0.1em 0.45em;
    border: 1px solid var(--bulma-border);
    border-radius: var(--bulma-radius-small);
    background-color: var(--bulma-scheme-main-bis);
  }
}
</style>
