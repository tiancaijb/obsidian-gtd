# GTD Workflow

> An Obsidian plugin that brings org-mode style GTD workflow to your vault — TODO/DONE states, priorities, scheduled/deadline dates, agenda view, quick capture, task timer, Pomodoro, timeline, and time statistics.

[中文](./README.zh-CN.md) · [日本語](./README.ja.md)

[![爱发电赞助](afdian-sponsor.jpg)](https://afdian.com/a/xx7ax)

---

## What Is This?

GTD Workflow adds a complete Get Things Done system to Obsidian using Markdown checkbox syntax with org-mode-style metadata. Tasks are written in plain Markdown files, fully editable and portable.

Inspired by Emacs org-mode — designed for Obsidian.

## Features

- **📁 GTD Folder Structure** — Auto-creates `gtd/` with inbox, next actions, waiting, someday/maybe, and projects.
- **📋 Agenda View** — Right sidebar showing tasks grouped by today, this week, this month, and future.
- **⚡ Quick Capture** — Capture ideas to inbox from anywhere in Obsidian.
- **⏱ Task Timer** — Start/pause/stop per-task timer. Auto-writes CLOCK records to the task.
- **🍅 Pomodoro Timer** — Focus/break cycles with automatic CLOCK logging. Configurable duration and break length.
- **📈 Timeline View** — 24h timeline showing daily CLOCK records. Browse any date.
- **📊 Time Statistics** — Per-task time aggregation with pie chart visualization and CSV export.
- **🔄 Repeat Tasks** — Tasks with `REPEAT: +Nd` auto-shift to next date when marked done.
- **☀️ Morning Reminder** — Reminds you to step outside your door in the morning (configurable, disabled by default).

  > The habit is just "walk out the door" — no sunglasses, no 5 minutes, no pressure.
  > Lowest possible barrier to start your morning sunlight exposure.
  > [📺 Huberman Lab: Master Your Sleep](https://www.youtube.com/watch?v=nm1TxQj9IsQ)
- **🔤 Priorities** — `[#A] [#B] [#C]` inline priorities.
- **↔️ Indent** — Promote/demote tasks with subtasks.
- **🌐 Bilingual** — UI and metadata keywords in Chinese and English.

## Task Format

```markdown
- [ ] Task description  [#A]
  SCHEDULED: <2026-06-27>
  DEADLINE: <2026-06-30>
  CLOCK: [2026-06-27 Sat 09:00]--[2026-06-27 Sat 10:30] => 1:30
```

- Priority: `[#A]` (high) `[#B]` (medium) `[#C]` (low)
- Dates: `SCHEDULED:` (scheduled date) `DEADLINE:` (deadline)
- Time: `CLOCK: [start]--[end] => duration`

## Commands

| Command | Default Key |
|---------|-------------|
| Quick Capture | — |
| Toggle checkbox | — |
| Cycle priority | — |
| Promote/Demote | — |
| Insert task | — |
| Toggle timer | — |
| Open Agenda | — |
| Open Timeline | — |
| Open Statistics | — |

## Views

- **Agenda** — Right sidebar. Tasks grouped by date, with inline quick capture, timer, and Pomodoro.
- **Timeline** — Right sidebar. 24h timeline visualization. Browse any day's CLOCK records.
- **Stats** — Right sidebar. Per-task time aggregation with pie chart. CSV export supported.

## Installation

### From Obsidian Community Store
Search **GTD Workflow** in Community Plugins (pending review).

### Manual
Download `main.js`, `styles.css`, `manifest.json` from the [latest release](https://github.com/tiancaijb/obsidian-gtd/releases) and copy to `.obsidian/plugins/obsidian-gtd/`.

### Developer Mode
```bash
git clone git@github.com:tiancaijb/obsidian-gtd.git
cd obsidian-gtd
npm install
npm run dev
```

## Architecture

The plugin's data model follows org-mode conventions:

- **Tasks** are Markdown list items with checkbox `[ ]` / `[x]`
- **Metadata** (`[#A]`, `SCHEDULED:`, `DEADLINE:`, `CLOCK:`) is inline in the list item body
- **Views** parse the task files on the fly — no separate database
- **Folder structure** (`gtd/`) mirrors the GTD methodology: inbox → process → organize → review

## Why This Plugin?

I use Emacs org-mode for my personal GTD system (see [my workflow](https://tiancaijb-site.vercel.app/zh/notes/my-workflow)). This plugin brings the same task model to Obsidian users — checkboxes, priorities, scheduled dates, CLOCK records — without requiring Emacs.

## Sponsor

If this plugin helps you, consider supporting my work ❤️

[![爱发电赞助](afdian-sponsor.jpg)](https://afdian.com/a/xx7ax)

## License

MIT
