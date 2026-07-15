# SPEC v2 — obsidian-gtd CI/CD, Documentation & Performance

## Problem Statement

The obsidian-gtd plugin has been successfully refactored (type safety, tests, module boundaries, ESLint compliance). The codebase is now in a healthy state for further investment in three areas:

1. **CI/CD** — The project has minimal CI. No automated dependency updates, no coverage reporting, and no visible quality badges.
2. **Documentation** — The project lacks contributor guidance, a changelog, and architectural documentation that would help new developers onboard.
3. **Performance** — While file caching and debouncing were added, the plugin still eagerly loads all views on startup, re-parses files unnecessarily, and renders all tasks at once.

## Scope

### CI/CD
- Dependabot configuration for automated dependency updates
- Code coverage reporting via Codecov
- CI status badges in README

### Documentation
- CONTRIBUTING.md — contributor guide: dev environment setup, PR workflow, coding standards
- CHANGELOG.md — release history from v0.1.0 to v0.2.1
- docs/architecture.md — module architecture, data flow, extension guide

### Performance
- Lazy loading: register commands/views only when first used
- Parser LRU cache: avoid re-parsing files that haven't changed
- View lazy rendering: render only visible groups or defer future groups

## Implementation Decisions

### Ticket Structure

```
ticket-0026: CI/CD automation
ticket-0027: CONTRIBUTING.md
ticket-0028: CHANGELOG.md
ticket-0029: docs/architecture.md
ticket-0030: lazy loading
ticket-0031: parser LRU cache
ticket-0032: view lazy rendering
```

### Dependency Order
- 0026 is independent
- 0027, 0028, 0029 are independent of each other and of 0026
- 0030, 0031, 0032 are independent of each other but 0031 depends on understanding the parser module (documented in 0029)

## Verification
- `npm run build` — must pass
- `npm run lint` — zero errors
- `npm test` — all 583 tests must still pass
- For performance tickets: benchmark or profile to confirm improvement
