# 0001 — Fix ESLint configuration

## 目标
让 `npm run lint` 通过，启用严格的 ESLint 规则集。

## 背景
项目有两个 ESLint 配置文件（`eslint.config.mjs` + `eslint.config.mts`），但 `eslint.config.mjs` 似乎未正确配置，导致 lint 运行时找不到配置。当前 lint 报 2 个错误（`prefer-const`）。

## 任务清单
- [ ] 检查 `eslint.config.mjs` 和 `eslint.config.mts` 内容，确定哪个是生效的
- [ ] 合并或清理配置文件，只保留一个
- [ ] 启用 `typescript-eslint` strict 规则
- [ ] 添加 `eslint-plugin-vitest`（如果可用）
- [ ] 确认 `npm run lint` 零错误

## 产出标准
- `npm run lint` 输出零错误、零警告
- 配置使用 flat config 格式
- 规则集包含 `@typescript-eslint/strict` 或等价级别
