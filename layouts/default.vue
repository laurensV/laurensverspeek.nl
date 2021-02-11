<template>
  <div>
    <nav-bar/>
    <section class="section content">
      <Nuxt/>
    </section>
    <foot/>
  </div>
</template>

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
