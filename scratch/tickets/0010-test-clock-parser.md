# 0010 — Unit tests: clock-parser.ts

## 目标
为 `src/utils/clock-parser.ts` 添加完整的单元测试。

## 背景
CLOCK 记录解析负责将 org-mode 风格的时间记录解析为结构化数据，供 Timeline 和 Stats 视图使用。格式解析错误会导致时间统计不准。

## 任务清单
- [ ] 测试 `parseClockLine`：
  - 标准 CLOCK 记录
  - 中文 `计时:` 关键字
  - 无效格式返回 null
  - 跨日记录（start 和 end 在不同日期）
  - 零时长记录
- [ ] 测试 `extractClockRecords`：从多行中提取所有记录
- [ ] 测试 `filterByDate`：日期过滤正确
- [ ] 测试 `totalMinutes`：合计计算正确
- [ ] 测试 `formatDuration`：
  - 0分钟、1分钟、59分钟、60分钟、61分钟、多小时

## 依赖
- #0008（Vitest 基础）

## 产出标准
- 每个函数的主要路径和边界情况都有测试
- 测试通过
- 覆盖率 > 90%
