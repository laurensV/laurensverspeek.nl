<template>
  <svg
    class="app-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="icons[name]"
  />
</template>

<script setup lang="ts">
// Feather-style inline icons: no icon-font dependency, colored via currentColor.
// The path data + IconName type live in utils/icons.ts so plain .ts modules
// can import them without going through an SFC.
import { icons, type IconName } from '~/utils/icons'

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })

export type { IconName }
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
