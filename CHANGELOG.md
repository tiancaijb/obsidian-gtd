# Changelog

All notable changes to the GTD Workflow plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI/CD automation: Dependabot configuration, Codecov reporting, and CI status badges
- CONTRIBUTING.md with contributor guide: dev environment setup, PR workflow, coding standards
- Twitter follow badge to READMEs

### Changed
- Updated afdian sponsor image

### Chore
- Ignore scratch/.last_error
- Add batch 2 ticket structures (CI/CD, docs, and performance)

## [0.2.1] - 2026-07-15

### Changed
- Version bump to 0.2.1

## [0.2.0] - 2026-07-15

### Added
- Vitest test framework with 583+ tests across all modules
- Comprehensive unit tests for: parser, date-utils, timer, pomodoro, clock-parser, i18n, views
- Module extraction: commands split from main.ts into dedicated module
- Error handling improvements with structured error types
- New utility modules: editor-utils, file-cache, file-ops, morning-reminder, view-utils
- Agenda view split: extracted agenda-types.ts and agenda-ui.ts for better separation
- Performance optimization: refresh cycle improvements

### Changed
- Timer and Pomodoro complete refactor with cleaner interfaces
- Type safety improvements: non-null assertions fixed, strict operand types applied
- Deprecated imports cleaned and replaced with current Obsidian API equivalents
- Module boundaries established: all source code organized into structured directories

### Fixed
- Warning cleanup: non-null assertions, restrict-plus-operands, deprecated imports
- Review fixes across all modules

### Chore
- Release preparation artifacts

## [0.1.6] - 2026-07-11

### Fixed
- Replace innerHTML with safer DOM manipulation methods
- Remove unused variable in stats-view
- Bump minAppVersion from 1.7.2 to 1.13.0

### Removed
- Inaccurate hotkey references from README

## [0.1.5] - 2026-07-11

### Added
- REPEAT task type for recurring tasks
- Morning reminder notification
- Bilingual settings support (English/Chinese)
- Onboarding: welcome modal and quick start guide in settings
- Afdian sponsor link for donations

### Changed
- Rewrote README to trilingual format (English/中文/日本語)

### Fixed
- Remove erroneous Theme/Appearance section from plugin settings

## [0.1.4] - 2026-06-27

### Fixed
- Remove Theme/Appearance section from settings

### Chore
- Version bump to 0.1.4

## [0.1.3] - 2026-06-27

### Fixed
- All ESLint warnings resolved: floating promises, misused promises, unnecessary assertions, unused variables, display suppress patterns
- Remove eslint-disable directives, fix remaining floating promises
- Fix remaining misused promises and void leaks
- Remove unused variables in stats-view

### Chore
- Sync package.json version to match manifest.json

## [0.1.2] - 2026-06-27

### Chore
- Version bump to 0.1.2

## [0.1.1] - 2026-06-27

### Added
- Theme system with configurable color schemes
- CSV file export for task data
- Internationalization (i18n) for pomodoro labels
- Agenda view navigation bar for quick switching between timeline and stats
- Stats view period filtering (today / week / month)
- Pie chart visualization in stats view replacing bar charts
- Brighter colors for pie chart and timeline blocks

### Changed
- Plugin ID from `obsidian-gtd` to `gtd-workflow` (breaking change for existing installs)
- Author name from `wangy` to `tiancaijb`
- Rewrote README to bilingual format (English/中文)
- minAppVersion lowered from 1.0.0 to 1.7.0

### Fixed
- Review fixes: manifest metadata, settings headings, inline styles, README English
- All review warnings: no hotkeys, clean imports, empty blocks, window.setTimeout, CodeMirror dependencies
- All ESLint errors: sentence case, floating promises, inline styles, any types, unused variables
- ESLint 0 errors after config tuning and template literal fixes
- Final review fixes: remaining inline styles, remove type, unnecessary assertions

## [0.1.0] - 2026-06-27

### Added
- Initial release of GTD Workflow plugin for Obsidian
- TODO/DONE task states with keyboard shortcuts
- Priority markers (A/B/C) for task prioritization
- Scheduled date (`SCHEDULED:`) and deadline date (`DEADLINE:`) support
- Agenda view showing tasks grouped by date
- Quick capture modal for rapid task entry
- Timeline view for visual task scheduling
- Stats view with completion tracking
- Settings tab with configurable options
- English documentation

[Unreleased]: https://github.com/tiancaijb/obsidian-gtd/compare/0.2.1...HEAD
[0.2.1]: https://github.com/tiancaijb/obsidian-gtd/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.6...0.2.0
[0.1.6]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.5...0.1.6
[0.1.5]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.4...0.1.5
[0.1.4]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.3...0.1.4
[0.1.3]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/tiancaijb/obsidian-gtd/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/tiancaijb/obsidian-gtd/releases/tag/0.1.0
