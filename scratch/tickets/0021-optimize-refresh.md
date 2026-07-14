# 0021 — Optimize vault file scanning and view refresh

## 目标
消除三个视图（AgendaView、TimelineView、StatsView）每次刷新都全量扫描 vault 文件的性能开销。

## 背景
三个视图的 `refresh()` 方法都会调用 `this.app.vault.getMarkdownFiles()` 获取所有 markdown 文件，然后逐一 `vault.read()` 读取内容。这在 GTD 文件夹文件多时（几十个文件）会明显卡顿。

此外，timer 每 5 秒触发 `refreshTimerOnly()`（这已经优化了），但 Pomodoro 回调会触发 `this.refresh()` 全量刷新，包括重新扫描 vault。

## 方案

### 1. 文件缓存
在 `AgendaView`、`TimelineView`、`StatsView` 中添加简单的缓存机制：
- 缓存 GTD 文件夹文件列表 + 内容
- 使用 `vault.on('modify', ...)` 监听文件变更，只有变更时才失效缓存
- 缓存失效后下一次 refresh 重新扫描

### 2. 视图防抖
- `refresh()` 调用防抖（300ms），避免短时间内多次触发重复扫描
- 快速连续的用户操作（如快速勾选多个任务）只触发一次刷新

### 3. Pomodoro 刷新优化
- Pomodoro 完成回调 → 触发完整 refresh（需要展示新状态 ✓）
- Pomodoro tick（每秒）→ 只更新 Pomodoro UI，不触发全量刷新

## 任务清单
- [ ] 实现 `FileCache` 类或工具：缓存文件内容 + Vault 变更监听
- [ ] `AgendaView.refresh()` — 使用缓存，添加防抖
- [ ] `TimelineView.refresh()` — 使用缓存
- [ ] `StatsView.refresh()` — 使用缓存
- [ ] `Pomodoro` 回调 → 区分 tick（仅 UI 更新）和 完成（全量刷新）
- [ ] 确认 npm run build + lint + test 通过

## 产出标准
- 视图刷新不再每次调用 `getMarkdownFiles()`（缓存未命中时除外）
- 文件变更后缓存自动失效
- 防抖防止短时间内多次重复刷新
- 测试不变
