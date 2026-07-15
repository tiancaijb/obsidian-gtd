# 0028 — CHANGELOG.md

## 目标
从 git log 整理发布历史，维护 CHANGELOG.md。

## 背景
项目从 v0.1.0 发展到 v0.2.1，经历多次重构和功能迭代，但没有 changelog。用户和开发者无法直观了解每个版本的变化。

## 任务清单
- [x] 从 git log 提取各版本变更
  - 从 tag 和 `version-bump.mjs` 提交识别版本节点
  - 按语义化版本格式组织
  - 每个版本包含：Added / Changed / Fixed / Removed 分类
- [x] 创建 `CHANGELOG.md`
  - 格式参考 [Keep a Changelog](https://keepachangelog.com/)
  - 版本列表从 v0.1.0 到 v0.2.1
  - 未发布版本标为 `[Unreleased]`
- [x] 确认格式规范

## 产出标准
- `CHANGELOG.md` 存在
- 包含从 v0.1.0 到 v0.2.1 的所有版本
- 每个版本的变更分类清晰
