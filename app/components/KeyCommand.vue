<template>
  <div class="key-command is-family-code">
    <p class="kc-label"># {{ label }}</p>
    <div class="kc-row">
      <pre class="kc-cmd" tabindex="0"><span class="kc-prompt">$</span> {{ cmd }}</pre>
      <button type="button" class="kc-copy" :class="{ 'is-copied': copied }" @click="copy(cmd)">
        {{ copied ? 'copied ✓' : 'copy' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// One labeled, copyable shell command — the building block of the /keys page.
// The label says what the command does; the copy button grabs it without the `$`.
defineProps<{ label: string, cmd: string }>()
const { copied, copy } = useCopyFlag()
</script>

<style scoped lang="scss">
.key-command {
  min-width: 0;
}

.kc-label {
  margin-bottom: 0.3rem;
  color: var(--bulma-text-weak);
  font-size: 0.72rem;
}

.kc-row {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background: var(--bulma-scheme-main-bis);
}

.kc-cmd {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.55rem 0.75rem;
  background: none;
  color: var(--bulma-text);
  font-size: 0.78rem;
  line-height: 1.4;
  white-space: pre;
  overflow-x: auto;

  .kc-prompt {
    color: var(--bulma-primary-on-scheme);
    user-select: none;
  }
}

.kc-copy {
  flex-shrink: 0;
  padding: 0 0.85rem;
  border: none;
  border-left: 1px solid var(--bulma-border-weak);
  background: none;
  color: var(--bulma-text-weak);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: var(--bulma-primary-on-scheme);
  }

  &.is-copied {
    color: var(--bulma-primary-on-scheme);
  }
}
</style>
