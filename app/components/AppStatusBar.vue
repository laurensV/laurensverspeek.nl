<template>
  <div class="status-bar is-family-code no-print" role="toolbar" aria-label="Editor status bar">
    <div class="status-group">
      <a
        class="status-item"
        href="https://github.com/laurensV/laurensverspeek.nl"
        target="_blank"
        rel="noopener"
        title="View source on GitHub"
      >
        <AppIcon name="code" :size="11" /> main*
      </a>
      <!-- stays visible on mobile: its 5-tap easter egg must be findable by thumb too -->
      <button
        class="status-item status-button"
        title="v2.0.0"
        @click="versionClick"
      >v2.0.0</button>
      <button
        v-if="visitors.enabled.value && visitors.count.value > 0"
        class="status-item status-button status-visitors"
        :class="{ 'is-showing': visitors.showCursors.value }"
        :aria-pressed="visitors.showCursors.value"
        :title="visitors.showCursors.value ? 'Live cursors shown — click to hide' : 'Live cursors hidden — click to show'"
        @click="visitors.showCursors.value = !visitors.showCursors.value"
      >
        ◉ {{ visitors.count.value }} browsing
      </button>
      <button
        class="status-item status-button status-online"
        :class="{ 'is-pinging': pinging }"
        :title="`presence: ${presence.label} — click to change`"
        @click="cyclePresence"
      >
        <span class="online-dot" :style="{ '--dot': presence.color }" /> {{ presence.label }}
      </button>
      <button
        v-if="petView"
        class="status-item status-button status-pet is-hidden-mobile"
        :title="`${petView.name} is ${petView.moodLine} — click to check on them`"
        @click="checkPet"
      >{{ petView.face }} {{ petView.name }}</button>
    </div>

    <div class="status-group">
      <span v-if="pendingKey" class="status-item status-pending" aria-hidden="true">{{ pendingKey }}-</span>
      <span class="status-item is-hidden-touch">Ln {{ line }}, Col {{ column }}</span>
      <span class="status-item is-hidden-touch">UTF-8</span>
      <button class="status-item status-button status-eol is-hidden-touch" title="Line endings" @click="toggleEol">{{ eol }}</button>
      <button class="status-item status-button status-lang is-hidden-mobile" title="Language mode" @click="cycleLang">{{ LANGS[lang] }}</button>
      <button class="status-item status-button is-hidden-mobile" title="Command palette" @click="palette.open()">
        ctrl+k
      </button>
      <button class="status-item status-button" title="Open terminal (~)" @click="terminal.open()">
        <AppIcon name="terminal" :size="11" /> zsh
      </button>
      <span v-if="!online" class="status-item status-offline" title="offline — cached pages still work">⚠ offline</span>
      <span v-if="clock" class="status-item status-clock" :title="`your local time — ${clock}`">{{ clock }}</span>
      <button class="status-item status-button" title="Toggle theme" @click="toggleTheme($event)">
        <ClientOnly>
          <AppIcon :name="colorMode.value === 'dark' ? 'sun' : 'moon'" :size="11" />
          <template #fallback><AppIcon name="moon" :size="11" /></template>
        </ClientOnly>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// lightweight openers so the status bar doesn't drag the terminal/palette
// command registries onto every page (the overlays are lazily mounted)
const terminal = useTerminalLauncher()
const palette = usePaletteLauncher()
const colorMode = useColorMode()
const online = useOnline()

// which-key: shows "g-" while a vim go-to chord is waiting for its second key
const pendingKey = useState(STATE_KEYS.vimPendingKey, () => '')

// live visitors (cursors relay): count badge; clicking toggles the cursor dots
const visitors = useLiveVisitors()

// the tamagotchi (if adopted via the terminal's `pet` command)
const { view: petView } = usePet()

// clicking the pet opens the terminal AND checks on it, rather than just
// opening an empty shell
const checkPet = () => {
  terminal.open()
  terminal.run('pet')
}

const { toggle: toggleTheme } = useThemeSwitch()

// presence dot, EOL toggle, language mode, vibe cursor, clock and the
// destroy-mode version click all live in useStatusBarEggs
const {
  presence, pinging, cyclePresence,
  eol, toggleEol,
  lang, cycleLang,
  line, column,
  clock,
  versionClick
} = useStatusBarEggs()
</script>

<style scoped lang="scss">
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 1.65rem;
  padding: 0 0.5rem;
  font-size: 0.72rem;
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-bis-l),
    0.92
  );
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text-weak);

  // a 26px bar leaves the theme toggle / presence / version controls too small to
  // tap — grow the bar (and so its full-height items) on touch pointers
  @media (pointer: coarse) {
    height: 2.5rem;
    font-size: 0.8rem;
  }
}

.status-group {
  display: flex;
  align-items: center;
  height: 100%;
}

// on a phone the two groups' natural width exceeds the viewport, and with
// `space-between` it was the RIGHT group — holding the terminal button and the
// sun/moon toggle, the only tap-accessible theme switch on mobile — that got
// pushed off the edge. Let the left (easter-egg) group yield first: it shrinks
// and clips its least-essential items (presence, visitors) so the controls the
// user actually needs stay reachable.
.status-group:first-child {
  @media (pointer: coarse) {
    min-width: 0;
    overflow: hidden;
  }
}

// the local-time clock is nice-to-have and a phone always shows the OS clock;
// drop it on the narrowest screens so it can't crowd the toggle off
.status-clock {
  @media (max-width: 22.5rem) {
    display: none;
  }
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
  padding: 0 0.55rem;
  color: inherit;
  white-space: nowrap;

  // a slightly wider hit area to go with the taller bar on touch — but not so
  // wide that the row overflows the viewport (was 0.85rem, which pushed the
  // theme toggle off a 375px screen)
  @media (pointer: coarse) {
    padding: 0 0.55rem;
  }
}

// live visitor badge: dim while cursors are hidden, accent while shown
.status-visitors {
  color: var(--bulma-text-weak);

  &.is-showing {
    color: var(--bulma-primary);
  }
}

// the pending vim chord ("g-") flashes in accent while it waits
.status-pending {
  color: var(--bulma-primary);
  font-weight: 700;
}

// the network dropped: quiet amber, matching the toast
.status-offline {
  color: hsl(45deg, 90%, 60%);
}

a.status-item:hover,
.status-button:hover {
  background-color: hsla(var(--lv-primary-hsl), 0.15);
  color: var(--bulma-text-strong);
}

.status-button {
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
}

.status-online {
  position: relative;

  .online-dot {
    position: relative;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background-color: var(--dot, var(--bulma-success));
    box-shadow: 0 0 6px var(--dot, var(--bulma-success));
  }

  // radar ping ring that expands and fades on each presence change
  &.is-pinging .online-dot::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 1px solid var(--dot, var(--bulma-success));
    animation: status-ping 0.6s ease-out;
  }
}

@keyframes status-ping {
  from {
    transform: scale(1);
    opacity: 0.8;
  }
  to {
    transform: scale(3.2);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-online.is-pinging .online-dot::after {
    animation: none;
  }
}
</style>
