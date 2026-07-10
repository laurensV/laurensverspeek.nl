<template>
  <div
    class="lvos-context is-family-code"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @click.stop
  >
    <button @click="emit('terminal')">&gt;_ new terminal</button>
    <button @click="emit('wallpaper')">🖼 next wallpaper</button>
    <button @click="emit('open', 'settings')">⚙ settings</button>
    <button @click="emit('open', 'about-os')">ℹ about this computer</button>
    <button @click="emit('logout')">⏻ log out</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ x: number, y: number }>()
const emit = defineEmits<{
  terminal: []
  wallpaper: []
  open: [id: string]
  logout: []
}>()
</script>

<style scoped lang="scss">
.lvos-context {
  position: absolute;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  min-width: 11rem;
  padding: 0.35rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 12px 30px hsla(var(--lv-scheme-hs), 2%, 0.6);

  button {
    padding: 0.45rem 0.7rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 88%);
    font: inherit;
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
      color: var(--bulma-primary);
    }
  }
}
</style>
