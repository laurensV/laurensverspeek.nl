<template>
  <div
    :data-win="win.id"
    class="lvos-window"
    :class="{
      'is-wide': wide,
      'is-minimized': win.minimized,
      'is-maximized': win.maximized,
      'has-size': win.maximized || win.height !== undefined,
      'is-peek': peek,
      'is-dimmed': dimmed
    }"
    @pointerdown="emit('focus')"
  >
    <header
      class="lvos-window-titlebar is-family-code"
      @pointerdown.prevent="emit('drag', $event)"
      @dblclick="emit('maximize')"
      @contextmenu.prevent.stop="emit('menu', $event)"
    >
      <span class="lvos-window-title">
        <span v-if="win.pinned" title="Pinned on top" aria-hidden="true">📌 </span>{{ win.title }}
      </span>
      <span class="lvos-window-actions">
        <button :aria-label="`Minimize ${win.title}`" title="Minimize" @pointerdown.stop @click.stop="emit('minimize')">–</button>
        <button
          :aria-label="`${win.maximized ? 'Restore' : 'Maximize'} ${win.title}`"
          :title="win.maximized ? 'Restore' : 'Maximize'"
          @pointerdown.stop
          @click.stop="emit('maximize')"
        >{{ win.maximized ? '❐' : '□' }}</button>
        <button :aria-label="`Close ${win.title}`" title="Close" @pointerdown.stop @click.stop="emit('close')">×</button>
      </span>
    </header>

    <div class="lvos-window-body" :class="{ 'is-flush': flush }">
      <slot />
    </div>

    <template v-if="!win.maximized">
      <span
        v-for="dir in RESIZE_DIRS"
        :key="dir"
        class="lvos-resize"
        :class="`is-${dir}`"
        aria-hidden="true"
        @pointerdown.prevent.stop="emit('resize', $event, dir)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DesktopWindow } from '~/composables/useWindowManager'

// One lvOS window's chrome: titlebar with actions, the body around the app
// (slotted, so app content keeps WebDesktop's scope) and the resize handles.
// All window *mechanics* stay in useWindowManager — this component only emits.

// the eight resize handles (four edges + four corners)
const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
export type ResizeDir = (typeof RESIZE_DIRS)[number]

defineProps<{
  win: DesktopWindow
  /** Wider default size (browser, blog, …) — from the app registry */
  wide?: boolean
  /** Aero-peek highlight while its taskbar button is hovered */
  peek?: boolean
  /** Faded because another window is being peeked */
  dimmed?: boolean
  /** Body without padding (the terminal fills edge-to-edge) */
  flush?: boolean
}>()

const emit = defineEmits<{
  focus: []
  drag: [event: PointerEvent]
  minimize: []
  maximize: []
  close: []
  menu: [event: MouseEvent]
  resize: [event: PointerEvent, dir: ResizeDir]
}>()
</script>

<style scoped lang="scss">
.lvos-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: min(26rem, 88vw);

  &.is-wide {
    width: min(44rem, 92vw);
  }
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--lv-scheme-hs), 10%, 0.97);
  box-shadow: 0 18px 50px hsla(var(--lv-scheme-hs), 2%, 0.6);
  color: hsl(var(--lv-scheme-hs), 88%);
  overflow: hidden;
  animation: lvos-window-open 0.18s ease;
  transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s;

  // minimize keeps the app mounted (game state survives) but genies it toward
  // its own taskbar button (--gx/--gy measured at minimize time; fall back to a
  // generic downward sail)
  &.is-minimized {
    opacity: 0;
    transform: translate(var(--gx, 0), var(--gy, 45vh)) scale(0.08);
    visibility: hidden;
    pointer-events: none;
  }

  &.is-maximized {
    inset: 0 0 2.4rem 0;
    width: auto;
    border-radius: 0;
  }

  // Aero-peek: hovering a taskbar item highlights its window and fades the rest
  &.is-peek {
    border-color: var(--bulma-primary);
    box-shadow: 0 0 0 1px var(--bulma-primary), 0 18px 50px hsla(var(--lv-primary-hsl), 0.3);
  }

  // a peeked, minimized window ghosts back into view instead of staying hidden
  &.is-minimized.is-peek {
    opacity: 0.55;
    transform: translateY(18vh) scale(0.7);
    visibility: visible;
  }

  &.is-dimmed:not(.is-minimized) {
    opacity: 0.4;
  }
}

@keyframes lvos-window-open {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(0.5rem);
  }
}

// respect reduced motion: windows appear/minimize without the fly-in or genie
@media (prefers-reduced-motion: reduce) {
  .lvos-window {
    animation: none;
    transition: opacity 0.12s ease, visibility 0.12s;

    &.is-minimized {
      transform: none;
    }
  }
}

.lvos-window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.8rem;
  font-size: 0.72rem;
  background-color: hsla(var(--lv-primary-hsl), 0.12);
  border-bottom: 1px solid hsla(var(--lv-primary-hsl), 0.25);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  .lvos-window-actions {
    display: flex;

    button {
      width: 1.4rem;
      border: none;
      background: none;
      color: inherit;
      font-size: 0.85rem;
      cursor: pointer;

      &:hover {
        color: var(--bulma-primary);
      }
    }
  }
}

.lvos-window-body {
  flex: 1;
  padding: 1rem;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 0.85rem;

  // app content is slotted, so it carries WebDesktop's scope id
  :slotted(a) {
    color: var(--bulma-primary);
  }
}

// explicit size (resized, snapped or maximized): let the body fill the window
.lvos-window.has-size .lvos-window-body {
  max-height: none;
}

// the terminal app fills its window edge-to-edge
.lvos-window-body.is-flush {
  padding: 0;
}

// resize handles: thin invisible hit areas on each edge, small squares on the
// corners. The south-east corner keeps the visible diagonal grip.
.lvos-resize {
  position: absolute;
  touch-action: none;
  z-index: 3;

  // edges (kept just inside the window so overflow:hidden doesn't clip them)
  &.is-n, &.is-s { left: 0.6rem; right: 0.6rem; height: 6px; cursor: ns-resize; }
  &.is-e, &.is-w { top: 0.6rem; bottom: 0.6rem; width: 6px; cursor: ew-resize; }
  &.is-n { top: 0; }
  &.is-s { bottom: 0; }
  &.is-e { right: 0; }
  &.is-w { left: 0; }

  // corners sit above the edges
  &.is-ne, &.is-nw, &.is-se, &.is-sw { width: 14px; height: 14px; z-index: 4; }
  &.is-ne { top: 0; right: 0; cursor: nesw-resize; }
  &.is-nw { top: 0; left: 0; cursor: nwse-resize; }
  &.is-sw { bottom: 0; left: 0; cursor: nesw-resize; }
  &.is-se {
    bottom: 0;
    right: 0;
    width: 1rem;
    height: 1rem;
    cursor: nwse-resize;
    // three diagonal grip lines
    background:
      linear-gradient(
        135deg,
        transparent 0 50%,
        hsla(var(--lv-primary-hsl), 0.5) 50% 55%,
        transparent 55% 65%,
        hsla(var(--lv-primary-hsl), 0.5) 65% 70%,
        transparent 70% 80%,
        hsla(var(--lv-primary-hsl), 0.5) 80% 85%,
        transparent 85%
      );
  }
}
</style>
