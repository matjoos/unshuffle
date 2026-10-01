import { readdirSync, existsSync } from 'node:fs'
import { defineConfig, devices, chromium } from '@playwright/test'

// Use the sandbox's preinstalled Chromium when the version Playwright expects is absent.
function findChromium() {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'
  try {
    const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop()
    const p = dir && `${root}/${dir}/chrome-linux/chrome`
    return p && existsSync(p) && !existsSync(expected(root)) ? p : undefined
  } catch {
    return undefined
  }
}
function expected(root) {
  return `${root}/chromium_headless_shell-${chromium.executablePath().match(/-(\d+)\//)?.[1]}`
}
const exe = findChromium()
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/unshuffle/',
    launchOptions: exe ? { executablePath: exe } : {},
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/unshuffle/',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
