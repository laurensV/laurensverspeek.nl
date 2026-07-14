<template>
  <component :is="tag" ref="el" :aria-label="text">{{ text }}</component>
</template>

<script setup lang="ts">
// A section heading that "decodes" — its characters cycle through glyphs and
// settle into place — the first time it scrolls into view. Reuses the same
// scramble the nav links use on hover. The real text is always in the DOM (SSR
// + aria-label), so screen readers and no-JS visitors are unaffected.
const props = withDefaults(defineProps<{ text: string, tag?: string }>(), { tag: 'h2' })

const el = ref<HTMLElement>()
const { revealed } = useScrollReveal(el)
const { scramble } = useTextScramble()
// combined OS + site "reduce motion" (scramble() also guards, this just skips setup)
const reducedMotion = useReducedMotion()

let played = false
watch(revealed, (isRevealed) => {
  if (!isRevealed || played) return
  played = true
  if (reducedMotion.value) return
  const node = el.value
  if (node) scramble(node, props.text)
}, { immediate: true })
</script>
