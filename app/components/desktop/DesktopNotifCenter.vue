<template>
  <div class="lvos-notif is-family-code">
    <div class="lvos-notif-head">
      <span>notifications</span>
      <button v-if="notifications.length" class="lvos-notif-clear" @click="emit('clear')">clear</button>
    </div>
    <p v-if="!notifications.length" class="lvos-notif-empty">nothing here yet.</p>
    <div v-for="note in notifications" v-else :key="note.id" class="lvos-notif-item">
      <span class="lvos-notif-icon">{{ note.icon }}</span>
      <div>
        <p class="lvos-notif-title">{{ note.title }}</p>
        <p v-if="note.body" class="lvos-notif-body">{{ note.body }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Toast } from '~/composables/useDesktopToasts'

// The taskbar bell's notification history panel.

defineProps<{ notifications: Toast[] }>()
const emit = defineEmits<{ clear: [] }>()
</script>

<style scoped lang="scss">
.lvos-notif {
  position: absolute;
  bottom: 2.6rem;
  right: 0.5rem;
  // match the sibling tray popovers so a maximized window can't cover this
  z-index: 10000;
  width: 17rem;

  // clear the taller touch taskbar, like the start menu and volume popover
  @media (pointer: coarse) {
    bottom: 3.3rem;
  }
  max-height: 20rem;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);

  .lvos-notif-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.2rem 0.4rem 0.5rem;
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;

    .lvos-notif-clear {
      border: none;
      background: none;
      color: hsl(var(--lv-scheme-hs), 55%);
      font: inherit;
      font-size: 0.68rem;
      text-transform: none;
      cursor: pointer;

      &:hover {
        color: var(--bulma-primary);
      }
    }
  }

  .lvos-notif-empty {
    padding: 0.75rem 0.4rem;
    color: hsl(var(--lv-scheme-hs), 45%);
    font-size: 0.75rem;
  }

  .lvos-notif-item {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.4rem;
    border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);

    .lvos-notif-icon {
      font-size: 1rem;
    }

    .lvos-notif-title {
      color: hsl(var(--lv-scheme-hs), 90%);
      font-size: 0.78rem;
    }

    .lvos-notif-body {
      color: hsl(var(--lv-scheme-hs), 60%);
      font-size: 0.7rem;
    }
  }
}
</style>
