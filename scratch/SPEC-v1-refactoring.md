# SPEC — obsidian-gtd Refactoring

## Problem Statement

Obsidian has no built-in GTD (Get Things Done) task management system. Users who want an org-mode-style workflow — TODO/DONE states, priorities A/B/C, scheduled/deadline dates, CLOCK time tracking, and Pomodoro — are forced to use Emacs org-mode (which requires leaving Obsidian) or cobble together multiple plugins.

The existing plugin (v0.1.6) already solves this, but the codebase has accumulated technical debt that makes it hard to maintain and extend. ESLint reports issues, there are no tests, and module boundaries are unclear (main.ts is ~450 lines). A quality pass is needed before further feature work.

## Solution

Refactor the existing plugin's codebase to improve:
- **Type safety** — eliminate `any` and loose type usage, enable strict patterns
- **Module boundaries** — extract responsibilities from `main.ts` into focused modules
- **Test coverage** — add Vitest for pure-logic modules and integration tests for Obsidian-dependent modules
- **Error handling** — replace empty `catch` blocks with proper error handling
- **Performance** — audit view re-renders, vault scans, and debounce patterns
- **Mobile compatibility** — ensure no desktop-only assumptions leak into shared code
- **ESLint compliance** — zero lint errors with strict rules

**No new features.** The plugin's behavior and user-facing API remain identical after refactoring.

## User Stories

1. As a developer, I want the build to pass with zero type errors under `strict: true`, so that I can catch type-level bugs at compile time.
2. As a developer, I want ESLint to report zero errors with a strict ruleset, so that code quality is enforced automatically.
3. As a developer, I want `main.ts` split into smaller modules, so that each file has a single responsibility and is easier to maintain.
4. As a developer, I want `AgendaView`, `TimelineView`, and `StatsView` to have clear interfaces with their dependencies injected, so that they are testable without a running Obsidian instance.
5. As a developer, I want all `catch (_e) { void _e; }` patterns replaced with meaningful error handling, so that errors are not silently swallowed.
6. As a developer, I want `parseTaskLine`, `parseTaskLines`, and `serializeTask` to have unit tests covering edge cases (empty lines, malformed metadata, mixed languages), so that task parsing logic is regression-proof.
7. As a developer, I want `computeNextDate`, `isToday`, `isThisWeek`, `isThisMonth` to have unit tests covering boundary conditions (month boundaries, year rollover, week start day config), so that date logic is correct.
8. As a developer, I want `parseClockLine`, `extractClockRecords`, `filterByDate`, and `totalMinutes` to have unit tests, so that CLOCK record parsing is verified.
9. As a developer, I want `startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer`, and `formatDuration` to have unit tests with fake timers, so that timer logic is deterministic.
10. As a developer, I want `startPomodoro`, `pausePomodoro`, `resumePomodoro`, `stopPomodoro`, and state transitions to have unit tests with fake timers, so that Pomodoro cycle logic is correct.
11. As a developer, I want `formatClockLine` and `formatDuration` to produce correct org-mode-style output for edge cases (zero duration, single digit minutes, overflow hours), so that CLOCK records are well-formed.
12. As a developer, I want `i18n.ts` translations to be fully covered, so that all UI strings exist in both languages without gaps.
13. As a developer, I want the `DatePickerModal` and `CaptureModal` to be verifiable through integration tests (mocking Obsidian's modal API), so that user interaction flows are covered.
14. As a developer, I want the agenda view's task grouping, sorting, and rendering to have integration tests (mocking `app.vault` and file content), so that the most complex view is regression-proof.
15. As a developer, I want `editor-ext.ts` (CodeMirror decoration) and `settings.ts` (settings tab) to have integration tests, so that the Obsidian API integration points are covered.
16. As a developer, I want `gtdDecorationField` to be tested in isolation, so that the CodeMirror decoration logic is verified.
17. As a developer, I want the build process to produce identical `main.js` output before and after refactoring (byte-identical or functionally equivalent), so that no regressions are introduced.
18. As a developer, I want `manifest.json` and `versions.json` to remain unchanged, so that the plugin remains compatible with the same Obsidian versions.
19. As a developer, I want view re-renders (`AgendaView.refresh()`, `TimelineView.onOpen()`) to be debounced or guarded against redundant calls, so that performance is not degraded by unnecessary vault re-scans.
20. As a developer, I want all `window.setTimeout` and `window.setInterval` calls to be safely cleaned up in `onunload()`, so that no leaked timers persist after plugin disable.
21. As a developer, I want all modules to be explicitly typed with no implicit `any`, so that the codebase benefits from full TypeScript strict mode.
22. As a developer, I want the test suite to run in CI via a GitHub Action, so that quality is gatekept on every commit.

## Implementation Decisions

### Module Architecture (After Refactoring)

```
src/
├── main.ts                    ← Plugin lifecycle only (register commands, views, settings)
├── settings.ts                ← Settings interface + SettingTab (unchanged, minor cleanup)
├── models/task.ts             ← ParsedTask, Priority, ClockRecord types (unchanged)
├── utils/
│   ├── parser.ts              ← parseTaskLine, parseTaskLines, serializeTask, isTaskLine, isMetaLine
│   ├── clock-parser.ts        ← parseClockLine, extractClockRecords, filterByDate, totalMinutes, formatDuration
│   ├── date-utils.ts          ← formatDate, parseDate, todayStr, computeNextDate, isToday, isThisWeek, etc.
│   ├── timer.ts               ← startTimer, pauseTimer, resumeTimer, stopTimer, getElapsed, formatDuration, formatClockLine
│   ├── pomodoro.ts            ← PomodoroState, startPomodoro, pausePomodoro, resumePomodoro, stopPomodoro, etc.
│   ├── editor-ext.ts          ← gtdDecorationField (CodeMirror StateField) — minimal change
│   └── i18n.ts                ← t(), metaKeywords, gtdFilenames, groupTitles (unchanged)
└── views/
    ├── agenda-view.ts         ← AgendaView, TimerAPI interface — dependencies explicitly injected via constructor
    ├── capture-modal.ts       ← CaptureModal — unchanged
    ├── date-picker-modal.ts   ← DatePickerModal — unchanged
    ├── stats-view.ts          ← StatsView — dependencies injected
    └── timeline-view.ts       ← TimelineView — dependencies injected
```

**Key changes:**
- `main.ts` stays focused on lifecycle (command registration, plugin init). Extraction of `checkMorningReminder()` into its own file is optional but recommended if it grows.
- `TimerAPI` interface (already in `agenda-view.ts`) is the seam for timer testing — keep it.
- View constructors already receive settings and language. No additional dependency injection framework needed.
- The `window.setTickCallback` pattern in `timer.ts` is a global callback — refactored into a proper observer or injected dependency pattern for testability.
- `formatDuration` appears in both `clock-parser.ts` and `timer.ts` — consolidate into a shared utility or leave as-is (slight duplication, but each serves its own domain with different formatting needs).

### Dependency Injection Strategy

- **Pure functions** (parser, clock-parser, date-utils): tested directly, no mocking.
- **Global-state modules** (timer, pomodoro): tested with `vi.useFakeTimers()` and `vi.resetModules()` for state isolation between tests.
- **Obsidian-dependent views**: tested by mocking `obsidian` module via `vi.mock('obsidian', ...)`. Provide minimal mock implementations of `ItemView`, `WorkspaceLeaf`, `Notice`, `TFile`, etc.
- **Obsidian-dependent utils** (editor-ext, settings): same mock strategy.

### Error Handling Policy

- Empty `catch (_e) { void _e; }` blocks → replaced with `console.warn` or structured error context.
- File read/write failures → `Notice` to user with actionable message.
- Timer/Pomodoro edge cases → graceful no-ops with logged diagnostics.

### Testing Decisions

- **Test framework**: Vitest with `@vitest/runner`.
- **Seam**: The **module boundary** between pure-logic utilities and Obsidian-dependent views is the primary seam. Pure modules (parser, clock-parser, date-utils) need zero mocking. Timer and pomodoro modules use `vi.useFakeTimers()` but no Obsidian mock. Views require mocking the `obsidian` module.
- **Prior art**: No existing tests to reference. First test suite for this codebase.
- **Test location**: `src/__tests__/` directory, mirroring the source structure:
  ```
  src/__tests__/
  ├── utils/
  │   ├── parser.test.ts
  │   ├── clock-parser.test.ts
  │   ├── date-utils.test.ts
  │   ├── timer.test.ts
  │   ├── pomodoro.test.ts
  │   └── i18n.test.ts
  └── views/
      ├── agenda-view.test.ts
      ├── capture-modal.test.ts
      └── date-picker-modal.test.ts
  ```
- **Coverage target**: 100% of pure utility functions; critical paths in views.

### Code Style / Linting

- ESLint config (`eslint.config.mjs`) — currently seems inactive/unused. Switch to flat config with `typescript-eslint` at strict level.
- `prefer-const` fixes for the 2 existing issues.
- Add `vitest` ESLint plugin.

## Out of Scope

- **New features**: No new commands, views, settings, or user-facing behavior changes.
- **E2E testing**: No Playwright or real-Obsidian integration tests.
- **Theme overhaul**: `styles.css` content is out of scope unless type-related.
- **Obsidian API version bump**: `manifest.json` and `minAppVersion` stay as-is.
- **Build tooling changes**: esbuild config remains; no migration to another bundler.
- **CI/CD setup**: GitHub Actions for lint/test can be added but is secondary to code quality.
- **Documentation rewrite**: README, AGENTS.md content changes are out of scope (but dependency listings in package.json may need sync).
- **Refactoring the refactored code**: No second pass for "ideal" architecture — only improvements directly serving testability, safety, and maintainability.

## Further Notes

### Current Build Status (as of 2026-07-15)

| Check | Status |
|-------|--------|
| `npm run build` (tsc + esbuild) | ✅ Passes |
| `npm run lint` (eslint 9.x) | ❌ 2 errors (prefer-const) + config mismatch |
| `npm test` | ❌ No test script defined |
| `npm install` | ✅ Clean install |

### ESLint Config Issue

The project has two ESLint config files (`eslint.config.mjs` and `eslint.config.mts`) in the flat config format, but `eslint.config.mjs` may be misconfigured or empty, causing ESLint to fall back to "no config found" error during lint runs. This needs investigation — the `.mjs` file should be the active config, and `.mts` should be removed or consolidated.

### Known Code Quality Issues (Pre-Fix Inventory)

1. **`main.ts` is ~450 lines** — violates AGENTS.md recommendation of keeping main.ts minimal.
2. **`void` misuse** — floating promises and empty `catch (_e) { void _e; }` patterns throughout.
3. **No TypeScript strict mode** — `tsconfig.json` does not have `"strict": true`.
4. **Global mutable state** — `timer.ts` and `pomodoro.ts` use module-level variables (`currentTimer`, `intervalId`, `pomodoroState`) that can't be reset between tests without `vi.resetModules()`.
5. **No `onunload` cleanup** — `onunload()` in `main.ts` is empty. Intervals and event listeners may leak.
6. **`window.setInterval` in timer** — hardcoded 5s interval for tick callback. Should use Obsidian's `registerInterval` for safe cleanup.
7. **`Any` types** — a few `as unknown as AgendaView` casts in `main.ts`.
8. **Loose file scan** — `AgendaView.scanVault()` reads all markdown files then filters by prefix; could be more targeted.
9. **Inline `Date` construction** — `new Date()` used directly in multiple places without timezone awareness.
10. **Hardcoded DOM manipulation** — `addEventListener` in views may not be cleaned up on view close.
