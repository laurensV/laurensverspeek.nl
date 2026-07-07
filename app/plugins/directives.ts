import { magneticDirective } from '~/composables/useMagnetic'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('magnetic', magneticDirective)
})
