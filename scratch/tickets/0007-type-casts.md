# 0007 — Clean up type casts in main.ts

## 目标
消除 `main.ts` 中所有 `as unknown as AgendaView` / `as unknown as TimelineView` / `as unknown as StatsView` 类型强制转换。

## 背景
代码中多处使用 `(leaves[0]!.view as unknown as AgendaView)` 的方式获取视图实例。这不安全且在 strict 模式下应避免。替代方案：定义公共 View 接口或通过 `ItemView.getViewType()` 做类型收窄。

## 任务清单
- [ ] 在 `agenda-view.ts` 导出 `AgendaView` 的公共接口（已经有 `TimerAPI` — 扩展它或新增 `ViewAPI`）
- [ ] 在 `timeline-view.ts` 导出 `TimelineView` 的公共接口
- [ ] 在 `stats-view.ts` 导出 `StatsView` 的公共接口
- [ ] 将 `main.ts` 中 `as unknown as` 替换为 instanceof 检查或视图类型守卫
- [ ] 确认 `npm run build` 通过

## 依赖
- #0002（模块提取后更容易处理）

## 产出标准
- 零处 `as unknown as <ViewType>`
- 视图访问通过类型守卫或接口转换
- `npm run build` 无错误
