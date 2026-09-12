# Learning interactions and verification

Updated: 2026-09-11. Scope: `/groundwater-learning` and the six `/learn/...` pages, in TH/EN/ZH/JA. No deployment or database changes were made.

## Visitor-facing changes

- Numeric inputs retain the text being edited, including blank drafts. Localized field errors explain missing, invalid and out-of-range numbers. Dependent results and export actions are withheld until valid. Existing engineering formulas are unchanged.
- Calculator reports contain tool name, inputs and units, results, example/entered-data status, assumptions, limitations and a query-free source URL. Copy failures show feedback and an accessible manual-copy report. Print estimate uses the same report and omits website navigation.
- FAQ filters, selected situations and quiz choices expose their state to assistive technology. Answer recommendations move focus; quiz feedback and retry are announced/focused appropriately. Native disclosure controls and reduced-motion behavior remain available.
- Buttons have visible borders and selected states, links are underlined, and disclosures show a native expand marker. These cues do not depend on hovering. The existing teal palette and removed arrow decorations are preserved.
- The centre searches article sections, terminology, all nine calculator tools and FAQs. It supports Thai spacing, common technical synonyms, safe highlights, localized excerpts, section links and incremental results. Only the current language's index reaches the search client.
- Basics, permits and business-planning checklists offer optional device saving. Nothing is written before opt-in. Only stable checklist IDs and checkmarks are saved locally, never project details, calculator inputs or quiz answers. Reset, forget, storage failures and cross-tab opt-out are handled explicitly. Saved checks are shared across languages on the same origin/browser, not between devices.

## Re-running checks

```powershell
npm ci
npx playwright install --only-shell chromium
npm run check
npm run test:e2e:learning
```

`test:e2e:learning` starts the existing production build on `127.0.0.1:3005`, uses isolated desktop/touch browser contexts, and stops its server afterward. It refuses to reuse a process already on that port. It never logs in to CMS or submits provider/contact mutations.

To check an already-running local/preview build:

```powershell
$env:LEARNING_E2E_BASE_URL = 'http://127.0.0.1:3007'
npm run test:e2e:learning
npm run test:e2e:learning:routes
Remove-Item Env:LEARNING_E2E_BASE_URL
```

Screenshots and traces are retained on test failure under ignored `test-results/`. The default browser run also produces an ignored HTML report in `playwright-report/`.

On this workstation the npm/npx launcher currently points to a missing global CLI. Direct equivalents used during verification:

```powershell
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' ci
node node_modules/playwright/cli.js install --only-shell chromium
node node_modules/playwright/cli.js test --config playwright.learning.config.ts
```

The existing quality workflow now runs the browser suite after its build. The existing production monitor adds read-only checks of all 28 learning routes; it keeps its current schedule and configuration. These workflow edits take effect only after the repository changes are pushed. No new GitHub secret is required for these learning checks.

## Keeping search current

Article copy is extracted deterministically without executing the interactive components. FAQ records remain a direct data dependency. When editing lesson or calculator copy:

```powershell
npm run update:learning-search
npm run check:learning-search
npm test
```

Review the generated `src/data/learning-search-sections.json` diff with the text change. Tests and the npm prebuild check reject an outdated extract. The generator also supports `--patch` for an apply-patch workflow.

## Verification and limits

- Final verification passed: 92 automated Node tests, 50 Playwright desktop/touch tests, TypeScript, ESLint, touch-hover checks, search-index freshness and the production build. The read-only learning route monitor also passed all 28 localized routes.
- The production build and desktop/touch interaction suite were run locally. The suite covers input editing/reset, complete reports, clipboard failures, printing, keyboard controls, FAQ search/filter/hash links, quizzes, localized centre search, progress opt-in/reset/forget/storage failures, cross-tab synchronization and repeated viewport changes.
- The computer-use skill guided additional mobile visual inspection of controls, search results and optional saving. Browser emulation and ARIA assertions do not replace a real-device screen-reader review or native-language approval.
- The pre-existing development server on port 3000 returned markup but did not hydrate controls during automated checks; its hot-reload WebSocket handshake also failed. The same interactions passed against a fresh production build. No user-owned server was stopped. Restart the normal development server and refresh its tab if it shows stale or unresponsive controls.
- Previously documented technical/source-review and real-reader approval limits remain in `learning-content-review.md`.
