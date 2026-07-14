# 0020 — Split main.ts commands into functional modules

## 目标
将 `onload()` 中注册的 17 个 addCommand 按功能拆到独立文件，使 main.ts 缩减到 ≤200 行。

## 背景
当前 main.ts 约 516 行。onload() 包含 17 个 addCommand 调用 + 3 个 registerView + 定时器/Pomodoro 设置代码。命令注册占 ~300 行。

## 方案
创建 `src/commands/` 目录，按功能拆分为：

```
src/commands/
├── task-commands.ts    ← 与任务编辑有关的命令（toggle, priority, scheduled, deadline, promote, demote, insert）
├── timer-commands.ts   ← 与计时/番茄钟有关的命令（toggle-timer, pomodoro-start, pomodoro-stop）
├── view-commands.ts    ← 与视图打开有关的命令（open-agenda, refresh-agenda, stats, timeline）
└── index.ts            ← 统一注册函数 registerCommands(plugin)
```

### 导出接口
每个 commands 文件导出一个函数：
```ts
export function registerTaskCommands(plugin: OrgGtdPlugin): void;
export function registerTimerCommands(plugin: OrgGtdPlugin): void;
export function registerViewCommands(plugin: OrgGtdPlugin): void;
```

`commands/index.ts` 导出：
```ts
export function registerCommands(plugin: OrgGtdPlugin): void {
  registerTaskCommands(plugin);
  registerTimerCommands(plugin);
  registerViewCommands(plugin);
}
```

`onload()` 中调用：
```ts
registerCommands(this);
```

### 遗留问题
- `modifyCurrentLine` / `adjustIndent` 编辑器方法留在 main.ts（task-commands 需要它们），或提取到 `src/utils/editor-utils.ts`
- `timerAPI` 对象留在 onload()，或提取到 timer-commands.ts

## 任务清单
- [ ] 创建 `src/commands/task-commands.ts`（8 个命令）
- [ ] 创建 `src/commands/timer-commands.ts`（3 个命令）
- [ ] 创建 `src/commands/view-commands.ts`（4 个命令）
- [ ] 创建 `src/commands/index.ts`（registerCommands）
- [ ] `main.ts` onload() → 只保留 lifecycle + registerCommands + registerView + 定时器配置
- [ ] 提取 modifyCurrentLine + adjustIndent 到 `src/utils/editor-utils.ts`（目标是让 task-commands 能不依赖 main.ts 类方法）
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- main.ts ≤ 200 行
- src/commands/ 下 4 个文件
- 所有命令功能不变
- build + lint + test 通过
