# 0019 — Fix no-non-null-assertion in main.ts and utils

## 目标
消除 main.ts（12 处）、settings.ts（2 处）、clock-parser.ts（5 处）、parser.ts（5 处）、morning-reminder.ts（8 处）、date-utils.ts（1 处）、view-utils.ts（1 处）中总计 34 个 no-non-null-assertion warning。

## 背景
同 ticket 0018，这些 `!` 断言分布在核心逻辑模块中，需要在保证行为不变的前提下用类型安全的写法替代。

## 任务清单
- [ ] `src/main.ts` — 12 处
- [ ] `src/settings.ts` — 2 处
- [ ] `src/utils/clock-parser.ts` — 5 处（`m[2]!` 等 regex 匹配结果）
- [ ] `src/utils/parser.ts` — 5 处
- [ ] `src/utils/morning-reminder.ts` — 8 处
- [ ] `src/utils/date-utils.ts` — 1 处
- [ ] `src/utils/view-utils.ts` — 1 处
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- 非测试文件 0 个 no-non-null-assertion warning
- build + lint + test 通过
