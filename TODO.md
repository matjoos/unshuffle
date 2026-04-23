# Unshuffle — Work Items

Rolling backlog of things to improve. Loosely ordered by perceived value.
Small items first, then design-level ideas.

## Quick wins

- [ ] **Clickable set names everywhere.** In the missing-parts view (both By set
      and By color groupings), set names and numbers should link to the
      per-set SetScreen. Same for any chip or header that references a set.

- [ ] **"Hide done" filter everywhere.** The toggle already exists on
      SetScreen. Add it to PickingScreen (hide parts where `found + missing
      >= needed`) and to SummaryScreen (hide rows with no remaining work).

- [ ] **Mark parts off in Missing Parts → By set.** Currently this view is
      read-only. The By color mode has the "Credit to: …" chips that
      convert missing→found; the By set mode should offer the same
      interaction on each row (a single "Found" button, since the set is
      already chosen).

## Design: pivot Missing Parts into a universal filter

Currently we have four screens that all show "parts with some state":

- **PickingScreen** — parts of one color, grouped by set, markable.
- **SetScreen** — parts of one set, grouped by color, markable.
- **SummaryScreen (By set)** — missing parts of each set, read-only.
- **SummaryScreen (By color)** — missing parts in each color, with
  credit-to-set chips.

These are slices of the same underlying query:
`parts matching <filter>, grouped by <axis>`.

### Proposed unification

Collapse PickingScreen / SetScreen / SummaryScreen into one **Parts** view
with two independent controls:

- **Group by**: Set | Color
- **Filter**: Unresolved (default) | Missing only | All

And layered refinements:

- **Scope**: All (default) | *specific color* | *specific set* — applied
  by tapping a progress bar (scope = that set) or a color swatch (scope =
  that color). Deep-linking via URL/history stacks up.
- **Hide done**: toggle, applies within the current scope.

Every row carries the same actions that are available on PartCard today:
+Found, +Missing, and — for parts with any `missing > 0` — the set-credit
chips. That single action surface replaces the two code paths we have now
(PartCard buttons vs. SummaryScreen chips).

### Benefits

- Less code — one list renderer, one filter engine.
- Consistent UX — no more "wait, can I mark things here or not?".
- Filters compose: "missing only + grouped by color" ≡ today's Summary
  By color; "unresolved + grouped by set + scope=one color" ≡ today's
  PickingScreen.
- Easier to add future filters (e.g., "only printed parts", "only parts I
  have zero of anywhere in the collection").

### Risks / concerns

- Losing the friendly entry points. The current "Pick a color" framing is
  a good first-time experience — it tells the user *how to use the app*.
  Mitigation: keep ColorsScreen as the landing page; have it link into
  the Parts view with the right scope pre-applied.
- Bigger refactor than the quick wins above. Do it as a second pass, not
  the first commit.

## Nice-to-haves (not urgent)

- [ ] Show part image in the By color credit chips — easier to recognize
      than names for duplicates.
- [ ] Remember the last group-by and filter settings per-session.
- [ ] "Manually add missing part" escape hatch for cases like the Panda
      issue (Rebrickable inventory lists a piece not actually in the bag).
- [ ] Per-set image in SetScreen header is tiny. Consider a larger hero
      image on the SetScreen.
- [ ] After the SPA pivot: deep-linkable URLs (`#/set/41726-1` etc.).

## Done

- [x] JSON export / import for progress backup (localStorage can be
      cleared by browser privacy settings).
- [x] Allow adding sets mid-session without losing progress.
- [x] Per-set picking view with color grouping and "Hide done" toggle.
- [x] Freeze order on SetScreen so marking parts doesn't reshuffle groups.
- [x] Missing Parts By color view with set-credit chips.
- [x] Star indicator for 100% *complete* sets (vs. 100% checked w/ missing).
- [x] Set numbers in the credit chips to disambiguate similar names.
- [x] Refresh part IDs — patches BrickLink IDs onto existing inventory so
      Wanted List uploads don't get rejected. Progress counts preserved.
