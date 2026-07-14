# 0006 — Refactor pomodoro module for testability

## 目标
将 `pomodoro.ts` 从全局 mutable 状态重构为可测试的模块。

## 背景
与 `timer.ts` 类似，`pomodoro.ts` 使用模块级状态（`pomodoroState`）管理全局 Pomodoro 状态。测试之间会相互污染，且对时间敏感的逻辑无法隔离验证。

## 任务清单
- [ ] 将 `PomodoroState` 状态更新改为不可变模式
- [ ] 添加 `resetPomodoro()` 供测试使用
- [ ] 确保 `setPomodoroCallbacks` 可被多次调用而不泄漏
- [ ] 提取时间依赖（`Date.now`, `setInterval`）使其可被 mock
- [ ] 确认 `npm run build` 通过

## 依赖
- #0004（registerInterval 改造）

## 产出标准
- 状态可通过导出函数重置
- 回调设置幂等、可替换
- 所有现有功能不变
- `npm run build` 无错误
