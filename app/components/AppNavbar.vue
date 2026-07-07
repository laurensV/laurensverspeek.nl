<template>
  <nav class="navbar app-navbar" role="navigation" aria-label="main navigation">
    <div class="container">
      <div class="navbar-brand">
        <NuxtLink class="navbar-item is-family-code has-text-weight-bold" to="/">
          <span class="has-text-primary-on-scheme">~/</span>laurens-verspeek
        </NuxtLink>

        <a
          role="button"
          class="navbar-burger"
          :class="{ 'is-active': mobileMenu }"
          aria-label="menu"
          :aria-expanded="mobileMenu"
          @click="mobileMenu = !mobileMenu"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </a>
      </div>

      <div class="navbar-menu" :class="{ 'is-active': mobileMenu }">
        <div class="navbar-start">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            class="navbar-item nav-link is-family-code"
            :to="item.to"
            exact-active-class="is-active"
            @click="mobileMenu = false"
          >
            <span class="nav-comment">//&nbsp;</span>{{ item.label.toLowerCase() }}
          </NuxtLink>
        </div>

        <div class="navbar-end">
          <div class="navbar-item">
            <div class="buttons are-small">
              <button
                class="button terminal-button is-family-code"
                title="Open terminal (~)"
                @click="openTerminal"
              >
                <AppIcon name="terminal" :size="16" />
                <span class="ml-2 is-hidden-touch">terminal</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const mobileMenu = ref(false)
const { open } = useTerminal()

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/uses', label: 'Uses' },
  { to: '/contact', label: 'Contact' }
]

const openTerminal = () => {
  mobileMenu.value = false
  open()
}
</script>

<style scoped lang="scss">
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  background-color: hsla(
    var(--bulma-scheme-h),
    var(--bulma-scheme-s),
    var(--bulma-scheme-main-l),
    0.75
  );
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--bulma-border-weak);

  .navbar-menu {
    background: none;
  }

  .nav-link {
    position: relative;
    font-weight: 500;
    font-size: 0.9rem;

    .nav-comment {
      color: var(--bulma-text-weak);
      opacity: 0.6;
      transition: color 0.2s ease, opacity 0.2s ease;
    }

    &:hover .nav-comment,
    &.is-active .nav-comment {
      color: var(--bulma-primary-on-scheme);
      opacity: 1;
    }

    &::after {
      content: '';
      position: absolute;
      left: 0.75rem;
      bottom: 0.35rem;
      height: 2px;
      width: 0;
      background-color: var(--bulma-primary);
      transition: width 0.3s ease;
    }

    &.is-active {
      // Underline instead of Bulma's default filled background
      background-color: transparent;
      color: var(--bulma-text-strong);
      font-weight: 700;

      &::after {
        width: calc(100% - 1.5rem);
      }
    }
  }

  .terminal-button {
    gap: 0;
  }
}
</style>
