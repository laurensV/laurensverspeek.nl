<template>
  <component
    :is="tag"
    class="cmd-btn is-family-code"
    :class="[`is-${variant}`, { 'is-medium': size === 'medium' }]"
    v-bind="linkAttrs"
  >
    <span class="cmd-btn-prompt" aria-hidden="true">$</span>
    <span class="cmd-btn-label"><slot /></span>
    <span class="cmd-btn-caret" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
// Terminal-style button: a shell prompt you can click. Two corner brackets
// grow into a full frame on hover, the prompt lights up and a caret blinks
// as if the command is ready to run.
const props = withDefaults(
  defineProps<{
    to?: string
    href?: string
    /** When set, download the href as a file (same tab) instead of opening it */
    download?: string
    variant?: 'ghost' | 'primary'
    size?: 'normal' | 'medium'
  }>(),
  { to: undefined, href: undefined, download: undefined, variant: 'ghost', size: 'normal' }
)

const NuxtLink = resolveComponent('NuxtLink')
const tag = computed(() => (props.to ? NuxtLink : props.href ? 'a' : 'button'))
const linkAttrs = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href) {
    // downloads stay in the same tab; external links open a new one
    return props.download
      ? { href: props.href, download: props.download }
      : { href: props.href, target: '_blank', rel: 'noopener' }
  }
  return { type: 'button' as const }
})
</script>

<style scoped lang="scss">
.cmd-btn {
  --cmd-accent: var(--bulma-text-strong);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.55em 1.1em;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background:
    linear-gradient(
      hsla(var(--lv-primary-hsl), 0.08),
      hsla(var(--lv-primary-hsl), 0.08)
    )
    no-repeat left / 0% 100%;
  color: var(--bulma-text);
  font-size: 0.85rem;
  line-height: 1.4;
  cursor: pointer;
  transition: background-size 0.3s ease, border-color 0.25s ease, color 0.2s ease;

  &.is-medium {
    font-size: 1rem;
  }

  // corner brackets: top-left + bottom-right L-shapes that grow into a
  // full frame on hover
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 0.55em;
    height: 0.55em;
    border: 0 solid var(--cmd-accent);
    transition: width 0.28s ease, height 0.28s ease, border-color 0.28s ease;
    pointer-events: none;
  }

  &::before {
    top: -1px;
    left: -1px;
    border-top-width: 1px;
    border-left-width: 1px;
  }

  &::after {
    bottom: -1px;
    right: -1px;
    border-bottom-width: 1px;
    border-right-width: 1px;
  }

  .cmd-btn-prompt {
    color: var(--bulma-text-weak);
    transition: color 0.2s ease;
  }

  .cmd-btn-label {
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
  }

  // block caret, revealed and blinking on hover — command ready to run
  .cmd-btn-caret {
    width: 0.5em;
    height: 1.05em;
    margin-left: -0.1em;
    background-color: var(--cmd-accent);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover,
  &:focus-visible {
    color: var(--bulma-text-strong);
    border-color: var(--bulma-border);
    background-size: 100% 100%;

    &::before,
    &::after {
      width: calc(100% + 2px);
      height: calc(100% + 2px);
      border-color: var(--cmd-accent);
    }

    .cmd-btn-prompt {
      color: var(--cmd-accent);
    }

    .cmd-btn-caret {
      opacity: 1;
      animation: cmd-caret-blink 1s steps(2, start) infinite;
    }
  }

  &:active {
    transform: translateY(1px);
  }

  &.is-primary {
    --cmd-accent: var(--bulma-primary);
    border-color: hsla(var(--lv-primary-hsl), 0.45);
    color: var(--bulma-primary-on-scheme);

    .cmd-btn-prompt {
      color: hsla(var(--lv-primary-hsl), 0.6);
    }

    &:hover,
    &:focus-visible {
      color: var(--bulma-primary-on-scheme);
      border-color: hsla(var(--lv-primary-hsl), 0.7);
    }
  }
}

@keyframes cmd-caret-blink {
  to {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cmd-btn,
  .cmd-btn::before,
  .cmd-btn::after {
    transition: none;
  }

  .cmd-btn:hover .cmd-btn-caret,
  .cmd-btn:focus-visible .cmd-btn-caret {
    animation: none;
  }
}
</style>
