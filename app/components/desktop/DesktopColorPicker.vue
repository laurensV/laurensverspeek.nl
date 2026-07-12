<template>
  <div class="picker is-family-code">
    <div class="picker-swatch" :style="{ background: hslCss }">
      <button v-if="hasEyeDropper" class="picker-eyedrop" title="sample a colour from the screen" @click="sample">
        ⟟ pick
      </button>
    </div>

    <div class="picker-values">
      <button class="picker-value" title="copy hex" @click="copyValue(hex)">
        <span class="picker-value-k">HEX</span> {{ hex }}
      </button>
      <button class="picker-value" title="copy rgb" @click="copyValue(rgbCss)">
        <span class="picker-value-k">RGB</span> {{ rgb.r }}, {{ rgb.g }}, {{ rgb.b }}
      </button>
      <button class="picker-value" title="copy hsl" @click="copyValue(hslCss)">
        <span class="picker-value-k">HSL</span> {{ h }}°, {{ s }}%, {{ l }}%
      </button>
      <span v-if="copied" class="picker-copied">copied ✓</span>
    </div>

    <label class="picker-slider">
      <span>hue</span>
      <input v-model.number="h" type="range" min="0" max="360" class="picker-hue">
    </label>
    <label class="picker-slider">
      <span>sat</span>
      <input v-model.number="s" type="range" min="0" max="100">
    </label>
    <label class="picker-slider">
      <span>lum</span>
      <input v-model.number="l" type="range" min="0" max="100">
    </label>

    <div class="picker-accent">
      <button class="picker-apply" @click="accent.applyCustom(h, s, l)">use as site accent</button>
      <div class="picker-presets">
        <button
          v-for="a in accent.accents"
          :key="a.name"
          class="picker-preset"
          :title="a.name"
          :style="{ background: `hsl(${a.h}, ${a.s}%, ${a.l}%)` }"
          @click="applyPreset(a)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { hslToRgb, rgbToHex, rgbToHsl, hexToRgb } from '~/utils/color'
import type { Accent } from '~/composables/useAccent'

// An eyedropper + HSL colour tool. Copies hex/rgb/hsl, samples screen colours
// where the native EyeDropper API exists, and can push any colour to the real
// site accent (the same system the `colorscheme` command drives).

const accent = useAccent()

const h = ref(44)
const s = ref(100)
const l = ref(50)

const rgb = computed(() => hslToRgb(h.value, s.value, l.value))
const hex = computed(() => rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b))
const hslCss = computed(() => `hsl(${h.value}, ${s.value}%, ${l.value}%)`)
const rgbCss = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`)

const hasEyeDropper = import.meta.client && 'EyeDropper' in window

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined
const copyValue = (value: string) => {
  void navigator.clipboard?.writeText(value)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 1200)
}
onUnmounted(() => clearTimeout(copyTimer))

const setFromHex = (hexValue: string) => {
  const parsed = hexToRgb(hexValue)
  if (!parsed) return
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
  h.value = hsl.h
  s.value = hsl.s
  l.value = hsl.l
}

const applyPreset = (a: Accent) => {
  h.value = a.h
  s.value = a.s
  l.value = a.l
  accent.setAccent(a.name)
}

// the EyeDropper API is behind a runtime feature check; typed loosely on purpose
const sample = async () => {
  try {
    const Dropper = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
    const result = await new Dropper().open()
    setFromHex(result.sRGBHex)
  } catch { /* the user dismissed the picker */ }
}
</script>

<style scoped lang="scss">
.picker {
  color: hsl(var(--lv-scheme-hs), 88%);
  min-width: 15rem;
}

.picker-swatch {
  height: 5rem;
  border-radius: var(--bulma-radius);
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0.4rem;
}

.picker-eyedrop {
  border: 1px solid hsla(0, 0%, 0%, 0.3);
  border-radius: var(--bulma-radius-small);
  background: hsla(0, 0%, 0%, 0.45);
  color: hsl(0, 0%, 100%);
  font: inherit;
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
}

.picker-values {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin: 0.7rem 0;
}

.picker-value {
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-scheme-hs), 50%, 0.1);
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;

  &:hover { border-color: var(--bulma-primary); }
}

.picker-value-k {
  color: hsl(var(--lv-scheme-hs), 58%);
  margin-right: 0.2rem;
}

.picker-copied {
  color: var(--bulma-primary-on-scheme);
  font-size: 0.72rem;
}

.picker-slider {
  display: grid;
  grid-template-columns: 2.4rem 1fr;
  align-items: center;
  gap: 0.6rem;
  margin: 0.35rem 0;
  font-size: 0.75rem;

  span { color: hsl(var(--lv-scheme-hs), 68%); }
  input { width: 100%; accent-color: var(--bulma-primary); }
}

.picker-hue {
  background: linear-gradient(90deg, red, #ff0, lime, cyan, blue, magenta, red);
  border-radius: 3px;
}

.picker-accent {
  margin-top: 0.8rem;
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
  padding-top: 0.7rem;
}

.picker-apply {
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-primary-hsl), 0.14);
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  font-size: 0.75rem;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.picker-presets {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

.picker-preset {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  cursor: pointer;
}
</style>
