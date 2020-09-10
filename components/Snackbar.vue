<template>
  <v-snackbar v-model="visible" :timeout="timeout" :color="color">
    <ul v-if="text instanceof Array">
      <!-- eslint-disable-next-line -->
      <li v-for="textValue in text" v-html="textValue" />
    </ul>
    <div v-else v-html="text" />
    <v-btn v-if="cancel" text @click.native="visible = false">
      Close
    </v-btn>
  </v-snackbar>
</template>

<script>
// we must import our Snackbar plugin instance
// because it contains reference to our Eventbus
import events from '@/plugins/events.js'

export default {
  data () {
    return {
      visible: false,
      timeout: 6000,
      text: '',
      color: '',
      cancel: true,
      loading: false
    }
  },
  beforeMount () {
    // here we need to listen for emited events
    // we declared those events inside our plugin
    events.$on('showSnackbar', (params) => {
      this.show(params)
    })
    events.$on('closeSnackbar', () => {
      this.hide()
    })
  },
  methods: {
    hide () {
      // method for closing snackbar
      this.visible = false
    },
    resetValues () {
      this.visible = false
      this.text = ''
      this.color = ''
      this.timeout = 6000
      this.cancel = true
    },
    show (params) {
      this.resetValues()
      // making snackbar visible
      this.visible = true
      if (params.text instanceof Error) {
        const e = params.text
        let error = 'something went wrong'
        if (e.response && e.response.data) {
          if (e.response.data.error) {
            error = e.response.data.error
          } else if (e.response.data.message) {
            error = e.response.data.message
          } else if (e.response.data.errorMessage) {
            error = e.response.data.errorMessage
          } else if (typeof e.response.data === 'string') {
            error = e.response.data
          }
        } else if (e.message) {
          error = e.message
        }
        this.text = error
      } else {
        this.text = params.text
      }

      // setting callback function
      // eslint-disable-next-line
      if (params.hasOwnProperty('cancel')) { this.cancel = params.cancel }
      // eslint-disable-next-line
      if (params.hasOwnProperty('timeout')) { this.timeout = params.timeout }
      if (params.color) { this.color = params.color }
    }
  }
}
</script>
