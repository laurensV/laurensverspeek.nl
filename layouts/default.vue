<template>
  <v-app id="app">
    <modal/>
    <app-header :class="{'white-header' : true }"/>
    <v-main id="content">
      <nuxt/>
    </v-main>
    <v-footer color="white" padless id="footer">
      <v-row justify="center" no-gutters>
        <v-col class="primary py-4 text-center white--text" cols="12">
          &copy; {{ new Date().getFullYear() }} <b>Laurens Verspeek</b>
        </v-col>

      </v-row>
    </v-footer>

    <snackbar></snackbar>
  </v-app>
</template>

<script>
import Header from '@/layouts/Header.vue'

export default {
  components: {
    'app-header': Header
  },
  mounted () {
    if (window.location.hash) {
      setTimeout(() => {
        document.getElementById(window.location.hash.substring(1)).scrollIntoView(true)
        window.scrollBy(0, -100)
      }, 500)
    } else {
      window.scrollTo(0, 0)
    }
  }
}
</script>

<style lang="scss">
$body-font-family: "Roboto", sans-serif;
body .v-application {
  font-family: $body-font-family !important;

  .display-1,
  .display-2,
  .display-3,
  .display-4,
  .headline,
  .title,
  .subtitle-1,
  .subtitle-2,
  .body-1,
  .body-2,
  .caption,
  .overline {
    font-family: $body-font-family !important;
  }
}

#app {
  background: white;
}

#footer {
  border-top: 2px dashed #f4bd5a !important;
}
</style>
