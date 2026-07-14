# 0022 — Split agenda-view.ts

## 目标
将 479 行的 `src/views/agenda-view.ts` 拆分为职责单一的模块。

## 背景
`agenda-view.ts` 是插件中最大的文件（479 行），负责：
1. AgendaView 类（ItemView 子类）
2. TimerAPI 接口定义（与其他视图共享，可能已提取）
3. 任务分组逻辑
4. 任务项渲染
5. 捕获栏构建
6. 导航栏构建
7. Pomodoro UI 构建
8. 计时器 UI 构建

## 方案
```
src/views/agenda-view.ts          ← AgendaView 主类，组装配件
src/views/agenda-renderer.ts      ← 渲染逻辑（renderGroups, buildCaptureBar, buildNavBar 等）
src/views/agenda-task-grouper.ts  ← 任务分组与排序逻辑
```

或更保守的方案（先拆渲染）：
```
src/views/agenda-view.ts          ← AgendaView 主类 + 生命周期 + refresh
src/views/agenda-ui.ts            ← 所有 UI 构建方法（capture bar, nav bar, task list, pomodoro UI）
```

## 任务清单
- [ ] 拆分渲染相关方法到 `agenda-ui.ts` 或 `agenda-renderer.ts`
- [ ] 确保 AgendaView 构造函数的公共接口不变
- [ ] `npm run build + lint + test` 通过

## 产出标准
- `agenda-view.ts` ≤ 200 行
- 拆分后的模块职责清晰
- 功能不变
