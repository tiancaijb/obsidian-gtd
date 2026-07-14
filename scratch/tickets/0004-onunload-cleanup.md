# 0004 — Clean up onunload() and register all timers safely

## 目标
补全 `onunload()` 方法，确保所有定时器、事件监听器在插件卸载时被清理。

## 背景
当前 `onunload()` 方法是空的。`timer.ts` 使用 `window.setInterval` 进行 tick 刷新，`main.ts` 中使用 `window.setTimeout` 做欢迎提醒延迟。这些都不会在插件卸载时自动清理，可能导致内存泄漏和幽灵行为。

Obsidian 提供 `registerInterval()` 方法自动在 `onunload` 时清理。

## 任务清单
- [ ] 将 `timer.ts` 中的 `window.setInterval`/`window.clearInterval` 改为通过回调暴露给插件，由插件调用 `registerInterval`
- [ ] 将 `pomodoro.ts` 中的 `setInterval`（如果有）同样处理
- [ ] 将 `main.ts` 中的 `window.setTimeout`（欢迎提醒）改为 `registerInterval` 或 `registerEvent`
- [ ] 检查所有 `addEventListener` 是否使用 `registerDomEvent`
- [ ] 补全 `onunload()` 方法
- [ ] 确认 `npm run build` 通过

## 依赖
- #0002（模块提取后更清楚哪些需要清理）

## 产出标准
- `onunload()` 非空
- 所有定时器通过 `registerInterval` 注册
- 所有 DOM 事件通过 `registerDomEvent` 注册
- 插件卸载后无残留定时器或事件
