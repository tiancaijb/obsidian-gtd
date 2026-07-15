# 0026 — CI/CD Automation

## 目标
为项目配置 Dependabot 自动依赖更新、代码覆盖率报告，以及在 README 中添加 CI 状态徽标。

## 背景
项目已有 `lint.yml`（build + lint + test）和 `release.yml`（GitHub Release），但缺少：
- 自动依赖更新（Dependabot）
- 测试覆盖率可视化
- README 中的质量状态标识

## 任务清单
- [x] 创建 `.github/dependabot.yml`
  - 每周一检查 npm 依赖更新
  - 最多 10 个 open PR
- [x] 在 `lint.yml` 中添加 coverage 步骤
  - `npx vitest --coverage` 生成覆盖率报告
  - 使用 `codecov/codecov-action@v5` 上传
  - 安装 `@vitest/coverage-v8` 作为 devDependency
- [x] 在 README.md 顶部添加徽标行
  - GitHub Actions (build) badge
  - Codecov badge
  - 格式参考 shields.io 标准 badge URL
- [x] 确认 `npm run build + lint + test` 通过

## 产出标准
- `.github/dependabot.yml` 存在且配置正确
- `lint.yml` 中 coverage 步骤正常运行
- README.md 顶部显示 build + coverage badge
- Codecov 收到覆盖率报告
