# 0016 — Clean unused imports and deprecated API usage

## 目标
消除 8 个 warning：5 个 unused imports + 3 个 deprecated `display` 方法。

## 背景
- `src/utils/view-utils.ts`: `TIMELINE_VIEW_TYPE` 和 `STATS_VIEW_TYPE` 导入但未使用
- `src/settings.ts`: `display` 方法自 Obsidian 1.13.0 起弃用，需改用 `getSettingDefinitions`
- `src/__tests__/utils/pomodoro.test.ts`: `setPomodoroTimeProvider` 导入未使用
- `src/__tests__/views/capture-modal.test.ts` 和 `date-picker-modal.test.ts`: `beforeEach` 导入未使用

## 任务清单
- [ ] 移除 `view-utils.ts` 中未使用的 `TIMELINE_VIEW_TYPE` 和 `STATS_VIEW_TYPE` 导入
- [ ] 将 `settings.ts` 中 `GtdSettingTab.display()` 改为 `getSettingDefinitions()`（Obsidian 1.13.0+ 新 API）
- [ ] 移除测试文件中未使用的 import
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- 0 个 unused-vars warning
- 0 个 no-deprecated warning
- build + lint + test 通过
