// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Terminal output and icon paths are trusted, authored strings
    'vue/no-v-html': 'off'
  }
})
