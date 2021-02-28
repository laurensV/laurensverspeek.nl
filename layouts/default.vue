<template>
  <div id="app">
    <nav-bar/>
    <section class="section content">
      <Nuxt/>
    </section>
    <foot/>
  </div>
</template>

<style scoped>
  #app {
    background: url('~assets/img/grid.png');
    min-height: 100vh;
  }
</style>

<script>
  import NavBar from '@/components/NavBar';
  import Foot from '@/components/Footer';


  export default {
    components: {
      NavBar,
      Foot
    },

    data () {
      return {
      }
    },

    computed: {
    },

    methods: {
    }
  };
</script>
