# 0027 — CONTRIBUTING.md

## 目标
编写贡献指南，方便社区开发者参与项目。

## 背景
项目目前只有 README，缺少贡献指南。潜在的贡献者不知道如何搭建开发环境、PR 流程和代码规范。

## 任务清单
- [x] 创建 `CONTRIBUTING.md`
  - 开发环境搭建（Node.js 版本、npm install、dev vault 配置）
  - 项目结构概览
  - 代码规范（TypeScript strict、ESLint、Vitest 测试）
  - PR 工作流（fork → branch → commit → PR → review → merge）
  - Commit message 规范（语义化）
  - 测试要求（新功能必须有测试）
- [x] 确认格式规范，用英文书写

## 产出标准
- ✅ `CONTRIBUTING.md` 存在且内容完整
- ✅ 文档清晰、步骤可执行
- ✅ 与现有的 README 风格一致

## 实现验证（2026-07-16）

| 检查项 | 状态 |
|--------|------|
| `CONTRIBUTING.md` 存在 | ✅ 373 行，内容完整 |
| 开发环境搭建 | ✅ 涵盖 Node.js 版本、3 种 dev vault 方案 |
| 项目结构概览 | ✅ 完整目录树+说明 |
| 代码规范 | ✅ TypeScript strict、ESLint 双配置、Vitest |
| PR 工作流 | ✅ fork → branch → commit → PR → review → merge |
| Commit 规范 | ✅ Conventional Commits 表+示例 |
| 测试要求 | ✅ 明确要求新功能包含测试 |
| 英文书写 | ✅ 全文英语 |
| 与 README 风格一致 | ✅ 相同 tone、格式 |
| `npm run lint` | ✅ 零错误 |
| `npm test` | ✅ 583 测试全部通过 |
