<template>
  <div v-for="row in rows" :key="row.label" class="shortcut-row">
    <span class="shortcut-keys" :style="{ '--shortcut-keys-width': keysWidth ?? '0px' }">
      <kbd v-for="key in row.keys" :key="key">{{ key }}</kbd>
    </span>
    <span class="shortcut-label">{{ row.label }}</span>
  </div>
</template>

<script setup lang="ts">
// One keys → label cheat-sheet row list, shared by the site-wide shortcuts
// overlay (?) and the lvOS cheat sheet. Font size inherits from the host;
// the label color can be tuned via --shortcut-label-color.
interface ShortcutRow {
  keys: string[]
  label: string
}

defineProps<{
  rows: ShortcutRow[]
  /** Reserved width of the key column, so labels align */
  keysWidth?: string | undefined
}>()
</script>

<style scoped lang="scss">
.shortcut-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.28rem 0;
}

.shortcut-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  flex-shrink: 0;
  // the reserved key-column width comes in as a custom property so this rule
  // (not an inline style) owns min-width — letting the mobile query below drop it
  min-width: var(--shortcut-keys-width, 0);

  // on a phone the fixed reservation (e.g. 9rem on /keyboard) wastes most of the
  // row for a single-key shortcut and crushes the label to 2–3 lines; drop it so
  // the label reclaims the space
  @media (max-width: 520px) {
    min-width: 0;
  }
}

.shortcut-label {
  color: var(--shortcut-label-color, var(--bulma-text-weak));
}

kbd {
  font-size: 0.9em;
}
</style>
