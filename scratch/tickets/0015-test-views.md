# 0015 — Integration tests: views (agenda, timeline, stats, modals)

## 目标
为视图模块添加集成测试，使用 mock Obsidian API。

## 背景
视图模块（AgendaView、TimelineView、StatsView、CaptureModal、DatePickerModal）依赖 Obsidian API（`ItemView`、`WorkspaceLeaf`、`Notice`、`Vault` 等）。需要通过 mock 来验证它们的核心逻辑：任务分组、排序、渲染、捕获、日期选择。

## 任务清单
- [ ] 测试 `AgendaView.scanVault()`：
  - 正确读取 GTD 文件夹下的文件
  - 跳过非 GTD 文件夹的文件
  - 正确解析任务行并组装为 TaskEntry
- [ ] 测试 `AgendaView.groupTasks()`：任务按 Today / This Week / This Month / Future / No Date 分组
- [ ] 测试 `AgendaView` 排序：按优先级 A > B > C > none
- [ ] 测试 `CaptureModal` 捕获流程
- [ ] 测试 `DatePickerModal` 日期选择流程
- [ ] 测试 `TimelineView` 时间轴渲染准备
- [ ] 测试 `StatsView` 统计数据计算
- [ ] 测试 `updateSettings` 传播到子视图

## 依赖
- #0008（Vitest 基础 + obsidian mock 模块）

## 产出标准
- 每个视图的核心逻辑有测试覆盖
- mock 最小化（只 mock 实际使用的 API）
- 测试通过
