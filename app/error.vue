<template>
  <div class="error-page is-flex is-align-items-center is-justify-content-center">
    <div class="has-text-centered">
      <p class="is-family-code error-code has-text-primary-on-scheme">
        {{ error?.statusCode ?? 500 }}
      </p>
      <p class="is-family-code is-size-5 mb-5">
        <template v-if="error?.statusCode === 404">
          bash: {{ path }}: command not found
        </template>
        <template v-else>something went wrong on this page</template>
      </p>
      <CmdButton variant="primary" @click="handleError">cd ~</CmdButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error?: NuxtError }>()

const path = useRoute().path
const handleError = () => clearError({ redirect: '/' })
</script>

<style scoped lang="scss">
.error-page {
  min-height: 100vh;
  background-color: var(--bulma-scheme-main);
}

.error-code {
  font-size: clamp(5rem, 20vw, 10rem);
  font-weight: 700;
  line-height: 1;
}
</style>
