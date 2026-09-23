# TripSphere — web client

React frontend for the TripSphere travel-experience platform. Built against the
API contract in the Frontend Handbook (`swagger.json` is the contract of record).

## Run it

```bash
npm install
cp .env.example .env     # point VITE_API_URL at your API
npm run dev              # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run typecheck` | `tsc --noEmit` |

Node 18+. Vite 5 and Tailwind 3 are pinned for that.

## Configuration

`VITE_API_URL` is the only variable. It must include the `/api/v1` prefix:

```
VITE_API_URL=https://tripsphere-api.onrender.com/api/v1
```

The API must allow this origin — set `CORS_ORIGINS` on the backend to your dev
origin (`http://localhost:5173`) and to the deployed frontend origin.

## How it is put together

```
src/
  api/
    client.ts      envelope unwrapping, typed errors, single-flight refresh
    endpoints.ts   one typed function per API operation
    queries.ts     TanStack Query hooks + the cache-key registry
    types.ts       hand-written contract types
  components/
    ui/            primitives (Button, Field, Modal, Toast, Icon, Bits)
    layout/        AppShell, error/empty states, ErrorBoundary
    trip/          TripCard, ExpensePanel, TripSections, TripFilters
    post/          PostCard
  pages/           one file per screen; wizard/ holds Create Trip
  lib/             format.ts (money, dates), labels.ts (enum metadata), cn.ts
  store/           auth context, theme
```

### Contract rules the code enforces

These are the ones that bite, all handled centrally rather than per screen:

1. **Every response is wrapped.** `api()` unwraps `{ success, data }` once, in
   `client.ts`. Nothing else sees the envelope.
2. **Lists are cursor-paginated; search is offset.** Both live behind the hooks
   in `queries.ts`; cursors are never parsed.
3. **`null` money means hidden, not zero.** `money()` returns `null` for a null
   amount and every call site renders "Hidden by the traveller". Search for
   `ExpenseHidden` to see the masked state.
4. **Invisible is 404, not 403.** `ErrorState` renders a not-found screen for
   404 rather than a permissions error.
5. **Refresh tokens are single-use.** Concurrent 401s share one in-flight
   refresh (`refreshOnce`), so a parallel burst cannot burn the token twice.
6. **Enums are fetched, not hardcoded.** The expense-subcategory map and the
   rating-criteria matrix come from `GET /trips/meta/enums` via `useTripMeta`.
   Only display metadata (labels, emoji, colours) lives in `lib/labels.ts`.
7. **Always send the token.** Public endpoints read it to fill in `isLiked`,
   `isSaved` and `isFollowing`; `null` is treated as "unknown", not `false`.
8. **Only send declared fields.** Validation runs in whitelist mode, so forms
   send changed fields, never a whole spread object.

### Design system

Dark-first. Colours are CSS variables in `src/styles/index.css`, surfaced to
Tailwind in `tailwind.config.js` — light and dark are one definition, and the
theme toggle writes `data-theme` on `<html>` (applied pre-paint by an inline
script, so a reload never flashes the wrong theme).

Palette is "aurora over night": a near-black blue canvas with a fixed cyan and
indigo wash plus a 3.5% film-grain layer, elevated surfaces at `--c-surface`,
and a cyan→indigo gradient reserved for the primary action and the active nav
item. Amber is reserved for money and data so a figure never reads as a button.
Light mode is the same system re-stepped for a white surface, not an inversion.

Type is Space Grotesk (display), Inter (UI) and JetBrains Mono for every
figure — `.tnum` switches to mono with tabular numerals so amounts line up
wherever they stack. Fonts load from Google Fonts in `<head>`; the fallback
stack is explicit so a blocked webfont still lands on a system sans.

Depth comes from inset rings plus shadow steps (`shadow-card`, `shadow-lift`,
`shadow-glow`) rather than borders, with `.glass` for the top bar and the mobile
dock, `.hero-surface` for page headers and `.ring-gradient` for the hover
hairline on cards. Motion is a single spring curve (`ease-spring`); interactive
elements scale on press and grids stagger in.

**No emoji anywhere in the UI.** Emoji render differently on every platform and
read as informal, so every glyph is [lucide-react](https://lucide.dev), wrapped
in `components/ui/Icon.tsx` behind semantic names (`stay`, `monsoon`,
`viewpoint`). `IconTile` is the standard tinted subject marker in lists. The one
place the API stores a free-text emoji — a collection's `emoji` field — now
receives short icon tokens, and `collectionIcon()` maps anything unrecognised
(including emoji written by an older client) onto a neutral icon.

Entities without a photo are not left as grey panels: `lib/visual.ts` picks one
of eight curated three-stop gradients (ocean, sunset, jungle, dusk, reef, dune,
monsoon, bloom) from a hash of the entity id, so a trip, place or profile always
has artwork and always the same one. The palettes are curated rather than a hue
off the full wheel — an unconstrained hash lands on olive and mustard often
enough to look like a bug.

Illustrations live in `src/assets/` as transparent cut-outs. Backgrounds are
removed with a flood fill inwards from the border: a pixel is background if it
is greyscale, *or* dark with weak relative saturation. That second clause is
what catches a coloured halo — a glow around an object is the artwork's own hue
blended toward black, so it stays dark and washed out, while flat artwork is
either bright or strongly saturated and blocks the fill. A follow-up pass drops
pale pockets the fill could not reach, but only small ones that touch the
background, so enclosed whites (a card, a sticker) survive.

On the auth screen only the form is carded; the headline and illustration sit
directly on the page. `FloatingStickers` scatters a dozen drifting icons behind
it — hand-placed rather than randomised at runtime, since a fresh random layout
would reshuffle on every re-render, and kept out of the band the copy occupies.
The centre ones hide below `sm`, where percentage positions compress enough to
collide with text.
`EmptyState` has two shapes. With an `illustration` it drops the icon tile and
the body copy entirely: the art floats with a brand bloom behind it, its base
fades out through a `mask-image` ramp, and a single headline plus one large
`shine` button sit in that faded band. Without one it falls back to the icon
tile, title and body used on smaller empty screens.

Anything that sits **on top of imagery** — glass badges, hero titles — uses a
theme-independent dark scrim. A theme-aware surface fades to white in light
mode and takes the white text with it.

Dropdowns are a custom listbox (`components/ui/Dropdown.tsx`), not a native
`<select>`: portalled and positioned from the trigger rect so it never clips,
flips above when short on room, and supports arrows, Home/End, Enter, Escape
and optional filtering. Tabs measure the active trigger and slide a single
indicator, so triggers can be any width.

The six expense-category colours (`--viz-*`) are a fixed categorical palette,
validated against both surfaces for lightness band, chroma floor, colour-vision
separation, normal-vision separation and contrast. Two light-mode slots sit
below 3:1, so every segment of the stacked bar carries a visible direct label —
do not remove those labels, and do not reorder or recycle the hues.

Layout is web-centric: a persistent desktop rail, wide multi-column pages and a
full-bleed hero on every detail screen. Mobile keeps every feature, swapping the
rail for a floating dock and collapsing the grids.

## Screens

Home feed (for-you / following / friends), Explore with the budget filters,
Search, Create Trip (11-step wizard), Trip detail, Place page with aggregates,
Profile with travel map, Saved with collections, Post detail, Settings.

Not built, because the API has no endpoint for them: forgot password and
notifications. "Plan a trip like this" is composed from `GET /trips/:id` +
a prefilled `POST /trips`, and is labelled an estimate rather than a quote.
