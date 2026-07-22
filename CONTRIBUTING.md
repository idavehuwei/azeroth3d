# 贡献指南

感谢你来到 Azeroth3D 项目！每一份贡献，无论大小，都让这个项目变得更好。

## 贡献方式

这里每个人都有适合自己的位置：

- **代码。** 修复 bug、添加功能、或改进性能。请先阅读 [`plan-v4.md`](plan-v4.md) 了解当前进度，以及 [`AGENTS.md`](AGENTS.md) 了解我们的协作流程。
- **Bug 报告和功能建议。** 提交 Issue，清晰的 bug 报告本身就是一份贡献。
- **文档。** README、设计文档、注释都可以改进。
- **测试和反馈。** 玩一玩游戏，告诉我们哪里感觉不对。

## 开始之前

### 项目原则

- **资源 = 工厂函数 + 数据参数。** 所有美术/音频产物由代码生成，不提交 .png/.glb/.mp3 文件。
- **数值外置。** 所有游戏数值写在 `BALANCE` 表（`core.js`），改平衡不碰逻辑代码。
- **确定性世界。** 世界摆放类随机走 `SeededRng`（`srand()`），种子固定，世界位置不变。
- **Entity 统一受击。** 所有实体通过 `hitEntity` 统一入口，死亡挂接 `onDeath` 回调。

详见 [`CLAUDE.md`](CLAUDE.md) 的完整约束清单。

### 开发环境

```bash
# 只需要一个本地 HTTP 服务器（因为 Three.js 从 CDN 加载）
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/game.html
```

### 测试

```bash
node test_step01.js
```

每个 STEP 完成后，运行回归测试确认行为不变。

## 提交变更

### 分支命名

- 功能分支：`feature/<short-slug>`
- 修复分支：`fix/<short-slug>`

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat(combat): 技能冷却显示优化
fix(world): 传送门碰撞检测修正
docs: 更新 README 操作说明
```

### 提交流程

1. 确保你的代码遵循项目风格（2 空格缩进，`"use strict"`）
2. 运行测试确保绿色
3. 更新 `plan-v4.md` 的进度表（如果完成了一个 STEP）
4. 提交 PR

## 代码风格

- 2 空格缩进，`"use strict"` 模式
- 每个文件头部有依赖/导出注释清单
- 遵循现有代码的习惯，不引入新框架
- 注释写「为什么」，不写「是什么」

## 行为准则

请阅读并遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。