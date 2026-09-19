# Preview status

The user subsequently explicitly authorized public release on 18 September 2026, with restored video quality and exclusively brown/gold branding. Preserve the existing production database and private audio storage.

Preview: http://127.0.0.1:8787. Restart using `../Start Preview.command`. The source is in this `app/` directory. Preview D1/R2 data is isolated from production.

The public catalog contains 114 sourced Surahs and zero recordings. The original official logo is included. Six environment plates and five camera transitions were generated with Higgsfield and are stored locally with provenance in `../design/asset-manifest.json`.

The owner login is intentionally locked until a private ADMIN_PASSWORD with at least 16 characters is configured for the relevant environment. The password is not present in client code or source control. Never reuse the disposable QA password or its test data for a real deployment.

The scoped application tests, TypeScript checks and production build pass. Sixteen local API integration checks passed against a disposable QA database and audio bucket. Browser checks exercised responsive layouts, gallery selection/search, persistent audio, seek/speed/repeat/saved recordings and restoring the listening position after reload.

The actual preview has no test recitations. The separate QA site used explicitly labelled silent audio fixtures only, with no external publishing.

Before a future public release: configure the owner secret privately, preserve the production database and bucket, upload actual recitations, and test the real audio on the target phones. The AI environment follows a fixed camera path and may contain small architectural continuity differences.
