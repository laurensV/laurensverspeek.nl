<template>
  <div class="lvos-icons">
    <button v-for="icon in icons" :key="icon.id" class="lvos-icon is-family-code" @click="icon.action">
      <span class="lvos-icon-glyph">
        <AppIcon :name="icon.icon" :size="26" />
        <span v-if="badges?.[icon.id]" class="lvos-icon-badge">{{ badges[icon.id] }}</span>
      </span>
      <span class="lvos-icon-label">{{ icon.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from '~/utils/icons'

interface DesktopIconItem { id: string, label: string, icon: IconName, action: () => void }

defineProps<{ icons: DesktopIconItem[], badges?: Record<string, number> }>()
</script>

<style scoped lang="scss">
.lvos-icons {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  bottom: 4rem;
  display: flex;
  flex-flow: column wrap;
  align-content: flex-start;
  gap: 0.75rem;
}

.lvos-icon-glyph {
  position: relative;
}

.lvos-icon-badge {
  position: absolute;
  top: -0.35rem;
  right: -0.6rem;
  min-width: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 0.6rem;
  background-color: var(--bulma-primary);
  color: hsl(240, 11%, 8%);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
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
