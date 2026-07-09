// @ts-check
import pluginTs from '@typescript-eslint/eslint-plugin'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Terminal output and icon paths are trusted, authored strings
      'vue/no-v-html': 'off',
      // `() => (x.value = y)` setters are this codebase's established idiom
      '@typescript-eslint/no-confusing-void-expression': 'off'
    }
  },
  {
    // typed files only — these rules need type information
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      // numbers and booleans stringify predictably; objects stay forbidden
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      // the games' `while (true)` main loops are deliberate
      '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
      // spreading strings into chars is all over the terminal toys — every
      // input there is ASCII, where spread semantics are exactly right
      '@typescript-eslint/no-misused-spread': 'off'
    }
  }
)
  // type-aware linting covers the app tsconfig; tests, e2e, server (own
  // tsconfig) and the standalone configs live outside it, so they keep the
  // non-type-checked tier
  .append({
    files: ['tests/**/*.ts', 'e2e/**/*.ts', 'server/**/*.ts', '*.config.ts', 'content.config.ts'],
    ...pluginTs.configs['flat/disable-type-checked']
  })
