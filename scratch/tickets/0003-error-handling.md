# 0003 — Fix error handling: replace empty catch blocks

## 目标
消除所有 `catch (_e) { void _e; }` 模式，用有意义的错误处理替代。

## 背景
代码中多处使用空 catch 静默吞掉异常，包括文件读写操作、数据解析等。这会掩盖真正的错误，让调试变得困难。需要区分场景：
- 文件操作失败 → 通知用户
- 非关键路径失败 → console.warn 记录
- 预期内可能失败（如文件不存在） → 明确检查前置条件

## 任务清单
- [ ] 搜索所有 `catch (_e)` 模式（约 8 处）
- [ ] 对每个 catch 判断场景：
  - 文件操作（read/write/create/apppend）→ `new Notice()` 通知用户
  - 非关键路径 → `console.warn` 保留上下文
  - 可避免的 → 添加前置检查代替 try/catch
- [ ] 确认 `npm run build` 通过

## 产出标准
- 零处 `catch (_e) { void _e; }`
- 每处 catch 有上下文日志或用户通知
- `npm run build` 无错误
