import { defineConfig, devices } from '@playwright/test';

// Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to reuse a preinstalled Chromium instead of downloading one.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: {
    command: 'npx astro preview --port 4321 --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
