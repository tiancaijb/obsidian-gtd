# GTD Workflow

> 一款 Obsidian GTD 工作流插件——用 Markdown 复选框 + org-mode 风格元数据实现完整 GTD 系统：TODO/DONE 状态、优先级、计划/截止日期、Agenda 视图、快速捕获、任务计时、番茄钟、时间轴、统计图表。

[English](./README.md) · [日本語](./README.ja.md)

---

## 这是什么？

GTD Workflow 用 Markdown 复选框语法 + org-mode 风格的元数据，在 Obsidian 里实现了完整的 GTD 系统。任务写在纯文本 Markdown 文件里，完全可编辑、可移植。

灵感来自 Emacs org-mode，专为 Obsidian 设计。

## 功能特性

- **📁 GTD 文件夹结构** — 自动创建 `gtd/` 目录：inbox、next actions、waiting、someday/maybe、projects。
- **📋 Agenda 视图** — 右侧边栏，任务按今日/本周/本月/未来分组。
- **⚡ 快速捕获** — `Ctrl+Shift+C` 从 Obsidian 任何地方捕获想法到 inbox。
- **⏱ 任务计时** — 每个任务独立计时器，自动写入 CLOCK 记录。
- **🍅 番茄钟** — 专注/休息循环，自动记录 CLOCK。可配置时长。
- **📈 时间轴** — 24h 时间轴，查看任意一天的 CLOCK 记录。
- **📊 统计** — 按任务汇总耗时，饼图可视化，支持 CSV 导出。
- **🔤 优先级** — `[#A] [#B] [#C]` 行内优先级，`Shift+↑/↓` 循环切换。
- **↔️ 缩进调整** — `Alt+←/→` 升级/降级任务（含子任务）。
- **🌐 双语** — UI 和元数据关键字支持中文和英文。

## 任务格式

```markdown
- [ ] 任务描述  [#A]
  计划: <2026-06-27>
  截止: <2026-06-30>
  CLOCK: [2026-06-27 Sat 09:00]--[2026-06-27 Sat 10:30] => 1:30
```

- 优先级：`[#A]`（高）`[#B]`（中）`[#C]`（低）
- 日期：`计划:`（计划日期）`截止:`（截止日期）
- 计时：`CLOCK: [开始]--[结束] => 时长`

## 快捷键

| 命令 | 默认快捷键 |
|------|-----------|
| 快速捕获 Quick Capture | `Ctrl+Shift+C` |
| 切换复选框 Toggle checkbox | `Ctrl+Enter` |
| 循环优先级 Cycle priority | `Shift+↑` / `Shift+↓` |
| 缩进调整 Promote/Demote | `Alt+←` / `Alt+→` |
| 插入任务 Insert task | `Ctrl+Shift+Enter` |
| 切换计时 Toggle timer | `Ctrl+Shift+T` |
| 打开 Agenda | — |
| 打开时间轴 Timeline | — |
| 打开统计 Statistics | — |

## 视图

- **Agenda** — 右侧边栏。任务按日期分组，内置快速捕获、计时器、番茄钟。
- **Timeline** — 右侧边栏。24h 时间轴，可查看任意一天的 CLOCK 记录。
- **Stats** — 右侧边栏。按任务汇总耗时统计，饼图可视化，支持 CSV 导出。

## 安装

### 从社区插件安装
搜索 **GTD Workflow**（待提交审核）。

### 手动安装
从 [latest release](https://github.com/tiancaijb/obsidian-gtd/releases) 下载 `main.js`、`styles.css`、`manifest.json`，放入 `.obsidian/plugins/obsidian-gtd/`。

### 开发者模式
```bash
git clone git@github.com:tiancaijb/obsidian-gtd.git
cd obsidian-gtd
npm install
npm run dev
```

## 架构

数据模型遵循 org-mode 惯例：

- **任务** 是 Markdown 列表项，带 `[ ]` / `[x]` 复选框
- **元数据**（`[#A]`、`计划:`、`截止:`、`CLOCK:`）写在列表项正文内
- **视图** 实时解析任务文件——无独立数据库
- **文件夹结构**（`gtd/`）遵循 GTD 方法论：收集 → 处理 → 组织 → 回顾

## 为什么做这个插件

我用 Emacs org-mode 做个人 GTD 系统（见 [我的工作流](https://tiancaijb-site.vercel.app/zh/notes/my-workflow)）。这个插件把同样的任务模型带给了 Obsidian 用户——复选框、优先级、计划日期、CLOCK 记录——不需要 Emacs。

## 赞助

如果这个插件对你有帮助，可以考虑赞助我 ❤️

[![爱发电赞助](afdian-sponsor.jpg)](https://afdian.com/a/xx7ax)

## License

MIT
