# 0029 — Architecture Documentation

## 目标
编写架构文档 `docs/architecture.md`，记录模块结构、数据流和扩展指南。

## 背景
项目经过重构后模块边界清晰，但缺少文档记录整体架构。新 contributor 需要花时间阅读源码才能理解模块关系和扩展方式。

## 任务清单
- [ ] 创建 `docs/` 目录
- [ ] 编写 `docs/architecture.md`
  - 目录结构总览（src/ 下每个模块的职责）
  - 核心数据模型（ParsedTask, ClockRecord, PomodoroState）
  - 数据流（文件解析 → 视图渲染 → 用户交互 → 文件写入）
  - 模块依赖图（用 ASCII 或 Mermaid 图）
  - 关键 seam/接口（TimerAPI、view 构造函数依赖注入）
  - 扩展指南（如何添加新视图、新命令、新解析规则）
  - 测试策略（纯函数直接测、全局状态用 fake timers、视图 mock obsidian）
- [ ] 确认格式规范，用英文书写

## 产出标准
- `docs/architecture.md` 存在且内容完整
- 包含模块依赖图
- 包含扩展指南（至少 1 个扩展示例）
- 与现有代码结构一致
