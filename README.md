# GTD Plugin for Obsidian

一个基于 GTD 工作流的 Obsidian 插件，使用 Markdown 复选框语法配合 org-mode 风格元数据。

A GTD workflow plugin for Obsidian, using Markdown checkbox syntax with org-mode-style metadata.

---

## 功能 Features

- **GTD 文件夹体系** — 自动创建 `gtd/` 文件夹，含收集箱、下一步行动、等待中、将来也许、项目
- **Agenda 视图** — 右侧边栏，按今天/本周/本月/未来分组显示任务
- **快速捕获** — `Ctrl+Shift+C` 随时随地捕获想法到收件箱
- **任务计时** — 开始/暂停/停止计时，自动写入 CLOCK 记录
- **番茄钟** — 内置番茄钟，专注/休息循环，完成自动记录
- **时间轴** — 24h 时间轴视图，展示每日 CLOCK 记录
- **耗时统计** — 按任务汇总耗时，含柱状图，支持 CSV 导出
- **优先级** — `[#A] [#B] [#C]` 行内优先级，`Shift+↑/↓` 循环切换
- **缩进调整** — `Alt+←/→` 调整任务缩进（含子任务）
- **中英文切换** — 界面和元数据关键字全支持中英文

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
