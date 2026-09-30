# AUTOPILOT — unshuffle

Status: ACTIVE
Runs: 3 / 12 (cap 12)   Branch: `autopilot`   Setup: `tools/cloud-setup.sh`

## Definition of done
1. No open items in `TODO.md` (each implemented or closed with a reason).
2. Tested app: unit tests (inventory, found/missing accounting, filters, export/import, BrickLink export) + Playwright e2e of main flows, all via `npm test`; GitHub Actions runs lint+build+tests on PRs (deploy workflow keeps working).
3. Practical for sorting a big pile on phone/tablet: shared parts across sets, partly built sets, part search/filter, substitutes, minifigs/spares, big-inventory performance, API-key first-run guidance, undo.
Constraints: localStorage shape changes need migration + test; JSON export/import stays compatible with current-version files; app stays static; no secrets.

## Milestones
- [x] M1 Test harness: vitest+jsdom, fixtures (Rebrickable response shape), unit tests for reducer/export/api/selectors, CI workflow, `npm test` (state logic moved to src/state.js)
- [x] M2 Playwright e2e against fixtures (route-intercepted fetch), screenshots phone+desktop, `npm test` runs both
- [x] M3 Versioned state migration framework (`migrateState`, fills defaults) + tests (selectors stay in src/state.js; no separate src/logic needed)
- [x] M4 TODO quick wins: clickable set names (SetLink), Hide done shared setting (persisted, on Picking/Set/Summary progress), Found button in Summary By set, pluralisation
- [ ] M5 Unified Parts view (group by Set|Color, filter Unresolved|Missing|All, scope set/color, hide done); ColorsScreen stays landing; persist settings
- [ ] M6 Part search; undo stack for marks; bulk actions (found all needed / mark whole set built / partly built sets)
- [ ] M7 First-run API-key guidance; manual-add missing part; shared-parts across sets view; spare parts/minifigs handling; alternate colours
- [ ] M8 Performance for huge inventories; mobile/tablet polish; nice-to-haves (chip images, set hero, deep-link URLs); decide on `worker/`
- [ ] M9 Stabilise, README, final report, PR

## Log
- Run 1 started 2026-09-30 (UTC). Shipped M1: reducer/selectors moved to src/state.js; 27 unit tests (api w/ mocked fetch + fixtures, reducer, selectors, persistence/import, BL XML/CSV); CI workflow. Verified: lint, build, vitest pass. Also shipped M2: Playwright (phone Pixel 7 + desktop) 5 flows x2 pass, screenshots viewed (phone picking, desktop summary look OK; fixture images are 1px so appear as blank). `npm test` = vitest + playwright; playwright.config.js auto-falls back to preinstalled /opt/pw-browsers chromium. Next: M3. Run 1 finished.

- Run 2 finished: shipped M3+M4. hideDone is now a persisted top-level state field (no version bump; migrateState fills defaults). Summary 'Hide done sets' hides completed sets in Progress (missing rows are by definition unfinished). Credit chips in By color are not set links (they are actions). Verified: lint, 31 unit, 12 e2e pass, screenshot viewed. Next: M5 unified Parts view. (started 2026-09-30T09:11:33Z.
- Run 3 started 2026-09-30T12:16Z.
## Known issues / decisions
- Progress-bar labels truncate on phone (fix in M8 polish).
- Screen name is persisted in state, so reload resumes on the last screen (kept).
- worker/ is unused by src (to decide in M8).
