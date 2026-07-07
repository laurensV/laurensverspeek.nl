<template>
  <button class="theme-toggle" title="Toggle theme" aria-label="Toggle theme" @click="toggle">
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

<style scoped lang="scss">
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background: none;
  color: var(--bulma-text-weak);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, transform 0.3s ease;

  &:hover {
    color: var(--bulma-primary-on-scheme);
    border-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.5);
    transform: rotate(40deg);
  }

  &:active {
    transform: rotate(40deg) scale(0.92);
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
}
</style>
