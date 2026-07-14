# 0002 — Module extraction from main.ts

## 目标
将 `main.ts`（~450 行）拆分为职责单一的模块，核心生命周期逻辑留在入口文件。

## 背景
当前 `main.ts` 处理了所有事情：命令注册、视图注册、计时器回调、番茄钟回调、文件操作、晨间提醒。按 AGENTS.md 约定，`main.ts` 应只处理插件生命周期（onload/onunload）和命令注册，业务逻辑委托到独立模块。

## 任务清单
- [ ] 提取 `checkMorningReminder()` 到 `src/utils/morning-reminder.ts`
- [ ] 提取 `appendClockLog()` 到 `src/utils/file-ops.ts`
- [ ] 提取视图激活/切换逻辑（`toggleAgendaView`, `activateAgendaView`）到 `src/utils/view-utils.ts`
- [ ] 将 Pomodoro 和 Timer 的回调设置移出 `onload()` 的内联代码
- [ ] `main.ts` 瘦身到 150 行以内
- [ ] 确认 `npm run build` 通过

## 依赖
- #0001（ESLint config — 先修好 lint 再动结构）

## 产出标准
- `main.ts` 只负责生命周期和命令注册
- 每个提取的模块有清晰的单一职责
- `npm run build` 无错误
- 功能行为不变
