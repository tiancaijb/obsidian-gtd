# 0013 — Unit tests: pomodoro.ts

## 目标
为 `src/utils/pomodoro.ts` 添加完整的单元测试，使用 fake timers 控制时间。

## 背景
Pomodoro 模块管理番茄钟状态机：idle → focus → shortBreak/longBreak → focus 循环。状态转换和计时准确性需要 fake timers 验证。

## 任务清单
- [ ] 测试 `startPomodoro`：进入 focus 状态，设置目标时间
- [ ] 测试 `pausePomodoro` / `resumePomodoro`：暂停时剩余时间不变，恢复后继续倒计时
- [ ] 测试 `stopPomodoro`：回到 idle 状态
- [ ] 测试 focus 完成后自动进入 shortBreak / longBreak 循环
- [ ] 测试完成 N 个 focus 后进入 longBreak
- [ ] 测试 callback 在完成时被调用
- [ ] 使用 `beforeEach` 重置状态
- [ ] 测试 `getPomodoroState` 返回正确的 phase 和剩余时间

## 依赖
- #0006（pomodoro 重构后）
- #0008（Vitest 基础）

## 产出标准
- 状态机所有转换路径都有测试
- fake timers 正确模拟倒计时
- 测试通过
- 覆盖率 > 90%
