# OctoGrab Agent Notes

## Setup

- Use Bun, not npm. `bun.lock` is the source of truth even though `package-lock.json` exists.
- Run `bun install` before any TS/build work. `tsconfig.json` extends `.wxt/tsconfig.json`, and `bun install` runs `wxt prepare` to generate it.
- Local extension dev needs `.env` with `VITE_DEV_MODE=true` (`.env.example` defaults to `false`). This flag is compile-time only via `import.meta.env`, so rebuild after changing it.
- Without `VITE_DEV_MODE=true`, the sidepanel can be blocked by the license/tamper flow.

## Commands

- `bun dev` starts the Chrome MV3 WXT dev build.
- `bun run dev:firefox` starts the Firefox build.
- `bun run build` creates `.output/chrome-mv3`.
- `bun run build:prod` is the protected build: it runs `wxt build` and then `scripts/obfuscate.js`.
- `bun run compile` is the repo typecheck command.
- `bun run test` runs the full Vitest suite.
- `bun vitest run tests/messaging.test.ts` runs a single test file.
- There is no repo lint/format script or CI workflow to rely on; do not invent one.

## Structure

- This is a WXT Chrome extension. The real entrypoints are WXT-discovered files under `entrypoints/`: `background.ts`, `content.ts`, and `sidepanel/main.tsx`.
- `entrypoints/sidepanel/` is the React app. It uses `MemoryRouter`, not `BrowserRouter`.
- `entrypoints/sidepanel/main.tsx` waits for `setupDatabase()` before rendering the app.
- `entrypoints/content.ts` runs at `document_start` on `<all_urls>` and owns selector picking, preview extraction, the execution frame overlay, and RPC setup.
- `entrypoints/stores/blueprint-builder-store.ts` is the manual blueprint editor state.
- `entrypoints/stores/blueprint-executor-store.ts` is the main execution engine.
- `entrypoints/stores/blueprint-wizard-store.ts` is the guided scraper wizard and keeps a recoverable draft in `localStorage`.
- `landing-page/` is a separate static marketing site, not part of the WXT extension entrypoints.

## Persistence

- IndexedDB storage is Dexie in `core/database.ts`; schema changes require a new Dexie version there.
- The UI calls them "blueprints", but persistence still uses legacy `SavedPlan` / `plan.pipeline` shapes from `core/types.ts` and `entrypoints/models/blueprint-persistence.ts`.
- The current Dexie schema version is `2`; that version adds the `notifications` table.
- Wizard draft state is stored in `localStorage` under `octograb_wizard_draft`, not Dexie.

## Gotchas

- Only `VITE_`-prefixed env vars are exposed to the build (`wxt.config.ts`).
- Content-script messaging is intentionally retry-heavy: `sendToTab()` retries 8 times with a 750ms delay before giving up.
- Tests are plain Vitest with no global setup file; focused tests usually mock `wxt/browser` directly.
- `build:prod` obfuscation has MV3-specific compatibility exceptions in `scripts/obfuscate.js`; do not "simplify" those flags casually.

## Repo Aids

- A Graphify graph exists at `graphify-out/graph.json`; use it first for codebase/architecture questions before broad source searching.
