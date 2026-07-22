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
3. **世界确定性。** `world.js` / `models.js` 的摆放类随机走 `srand()`（SeededRng），不走 `rand()`（Math.random）。分区种子为 `WORLD_SEED ^ hash(zoneId)`（见 `zones.js` / `setZoneSeed`）。
4. **Entity 统一受击。** 所有实体通过 `hitEntity` 入口，死亡挂接 `onDeath` 回调。
5. **文件头注释。** 每个 JS 文件头部有依赖/导出清单。
6. **性能。** 新增粒子/几何体有 `dispose()` 路径。

## 模块地图

| 文件 | 职责 | 导出 |
|------|------|------|
| `core.js` | 基础设施 | BALANCE, SeededRng, srand, makeLabel, scene, camera, renderer |
| `icons.js` | 图标画布工厂 | Icons.canvas, Icons.get |
| `items.js` | 物品与掉落 | QUALITY, ITEMS, LOOT, EQUIP_SLOTS, dropLoot, tryLoot, useItem, sellItem, equipItem |
| `rig.js` | 人形骨架 / Anim | createRigSkeleton, assembleHumanoidRig, updateHumanoidAnim, CLASS_LOOK_META |
| `creatures.js` | 生物族群工厂 | buildQuadruped, buildElemental, buildHumanoidMob, buildFlameSpawn, QUADS, MOB_LOOK |
| `models.js` | 职业 / NPC / Boss / 建筑 | buildPlayer…, buildBoss, buildHut/Tent/Fence/Watchtower |
| `anim.js` | 生物动画挂点 | updateMobAnim, beginDeathRoll, updateBossHammerAnim, updateBossWingAnim |
| `vfx.js` | 战斗表现层 | VFX.spawn, tickVfx, pulseHitFlash, ground_warn / 粒子池 |
| `weather.js` | 天气层（render-only） | setWeather, updateWeather, clearWeather |
| `world.js` | 莫高雷世界 | player, boss, MOBS, QUEST, enterRaid, mobDie, setCorpse, tryInteract, vendor, spiritHealer |
| `combat.js` | 战斗系统 | S, CLASSES, SKILLS, hitEntity, useSkill, gainCopper, getFocusTarget |
| `buffs.js` | Buff / Debuff 条 | applyBuff, tickBuffs, renderBuffHud, clearAllBuffs |
| `companions.js` | AI 队友 / 3 人小队 | PARTY, formParty, recruitCompanion, tickCompanion |
| `threat.js` | 仇恨与职责 | addThreat, getTopThreatActor, meleeHitFromThreat, checkPartyWipe |
| `vfx.js` | 特效注册表 | VFX, fireProjectile, spawnTelegraph, spawnBurst, disposeVfxMesh |
| `talents.js` | 天赋数据层 | TALENTS, spendTalent, getSkillCd, cheatTalent |
| `panels.js` | HUD 面板 | toggleCharPanel, toggleSpellPanel, toggleQuestLog |
| `quests.js` | 任务枢纽 | QUESTS, acceptQuest, turnInQuest, onQuestMobKill, getQuestLogEntries |
| `professions.js` | 采集 / 制作 | MATS, RECIPES, tryGather, tryCraft, buildWorkbench |
| `rares.js` | 稀有 / 世界 Boss | RARES, WORLD_BOSSES, spawnRaresForZone, getRareMapEntries |
| `deeds.js` | 功绩之书 | DEEDS, grantDeed, toggleDeedsPanel, updatePlayerNameplate |
| `map.js` | 小地图 / 世界地图 | updateMinimap, toggleWorldMap, MAP_ZONES |
| `zones.js` | 多场景注册表 | ZONES, registerZone, enterZone, ensureAllZonesBuilt |
| `barrens.js` | 贫瘠之地 | sceneBarrens, BARRENS_QUEST, buildBarrensZone |
| `durotar.js` | 赭岩谷 | sceneDurotar, buildDurotarZone, tryInteractDurotar |
| `raid.js` | 副本系统 | BOSSES, createBoss, bossAI, DUNGEON, DUNGEONS, getDungeon, buildRaidScene, spawnAdd |
| `wailing.js` | 哀嚎洞穴 | sceneWailing, WAILING_DUNGEON, buildWailingZone |
| `ragefire.js` | 怒焰裂谷 | sceneRagefire, RAGEFIRE_DUNGEON, buildRagefireZone |
| `onyxia.js` | 奥妮克希亚巢穴 | sceneOnyxia, ONYXIA_DUNGEON, buildOnyxiaZone |
| `finder.js` | 本地地下城查找器 | toggleDungeonFinderPanel, queueDungeonFinder |
| `save.js` | 存档系统 | saveGame, loadGame, exportSaveCode, importSaveCode |
| `main.js` | 主循环 | tick, clampArena |
| `sfx.js` | 程序化音效 | SFX.init, play, playFoot, playHit, music |

## 命令

- `python3 -m http.server 8080` — 启动本地服务器
- `node test_step01.js` — 运行回归测试

## 开发进度

- 已执行账本：`plan-merged.md`（STEP 0–29 / v4.0 完成）
- **下一阶段单机路线：`plan-v1.md`**（对照 WoC 补齐美术/内容/系统；默认不做联机）

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