<template>
  <div>
    <v-navigation-drawer v-if="!$vuetify.breakpoint.lgAndUp" v-model="drawer" app>
      <v-list dense>
        <v-list-item link to="/">
          <v-list-item-title>Home</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/about">
          <v-list-item-title>About</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/solutions">
          <v-list-item-title>Solutions</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/for-organisations">
          <v-list-item-title>Enterprise</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/token-page">
          <v-list-item-title>EFX</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/foundation">
          <v-list-item-title>Social Impact</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/news">
          <v-list-item-title>News & media</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/contact" exact>
          <v-list-item-title>Contact Us</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar app>
      <div class="d-flex my-auto align-center" style="min-width: 210px">
        <nuxt-link to="/" class="toolbar-title pl-1 d-sm-block font-weight-light primary--text">
          Laurens Verspeek
        </nuxt-link>
      </div>
      <div class="flex-grow-1"/>
      <v-tabs
        v-if="$vuetify.breakpoint.lgAndUp"
        background-color="transparent"
        color="grey darken-4"
        right
        class="mx-2"
        optional
        light
      >
        <v-tab to="/" text min-width="125">
          Home
        </v-tab>
      </v-tabs>
      <v-btn v-if="$vuetify.breakpoint.lgAndUp" color="accent black--text" min-width="125"
             to="/contact" class="my-auto mr-8" exact>
        <span>Contact Me</span>
      </v-btn>
      <v-app-bar-nav-icon v-else @click.stop="drawer = !drawer" class="my-auto mr-2"/>
    </v-app-bar>
  </div>
</template>

<script>
export default {
  data() {
    return {
      drawer: false
    }
  }
}
</script>

<style lang="scss">

</style>

