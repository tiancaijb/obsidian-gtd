# Contributing to GTD Workflow

Thank you for considering contributing to **GTD Workflow**! This guide will help you set up a development environment, understand the project structure, and follow the contribution workflow.

## Table of Contents

- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Workflow](#pull-request-workflow)
- [Testing](#testing)
- [Release Process](#release-process)

---

## Development Environment

### Prerequisites

- **Node.js**: 20.x, 22.x, or 24.x (see [CI matrix](.github/workflows/lint.yml))
- **npm**: Comes with Node.js
- **Git**

### Setup

```bash
# Clone the repository
git clone git@github.com:tiancaijb/obsidian-gtd.git
cd obsidian-gtd

# Install dependencies
npm install

# Build the plugin
npm run build
```

### Development Workflow

#### Option 1: Build to a test vault (recommended)

The esbuild config supports a `--vault` flag that outputs directly to an Obsidian vault's plugin folder:

```bash
# Build once and output to a vault
npx esbuild.config.mjs --vault "/path/to/your/vault"
```

With Hot Reload (community plugin) installed in the vault, changes auto-reload after rebuild.

#### Option 2: Manual copy

```bash
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to `<vault>/.obsidian/plugins/gtd-workflow/`.

#### Option 3: Watch mode with WSL/Windows vault

If you use WSL with a Windows vault, the bundled `dev-watch.sh` polls source changes, rebuilds, and triggers Hot Reload:

```bash
./dev-watch.sh
```

Adjust the `VAULT` path in the script to match your setup.

### Verify Your Setup

```bash
# Build should pass
npm run build

# Lint should pass
npm run lint

# All tests should pass
npm test
```

## Project Structure

```
obsidian-gtd/
├── src/
│   ├── main.ts                # Plugin entry point, lifecycle management
│   ├── settings.ts            # Settings interface, defaults, settings tab
│   ├── commands/              # Command registrations
│   │   ├── index.ts           # Command registration hub
│   │   ├── task-commands.ts   # Task editing commands
│   │   ├── timer-commands.ts  # Timer and Pomodoro commands
│   │   └── view-commands.ts   # View toggle commands
│   ├── models/                # Data models
│   │   └── task.ts            # Task type definitions
│   ├── utils/                 # Utility functions
│   │   ├── parser.ts          # Task line parsing / serialization
│   │   ├── date-utils.ts      # Date formatting and computations
│   │   ├── clock-parser.ts    # CLOCK record parsing
│   │   ├── timer.ts           # Task timer logic
│   │   ├── pomodoro.ts        # Pomodoro timer logic
│   │   ├── file-ops.ts        # File system operations
│   │   ├── file-cache.ts      # File caching layer
│   │   ├── i18n.ts            # Internationalization
│   │   ├── editor-ext.ts      # CodeMirror editor extensions
│   │   ├── editor-utils.ts    # Editor helper functions
│   │   ├── morning-reminder.ts# Morning sunlight reminder
│   │   └── view-utils.ts      # View utility functions
│   ├── views/                 # Obsidian views and modals
│   │   ├── agenda-view.ts     # Agenda sidebar view
│   │   ├── agenda-ui.ts       # Agenda UI components
│   │   ├── agenda-types.ts    # Agenda-specific types
│   │   ├── timeline-view.ts   # Timeline sidebar view
│   │   ├── stats-view.ts      # Time statistics view
│   │   ├── capture-modal.ts   # Quick capture modal
│   │   └── date-picker-modal.ts# Date picker modal
│   └── __tests__/             # Test files
│       ├── helpers/           # Test helpers and mocks
│       ├── setup.test.ts      # Test environment setup
│       ├── utils/             # Utility tests
│       └── views/             # View tests
├── main.js                    # Bundled output (built, not committed)
├── manifest.json              # Plugin manifest
├── styles.css                 # Plugin styles
├── esbuild.config.mjs         # Build configuration
├── vitest.config.ts           # Test configuration
├── eslint.config.mjs          # ESLint configuration
├── tsconfig.json              # TypeScript configuration
└── tsconfig.build.json        # TypeScript build configuration (excludes tests)
```

## Coding Standards

### TypeScript

- **Strict mode** is enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2021
- Module system: ESNext (bundled by esbuild to CJS)
- Use `const` by default, `let` only when reassignment is needed
- Avoid `any` — prefer `unknown` with proper type narrowing
- Non-null assertions (`!`) are discouraged; use optional chaining or type guards instead
- Prefix unused variables with underscore (`_unusedVar`)

### ESLint

The project has two ESLint configurations:

1. **Source code** (`src/**/*.ts` excluding tests): Strict type-checked rules via `typescript-eslint` plus Obsidian plugin rules
2. **Test files** (`src/__tests__/**/*.ts`): Relaxed rules (mocks and test helpers are inherently type-unsafe)

Run linting before committing:

```bash
npm run lint
```

Some rules are set to `warn` for gradual cleanup — new code should avoid triggering warnings.

### Formatting

- **Indentation**: Tabs (width: 4)
- **Encoding**: UTF-8
- **Line endings**: LF
- **Final newline**: Always present
- **Quotes**: Single quotes for strings
- An `.editorconfig` file is provided — ensure your editor supports it

### Module Organization

- **`main.ts` is minimal**: It handles plugin lifecycle (`onload`, `onunload`, `loadSettings`) and delegates everything else to modules
- **One responsibility per file**: If a file exceeds ~200–300 lines, consider splitting
- **Clear module boundaries**: Each module exports a focused, well-documented interface
- **Imports**: Use relative paths within `src/` (e.g., `../../utils/parser`)

### Naming Conventions

- **Variables and functions**: `camelCase`
- **Classes and types**: `PascalCase`
- **Files**: `kebab-case` (e.g., `date-utils.ts`, `agenda-view.ts`)
- **Test files**: `<module>.test.ts` co-located under `src/__tests__/` mirroring the source structure

## Commit Convention

This project uses **semantic commit messages** following the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short description>
```

or for scoped commits:

```
<type>(<scope>): <short description>
```

### Types

| Type     | Usage                                          |
|----------|------------------------------------------------|
| `feat`   | A new feature                                  |
| `fix`    | A bug fix                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`   | Performance improvement                        |
| `test`   | Adding or updating tests                       |
| `docs`   | Documentation changes                          |
| `chore`  | Build process, dependencies, tooling           |
| `style`  | Formatting, missing semicolons (not CSS)       |
| `ci`     | CI/CD configuration changes                    |

### Examples

```
feat: add quick capture hotkey
fix(parser): handle empty SCHEDULED lines
refactor: extract task formatting to standalone module
test: add parser edge case tests
docs: update README with new command table
chore(deps): bump esbuild to 0.25
```

### Commitiquette

- Keep the subject line under **72 characters**
- Use **imperative mood** ("add", not "added" or "adds")
- Don't end the subject line with a period
- Reference issues/tickets in the body when applicable

## Pull Request Workflow

### Step-by-Step

1. **Fork** the repository on GitHub
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. **Make your changes** following the coding standards
4. **Commit** using the [commit convention](#commit-convention):
   ```bash
   git commit -m "feat: add my new feature"
   ```
5. **Run checks** locally:
   ```bash
   npm run build
   npm run lint
   npm test
   ```
6. **Push** to your fork:
   ```bash
   git push origin feat/my-feature
   ```
7. **Open a Pull Request** against the `main` branch
   - Use a descriptive title following the commit convention
   - Include a clear description of what the PR does and why
   - Reference any related issues or tickets (e.g., `Closes #123`)

### Before Merging

- All CI checks must pass (build, lint, test on three Node.js versions)
- At least one maintainer review is required
- The branch must be up to date with `main`

### After Merging

- Delete the feature branch from your fork
- Celebrate your contribution 🎉

## Testing

### Test Framework

We use **Vitest** with V8 coverage.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (useful during development)
npm run test:watch

# Run a specific test file
npx vitest run src/__tests__/utils/parser.test.ts

# Run tests with coverage report
npm test -- --coverage
```

### Writing Tests

- **New features must include tests**. Bug fixes should include a test that reproduces the bug before the fix.
- Test files are in `src/__tests__/`, mirroring the source structure under `src/`.
- Pure utility functions should have **unit tests** with no mocking needed.
- View tests may require **mocks** for Obsidian APIs (see `src/__tests__/helpers/obsidian-mock.ts`).
- Follow existing test patterns — each test file has a block comment describing what it tests, and tests are grouped with `describe` blocks.
- Use `vitest` matchers (`expect`, `toBe`, `toEqual`, `toMatchSnapshot`).

### Coverage

- Coverage is collected in CI and uploaded to [Codecov](https://codecov.io/gh/tiancaijb/obsidian-gtd).
- Run locally with `npm test -- --coverage` and open `coverage/index.html` in a browser.
- Aim to maintain or improve coverage. New code should be covered.

## Release Process

Releases are automated via GitHub Actions. Maintainers follow these steps:

1. Determine the new version following [SemVer](https://semver.org/)
2. Update `version` in `manifest.json`
3. Update `versions.json` to map the new version to the minimum app version
4. Commit with message `chore(release): bump to <version>`
5. Tag the commit: `git tag <version>` (no leading `v`)
6. Push the tag: `git push origin <version>`
7. The [Release workflow](.github/workflows/release.yml) creates a draft release with `main.js`, `manifest.json`, and `styles.css` attached
8. Publish the draft release on GitHub

---

Thank you for contributing! If you have questions, feel free to open an issue or reach out on Twitter [@tiancaijb666](https://x.com/tiancaijb666).
