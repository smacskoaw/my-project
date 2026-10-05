import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/static',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:4173/my-project/',
    headless: true,
    launchOptions: {
      executablePath:
        process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    },
  },
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://localhost:4173/my-project/',
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_BASE_PATH: '/my-project', PORT: '4173' },
  },
});
