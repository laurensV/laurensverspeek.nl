<template>
  <div class="code-window is-family-code">
    <div class="code-titlebar">
      <span class="dot" /><span class="dot" /><span class="dot" />
      <span class="code-title">{{ title }}</span>
    </div>
    <!-- `code` is authored HTML with .tok-* spans; rendered via v-html because
         Vue's template compiler collapses whitespace even inside <pre> -->
    <pre class="code-body" v-html="code" />
  </div>
</template>

<script setup lang="ts">
// Editor-style window for hand-highlighted code snippets.
defineProps<{ title: string, code: string }>()
</script>

<style scoped lang="scss">
.code-window {
  border: 1px solid var(--bulma-border-weak);
  border-radius: var(--bulma-radius-large);
  background-color: var(--bulma-scheme-main-bis);
  overflow: hidden;
  font-size: 0.8rem;
}

.code-titlebar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid var(--bulma-border-weak);

  .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background-color: var(--bulma-border);
  }

  .code-title {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    color: var(--bulma-text-weak);
  }
}

.code-body {
  margin: 0;
  padding: 1rem 1.2rem;
  background: none;
  color: var(--bulma-text);
  line-height: 1.7;
  overflow-x: auto;

  :deep(.tok-kw) {
    color: var(--bulma-danger);
  }
  :deep(.tok-type) {
    color: var(--bulma-info);
  }
  :deep(.tok-str) {
    color: var(--bulma-success);
  }
  :deep(.tok-fn) {
    color: var(--bulma-primary-on-scheme);
  }
  :deep(.tok-comment) {
    color: var(--bulma-text-weak);
    opacity: 0.75;
  }
}
</style>
