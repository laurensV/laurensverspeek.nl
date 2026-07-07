<template>
  <span class="tui-frame" :style="frameStyle" aria-hidden="true">
    <span class="tui-corner is-tl" />
    <span class="tui-corner is-tr" />
    <span class="tui-corner is-bl" />
    <span class="tui-corner is-br" />
  </span>
</template>

<script setup lang="ts">
// Decorative TUI focus frame: four L-shaped corner brackets that sit just
// outside a positioned parent. Drop <TuiFrame /> inside any `position:
// relative` element to get the bracket treatment used across the site.
const props = withDefaults(
  defineProps<{
    /** Arm length of each corner bracket */
    size?: string
    /** Border thickness */
    thickness?: string
    /** Bracket color (any CSS color / var) */
    color?: string
    /** How far outside the parent edge the brackets sit */
    offset?: string
  }>(),
  { size: '0.7rem', thickness: '2px', color: 'var(--bulma-primary)', offset: '-2px' }
)

const frameStyle = computed(() => ({
  '--tui-size': props.size,
  '--tui-thickness': props.thickness,
  '--tui-color': props.color,
  '--tui-offset': props.offset
}))
</script>

<style scoped lang="scss">
.tui-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.tui-corner {
  position: absolute;
  width: var(--tui-size);
  height: var(--tui-size);
  border: 0 solid var(--tui-color);

  &.is-tl {
    top: var(--tui-offset);
    left: var(--tui-offset);
    border-top-width: var(--tui-thickness);
    border-left-width: var(--tui-thickness);
  }
  &.is-tr {
    top: var(--tui-offset);
    right: var(--tui-offset);
    border-top-width: var(--tui-thickness);
    border-right-width: var(--tui-thickness);
  }
  &.is-bl {
    bottom: var(--tui-offset);
    left: var(--tui-offset);
    border-bottom-width: var(--tui-thickness);
    border-left-width: var(--tui-thickness);
  }
  &.is-br {
    bottom: var(--tui-offset);
    right: var(--tui-offset);
    border-bottom-width: var(--tui-thickness);
    border-right-width: var(--tui-thickness);
  }
}
</style>
