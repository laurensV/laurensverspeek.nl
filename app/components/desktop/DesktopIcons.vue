<template>
  <div class="lvos-icons">
    <button v-for="icon in icons" :key="icon.id" class="lvos-icon is-family-code" @click="icon.action">
      <span class="lvos-icon-glyph"><AppIcon :name="icon.icon" :size="26" /></span>
      <span class="lvos-icon-label">{{ icon.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from '~/components/AppIcon.vue'

export interface DesktopIconItem { id: string, label: string, icon: IconName, action: () => void }

defineProps<{ icons: DesktopIconItem[] }>()
</script>

<style scoped lang="scss">
.lvos-icons {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  bottom: 4rem;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.75rem;
}

.lvos-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: 5.5rem;
  padding: 0.6rem 0.25rem;
  border: 1px solid transparent;
  border-radius: var(--bulma-radius);
  background: none;
  color: hsl(var(--lv-scheme-hs), 90%);
  font-size: 0.7rem;
  cursor: pointer;

  .lvos-icon-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: var(--bulma-radius);
    background-color: hsla(var(--lv-primary-hsl), 0.15);
    color: var(--bulma-primary);
  }

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.4);
    background-color: hsla(var(--lv-primary-hsl), 0.08);
  }
}
</style>
