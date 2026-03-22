# Unshuffle

**Humans fighting entropy, but this time with AI-built tooling and having fun while doing it.**

---

## What is it?

A web app that turns color-sorted bags of mixed LEGO into rebuilt sets. You enter your set numbers, pick up a bag of one color, and Unshuffle tells you which pieces from that bag go into which set — with pictures, quantities, and a running missing-parts tracker.

## The problem

Every LEGO household has the same story: multiple sets get mixed into one big pile. Parents and kids want to rebuild them but cross-referencing instruction booklets manually takes forever. Everyone naturally sorts by color first — that's the easy part. The hard part is the second step: "I'm holding 200 white pieces, which ones go where?"

## The workflow

1. User enters set numbers (they have the booklets or know the numbers)
2. App fetches full parts inventories from Rebrickable API
3. App pivots everything by color across all sets
4. User selects a color ("I'm picking up white")
5. App shows a picking list: for each set, which white pieces are needed, with images and quantities
6. User taps pieces as found → piece goes into that set's shoebox
7. User marks pieces as missing → goes onto the missing list
8. At the end: export missing parts list for ordering on BrickLink/BrickOwl

## Data source: Rebrickable API

- **License**: Explicitly allows commercial use, including images of parts and sets. Just add attribution. No MOC images.
- **API docs**: https://rebrickable.com/api/v3/docs/
- **What it provides**: Full set inventories with part number, name, color, quantity, and image URLs (LDraw-based 3D renders)
- **Free API key**: Register at https://rebrickable.com/api/
- **Rate limits**: Paginated, page size 1000

### Key endpoints

- `GET /api/v3/lego/sets/{set_num}/parts/` — all parts in a set, including color and image URL
- `GET /api/v3/lego/parts/{part_num}/` — part details
- `GET /api/v3/lego/colors/` — full color list with RGB values

### Image URLs

Rebrickable provides part images at multiple resolutions via their CDN:
- `https://cdn.rebrickable.com/media/thumbs/parts/elements/{element_id}.jpg/250x250p.jpg`
- Various sizes available (20x20, 50x50, 250x250, etc.)

## Why NOT BrickLink for data

- General ToS: "any unauthorized or commercial use without written permission is strictly prohibited"
- API terms: cannot charge for features that use their API data
- Caching restricted to 6 hours for item data, 24 hours for other content
- API is primarily for store management, not catalog access
- **Use BrickLink only as a purchase destination** for the missing parts list — that's fine and sends them customers

## Existing landscape (as of March 2026)

| Tool | What it does | Gap |
|------|-------------|-----|
| SortaBrick (Android) | Per-set part tracking with images, mark found/missing | No cross-set color-first picking |
| Brickit | Camera scans piles, suggests builds | Misidentifies pieces, no color awareness |
| SortABrick.com | Physical service — ship bricks, get back sorted sets | Not DIY, EU-only, expensive |
| Rebrickable | Collection management, build calculations | Per-set UI, no color-first cross-set picking |
| Rebrickable forum (Oct 2025) | Developer proposed camera-based sorting assistant | Never shipped |

**The gap**: Nobody has built the color-first cross-set picking list workflow.

## MVP scope (one Claude Code session)

### Must have
- Enter multiple set numbers
- Fetch inventories from Rebrickable API
- Group all parts by color across sets
- Color picker/selector screen
- Picking list per color: show part image, name, quantity, which set needs it
- Tap to mark as "found" (decrements count)
- Tap to mark as "missing"
- Progress indicator per set (x% complete)
- Missing parts summary/export

### Nice to have (v2)
- Persist state in localStorage so you can close the browser
- Handle shared pieces (if Set A needs 8 white 2x4 and Set B needs 6, but you only have 12)
- BrickLink/BrickOwl deep links for purchasing missing parts
- Voice control ("next piece") for hands-free sorting
- Offline mode / PWA
- Import set list from Rebrickable account

### Out of scope
- Camera-based piece identification (separate hard problem)
- User accounts / server-side storage
- Mobile native apps

## Tech stack

- **Frontend**: Single-page web app (React or plain HTML/JS)
- **Data**: Rebrickable API (free key)
- **State**: Client-side (localStorage for persistence)
- **Hosting**: GitHub Pages (free, static)
- **Build**: Claude Code in one session

## Monetization approach: none

Open source on GitHub. MIT or AGPL license (decide before pushing).
- **MIT**: Maximum freedom, someone could wrap it in a paid SaaS
- **AGPL**: Same freedom for end users, but anyone running a modified version as a service must publish their source

Add a Ko-fi or similar donate button. No paid tiers, no support obligations, no refund headaches.

## Go-to-market

1. Ship MVP on GitHub
2. Post on r/lego, r/legosorting (if it exists), Rebrickable forums
3. README with clear screenshots/GIF of the workflow
4. Let it spread organically — the LEGO community shares good tools

## Attribution

Include in footer/README:
> Parts data and images provided by [Rebrickable](https://rebrickable.com)

---

*Project conceived March 2026. Conversation archived in Claude chat history.*
