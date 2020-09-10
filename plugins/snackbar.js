// we need our snackbar component
import Vue from 'vue'
import SnackbarComponent from '@/components/Snackbar.vue'
import events from '@/plugins/events.js'

const Snackbar = {
  // every plugin for Vue.js needs install method
  // this method will run after Vue.use(<your-plugin-here>) is executed
  install (Vue) {
    // making our snackbar component global
    Vue.component('snackbar', SnackbarComponent)

    // exposing global $snackbar object with method show()
    // method show() takes object params as argument
    // inside this object we can have snackbar title, text, styles... and also our callback confirm function
    Vue.prototype.$snackbar = {
      show (params) {
        // if we use this.$snackbar.show(params) inside our original Vue instance
        // we will emit 'show' event with parameters 'params'
        events.$emit('showSnackbar', params)
      },
      close () {
        // if we use this.$snackbar.show(params) inside our original Vue instance
        // we will emit 'show' event with parameters 'params'
        events.$emit('closeSnackbar')
      }
    }
  }
}

Vue.use(Snackbar)

export default Snackbar
