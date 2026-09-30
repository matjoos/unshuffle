#!/usr/bin/env bash
# Idempotent environment setup for autopilot runs.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund
# Chromium is pre-installed at /opt/pw-browsers in the cloud sandbox; never download.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
if [ ! -d "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}" ]; then
  echo "No preinstalled Chromium; trying: npx playwright install chromium" >&2
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 npx playwright install chromium || true
fi
