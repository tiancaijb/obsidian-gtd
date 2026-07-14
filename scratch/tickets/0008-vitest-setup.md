# 0008 — Add Vitest and set up test infrastructure

## 目标
安装 Vitest，创建测试配置文件，添加 `npm test` 脚本，编写 mock Obsidian API 的辅助模块。

## 背景
项目目前没有任何测试框架。需要搭建基础测试设施，让后续每个 ticket 可以增量添加测试。

## 任务清单
- [ ] `npm install -D vitest`
- [ ] 创建 `vitest.config.ts`（使用 esbuild，与项目一致）
- [ ] 在 `package.json` 添加 `"test": "vitest run"` 和 `"test:watch": "vitest"` 脚本
- [ ] 创建 `src/__tests__/helpers/obsidian-mock.ts` — 提供 `ItemView`、`WorkspaceLeaf`、`Notice`、`TFile`、`Vault` 的最小 mock
- [ ] 验证 `npm test` 可运行（即使没有测试文件也会通过）
- [ ] 在 `eslint.config.mjs` 添加 `vitest` 环境（如适用）

## 依赖
- #0001（ESLint config）

## 产出标准
- `npm test` 成功退出（零测试也通过）
- `npm run build` 不受影响
- mock 模块覆盖 views 测试所需的最小 Obsidian API 子集
