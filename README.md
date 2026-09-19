# As-Salaam Institute — The Invitation

This is the coded hybrid redesign of the institute's Qur'an recitation archive. The preview is at **http://127.0.0.1:8787** while the local server is running. The user has authorized publishing this version to https://as-salaam-recitations.higgsfield.app.

## What is built

- Six connected cinematic chapters, using a continuous film assembled from the five existing Higgsfield camera clips. Every chapter now moves as you scroll; there are no static dwell bands.
- The existing scroll-video engine, with forward/reverse seeking, exact-frame posters and smaller mobile encodes. Adjacent segments share identical decoded boundary frames. Scroll easing is independent of decoder speed, and the final clip completes before the background leaves the screen. GSAP handles the chapter copy; it does not drive a second video timeline.
- A live Three.js cylindrical Surah gallery. Fifteen neighbouring cards are rendered at a time, with all 114 chapters available through drag, keyboard, search, filters and a native selector.
- Actual HTML recording controls, independent of the visual assets. One persistent audio element supports play/pause, previous/next, seeking, volume, speed, repeat, saved recordings, sharing and remembered listening position.
- The existing Surah routes, verified metadata, reciter records, private audio storage and authenticated upload/publishing backend.
- The supplied official logo. Its original file is retained unchanged; the display copy only removes empty outer margins.

## Preview and private uploads

Double-click **Start Preview.command** on this Mac to restart the preview. It builds the app, applies migrations only to the local preview database, and starts the local server. The full source is in `app/`.

The preview has no recitations yet. Play buttons are disabled until real recordings are published. No third-party recitations or generated Qur'an audio were added.

The owner login remains locked until a private `ADMIN_PASSWORD` of at least 16 characters is configured. For local development, that secret belongs in `app/.dev.vars`, which is ignored by version control. For a hosted release it must be added privately to the deployment environment. Never put it in public source, browser code, or chat. No production password has been created or changed.

Local preview storage and the hosted website's storage are separate. Local test uploads do not become public uploads. After secure access is configured, add your reciter profile, upload MP3/M4A/WAV files, review each Surah's metadata, and publish from the recording studio.

## Validation

The scoped application tests and production build pass. `design/integration-checks.json` records 16 checks against an isolated local D1/R2 environment, including authentication, private drafts, upload validation, distribution-rights confirmation, byte-range seeking and revoked sessions.

The browser checks cover desktop and mobile composition, gallery navigation/search, audio playback, persistent playback across pages, seek/speed/repeat/favourite controls, and listening-position restoration. Silent fixtures exist only in a separate disposable test environment; they are not part of the actual preview catalog.

Run the application checks from `app/` with `bun run test`, `bun run typecheck`, and `bun run build`. After building, `python3 scripts/check-archive.py` runs the isolated backend checks. Append `--keep` for a temporary browser test site on port 8788.

## Media and practical limits

`prepare-continuous-journey.py` rebuilds the active chapter films from the existing local source clips without generating new media. `design/continuous-journey-checks.json` records exact-frame seam checks and delivery sizes.

Original Higgsfield outputs are in `design/source/`; their provenance is in `design/asset-manifest.json`. Optimised same-origin browser assets are in `app/public/assets/world/`.

The environment is a generated film, so the user follows a fixed camera path. The Surah gallery is real interactive 3D. AI-generated architectural transitions can contain small geometry changes; this is not a navigable 3D reconstruction of a real building. Reduced-motion visitors receive static scenes and an accessible card alternative. Devices without WebGL retain the Surah selector and full list.

The quality-priority release uses 1920×1080 desktop films (88.6 MiB total) and dedicated 720×1280 portrait films (39.1 MiB total). Films load progressively by nearby chapter. Video is silent, with frequent keyframes for seeking. Recitation starts only after a listener explicitly presses play.

The public release was authorized after preview review. Keep the existing production database and private audio bucket when releasing this redesign; do not replace them with local preview or QA data.

The brown/gold visual system supersedes the former olive palette. Large video files are stored on Higgsfield media storage and pinned by checksum in `app/cinematic-assets.json`; a fixed, same-origin streaming endpoint serves only those approved films. The publishing build needs no large external downloads. The full source remains editable after a Codex session ends, but AI editing still depends on the editor’s usage limits.

