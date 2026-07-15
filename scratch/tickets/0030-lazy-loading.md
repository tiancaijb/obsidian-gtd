# 0030 — Lazy Loading for Views and Commands

## 目标
优化 `onload()` 启动性能：只在用户首次打开视图或触发命令时才注册对应的模块，而不是在插件加载时全部初始化。

## 背景
当前 `main.ts` 的 `onload()` 中同时注册了所有命令（Quick Capture、Toggle Timer、Open Agenda 等）和所有视图（AgendaView、TimelineView、StatsView）。如果用户只用其中一部分功能，仍然加载了全部代码。通过动态 import 或延迟注册，可以减少插件启动耗时。

## 方案
- 命令注册：在 `onload()` 中只注册命令 ID 和名称，回调使用懒加载函数
- 视图注册：用 `registerView()` 注册类型，但视图的实际构造延迟到 `activateView()` 调用时
- 使用 `await import()` 动态加载视图模块（如果 esbuild 配置支持 code splitting）

注意：Obsidian 插件的 esbuild 配置通常打包成单文件 `main.js`，不支持 code splitting。因此"懒加载"在本项目中是指：
- 将命令回调逻辑从 `onload()` 内联改为按需执行
- 视图的 Obsidian API 调用（`activateView`、`registerView`）不变，但视图内部的重资源操作延迟到视图打开后

## 任务清单
- [ ] 检查 esbuild 配置是否支持 code splitting（预期不支持）
- [ ] 命令回调懒加载：将命令回调提取为独立函数，`onload()` 中只绑定命令名称和 ID
- [ ] 重资源操作延迟：视图打开（`onOpen()`）后按需加载，而不是在构造函数中全部初始化
- [ ] 确认 `npm run build + lint + test` 通过

## 产出标准
- `main.ts` 的 `onload()` 不包含任何重资源初始化
- 插件启动后未使用的视图/命令不执行对应逻辑
- 功能行为不变
