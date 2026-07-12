<template>
  <div class="bios is-family-code" role="dialog" aria-label="BIOS setup utility">
    <header class="bios-title">lvOS BIOS Setup Utility — Main</header>
    <div class="bios-body">
      <table class="bios-table">
        <tbody>
          <tr class="is-dim">
            <td>System Date</td>
            <td>{{ today }}</td>
          </tr>
          <tr :class="{ 'is-active': cursor === 0 }">
            <td>Wallpaper</td>
            <td>[{{ wallpapers[wallpaper]?.name ?? 'unknown' }}]</td>
          </tr>
          <tr :class="{ 'is-active': cursor === 1 }">
            <td>Night Light</td>
            <td>[{{ night.enabled.value ? 'Enabled' : 'Disabled' }}]</td>
          </tr>
          <tr :class="{ 'is-active': cursor === 2 }">
            <td>Night Light Warmth</td>
            <td>[{{ night.warmth.value }}%]</td>
          </tr>
          <tr :class="{ 'is-active': cursor === 3 }">
            <td>Screensaver</td>
            <td>[{{ saverNames[saver] }}]</td>
          </tr>
          <tr :class="{ 'is-active': cursor === 4 }">
            <td>Color Scheme</td>
            <td>[{{ colorMode.preference }}]</td>
          </tr>
          <tr :class="{ 'is-active': cursor === 5 }">
            <td>Quiet Boot <span class="bios-note">(skip splash this session)</span></td>
            <td>[{{ quietBoot ? 'Enabled' : 'Disabled' }}]</td>
          </tr>
        </tbody>
      </table>
      <aside class="bios-help">
        <p>Item Specific Help</p>
        <p class="bios-help-text">{{ HELP[cursor] }}</p>
        <p class="bios-help-text">These are the real settings — changes apply to the actual desktop, immediately.</p>
      </aside>
    </div>
    <footer class="bios-footer">
      <span>↑↓ Select Item</span>
      <span>←→ Change Values</span>
      <span>F10 Save &amp; Exit</span>
      <span>ESC Exit</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// The BIOS setup behind "Press DEL": arrow-key menus over REAL settings —
// wallpaper, night light and theme are the same shared state the desktop
// uses, so nothing here is decorative ([[consistency]]: one state, no fakes).

const emit = defineEmits<{ exit: [] }>()

const { wallpapers, wallpaper } = useWallpaper()
const night = useNightLight()
const colorMode = useColorMode()
const { saver, saverIds, saverNames } = useScreensaverChoice()

const cursor = ref(0)
const ROWS = 6

const HELP = [
  'Selects the desktop background. The Paint app can add a custom entry.',
  'Warms the display colors in the evening (the displays panel has the same switch).',
  'How warm the night light tints the screen.',
  'What plays when the desktop idles (the settings app has the same picker).',
  'dark, light, or follow the system.',
  'Skips the site boot splash for the rest of this browser session.'
]

const today = new Date().toISOString().slice(0, 10)

const quietBoot = ref(false)
onMounted(() => {
  quietBoot.value = sessionStorage.getItem('lv-booted') === '1'
})

const THEMES = ['dark', 'light', 'system']

const change = (dir: 1 | -1) => {
  if (cursor.value === 0) {
    const count = wallpapers.value.length
    wallpaper.value = (wallpaper.value + dir + count) % count
  } else if (cursor.value === 1) {
    night.enabled.value = !night.enabled.value
  } else if (cursor.value === 2) {
    night.warmth.value = Math.min(100, Math.max(0, night.warmth.value + dir * 5))
  } else if (cursor.value === 3) {
    const at = saverIds.indexOf(saver.value)
    saver.value = saverIds[(at + dir + saverIds.length) % saverIds.length]!
  } else if (cursor.value === 4) {
    const at = THEMES.indexOf(colorMode.preference)
    colorMode.preference = THEMES[(at + dir + THEMES.length) % THEMES.length]!
  } else {
    quietBoot.value = !quietBoot.value
    if (quietBoot.value) sessionStorage.setItem('lv-booted', '1')
    else sessionStorage.removeItem('lv-booted')
  }
}

useEventListener('keydown', (event: KeyboardEvent) => {
  const key = event.key
  if (key === 'ArrowUp') cursor.value = (cursor.value + ROWS - 1) % ROWS
  else if (key === 'ArrowDown') cursor.value = (cursor.value + 1) % ROWS
  else if (key === 'ArrowLeft') change(-1)
  else if (key === 'ArrowRight' || key === 'Enter') change(1)
  else if (key === 'F10' || key === 'Escape') emit('exit')
  else return
  event.preventDefault()
  event.stopPropagation()
})
</script>

<style scoped lang="scss">
// the one place on the site allowed to be BIOS blue
.bios {
  position: fixed;
  inset: 0;
  z-index: 97;
  display: flex;
  flex-direction: column;
  background-color: #0525ad;
  color: #d8d8e8;
  font-size: 0.85rem;
}

.bios-title {
  padding: 0.5rem 1.25rem;
  background-color: #04188a;
  color: #ffe14d;
  font-weight: 700;
  text-align: center;
}

.bios-body {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem clamp(1rem, 5vw, 4rem);
}

.bios-table {
  flex: 1.4;
  border-collapse: collapse;
  align-self: flex-start;

  td {
    padding: 0.35rem 0.9rem;
  }

  td:last-child {
    color: #7fd4ff;
  }

  tr.is-active td {
    background-color: #d8d8e8;
    color: #04188a;

    &:last-child {
      color: #04188a;
      font-weight: 700;
    }
  }

  tr.is-dim td {
    color: #8890c0;
  }
}

.bios-note {
  color: #8890c0;
  font-size: 0.72rem;
}

.bios-help {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #4a5ad0;
  align-self: flex-start;
  min-width: 12rem;

  p:first-child {
    color: #ffe14d;
    margin-bottom: 0.6rem;
  }
}

.bios-help-text {
  color: #b8c0e8;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.bios-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.6rem;
  padding: 0.5rem 1.25rem;
  background-color: #04188a;
  color: #d8d8e8;
  font-size: 0.75rem;
}
</style>
