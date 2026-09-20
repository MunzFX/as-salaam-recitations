# As-Salaam Recitations — Editing Guide

You are editing the source of https://as-salaam-recitations.higgsfield.app — a
cinematic Qur'an recitation archive. Read this before changing anything.

## Stack

React 19 + TanStack Start (SSR), Vite, Tailwind CSS, GSAP ScrollTrigger,
Three.js (Surah gallery). Deployed as ONE Cloudflare Worker on the Higgsfield
platform, which injects the database (D1), audio storage (R2), auth and
secrets at build time. All real code lives in `app/`.

## Key files (edit these)

| Path | What it is |
|---|---|
| `app/src/routes/index.tsx` | Home route — renders the cinematic journey |
| `app/src/components/archive/journey.tsx` | Home page: scroll-scrub + the liquid-warp seam controller |
| `app/src/archive-journey-scenes.tsx` | The 6 chapters: order, ids, labels, which film clip each maps to |
| `app/src/components/archive/journey-parts.tsx` | Chapter content: hero copy, featured player, browse panel, gallery |
| `app/src/components/scroll-scrub/scroll-scrub.tsx` | The scroll engine (film scrubbing). Extend additively; do NOT rewrite |
| `app/src/components/scroll-scrub/scroll-scrub.css` | Engine styles + the liquid-warp CSS at the bottom |
| `app/src/routes/` | Other pages: recitations, surah list, surah detail, about, admin |
| `app/src/lib/archive.ts` + `app/src/lib/surah-seed.json` | Data model and 114-Surah seed |
| `app/migrations/` | SQL schema (additive migrations only) |
| `app/public/assets/world/` | Film clips + posters (referenced by `app/cinematic-assets.json`) |

## How the home page works

`ScrollScrub` sticks a full-viewport stage to the screen; each of the 6
chapters is a tall band below it. Scrolling scrubs the chapter's film forward
and backward. At the boundary between chapters (`Journey`'s controller) a
watery displacement filter flexes the film with scroll velocity and springs
back — that effect lives in `journey.tsx` (controller) + `scroll-scrub.css`
(the `#as-salaam-liquid` SVG filter is defined in `scroll-scrub.tsx` markup).

## Rules

- Preserve the scroll engine's segment wiring and timing. Add markup/CSS
  additively; keep the scenes array in `archive-journey-scenes.tsx` a module
  constant.
- Never drive per-frame animation values through React state — the engine
  writes directly to the DOM (`window.requestAnimationFrame`), follow that.
- Every `poster` file is the exact first frame of its clip. Don't swap or
  regenerate media unless you regenerate both encode and poster.
- Don't touch `cinematic-assets.json` checksums or `migrations/` unless you
  know exactly why.
- Content should stay Arabic-language-safe: preserve `lang="ar" dir="rtl"`
  spans on Arabic text.

## Local dev (limited)

`cd app && bun install && bun run dev`. NOTE: the `@higgsfield/*` workspace
packages and the D1/R2/secret bindings are platform-internal and are NOT in
this archive — the app builds and deploys only through the Higgsfield platform.
Edits here are code-reviewable; a full local run requires those internal parts.

## Getting your changes live

1. Make your edits (diff the changed files against this archive's originals).
2. Send the changed files back to the assistant in your Higgsfield chat —
   it will apply them to the real repository, build, and deploy to
   https://as-salaam-recitations.higgsfield.app, then give you the live URL.