<template>
  <footer class="footer is-transparent mt-6">
    <div class="content has-text-centered">
      <p>
        &copy; {{ new Date().getFullYear() }} <b>laurensverspeek.nl</b>
      </p>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
  .footer {
    .navbar {
      border-top: 2px solid $primary;
    }
    &.is-transparent {
      background: transparent;
    }
    .logo {
      height: 50px;
    }
    .navbar {
      .navbar-menu {
        margin-top: 0px;
        align-items: center;
      }
    }
  }
</style>
