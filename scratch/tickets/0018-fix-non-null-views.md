# 0018 — Fix no-non-null-assertion in views

## 目标
消除 agenda-view.ts（16 处）、stats-view.ts（3 处）、timeline-view.ts（5 处）中总计 24 个 `no-non-null-assertion` warning。

## 背景
非空断言（`!` 操作符）在视图代码中大量使用，主要用于访问：
- `this.app.workspace.getLeavesOfType()` 返回数组的 `[0]!` 元素
- `lines[i]!` 等数组元素访问
- 方法链中的中间值保证非空

修复策略（按推荐优先级）：
1. **类型守卫**：`if (x !== null && x !== undefined)` 收窄类型
2. **可选链 + 空值合并**：`x?.prop ?? defaultValue`
3. **提前 return**：`if (!x) return;` 在函数顶部
4. **类型注解**：显式声明非空类型而非用 `!` 断言

## 任务清单
- [ ] `src/views/agenda-view.ts` — 16 处
- [ ] `src/views/stats-view.ts` — 3 处
- [ ] `src/views/timeline-view.ts` — 5 处
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- views 目录下 0 个 no-non-null-assertion warning
- build + lint + test 通过
