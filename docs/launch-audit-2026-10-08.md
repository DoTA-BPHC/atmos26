# Launch audit, 8 October 2026

Branch `chore/launch-hardening-2026-10-08`, cut from `feat/atmos26` at `76e3745` (same as `origin/main`).
Fest: Fri 23 – Sun 25 October 2026, 15 days out.

## How this was checked
- `npm run build` and `npm run lint` (both clean before and after).
- `npm run preview` on port 4173, then Lighthouse 13.5 with its default mobile setup (Moto G Power viewport, 4x CPU slowdown, slow 4G), one run per page. Lighthouse numbers move ±10 points between runs, so read them as directions.
- The machine has a real GPU (RTX 4060 laptop), so the default runs got the live WebGL tier. `?tier=still` shows what reduced-motion, no-WebGL and weak devices get.
- Playwright at 1440 px and 390 px for focus, titles, network requests and layout. Contrast worked out from the tokens in `src/index.css`.
- `python scripts/verify_logo.py`: PASS (mean and max difference 0). The hero and logo files were not touched.
- `vite preview` falls back to the root `index.html` for every path. It does not serve the per-page HTML files that Vercel serves, so local numbers for inner pages still include the hero preloads that the build now removes from them.

## Scores (Lighthouse, mobile)

| Page | Before | After | Notes |
|---|---|---|---|
| `/` live tier | Perf 26 · A11y 100 · SEO 92 | Perf 50 · A11y 100 · SEO 100 | TBT 5.9 s → 0.8 s (part of this is run-to-run noise) |
| `/?tier=still` | Perf 38, 1,885 KiB, 370 KB JS | Perf 70, 1,683 KiB, 168 KB JS | three.js is no longer downloaded |
| `/events?tier=still` | Perf 41 | Perf 47 | three.js no longer downloaded; 992 KiB in total |
| `/gallery` | Perf 29, LCP 27.9 s, 5,288 KiB | Perf 32, LCP 8.4 s, 2,393 KiB | live floor backdrop still costs TBT |
| `/gallery?tier=still` | – | Perf 41, LCP 8.6 s, 1,719 KiB | about 530 KiB of that is the hero preloads, which the Vercel build leaves out |

Accessibility was already 100 on every page. Contrast holds up: stone 15.6:1, stone-dim 7.6:1, stone-mute 5.6:1, brass 7.9:1 on the void (all above 5:1 on soot too).

## Findings, most important first

### Fixed on this branch
1. **Every device downloaded three.js, even ones that never draw WebGL.** `World.tsx` and `FloorBackdrop.tsx` imported the engine statically, so reduced-motion, no-WebGL and weak devices on the still tier still fetched and parsed about 200 KB gzip (three.js plus postprocessing). The engine and backdrop are now imported inside the effect, only when the tier is live. Both files are code-owned; the change is limited to how the module is loaded. (`bd071ce`)
2. **The gallery sent 2048 px originals to phones.** `/gallery` came to 5.3 MB, and `ad_astra.jpg` alone was 1.5 MB. Photos wider than 1200 px now have 960 px copies (48–126 KB each) served through `srcSet`, and the lightbox still opens the originals. `ad_astra.jpg` and `dota_events.jpg` were re-encoded at JPEG q82 (1.5 MB → 330 KB and 505 KB → 301 KB). Pixel size, EXIF/XMP/ICC and the origin comment were kept. All of this is logged in `design/ASSETS.md`. (`bd071ce`, `4e850c0`)
3. **Inner pages preloaded the hero's logo layers** (`disc.webp` 403 KB and `outer.webp` 116 KB) without using them, and Chrome warned about it. The build now removes those preloads from every page except `/`. (`bd071ce`)
4. **Gallery images had no `width`/`height`.** This was a Lighthouse failure and could shift the layout. `GALLERY` now stores each photo's pixel size. (`bd071ce`)
5. **No robots.txt.** The SPA rewrite returned the HTML page instead (Lighthouse: "robots.txt is not valid", SEO 92). The build now writes `robots.txt` and `sitemap.xml` (57 URLs: 6 pages and 51 events) from `FEST.url` and `EVENTS`. (`ec6397f`)
6. **Soft 404s.** `vercel.json` rewrote every path to `index.html`, so a mistyped URL returned 200 with the "Signal lost" page. The build now writes a `404.html` (noindex, no canonical, which still boots the app's 404 page), and the catch-all rewrite now covers only the five top-level routes, as a safety net. **Check this on a Vercel preview deploy**: `/nope` and `/events/nope` should return 404 and show "Signal lost", and `/events`, `/proshows`, `/events/robowars` should return 200.
7. **Share and SEO tags were incomplete.** There was no canonical link, no `twitter:description`, no `og:image:alt`, `og:locale` or `color-scheme`, and the non-event pages used the home page's title and description for crawlers. Now every route (home, the five pages, every event, 404) has its own built HTML with title, description, canonical and OG/Twitter tags. Absolute URLs come from `FEST.url`. Proshows and Sponsors descriptions are built from their data files. The LCP preload now has `fetchpriority="high"`. (`ec6397f`)
8. **Reduced motion did not reach framer-motion.** The CSS rule stops CSS animation only. JS-driven rises, slides and blur reveals (page headers, rows, gallery, mobile menu ring) still moved. Layout now wraps the app in `MotionConfig reducedMotion="user"`, which skips movement and keeps fades. The hero, countdown, scratches and world already handled reduced motion themselves. (`bf0ac41`)
9. **The gallery lightbox let focus escape** and did not return it after closing. Tab now stays inside the dialog, and focus goes back to the photo that opened it. (`bf0ac41`)
10. **Only event pages set a document title.** Every page with a `PageHeader`, and the 404, now sets "Name · ATMOS ’26" for tabs, history and screen readers. (`bf0ac41`)
11. **Small a11y fixes.** The nav wordmark's accessible name ("ATMOS 2026, home") did not contain its visible text, a Lighthouse label-in-name failure; it is now "ATMOS ’26, home". The events filter used `role="tab"` without tab panels or arrow keys; it is now a group of `aria-pressed` buttons. The passes note read a hard-coded handle; it now reads `CONTACT.instagram`. (`bf0ac41`)

### Open (not low-risk enough to change two weeks out, or needs a decision)
1. **Live floor backdrops on phones.** Each inner page starts a three.js scene behind its title. Under Lighthouse's mobile CPU this is most of the remaining 5–9 s of TBT on `/events`, `/proshows` and `/gallery`. A one-line option is to give phones (`PHONE` in `src/world/quality.ts`) the floor's still in `FloorBackdrop`. That is a design call (DESIGN.md wants the live floor where the device can carry it), so it is left to the team.
2. **FCP of about 3 s on slow 4G.** The app renders only on the client (`<div id="root">` is empty), and the main chunk is 526 KB (168 KB gzip: React, router, framer-motion, Lenis, lucide). Prerendering the hero, or splitting framer-motion out of the first chunk, would help. Both are too large a change for this window.
3. **Hero logo layers are lossless WebP** (`disc.webp` alone is 403 KB, about 1 MB for the set). They cannot be re-encoded or downscaled under the logo rule. They stay as they are, preloaded.
4. **`/gallery/proshow.jpg` (284 KB, 2048 px)** is still the background of the Proshows page bands and the home teaser. `proshow-960.jpg` exists now and could replace it on the Proshows page.
5. **`robo_soccer.jpg` has black letterbox bars baked into the file** (a portrait frame around a landscape photo). Ask the team for the original.
6. **Missing source maps and the `HydrateFallback` console warning** from react-router lazy routes. Both are harmless and were left alone.
7. **`/favicon.ico`** is not shipped. Browsers that ask for it now get the 404 page instead of `index.html`. This is harmless; add a `.ico` only if the team wants one.

### Honesty check on placeholders (nothing invented was found)
- Events come from the events team's brochure sheet. Days, team sizes and some fees are "TBA". Organising clubs come from the DEPP brochure and SU Connect.
- Proshows: all three nights sealed (`artist: null`). The codenames and clues are site copy, as PRODUCT.md says. **The genre "Electronic" on night 2 is a soft claim about the line-up: confirm it with the team or change it to something neutral.**
- Sponsors: Synchrony is the only named sponsor (confirmed title sponsor). The Associate (3) and Partners (8) open slots are layout placeholders. Confirm the counts, or reduce them, before launch.
- Stats (30,000+ footfall, 40+ events, ₹12L+, 150+ colleges) are previous-edition figures from PRODUCT.md.

## Filling in the real line-up (data-only edits)
Everything below is a change to a file in `src/data/`. Nothing in the components needs to change. After editing, run `npm run build` and `npm run lint`. The build regenerates the share cards, the sitemap and the per-page HTML.

### `src/data/fest.ts`
| Field | Now | Set to |
|---|---|---|
| `FEST.registration.open` | `false` | `true` when passes go on sale |
| `FEST.registration.url` | `''` | the real ticketing URL (both are needed before "Get passes" becomes a link) |
| `FEST.url` | `https://atmos26.vercel.app` | the production domain if it changes. It drives canonical, OG/Twitter URLs, sitemap and robots |
| `GALLERY[]` | 11 photos | `{ src, caption, w, h, small? }`. `w`/`h` are the file's pixel size. Add a 960 px `small` copy for anything wider than 1200 px (see `design/ASSETS.md`) |

### `src/data/proshows.ts` (`PROSHOWS[]`, one entry per night)
| Field | Type | Effect |
|---|---|---|
| `artist` | `string \| null` | `null` keeps the night "Sealed". A name shows on the Proshows page and on the home teaser ("Act sealed" is replaced). Once any night is named, the teaser heading changes from "Names sealed." to "The line-up.", the arena row stops saying "stays sealed", and the Proshows intro and share card change to match |
| `image` | `string?` | the act's photo in `public/proshows/` (WebP, ≤ 300 KB, origin noted in `design/ASSETS.md`). It replaces the past-proshow background on that night's band |
| `genre`, `venue`, `clue`, `date`, `night`, `codename` | `string` | shown as written; confirm `genre` (see above) |

### `src/data/events.ts` (`EVENTS` via `LIST[]`)
| Field | Type | Effect |
|---|---|---|
| `id` | `string` | URL slug (`/events/<id>`), must be unique and stable once shared |
| `title`, `category` | `string`, `'competitions' \| 'workshops' \| 'experiences'` | required |
| `prize` | `number \| null` | rupees; `null` shows "—" |
| `fee` | `string` | `'Free'`, `'₹399'`, `'TBA'` … |
| `team` | `string?` | e.g. `'2–4'`; "TBA" until set |
| `when` | `string?` | **new.** Day and time, e.g. `'Sat 24 Oct, 10:00'`; the page says "23–25 Oct, day TBA" until set |
| `about` | `string?` | **new.** One or two plain sentences from the organisers, shown under the facts |
| `note` | `string?` | short subtitle (e.g. "Two-day event") |
| `clubs` | `ClubSlug[]?` | organisers from `CLUBS` (name and SU Connect tagline only, never people or phone numbers) |
| `image` | `string?` | the club's 4:3 poster in `public/events/` (WebP ≤ 300 KB); no picture until then |

### `src/data/sponsors.ts` (`SPONSOR_TIERS[]`)
| Field | Type | Effect |
|---|---|---|
| `tier` | `string` | the tier name. `'Title'` also feeds the hero and the summit (`TITLE_SPONSOR`) |
| `slots` | `number` | how many boxes the tier shows; empty ones say "Open slot" |
| `sponsors[]` | `{ name, logo, href }` | `logo` is a reversed (light-on-dark) WebP in `public/sponsors/`, with its origin noted in `design/ASSETS.md` and made like `scripts/sponsor_logo.py` does. `name` is the alt text |

### Not data-driven yet
- **Talks**: the "Talks / Coming soon" row in `src/components/home/Categories.tsx` (`ARENAS`) is still written in the component, with no data file behind it. When speakers are confirmed, add a small `src/data/talks.ts`, or turn talks into an event category.

## What the team must provide
1. Registration URL and the go-live moment (`FEST.registration`).
2. The proshow artists per night (and photos, if any), plus confirmation of the night-2 genre.
3. Event days/times and team sizes, and the fees still marked TBA (Wall Street Business Challenge, Wall Street Analytics Challenge, Semiconductor Workshop, Make Your Own Perfume, Chemistry Casino, Tech Tiranga, Auto Expo), plus club posters.
4. Associate and partner sponsors with official logo files, and the real number of slots per tier.
5. The production domain, if it is not `atmos26.vercel.app`.
6. The talk line-up (see "Not data-driven yet").
7. A Vercel preview deploy from this branch to confirm the 404 behaviour and the share cards (paste a URL into the WhatsApp and LinkedIn post inspectors). This branch was not pushed or deployed.
