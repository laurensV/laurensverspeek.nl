<template>
  <div ref="el" class="reveal" :class="{ 'is-revealed': revealed }" :style="delayStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Wrapper that fades/slides its content in when scrolled into view.
const props = withDefaults(defineProps<{ delay?: number }>(), { delay: 0 })

const el = ref<HTMLElement>()
const { revealed } = useScrollReveal(el)

const delayStyle = computed(() =>
  props.delay ? { transitionDelay: `${props.delay}ms` } : undefined
)
</script>
