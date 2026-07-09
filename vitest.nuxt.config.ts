import { defineVitestConfig } from '@nuxt/test-utils/config'

// Component tests run in a real Nuxt environment (auto-imports, useState, …),
// which is heavier than the pure-logic suite — so they live in their own
// config + `test:nuxt` script rather than slowing down `npm run test`.
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/nuxt/**/*.test.ts']
  }
})
