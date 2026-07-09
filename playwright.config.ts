import { defineConfig, devices } from '@playwright/test'

// E2E against the generated static site. The webServer serves .output/public
// with a SPA fallback, so `npm run generate` must run before these tests.
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  // Parallel across FILES only: each spec file keeps its internal order (some
  // build on state within a file), but the four suites run side by side —
  // contexts are isolated and the static server is read-only.
  fullyParallel: false,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: 'dark',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve-static.mjs`,
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
})
