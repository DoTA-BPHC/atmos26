# Reference teardown, 13 October 2026

Three fest sites taken apart with [REA](https://github.com/morluto/rea) (`rea-agents` 6.4.0, CLI through
`npx`, no MCP setup) to decide what ATMOS borrows. REA attached to a throwaway Chrome profile on loopback
(`--remote-debugging-port=9333 --user-data-dir=%TEMP%\rea-prof`), passive only: it never drove the pages.
Raw evidence stayed on the analysing machine; the evidence IDs below identify each capture.

## Commands
```bash
rea list-browser-targets http://127.0.0.1:9333 --format json
rea analyze-web-bundle   http://127.0.0.1:9333 <target> --observation-ms 3000 --format json
rea inspect-web-page     http://127.0.0.1:9333 <target> --observation-ms 2000 --include-script-sources --format json
rea export-web-scripts   <capture.json> <empty-dir>      # then grep the exported bundle
```
Techfest serves its bundle from CloudFront, so its captures need
`--allowed-origins https://techfest.org --allowed-origins https://dsp17yg366baq.cloudfront.net`
(REA scopes to the page's own origin by default).

## Findings
| Site | Stack (REA fingerprints, chunks) | How the home page works |
|---|---|---|
| techfest.org (`ev_2839fea2…`, scripts `ev_a95ec632…`) | React (CRA), framer-motion, three.js, GSAP. `main.js` 718 KB + a 561 KB chunk; 23 routes | One `.sticky-viewport` inside a `.scroll-track` of **600vh, 300vh on phones (≤480px)**. `useScroll({ target: track, offset: ['start start','end end'] })` → `useSpring({ stiffness: 120, damping: 30, mass: 0.4 })` drives `motion.div` parallax layers (video sky, palace, character, fog, `perspective: 800px`). The sky video shows a first-frame **poster** and only gets its `src` after `load` + `requestIdleCallback` (1.5 s timeout); the three.js canvas mounts after idle. A "Scroll" cue with a bobbing line fades with progress. Fixed chrome: nav pill, icon rails, **mobile bottom nav**, chatbot. |
| oasis-2025-web.vercel.app (`oa-bundle`) | Vite, React, GSAP ScrollTrigger, framer (proxy chunk), react-helmet. Homepage chunk 474 KB | "Enter" gate that unlocks audio, illustrated hero with Register always on screen, fixed countdown, per-section titles via Helmet. Deep links (`/events`) return Vercel 404: no SPA rewrite. |
| bits-apogee.org (`ev_49ccbc5d…`) | React, three.js + @react-three, GSAP, Howler, Spline, all in **one 2.2 MB module** | Terminal boot screen and a "LAUNCH" gate. `body { overflow: hidden }`: no page scroll; the wheel drives a car and camera through a 3D city. Menu and countdown are billboards inside the scene. |

## What ATMOS took
- **Hero inside the fly-through** (Techfest): the hero is now the first segment of the ascent, over the
  live shaft, instead of a separate screen above it.
- **Poster, then live** (Techfest): `public/world/stills/top*.webp` show at once; the engine starts on
  idle and fades up over 1.2 s.
- **Phone runway about half of desktop** (Techfest 600vh → 300vh): the ascent is 10.7 screens on desktop,
  5.4 on phones.
- **Spring-smoothed hero exit** with Techfest's constants, and its scroll cue.
- **One screen after the spectacle** (Techfest's three-card landing): the post-summit hub.
- **Mobile bottom nav** (Techfest).
- **Countdown always in view on the first screen** (Oasis), in the hero's info dock.
- **The world carries the information** (APOGEE's billboards), as the dock over the shaft.

## What ATMOS left out
- Entry gates (Oasis "Enter", APOGEE "LAUNCH"): they hold back the when/where/how-to-join that
  PRODUCT.md wants on the first phone screen. The preloader is capped at 4 s for the same reason.
- Wheel hijacking (APOGEE): breaks keyboard, screen readers and touch.
- Chatbot, sign-in, social rails (Techfest): no backend; the footer already links out.
- Three equal floating cards (Techfest): same-size cards as structure are on the AGENTS.md banned list.
- Contact cards with people (Oasis): no people or phone numbers on the site.
- Single giant bundles (APOGEE 2.2 MB, Oasis 474 KB): no new dependencies; three.js stays lazy.
