// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test-e2e',
  timeout: 30000,
  retries: 1,
  use: {
    browserName: 'chromium',
    headless: true,
  },
});
