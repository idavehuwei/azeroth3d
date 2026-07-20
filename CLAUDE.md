# Azeroth3D · 项目 CLAUDE.md

> 项目信息与 AI 协作约束。保持简洁，严格项目范围。

---

## 项目概览

**熔火之心**（Azeroth3D）—— 经典风格 3D 网页游戏，所有资源程序化生成。

- 技术栈：Three.js r128（CDN）· 纯 JavaScript（ES6）· Canvas 2D · DOM + CSS
- 无外部美术资源，无构建工具
- 单页应用，打开 `game.html` 即可游玩

## 硬性约束（必须遵守）

1. **零美术资源。** 不提交 .png/.glb/.mp3 文件。所有模型/图标/特效由代码生成。
2. **数值外置。** 所有游戏数值写在 `BALANCE` 表（`core.js`），不散落在逻辑代码中。
3. **世界确定性。** `world.js` / `models.js` 的摆放类随机走 `srand()`（SeededRng），不走 `rand()`（Math.random）。种子固定（`WORLD_SEED`）。
4. **Entity 统一受击。** 所有实体通过 `hitEntity` 入口，死亡挂接 `onDeath` 回调。
5. **文件头注释。** 每个 JS 文件头部有依赖/导出清单。
6. **性能。** 新增粒子/几何体有 `dispose()` 路径。

## 模块地图

| 文件 | 职责 | 导出 |
|------|------|------|
| `core.js` | 基础设施 | BALANCE, SeededRng, srand, makeLabel, scene, camera, renderer |
| `icons.js` | 图标画布工厂 | Icons.canvas, Icons.get |
| `items.js` | 物品与掉落 | QUALITY, ITEMS, LOOT, dropLoot, tryLoot |
| `models.js` | 3D 模型工厂 | buildPlayer, buildMage, buildArcher, buildBoss, buildBoar, buildFlameSpawn, buildElder |
| `world.js` | 莫高雷世界 | player, boss, MOBS, QUEST, enterRaid, mobDie, setCorpse, tryInteract |
| `combat.js` | 战斗系统 | S, CLASSES, SKILLS, hitEntity, bossAI, useSkill, addDie |
| `main.js` | 主循环 | tick, clampArena |

## 命令

- `python3 -m http.server 8080` — 启动本地服务器
- `node test_step01.js` — 运行回归测试

## 开发进度

详见 `plan-merged.md` 的 13 个 STEP 可执行计划。

## 协作流程

详见 `AGENTS.md` 的 6 个 AI 角色协作体系。

## 文档

- `README.md` — 项目介绍与快速开始
- `AGENTS.md` — AI 协作角色定义
- `plan-merged.md` — 逐步执行计划
- `DESIGN.md` — 设计语言与视觉规范
- `CONTRIBUTING.md` — 贡献指南
- `DEPLOY.md` — 部署指南
- `CREDITS.md` — 资源致谢
- `SECURITY.md` — 安全策略
- `CODE_OF_CONDUCT.md` — 行为准则