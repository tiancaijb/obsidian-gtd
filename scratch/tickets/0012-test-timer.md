# 0012 — Unit tests: timer.ts

## 目标
为 `src/utils/timer.ts` 添加完整的单元测试，使用 fake timers 控制时间。

## 背景
Timer 模块管理任务的计时功能。它依赖 `Date.now()` 和 `window.setInterval`，测试时需要 `vi.useFakeTimers()` 控制时间流逝。

## 任务清单
- [ ] 测试 `startTimer`：开始后状态正确
- [ ] 测试 `pauseTimer` / `resumeTimer`：暂停后经过时间不增长，恢复后继续增长
- [ ] 测试 `stopTimer`：返回正确的经过时间和起止时间
- [ ] 测试同一 task 重复 start/stop
- [ ] 测试 `getElapsed`：运行中和暂停后的值正确
- [ ] 测试 `formatDuration`：各种时长格式
- [ ] 测试 `formatClockLine`：输出格式符合 org-mode 风格
- [ ] 使用 `beforeEach` 重置状态

## 依赖
- #0005（timer 重构后）
- #0008（Vitest 基础）

## 产出标准
- 所有状态转换路径都有测试
- fake timers 正确模拟时间流逝
- 测试通过
- 覆盖率 > 90%
