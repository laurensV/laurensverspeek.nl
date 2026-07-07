<template>
  <button class="button" title="Toggle theme" aria-label="Toggle theme" @click="toggle">
    <ClientOnly>
      <AppIcon :name="colorMode.value === 'dark' ? 'sun' : 'moon'" :size="16" />
      <template #fallback>
        <AppIcon name="moon" :size="16" />
      </template>
    </ClientOnly>
  </button>
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const toggle = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
