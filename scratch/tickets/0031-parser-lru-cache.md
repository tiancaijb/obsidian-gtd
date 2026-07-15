# 0031 — Parser LRU Cache

## 目标
为任务解析模块添加 LRU 缓存，避免同一文件在短时间内重复读取时反复解析。

## 背景
`parser.ts` 中的 `parseTaskLines()` 目前每次调用都完整解析文件内容。在以下场景中会出现重复解析：
- 用户在编辑器中修改文件 → vault.on('modify') 触发 → 视图刷新 → 重新解析
- 多个视图在同一事件循环中刷新 → 各视图各自解析同一文件
- 用户快速切换文件 → 重新解析已被解析过的内容

## 方案
- 实现一个简单的 LRU 缓存（max size = 50 条目）
- 缓存 key = 文件路径，value = 解析结果（ParsedTask[]）
- 文件修改时失效对应缓存条目
- 可选：使用 `lru-cache` npm 包，或手写简易实现（Map + 双向链表）

## 任务清单
- [ ] 在 `src/utils/parser.ts` 或新建 `src/utils/parser-cache.ts` 中实现 LRU 缓存
- [ ] 集成到 `parseTaskLines()` 或包裹一层缓存函数
- [ ] 在 `vault.on('modify', ...)` 回调中失效对应缓存
- [ ] 确认 `npm run build + lint + test` 通过

## 产出标准
- 同一文件在未修改时重复解析命中缓存，不执行实际解析逻辑
- 文件修改后缓存自动失效
- 缓存有大小上限，不会无限增长
- 所有现有测试通过
