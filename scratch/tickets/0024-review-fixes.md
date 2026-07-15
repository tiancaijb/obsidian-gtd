# 0024 — Fix Obsidian community review issues

## 目标
修复 Obsidian 社区插件审查报告中的 5 个 issues（不含 release description，那个手动填）。

## 问题清单

### 1. eslint-plugin-vitest 替换
**文件**: `package.json:26`
**问题**: "eslint-plugin-vitest" should be replaced with an alternative package
**修复**: 检查是否有官方推荐的替代品，或用 ESLint 内置规则替代

### 2. 未处理的 Promise（3 处）
- `src/settings.ts:113` — `this.plugin.saveSettings()` 未 await/void
- `src/views/agenda-ui.ts:204` — 未处理的 promise
- `src/views/agenda-ui.ts:210` — 未处理的 promise
**修复**: 加上 `void` 前缀或 `await`

### 3. 非 window.setTimeout / clearTimeout（2 处）
- `src/views/agenda-view.ts:74` — `clearTimeout()` 应为 `window.clearTimeout()`
- `src/views/agenda-view.ts:77` — `setTimeout()` 应为 `window.setTimeout()`
**修复**: 加上 `window.` 前缀

## 任务清单
- [ ] 修复 `eslint-plugin-vitest` 警告
- [ ] 修复 3 处未处理 Promise（加 `void` 或 `await`）
- [ ] 修复 2 处 `setTimeout`/`clearTimeout`（加 `window.`）
- [ ] 手动补 release description（不在代码中修复）
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- 审查报告中所有 Warning 清零
- Release 手动添加 release notes
