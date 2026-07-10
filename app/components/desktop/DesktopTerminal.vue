<template>
  <div class="desktop-terminal">
    <TerminalPanes :active="active" input-id-base="desktop-terminal-input" @escape="() => {}" />
  </div>
</template>

<script setup lang="ts">
// The same interactive terminal (shared state) rendered inside an lvOS window
// instead of the centered overlay. `active` is true when this is the focused,
// non-minimized window so it owns the keyboard.
defineProps<{ active?: boolean }>()

// greet on first open, mirroring the overlay (without opening the overlay)
const { lines, greet } = useTerminal()
onMounted(() => {
  if (!lines.value.length) greet()
})
</script>

<style scoped lang="scss">
.desktop-terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 16rem;
  font-size: 0.85rem;
}
</style>
