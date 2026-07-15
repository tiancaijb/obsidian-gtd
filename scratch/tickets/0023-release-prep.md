# 0023 — Prepare for 0.2.0 release

## 目标
完成发布 Obsidian 社区商店前的准备工作：版本号更新、CI 加测试、manifest 补全。

## 背景
项目经过 22 个 ticket 的重构，代码质量大幅提升。准备发布 0.2.0。

## 任务清单
- [ ] **版本号 bump**：manifest.json + package.json 从 `0.1.6` → `0.2.0`
- [ ] **versions.json**：修复残留条目（删除 `"1.0.0": "1.0.0"`），添加 `"0.2.0": "1.13.0"`
- [ ] **manifest.json 补全**：设置 `authorUrl: "https://github.com/tiancaijb"`，`fundingUrl: "https://afdian.com/a/xx7ax"`
- [ ] **CI 加测试**：`.github/workflows/lint.yml` 添加 `npm test` 步骤
- [ ] **测试在 Node 环境兼容**：pomodoro 测试依赖 `window`，确保在 GitHub Actions 的 Node 环境中能跑（或加 `--environment jsdom`）
- [ ] 确认 `npm run build + lint + test` 全部通过

## 产出标准
- 三个文件版本号一致（manifest.json / package.json / git tag）
- versions.json 干净无残留
- CI 跑 build + lint + test 全部绿色
- 作者信息完整
