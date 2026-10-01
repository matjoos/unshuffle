# AUTOPILOT — unshuffle

# FINAL REPORT (run 7)

**Built:** Unshuffle now has a unified Parts view (group by set|colour, filter Unresolved|Missing|All, scope to a set or colour, hide done, part search, shared-by-several-sets filter, bulk "All found" per group which also marks a whole set as built for partly built sets), global Undo, manual add of missing parts, first-run Rebrickable API-key guidance, deep-linkable hash URLs, render cap with "Show more" for huge inventories, set hero image, clickable set names, persisted settings, a versioned state migration (old `picking`/`set` screens migrate), and the broken `worker/` removed (nothing used it). Every TODO.md item is ticked or closed with a reason. The friendly "pick a colour" landing page is kept.

**Verified:** `npm run lint`, `npm run build`, `npm test` (vitest unit tests + 28 Playwright e2e on phone and desktop viewports, Rebrickable mocked by fixtures in `tests/fixtures`) all pass on this branch. Screenshots were viewed in earlier runs. CI (`.github/workflows`) runs lint + build + tests on PRs; the deploy workflow is untouched.

**Check by hand:** use a real Rebrickable key with a few real sets (fixtures are synthetic); try it on a real phone; load an old localStorage/export file from the current live version; the BrickLink Wanted List upload on bricklink.com.

**Not done:** alternate colours/substitutes (out of scope: no reliable data in the Rebrickable inventory endpoint); progress-bar labels may truncate on very narrow phones.


Status: DONE
Runs: 7 / 12 (cap 12)   Branch: `autopilot`   Setup: `tools/cloud-setup.sh`

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
- [x] M5 Unified Parts view (group by Set|Color, filter Unresolved|Missing|All, scope set/color, hide done); ColorsScreen stays landing; persist settings
- [x] M6 Part search; global undo stack; bulk 'All found' per group (scope to a set = mark whole set built, for partly built sets)
- [x] M7 First-run API-key guidance; manual-add missing part; shared-parts filter; spares ignored/minifig parts included (decision). Alternate colours deferred (see issues)
- [x] M8 Render cap + Show more, memo PartCard, set hero image, deep-link hash URLs (src/hash.js), worker/ deleted (unused, broken)
- [x] M9 Stabilise, README, final report, PR

## Log
- Run 1 started 2026-09-30 (UTC). Shipped M1: reducer/selectors moved to src/state.js; 27 unit tests (api w/ mocked fetch + fixtures, reducer, selectors, persistence/import, BL XML/CSV); CI workflow. Verified: lint, build, vitest pass. Also shipped M2: Playwright (phone Pixel 7 + desktop) 5 flows x2 pass, screenshots viewed (phone picking, desktop summary look OK; fixture images are 1px so appear as blank). `npm test` = vitest + playwright; playwright.config.js auto-falls back to preinstalled /opt/pw-browsers chromium. Next: M3. Run 1 finished.

- Run 2 finished: shipped M3+M4. hideDone is now a persisted top-level state field (no version bump; migrateState fills defaults). Summary 'Hide done sets' hides completed sets in Progress (missing rows are by definition unfinished). Credit chips in By color are not set links (they are actions). Verified: lint, 31 unit, 12 e2e pass, screenshot viewed. Next: M5 unified Parts view. (started 2026-09-30T09:11:33Z.
- Run 3 started 2026-09-30T12:16Z. Shipped M5: PartsScreen replaces Picking/SetScreen (set+colour scope selects, group by set|colour, filter All|Unresolved|Missing, hide done, 'Found it' on missing rows); Summary keeps progress/export and links to Parts (missing filter). State gained `view` (persisted; old 'picking'/'set' screens migrate to 'parts', tested). Verified: lint, build, 36 unit, 14 e2e, phone screenshot viewed (group-by pill tint looks slightly odd; polish in M8). Next: M6. Run 3 finished.
- Run 4 started 2026-09-30T15:11Z.
- Run 4 finished: shipped M6. view.query (search name/part no./BL id), state.history undo snapshots (max 50, session-only, stripped from storage/export), RESOLVE_ROWS bulk, floating UndoBar, 'All found' in group headers. Verified: lint, 38 unit, 17 e2e, phone screenshot viewed (looks fine). Next: M7.
- Run 5 started 2026-09-30T18:11Z.
- Run 5 finished: shipped M7 (API-key steps on setup, view.shared filter, ADD_MANUAL_PART w/ undo, README). Verified: lint, build, 41 unit, 22 e2e, phone screenshot viewed. Next: M8.
- Run 6 started 2026-09-30T21:11Z.
- Run 6 finished: shipped M8. Hash deep links (+unit, e2e), per-group 60-row cap with Show more (e2e with 400 bulk parts), hero image, worker/ removed (nothing referenced it). TODO.md fully ticked. Verified: lint, unit, 27 e2e, screenshot viewed. Next: M9 stabilise/README/final report/PR.
- Run 7 started 2026-10-01T00:11Z.
- Run 7 finished: M9 verified (lint, build, 28 e2e + unit pass), final report written, status DONE, PR opened.
## Known issues / decisions
- Progress-bar labels truncate on phone (fix in M8 polish).
- Screen name is persisted in state, so reload resumes on the last screen (kept).
- worker/ is unused by src (to decide in M8).
- Alternate colours/substitutes not implemented; consider a small note in M8 or close as out of scope in final report.
- TODO.md manual-add item ticked this run.
