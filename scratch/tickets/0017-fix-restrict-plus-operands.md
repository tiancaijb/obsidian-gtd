# 0017 — Fix restrict-plus-operands warnings

## 目标
消除 22 个 `restrict-plus-operands` warning：stats-view.ts（18 处）+ timeline-view.ts（4 处）+ main.ts（1 处）。

## 背景
这些 warning 来自模板字符串或字符串拼接中 `number + string` 或 `string + number` 操作。TypeScript strict 规则要求操作数类型必须一致。

典型的修复方式：
- `elapsedMinutes + 'm'` → `String(elapsedMinutes) + 'm'` 或 `\`${elapsedMinutes}m\``
- `totalMin % 60 + 'm'` → `String(totalMin % 60) + 'm'`

## 任务清单
- [ ] `src/views/stats-view.ts` — 18 处：用 `String()` 包裹数值或改用模板字符串
- [ ] `src/views/timeline-view.ts` — 4 处：同上
- [ ] `src/main.ts` — 1 处：`'gtd-theme-' + this.settings.theme`
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- 0 个 restrict-plus-operands warning
- build + lint + test 通过
