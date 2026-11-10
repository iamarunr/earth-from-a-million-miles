import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run the built site and answer NASA's services from
// recorded data (tests/e2e/fixtures), so they pass offline and never change.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4319', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }, grep: /@smoke/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }, grep: /@smoke/ },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4319 --strictPort',
    url: 'http://localhost:4319',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
