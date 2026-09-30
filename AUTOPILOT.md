# AUTOPILOT — unshuffle

Status: ACTIVE
Runs: 1 / 12 (cap 12)   Branch: `autopilot`   Setup: `tools/cloud-setup.sh`

## Definition of done
1. No open items in `TODO.md` (each implemented or closed with a reason).
2. Tested app: unit tests (inventory, found/missing accounting, filters, export/import, BrickLink export) + Playwright e2e of main flows, all via `npm test`; GitHub Actions runs lint+build+tests on PRs (deploy workflow keeps working).
3. Practical for sorting a big pile on phone/tablet: shared parts across sets, partly built sets, part search/filter, substitutes, minifigs/spares, big-inventory performance, API-key first-run guidance, undo.
Constraints: localStorage shape changes need migration + test; JSON export/import stays compatible with current-version files; app stays static; no secrets.

## Milestones
- [x] M1 Test harness: vitest+jsdom, fixtures (Rebrickable response shape), unit tests for reducer/export/api/selectors, CI workflow, `npm test` (state logic moved to src/state.js)
- [ ] M2 Playwright e2e against fixtures (route-intercepted fetch), screenshots phone+desktop, `npm test` runs both
- [ ] M3 Extract pure logic to `src/logic` (selectors), versioned state migration framework + tests
- [ ] M4 TODO quick wins: clickable set names, Hide done everywhere, mark Found in By set
- [ ] M5 Unified Parts view (group by Set|Color, filter Unresolved|Missing|All, scope set/color, hide done); ColorsScreen stays landing; persist settings
- [ ] M6 Part search; undo stack for marks; bulk actions (found all needed / mark whole set built / partly built sets)
- [ ] M7 First-run API-key guidance; manual-add missing part; shared-parts across sets view; spare parts/minifigs handling; alternate colours
- [ ] M8 Performance for huge inventories; mobile/tablet polish; nice-to-haves (chip images, set hero, deep-link URLs); decide on `worker/`
- [ ] M9 Stabilise, README, final report, PR

## Log
- Run 1 started 2026-09-30 (UTC). Shipped M1: reducer/selectors moved to src/state.js; 27 unit tests (api w/ mocked fetch + fixtures, reducer, selectors, persistence/import, BL XML/CSV); CI workflow. Verified: lint, build, vitest pass. Next: M2 Playwright (Chromium at /opt/pw-browsers). Run 1 finished.

## Known issues / decisions
- worker/ is unused by src (to decide in M8).
