# 0005 — Refactor timer module for testability

## 目标
将 `timer.ts` 从全局 mutable 状态重构为可测试的模块。

## 背景
当前 `timer.ts` 使用模块级变量（`currentTimer`, `intervalId`, `tickCallback`）管理全局状态。这使得：
- 测试之间状态污染（需要 `vi.resetModules()`）
- 无法注入 mock 依赖
- `window` 全局硬编码

## 任务清单
- [ ] 将 `TimerState` 接口改为不可变更新模式（每次操作返回新状态）
- [ ] 将 `startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer` 改为接收外部 `Date.now` 等依赖（或暴露给测试通过 `vi.setSystemTime` 控制时间）
- [ ] 状态重置方法 `resetTimer()` 供测试使用
- [ ] 移除全局 `intervalId` — 由调用方（main.ts）控制 interval 生命周期
- [ ] 提取 `formatDuration`（与 clock-parser.ts 重复）— 或保留且统一行为
- [ ] 确认 `npm run build` 通过

## 依赖
- #0004（registerInterval 改造）

## 产出标准
- `timer.ts` 不再硬编码 `window.setInterval`
- 状态可通过导出函数重置
- 所有现有功能不变
- `npm run build` 无错误
