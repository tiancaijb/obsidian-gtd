# Contributing to GTD Workflow

Thank you for considering contributing to the GTD Workflow plugin for Obsidian! This guide will help you set up your development environment, understand the project structure, and follow the contribution workflow.

## Table of Contents

- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Workflow](#pull-request-workflow)
- [Release Process](#release-process)

---

## Development Environment

### Prerequisites

- **Node.js**: Use the current LTS version (Node.js 18+). The CI pipeline tests on 20.x, 22.x, and 24.x — any of these is safe for local development.
- **npm**: Comes with Node.js. This project uses npm as its package manager.
- **Git**: Required for version control and the PR workflow.

### Setup

```bash
# Clone the repository
git clone git@github.com:tiancaijb/obsidian-gtd.git
cd obsidian-gtd

# Install dependencies
npm install
```

### Dev Build (Watch Mode)

```bash
npm run dev
```

This starts esbuild in watch mode, recompiling `main.js` whenever source files change.

### Production Build

```bash
npm run build
```

This runs TypeScript type checking (with strict settings) and then bundles the plugin into `main.js`.

### Setting Up a Dev Vault

To test the plugin in Obsidian during development, you need a development vault. There are three approaches:

**Option 1: Symlink (recommended)**

1. Create a test vault in Obsidian (e.g., `~/dev/obsidian-gtd-vault/`).
2. Create the plugins folder: `mkdir -p ~/dev/obsidian-gtd-vault/.obsidian/plugins/gtd-workflow/`
3. Symlink the built files:
   ```bash
   ln -s /path/to/obsidian-gtd/main.js /path/to/vault/.obsidian/plugins/gtd-workflow/main.js
   ln -s /path/to/obsidian-gtd/manifest.json /path/to/vault/.obsidian/plugins/gtd-workflow/manifest.json
   ```
4. Enable the plugin in Obsidian via **Settings → Community plugins**.

**Option 2: Direct Copy**

Run after each build:
```bash
cp main.js manifest.json /path/to/vault/.obsidian/plugins/gtd-workflow/
```

**Option 3: Watch with dev vault flag**

If you set up a `.env` file or use the esbuild config's vault flag:
```bash
npm run dev -- --vault "/path/to/Obsidian Vault"
```
This writes `main.js` and `manifest.json` directly to the vault's plugin folder on every change.

> **Note**: After changing plugin files, you can reload the plugin in Obsidian via **Settings → Community plugins → Installed plugins → GTD Workflow → Reload** (or use the Obsidian Developer Tools: `Ctrl+Shift+I` → `app.plugins.reload("gtd-workflow")`).

---

## Project Structure

```
obsidian-gtd/
├── src/
│   ├── main.ts                  # Plugin entry point, lifecycle management
│   ├── settings.ts              # Settings interface, defaults, settings tab
│   ├── commands/
│   │   ├── index.ts             # Command registration hub
│   │   ├── task-commands.ts     # Task-related commands (toggle, cycle priority, etc.)
│   │   ├── timer-commands.ts    # Timer and Pomodoro commands
│   │   └── view-commands.ts     # View toggle commands
│   ├── models/
│   │   └── task.ts              # Task data model and types
│   ├── utils/
│   │   ├── parser.ts            # Markdown task parser
│   │   ├── clock-parser.ts      # CLOCK record parser
│   │   ├── date-utils.ts        # Date calculation helpers
│   │   ├── editor-ext.ts        # CodeMirror editor extension
│   │   ├── editor-utils.ts      # Editor utility functions
│   │   ├── file-cache.ts        # File content cache with invalidation
│   │   ├── file-ops.ts          # File I/O operations
│   │   ├── i18n.ts              # Internationalization (Chinese, English, Japanese)
│   │   ├── morning-reminder.ts  # Morning sunlight reminder
│   │   ├── pomodoro.ts          # Pomodoro timer logic
│   │   ├── timer.ts             # Per-task timer logic
│   │   └── view-utils.ts        # View utility functions
│   ├── views/
│   │   ├── agenda-view.ts       # Agenda sidebar view
│   │   ├── agenda-types.ts      # Agenda view type definitions
│   │   ├── agenda-ui.ts         # Agenda view UI components
│   │   ├── capture-modal.ts     # Quick capture modal
│   │   ├── date-picker-modal.ts # Date picker modal
│   │   ├── stats-view.ts        # Time statistics view with pie chart
│   │   └── timeline-view.ts     # 24h timeline view
│   └── __tests__/
│       ├── helpers/
│       │   └── obsidian-mock.ts      # Obsidian API mocks for tests
│       ├── setup.test.ts             # Test environment setup
│       ├── utils/
│       │   ├── clock-parser.test.ts
│       │   ├── date-utils.test.ts
│       │   ├── i18n.test.ts
│       │   ├── parser.test.ts
│       │   ├── pomodoro.test.ts
│       │   └── timer.test.ts
│       └── views/
│           ├── agenda-view.test.ts
│           ├── capture-modal.test.ts
│           ├── date-picker-modal.test.ts
│           ├── stats-view.test.ts
│           └── timeline-view.test.ts
├── .github/
│   └── workflows/
│       └── lint.yml             # CI: build, lint, test, upload coverage
├── manifest.json                # Obsidian plugin manifest
├── tsconfig.json                # TypeScript configuration (strict)
├── tsconfig.build.json          # Build-specific TS config (excludes tests)
├── esbuild.config.mjs           # esbuild bundler configuration
├── eslint.config.mjs            # ESLint flat configuration
├── vitest.config.ts             # Vitest test configuration
├── AGENTS.md                    # AI-assisted development guidelines
└── package.json
```

### Key Architectural Decisions

- **Plugin lifecycle**: `src/main.ts` is the entry point. It keeps `onload()` and `onunload()` focused on registration and cleanup. All feature logic is delegated to separate modules.
- **File cache**: A shared `FileCache` instance invalidates cached file contents on vault `modify`/`create`/`delete`/`rename` events, avoiding redundant reads.
- **Task model**: Tasks are parsed from plain Markdown list items — there is no separate database. Metadata (priority, dates, CLOCK records) lives inline in the list item body.
- **Views**: The agenda, timeline, and stats views are registered as Obsidian sidebar views. They share the same file cache and re-parse data on activation.
- **Timer**: Timer state is managed by a singleton module (`utils/timer.ts`) that all views reference via a callback pattern.

---

## Coding Standards

### TypeScript

The project uses strict TypeScript:

- `strict: true` in `tsconfig.json`
- `noUncheckedIndexedAccess: true` — always check indexed access for `undefined`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

All source code (excluding test files) must compile without errors under these settings.

### ESLint

The project uses ESLint with two configurations:

1. **Source files** (`src/**/*.ts`, excluding tests): TypeScript strict type-checked rules plus `eslint-plugin-obsidianmd` for Obsidian-specific rules.
2. **Test files** (`src/__tests__/**/*.ts`): Relaxed rules that accommodate mock-heavy code.

Run linting before every commit:

```bash
npm run lint
```

**Important**: Linting must pass with zero errors (warnings are acceptable but should be kept to a minimum). New code should not introduce new warnings.

### Code Style

- Use `async/await` over promise chains.
- Handle errors gracefully — avoid silent failures.
- Prefer early returns over deep nesting.
- Use `this.register*` helpers (`registerEvent`, `registerView`, `registerInterval`, etc.) for everything that needs cleanup — never manually manage listener/interval lifecycle.
- Keep functions focused and small. Split large files (over ~200–300 lines) into smaller modules.
- Write descriptive variable and function names. Avoid abbreviations when the full word is clearer.
- Maintain clear module boundaries — each file should have a single, well-defined responsibility.

### Naming Conventions

- **Files**: Use kebab-case for utility modules (`date-utils.ts`, `file-cache.ts`). View files use hyphenated names (`agenda-view.ts`, `stats-view.ts`).
- **Classes**: PascalCase (`AgendaView`, `FileCache`, `GtdPluginSettings`).
- **Functions and variables**: camelCase (`getCurrentTimer`, `fileCache`).
- **Types and interfaces**: PascalCase (`GtdPluginSettings`, `Task`).
- **Constants**: UPPER_SNAKE_CASE for configuration constants (`DEFAULT_SETTINGS`).

---

## Testing

The project uses [Vitest](https://vitest.dev/) as the test runner.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

### Coverage

Coverage reports are generated using `@vitest/coverage-v8`. In CI, the JSON coverage report is uploaded to [Codecov](https://codecov.io/gh/tiancaijb/obsidian-gtd).

To view the local HTML coverage report:
```bash
npm test -- --coverage
open coverage/index.html
```

### Test Requirements

- **New features must include tests** that cover the happy path, edge cases, and error conditions.
- **Bug fixes must include a regression test** that would have caught the bug.
- Tests live in `src/__tests__/`, mirroring the module structure of `src/`.
- Use the Obsidian API mocks in `src/__tests__/helpers/obsidian-mock.ts` instead of mocking the Obsidian API manually.
- Mocks are reset between tests (`mockReset: true` and `restoreMocks: true` in vitest config) — no need to manually clean up unless you add global mocks.
- Keep tests fast and focused. They run in a Node.js environment, not a browser.

---

## Commit Message Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This makes it easy to generate changelogs and automate version bumps.

### Format

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Types

| Type       | Usage                                                   |
|------------|---------------------------------------------------------|
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation changes                                   |
| `style`    | Code style changes (formatting, no logic change)        |
| `refactor` | Code refactoring with no feature change or bug fix      |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `chore`    | Build process, CI, dependency updates, tooling          |
| `ci`       | CI/CD configuration changes                             |

### Scope

The scope should be the module or area affected (e.g., `parser`, `agenda-view`, `timer`, `settings`, `ci`, `docs`). If a change affects multiple scopes, omit the scope.

### Examples

```
feat(parser): support REPEAT metadata for recurring tasks
fix(timer): prevent concurrent timer sessions on same task
docs: add architecture documentation
refactor(agenda-view): extract task grouping logic into separate module
test(parser): add test cases for malformed metadata lines
chore(deps): update esbuild to 0.25.5
ci: add Codecov coverage upload step
```

### Footer

Use footnotes for breaking changes (`BREAKING CHANGE:`) or issue references (`Closes #123`).

---

## Pull Request Workflow

### Step-by-Step

1. **Fork** the repository on GitHub.

2. **Create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/my-feature
   ```

3. **Make your changes**. Keep commits small and focused — each commit should represent a logical unit of work.

4. **Run quality checks** locally before committing:
   ```bash
   npm run build    # TypeScript type check + esbuild bundle
   npm run lint     # ESLint — must report zero errors
   npm test         # All 583+ tests must pass
   ```

5. **Commit your changes** using the [conventional commit format](#commit-message-conventions):
   ```bash
   git add .
   git commit -m "feat(scope): concise description"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/my-feature
   ```

7. **Open a Pull Request** against `tiancaijb/obsidian-gtd:main`.
   - Use a clear, descriptive title following the conventional commit format.
   - In the description, explain what the change does, why it's needed, and how it was tested.
   - Reference any related issues (e.g., `Closes #123`).

8. **Address review feedback**. The maintainer may request changes. Push additional commits to your branch — avoid force-pushing during review so changes are easy to diff.

9. **Merge**. Once approved, the maintainer will merge your PR. The `main` branch is protected and requires passing CI checks.

### PR Checklist

Before submitting, ensure:

- [ ] `npm run build` passes without errors
- [ ] `npm run lint` reports zero errors
- [ ] `npm test` passes (all tests, not just your new ones)
- [ ] New code includes tests that cover the relevant scenarios
- [ ] Commit messages follow the conventional commit format
- [ ] Documentation is updated if the API or behavior changed
- [ ] No `console.log` or debug artifacts are left in code
- [ ] The branch is up to date with `main` (rebase if needed)

### Branch Naming

Use descriptive branch names with a type prefix:

- `feat/my-feature` — new features
- `fix/bug-description` — bug fixes
- `docs/update-readme` — documentation
- `refactor/module-name` — refactoring
- `chore/update-deps` — tooling/dependency updates

---

## Release Process

Releases are managed by the project maintainer. The process is:

1. Bump the `version` field in `manifest.json` following Semantic Versioning (`x.y.z`).
2. Update `versions.json` to map the new version to the minimum required Obsidian app version.
3. Run the build to produce the production `main.js`.
4. Create a GitHub release with a tag matching the version (no leading `v`).
5. Attach `main.js`, `manifest.json`, and `styles.css` (if present) to the release.

---

## Questions?

If you have questions about contributing, open a [Discussion](https://github.com/tiancaijb/obsidian-gtd/discussions) or reach out to the maintainer on [Twitter](https://x.com/tiancaijb666).

For AI-assisted development, see [`AGENTS.md`](./AGENTS.md) which contains guidelines for AI coding agents working on this project.
