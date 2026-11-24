# OctoGrab

A browser sidebar for building reusable website extraction blueprints with nested blocks.

Built with **WXT, React, MobX, shadcn/ui, and Tailwind CSS**. Supports Chrome and Chromium browsers with the Side Panel API.

## Included

- Toolbar action opens OctoGrab in the browser's native side panel.
- Navigation between the blueprint editor, saved blueprints, and settings.
- Light, dark, and system themes with the mascot's mint and teal palette.
- Approved octopus brand mark in the header, favicon, and extension icons, with matching editor and library illustrations.
- Fifteen configurable action, control, and data block types.
- Nested child areas, including separate If branches and Repeat between steps.
- Drag-and-drop reorder and nesting, plus menu and form controls for keyboard use.
- Block duplication, configuration, field mappings, and confirmed deletion.
- Blueprint creation, duplication, search, deletion, and validated JSON import/export.
- Automatic local draft saving and restoration, with visible storage errors.

- On-page element picking, with CSS selectors, match counts, and an example.
- A local sequential runner for all fifteen block types, including pagination and separate detail tabs.
- Captured value bindings (`{{detail_url}}`), element / captured / fixed-text / page-URL field sources, and optional fields.
- Run, Pause, Resume, Stop, persistent results, and CSV / JSON exports.
- Optional website access requested from the Pick or Run button; a run stays within its declared origins.
- Immutable run snapshots, bounded budgets, and atomic IndexedDB checkpoints with records.

The ordinary HTTP preview supports editing only. Picking and execution need the installed extension. Current support covers the top-level document and ordinary DOM elements. Iframes, shadow roots, virtualized collections, trusted-input-only interactions, and loops over captured lists are not implemented. Selectors require manual repair when layouts change.

## Try the practice catalog

Reload the built extension, then open **Details → Practice catalog → Pagination + details**. This creates a separate configured blueprint. Click **Run blueprint**, grant access to `webscraper.io`, and open **Results**. The default visits two listing pages and at most two cars on each page, saving four rows with listing values and detail fields.

**Final page** starts on page 17 and checks that its four cars are saved before stopping. **Load more** exercises appended items, deduplicating rows by captured URL; it revisits earlier details on the second pass. These fictional vehicle listings are public scraping practice data, not current market data. See [benchmark evidence](./docs/testing/website-benchmarks.md).

Runs open a new listing tab and create their own temporary detail tabs. The listing stays open for inspection. Limits are 1,000 rows, 250 page visits, 10,000 DOM commands, and five active minutes; waits are at most 60 seconds each. A repetition limit is reported explicitly. Pause and Stop take effect between actions, or during observational waits; an already dispatched action is not undone. Keep the run's tabs unchanged while it is active.

Rows remain available after failure or interruption. A paused run resumes only if its saved documents can be verified. When the worker stops during an unfinished step, the outcome is marked uncertain: inspect the page, stop that run, and start a new one. It will not replay the uncertain action automatically. Browser restarts are not an unattended execution feature.

JSON exports keep `dataset`, `values`, and `pageUrl` separate. CSV includes the dataset and escapes extracted spreadsheet formulas as text.

## Development

Use Node.js 22.18 or newer.

```sh
npm ci
npm run dev
```

WXT starts the development server and launches its extension development browser. If your browser does not automatically load development extensions, load `.output/chrome-mv3-dev` using its Extensions page.

## Install the built extension

```sh
npm run build
```

1. Open Chrome's Extensions page (`chrome://extensions`).
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project's `.output/chrome-mv3` directory.
4. Pin OctoGrab, then click its toolbar icon to open the sidebar.

`npm run zip` builds a distributable extension ZIP in `.output`. No publishing is performed.

## Check

```sh
npm run typecheck
npm test
npm run build
```

The model/store and runtime checks cover nested moves, validation and draft storage, pagination order, scope isolation, bindings, deduplication, checkpoint continuation, required/optional fields, and safe exports.

For the browser check, install Playwright's Chromium once:

```sh
npx playwright install chromium
npm run test:browser
npm run test:runner
```

The browser check loads the built extension in a fresh temporary Chromium profile, checks native side-panel registration, and exercises editing, nested steps, ordering, themes, reload persistence, export/import, and deletion at sidebar widths. It closes that browser and deletes its temporary profile afterward. `CHROMIUM_EXECUTABLE` can specify an existing compatible Playwright Chromium executable. Screenshots are written to `.output/sidebar-*.png`.

The runner check uses a local catalog served by the test, with numbered pages, appended cards, and detail forms. It checks real extension execution, picking, pause/resume/stop, selector failures, and worker termination. Headless Chromium cannot answer native permission prompts, so this test pre-grants only its localhost origin and the public practice origin in its disposable profile. Application permission handling is unchanged.

To also run the bounded public catalog check:

```sh
OCTOGRAB_LIVE_TEST=1 npm run test:runner
```

## Structure

```text
src/
  entrypoints/
    background.ts              Run coordination, recovery, toolbar behavior
    page.content.ts            On-demand selector picker and DOM commands
    sidepanel/                 React entrypoint
  components/
    app.tsx                    Navigation, library, settings
    editor.tsx                 Blueprint editor
    block-tree.tsx             Nested steps and drop targets
    block-palette.tsx          Block selection
    block-settings.tsx         Configuration and field mappings
    ui/                        Official shadcn components
  lib/blueprint.ts              Block definitions, tree operations, import validation
  runtime/                     Serializable execution stack, budgets, run storage
  stores/editor-store.ts        MobX state and local draft persistence
  stores/runtime-store.ts       Run controls and extension messaging
  styles.css                   Theme tokens and editor styles
tests/                         Model and native extension browser checks
```

The shared vocabulary is in [CONTEXT.md](./CONTEXT.md), and the planned full system is in [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md). Third-party source and icon notices are in [THIRD_PARTY_NOTICES.md](./public/THIRD_PARTY_NOTICES.md) and are included in the extension build.
