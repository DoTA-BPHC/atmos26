# GEMINI.md: rules for Antigravity / Gemini in this repo

**Always follow `AGENTS.md` first.** It has the project map, commands and hard rules. Then use `DESIGN.md` for anything visual and `PRODUCT.md` for facts.

Antigravity-specific:
- Start every task in **planning mode**. Show the plan and the list of files you will touch before editing.
- If the plan touches a protected path (`src/index.css`, `src/components/hero/`, `src/components/particles/`, `public/logo/`, `src/data/logoLayers.json`, `scripts/`, `DESIGN.md`, `PRODUCT.md`, `AGENTS.md`), stop and ask the human before editing.
- Never use image generation to create or alter the ATMOS logo, its hands, its lettering or its ring. Generated imagery for other things (backgrounds, event art) must follow the palette in `DESIGN.md` and be logged in `design/ASSETS.md`.
- Keep diffs small. Don't reformat untouched code. Don't add packages without a stated reason.
- Verify before you report done: `npm run build` and `npm run lint` pass. Open the browser at `http://localhost:5173` and check the changed page at 1440 px and 390 px wide. Run `python scripts/verify_logo.py` if the hero or logo assets were involved.
- Write commit messages as `type: short summary` (`feat`, `fix`, `content`, `style`, `chore`).
