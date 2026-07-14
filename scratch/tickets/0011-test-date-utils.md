# 0011 — Unit tests: date-utils.ts

## 目标
为 `src/utils/date-utils.ts` 添加完整的单元测试。

## 背景
日期工具函数决定了 task 分组（Today / This Week / This Month / Future）的准确性。边界情况（月末/年末、周起始日设置、月份起始日设置）需要重点验证。

## 任务清单
- [ ] 测试 `formatDate`、`parseDate`、`todayStr`
- [ ] 测试 `computeNextDate`：
  - +1d、+7d、+1w、+2w、+1m、+3m
  - 跨月边界（1月31日 +1m）
  - 跨年边界
- [ ] 测试 `compareDates`
- [ ] 测试 `isToday`、`isWithinDays`、`isBeyond`
- [ ] 测试 `getWeekStart`：不同 weekStartDay 设置
- [ ] 测试 `isThisWeek`：周中日期、跨周日、周一 vs 周日起始
- [ ] 测试 `getMonthPeriodStart`、`isThisMonth`：不同 monthStartDay、跨月

## 依赖
- #0008（Vitest 基础）

## 产出标准
- 每个函数的主要路径和边界情况都有测试
- 测试通过
- 覆盖率 > 90%
