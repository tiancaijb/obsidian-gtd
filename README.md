# GTD Workflow Plugin

[English](#english) | [中文](#中文)

A GTD (Get Things Done) workflow plugin using Markdown checkbox syntax with org-mode-style metadata.

---

## English

### Features

- **GTD folder structure** — auto-creates `gtd/` folder with inbox, next actions, waiting, someday/maybe, projects
- **Agenda view** — right sidebar showing tasks grouped by today, this week, this month, future
- **Quick capture** — `Ctrl+Shift+C` to capture ideas to inbox from anywhere
- **Task timer** — start/pause/stop timer, auto-writes CLOCK records
- **Pomodoro timer** — focus/break cycles with automatic CLOCK logging
- **Timeline view** — 24h timeline showing daily CLOCK records
- **Time statistics** — per-task time aggregation with pie chart and CSV export
- **Priorities** — `[#A] [#B] [#C]` inline priorities, `Shift+↑/↓` to cycle
- **Indent** — `Alt+←/→` to promote/demote tasks (with subtasks)
- **Bilingual** — UI and metadata keywords in Chinese and English

## 任务格式 Task Format

```markdown
- [ ] 任务描述  [#A]
  计划: <2026-06-27>
  截止: <2026-06-30>
  CLOCK: [2026-06-27 Sat 09:00]--[2026-06-27 Sat 10:30] => 1:30
```

- 优先级：`[#A]`（高）`[#B]`（中）`[#C]`（低）
- 日期：`计划:`（计划日期）`截止:`（截止日期）
- 计时：`CLOCK: [开始]--[结束] => 时长`

## 快捷键 Commands

| 命令 | 默认快捷键 |
|------|-----------|
| 快速捕获 Quick Capture | `Ctrl+Shift+C` |
| 切换复选框 Toggle checkbox | `Ctrl+Enter` |
| 循环优先级 Cycle priority | `Shift+↑` / `Shift+↓` |
| 缩进调整 Promote/Demote | `Alt+←` / `Alt+→` |
| 插入任务 Insert task | `Ctrl+Shift+Enter` |
| 切换计时 Toggle timer | `Ctrl+Shift+T` |
| 打开 Agenda | |
| 打开时间轴 Timeline | |
| 打开统计 Statistics | |

## 视图 Views

- **Agenda** — 右侧边栏。任务按日期分组，内置快速捕获、计时器、番茄钟
- **Timeline** — 右侧边栏。24h 时间轴，可查看任意一天的 CLOCK 记录
- **Stats** — 右侧边栏。按任务汇总耗时统计，支持 CSV 导出

## 安装 Installation

### 从社区插件安装

在社区插件中搜索 "GTD"（待提交审核后）

### 手动安装

从 [latest release](https://github.com/tiancaijb/obsidian-gtd/releases) 下载 `main.js`、`styles.css`、`manifest.json`，放入 `.obsidian/plugins/obsidian-gtd/`

### 开发者模式

```bash
git clone git@github.com:tiancaijb/obsidian-gtd.git
cd obsidian-gtd
npm install
npm run dev
```

## 许可证 License

MIT
