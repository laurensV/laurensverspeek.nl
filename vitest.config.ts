import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Unit tests cover pure logic (terminal markdown renderer, games, pipes) —
// they run in node, without booting Nuxt.
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts']
  }
})
