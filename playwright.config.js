// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test-e2e',
  timeout: 40000,
  retries: 1,
  use: {
    browserName: 'chromium',
    headless: false,
    // Content scripty rozszerzeń Chrome nie podlegają CSP strony — testy muszą
    // to odwzorować, bo page.addScriptTag() wstrzykuje inline <script>, który
    // restrykcyjne CSP (np. zakupy-eleclerc.pl) inaczej blokuje.
    bypassCSP: true,
  },
});
