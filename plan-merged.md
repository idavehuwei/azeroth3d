# 熔火之心 · 逐步执行计划（含程序化资源管线设计）

**STEP-BY-STEP PLAN + ASSETS DESIGN — 参考 WORLD OF CLAUDECRAFT**

> 基线 v1.3.5（五模块）· 目标：按可验证小步走完 **v1.4 → v5.0**（WoW 经典背景：莫高雷 → 卡利姆多扩张 → 团队副本 → 真联机）· 参考仓库 [levy-street/world-of-claudecraft](https://github.com/levy-street/world-of-claudecraft)（代码 MIT / 少量资源 CC0）· **借架构不借世界观**：内容命名与叙事走艾泽拉斯经典路线

---

## 〇 · 为什么参考 WoC，借什么（三条核心经验）

WoC 与本项目同源：Three.js + 程序化几何体 + 零外部资源的经典 MMO。它已经做完了我们 roadmap 上的全部内容（掉落、背包、天赋、多副本、存档、AI 队友、真联机），其架构经验可以直接映射到我们的小体量上：

| WoC 的做法 | 映射到本项目 |
| --- | --- |
| **One sim, three hosts**：`src/sim/` 零 DOM / Three.js 依赖，同一份核心跑离线浏览器、联机服务器、RL 环境 | 轻量版：先把「数值与规则」从渲染代码中剥离（`BALANCE` 表 + `Entity` 统一受击），不追求完全分层，但每一步都朝这个方向走——这也是将来做联机 / AI 队友的唯一通路 |
| **Content as data**：九职业、技能、Boss、任务全是数据表，加内容不改引擎代码 | 把技能伤害、Boss 技能循环、掉落表、天赋定义全部做成数据（我们的 `CLASSES` 表已经是雏形），后续「加一个 Boss = 加一条配置」 |
| **每步可验证**：Vitest 单测 + puppeteer 冒烟脚本，五个 AI 机器人能自动打通副本 | 每一步都定义「验收标准」，并逐步建一个极简 `debug.js`（控制台断言 + 作弊指令），让每次改动 30 秒内可回归 |

另外三条可直接抄的小经验：**尸体拾取**（先杀怪出尸体、按 F 拾取，比「走近自动吸」更有手感）；**程序化 WebAudio**（WoC 全部音效运行时生成，验证了零音频资源可行）；**天气昼夜只做渲染层**（render-only，不碰逻辑——我们的昼夜循环照此办理，永不影响数值）。

---

## 一 · 资源来源解析与程序化管线（地图 · 怪物 · 玩家 · 法术 · 音效）

### 1.1 直接回答：WoC 是第三方资源吗？——不是，95% 是代码生成

> **结论：WoC 几乎不使用第三方美术资源。** 世界本体（地形、城镇、怪物、角色、法术图标、音效、天气）全部在运行时由代码生成——官方 README 明确写着「no 3D model files for the world」「almost nothing is a shipped asset」。仓库 `public/` 中确有**极少量**第三方静态文件（HDRI 天空、水面法线贴图、字体、少量 GLB），全部为 **CC0 公有领域**或 MIT 许可（逐包记录在其 CREDITS.md），仅做氛围补充，不构成任何游戏内容。**这与我们 `models.js` 的路线完全一致**——不需要转向，只需要把这条路线体系化。

| 资源类别 | WoC 的做法 | 来源 |
| --- | --- | --- |
| 地形 / 三张地图 | 固定种子（写死在 `src/main.ts`）+ 确定性 `Rng` 程序生成，每次进入完全相同 | ✅ 代码生成 |
| 城镇建筑 | 木桁架房屋等程序化几何体 | ✅ 代码生成 |
| 怪物 | 12 个「生物族群」骨骼模板，含走/攻/施法/坐/死全套动画，同族换参数出新怪 | ✅ 代码生成 |
| 玩家角色 | 同一套程序化人形骨架，按职业换武器与配色 | ✅ 代码生成 |
| 法术 / 物品 / Buff 图标 | 运行时用 Canvas 2D「画」出来 | ✅ 代码生成 |
| 法术特效 VFX | 程序化粒子与几何特效 | ✅ 代码生成 |
| 音效 / 音乐 | WebAudio 程序合成，93+ 条运行时生成，配套 SFX Studio 编辑器 | ✅ 代码生成 |
| 天气 / 昼夜 | 生物群系驱动、仅渲染层（render-only），不进逻辑 | ✅ 代码生成 |
| UI / HUD | 零框架，纯 DOM + CSS | ✅ 代码生成 |
| 天空 HDRI、水面法线、字体 | 少量静态文件放 `public/`，逐包记录许可 | ⚠️ 第三方 CC0 / MIT |

### 1.2 逐类拆解与我们的方案

**① 地图与地形**

> **WoC**：三个地区不是建模出来的，而是「世界种子 + 确定性随机数 `Rng`」长出来的：地形起伏、树木岩石摆放、野怪营地位置全由种子推导。种子固定 ⇒ 世界永远一样，服务器与客户端可各自生成同一个世界（联机零地图传输）。sim 内禁用 `Math.random` / `Date.now`。

> **我们**：`world.js` 目前用 `Math.random` 撒树与岩石，每次刷新世界都不同。方案：引入 20 行的**可播种随机器** `SeededRng(seed)`（mulberry32），所有摆放类随机改走它。收益：①世界固定，玩家能记住"狼在东北那棵歪树旁"；②复现 bug 可靠；③为 v3.0 联机与多地图打地基。战斗掉落等"玩法随机"暂留 `Math.random`，与渲染随机分流。→ **并入 STEP 0**

**② 怪物：族群模板，不是逐只建模**

> **WoC**：12 个「生物族群」（四足兽、人形、飞虫、亡灵……），每族一套**程序化骨架 + 全套动画**；狼、野猪、熊同属四足族群，只换体型、配色、部件开关。加新怪 = 一条数据，不写渲染代码。

> **我们**：把野猪函数泛化为**族群工厂**：
>
> ```js
> buildQuadruped({ size, bodyColor, tusks: true, tail: 'short', mane: false })  // 野猪/狼/陆行鸟共用
> buildHumanoidMob({ size, skin, weapon: 'staff', wings: true })                // 女妖/小恶魔共用
> ```
>
> 动画共用：四足的走路摆腿、受击后仰、死亡侧倒各写一次，全族群受益。届时加陆行鸟只是一行配置：`{family:'quad', size:1.2, color:0xd8b060, neck:'long'}`。→ **并入 STEP 5**

**③ 玩家角色**

> **WoC**：九职业共用同一套程序化人形骨架，差异只在武器、配色与施法动作；换装备时真的换手上的武器组。

> **我们**：三职业 `build*` 骨架代码三份重复。方案：抽 `buildHumanoid(config)` 基座（躯干/四肢/头 + 动画挂点），职业差异收敛为配置 `{weapon:'greatsword', armor:'plate', palette:[...]}`。解锁：①STEP 4 换装（`userData.weapon` 标 + 换武器组）；②v3.0 牧师 = 一条新配置，而非第四份骨架代码。→ **并入 STEP 4**

**④ 法术：图标画出来，特效程序化**

> **WoC**：所有法术/物品/Buff 图标运行时 Canvas 2D 绘制（渐变底 + 程序笔触）；特效是程序化粒子与几何体。零图片文件。

> **我们**：新建 `js/icons.js`：
>
> ```js
> Icons.get('fireball')  // 返回 dataURL：64×64 canvas，径向渐变火橙底 + 贝塞尔火舌 + 描边
> Icons.get('heal')      // 绿底 + 十字光晕；同一支画笔函数库（渐变/光晕/描边/符文）复用
> ```
>
> 技能栏、背包物品（品质边框：白/绿/蓝/橙描边由品质参数决定）、Buff 条共用。特效侧补一个 `VFX` 注册表：`{projectile, impact, aura}` 三类模板 + 参数，供 Boss 工厂按数据引用（Boss 技能表里写 `vfx:'lava_spit'` 即可）。→ **图标并入 STEP 2 之前，VFX 注册表并入 STEP 9**

**⑤ 音效音乐**

> **WoC**：93+ 条音效全部 WebAudio 合成（振荡器 + 噪声 + 包络 + 滤波），按表面材质区分脚步、按族群区分吼叫。

> **我们**：即 STEP 6 的 `sfx.js`，抄它两点：①**音色数据化**——每条音效是一组参数 `{wave:'sawtooth', freq:[800,200], noise:0.3, attack:0.01, decay:0.25, filter:'lowpass'}`，通用合成函数播放，调音改数据不改代码；②**族群绑定**——四足族群共用一组吼叫参数，换怪不加音效。→ **并入 STEP 6**

### 1.3 管线总设计与验金石

一个原则：**「资源 = 工厂函数 + 数据参数」**。任何美术/音频产物都由「可复用的工厂」按「一条数据」生成，仓库里永远没有 .png / .glb / .mp3。

```
js/
├─ core.js      BALANCE 数值表 · SeededRng（新增，≈20 行）
├─ icons.js     图标画布工厂：画笔函数库 + 图标配方表           （新增，STEP 2 前）
├─ models.js    几何工厂：buildHumanoid / buildQuadruped 族群基座 + 职业与怪物配方
├─ vfx  (并入 combat.js 或独立)  特效模板×3（弹道/命中/光环）+ 参数表
├─ sfx.js       WebAudio 合成器 + 音色参数表                     （STEP 6）
└─ world.js     地形与摆放全部走 SeededRng；固定世界种子
```

**验金石（达标即管线合格）：**

- 加一种新怪：只在 `MOBS` 数据表加一条族群配方，不改 `models.js` 工厂本体
- 加一个新技能图标：只在 `icons.js` 配方表加一条，不新建画布代码
- 加一个 Boss 技能特效：Boss 数据表写 `vfx:'xxx'` 引用模板，不写新粒子循环
- 刷新页面：世界一草一木位置不变（种子固定）
- 全仓库 0 个图片/模型/音频文件（入口页 CSS 渐变除外）
- （可选，v3.0 后）如需 HDRI 天空 / 水面法线等氛围补充，学 WoC 只用 CC0 并逐个记录许可来源

---

## 二 · 地基（对应 roadmap 第五节重构②④）——先修路，再跑车

### STEP 0 · 参数外置 + SeededRng + 依赖声明 `P1`

- 在 `core.js` 顶部建 `BALANCE` 常量表，把散落在 `combat.js / world.js / main.js` 的数值（技能伤害、野猪血量、Boss 技能伤害与 CD、任务奖励、AoE 伤害）全部搬入。
- **新增 `SeededRng(seed)`（≈20 行，mulberry32）**，`world.js / models.js` 所有摆放类随机改走它，世界种子固定（见 1.2①）。
- 每个 JS 文件头部加「依赖 / 导出」全局清单注释（roadmap 5.5 的短期措施）。
- 顺手把 `makeLabel` 从 `world.js` 挪到 `core.js`（掉落系统会用到）。

> **WoC 对照**：这是「sim 与渲染分离」的第一步——WoC 的所有数值都在 `src/sim/content/`，一切随机走确定性 `Rng`。

> **验收**：全局搜索不再出现魔法数字形式的技能伤害；刷新页面世界一草一木位置不变；游戏行为与改前一致（打一遍野猪 + Boss 各技能确认）。

### STEP 1 · Entity 统一受击 `P1`

- 把 `mobDamage / addDamage / dmgBoss` 三套高度雷同的受击逻辑收敛为一个 `hitEntity(ent, amount, label)`：乘系数 → 扣血 → 飘字 → 日志 → 死亡回调 `ent.onDeath()`。
- 野猪、烈焰之子、Boss 都改造成携带 `{hp, hpMax, onDeath, pos()}` 的统一实体对象；原三个函数保留为薄包装以免大改调用方。

> **WoC 对照**：WoC 单一 `Sim` 内所有生物走同一套战斗结算（命中表、护甲减免），这是它能有 12 个生物族群、5 个副本而不失控的原因。

> **验收**：三类目标受击表现不变；`onDeath` 回调就位——STEP 2 的掉落和 STEP 3 的经验将只在这一处挂接。

---

## 三 · v1.4 成长闭环——打怪 → 掉落 → 拾取 → 变强

### STEP 2 · 图标画布 + 掉落与尸体拾取 `P0`

- **前置：新建 `js/icons.js` 图标画布工厂**（见 1.2④），先做火球/治疗/剑/护甲等 6-8 个配方，品质描边（白/绿/蓝/橙）由参数决定。
- 新建 `js/items.js`：物品定义 `{id, name, icon, quality, slot, stats}` + 按权重的掉落表（普通 70% / 优秀 25% / 稀有 5%）。
- `dropLoot(pos, table)`：发光小方块 + `makeLabel` 悬浮名（品质决定颜色）。
- 借 WoC 的手感：怪物死亡先留**尸体**（模型倒地灰化 8 秒），靠近按 `F` 拾取（复用现有 `tryInteract` 与对话按钮 UI），而非走近自动吸取。
- 挂接点只有一个：STEP 1 的 `onDeath`。拉戈斯必掉「萨弗拉斯之柄」。

> **WoC 对照**：corpse loot 是 WoC 野外体验的骨架；图标全部 canvas 运行时绘制，零图片文件。

> **验收**：杀 10 只野猪，掉落品质分布大致符合 70/25/5；物品有 canvas 图标与品质描边；拾取有金色飘字与日志；拉戈斯掉橙锤。

### STEP 3 · 经验与等级 `P1`

- `S.p` 增加 `{level, xp, xpMax}`；野猪 +80 / 任务 +300 / Boss +2000，同样只挂在 `onDeath` 与任务回调。
- 1→10 级，每级 +5% 基础伤害、+8% 生命上限；数值全部写进 `BALANCE.levels`。
- 升级：全屏金光 `spawnBurst` + 「升级！」`announce`；等级显示在玩家名旁与经验条（复用 `barShell` 样式）。

> **WoC 对照**：WoC 用真实经典 XP 曲线；我们 10 级小曲线即可，但同样放数据表，为 STEP 10 天赋点发放做地基。

> **验收**：从 1 级打到 3 级流程顺畅；升级后面板数值正确增长。

### STEP 4 · 人形基座 + 背包与装备栏 `P0`

- **前置：抽 `buildHumanoid(config)` 人形基座**（见 1.2③），三职业收敛为配置 `{weapon, armor, palette}`，武器组打 `userData.weapon` 标。
- `B` 键开背包（HTML 覆盖层，样式与 `#dlg` 同风格）：16 格 + 武器 / 护甲两个装备位，物品图标来自 `icons.js`。
- 武器加 `dmgMul`、护甲加 `hpMax`；换装时只换武器组（装备萨弗拉斯之柄 → 战士手上真的换成带火焰粒子的巨锤）。

> **WoC 对照**：九职业共用一套程序化人形骨架；vendor/bags UI 全是 HTML 覆盖层 + canvas 图标，验证了「不进 3D 场景做 UI」路线。

> **验收**：拾取 → 背包可见 → 装备 → 模型换武器 + 面板数值变化 → 卸下还原，全链路无报错；三职业外观与重构前一致。

---

## 四 · v1.5 世界的呼吸——让莫高雷活起来

### STEP 5 · 族群工厂 + 野怪 AI 升级 + 三种新怪 `P1`

- **前置：把野猪泛化为 `buildQuadruped(config)` 族群工厂**（见 1.2②），走路/受击/死亡动画写一次全族群共用。
- 给 `MOBS` 状态机补两个 WoC 式行为：**社群仇恨**（social pull：同群 ID 的狼一只被打全群跟进）与**脱战回血回巢**（已有雏形，规范化）。
- 新怪三种（全部只是族群配方 + 数值）：陆行鸟（中立被动反击、移速快）、草原狼（3 只一群、社群仇恨）、鹰身女妖首领（小精英，读条火球——复用 Boss 的 `startCast`，掉优秀装备）。
- 加一只**稀有精英**「老灰鬃野猪王」：长重生计时、金色名字、必掉优秀物品——WoC 的 Old Greyjaw 同款惊喜感。

> **WoC 对照**：wander / proximity aggro / social pulls / chase / leash / respawn / rare spawn 正是 WoC 野外 AI 完整清单；12 族群模板让加新怪 = 一条数据。

> **验收**：加陆行鸟的代码只有一条配置 + 数值；打狼群一只全群上；陆行鸟不主动攻击；稀有怪按长计时刷新。

### STEP 6 · 程序化音效与音乐 `P1`

- 新建 `js/sfx.js`，只暴露 `SFX.play(name)` / `SFX.music(mode)`；**音色数据化**（见 1.2⑤）：每条音效一组合成参数，由通用合成函数播放；族群共用吼叫参数。
- 音色清单：挥剑（噪声+带通）、火球（锯齿扫频）、Boss 低吼（低频方波+失真）、拾取叮声、升级琶音。
- 草原：五声音阶平静循环；副本：低音鼓点。`AudioContext` 在「启程」按钮回调里初始化（自动播放策略）；音乐切换挂 `enterRaid` 过渡。

> **WoC 对照**：WoC 93+ 条音效全部运行时 WebAudio 合成——零音频资源完全够用。

> **验收**：开局无声（未点按钮前）；进本音乐切换；静音开关可用；调整音色只改参数表。

### STEP 7 · 昼夜循环 `P2`

- 10 分钟一昼夜：`sun` 颜色角度、`sceneWorld.background`、雾色随 `S.t` 插值；夜晚篝火 / 传送门光照权重上升，萤火虫粒子出现。
- **铁律（抄 WoC）**：昼夜是 render-only，任何数值、AI、刷新都不读时间——保证以后加存档 / 联机时无需序列化天气。

> **验收**：站营地看完一个完整昼夜无卡顿；夜晚篝火氛围明显；战斗数值与白天完全一致。

---

## 五 · v2.0 深入火焰之地——副本流程化

### STEP 8 · 抽出 raid.js + 副本分段 `P0 前置重构` ✅

- 把 `core.js` 的副本环境搭建与 `combat.js` 的 `bossAI` / 投射物 / 烈焰之子整体迁入 `raid.js`。
- 引入 `DUNGEON.stage` 状态推进：走廊（两组熔岩犬，复用烈焰之子 AI）→ 岩桥下沉 → 拉戈斯平台。
- **超额交付**：拉戈斯第三阶段狂暴（`phase3At` 30% 血量：小怪无限刷新、技能 CD/伤害加压），数值外置 `BALANCE.boss`。

> **WoC 对照**：WoC 的五个副本都是「分段解锁 + 小怪区 + 多 Boss」结构（Hollow Crypt：成对精英 → 小 Boss → 终 Boss）。

> **验收**：纯搬迁后游戏行为不变（回归一遍完整流程）；然后走廊分段生效，不清小怪不开桥。 ← **已通过**（`117d1f5` + `b319e74`）

### STEP 9a · VFX 注册表 `P0` ✅

> **拆分原因**：原 STEP 9 把「特效抽象 + Boss 工厂 + 新 Boss」捆在一起，一次改动面过大。先抽特效，再抽 AI，最后用新 Boss 做验金石。

- 新建 `vfx.js`：三类模板 `{projectile, impact, aura}` + 配方表。
- 现有 `fireProjectile` / `spawnTelegraph` / `spawnBurst` 改为调用 `VFX.spawn(id, ctx)`；Boss 技能字段只写 `vfx:'lava_bolt'` 之类的键。
- 配方起步 6 个：`lava_bolt`、`eruption_ring`、`melee_impact`、`roar_aura`、`heal_cross`、`loot_spark`。
- 参数默认进 `BALANCE.vfx`；动态网格经 `disposeVfxMesh` 回收。

> **WoC 对照**：WoC 特效是程序化粒子/几何体，按技能数据引用，不在每个 Boss 里手写粒子循环。

> **验收**：拉戈斯全技能视觉不变；战斗特效 `new THREE.Points` 实现只在 `vfx.js`。 ← **已通过**

### STEP 9b · `createBoss(config)` 工厂 + 拉戈斯数据化 `P0` ✅

- 抽象 `createBoss(config)`：技能表 `{id, name, cd, cast, range, effect, vfx}`；阶段表 `{hpPct, onEnter}`。
- 把现有拉戈斯三阶段（升起 / 潜地+烈焰之子 / 狂暴）迁成一份 `BOSSES.ragnaros`（叙事名「炎魔领主·拉戈斯」，对应经典熔火之心终 Boss 位）。
- `bossAI(dt)` 变为通用驱动：读当前 Boss 的技能 CD / 阶段阈值，不再 `if (phase===3 && name===...)`。

> **WoC 对照**：`src/sim/content/dungeons.ts` —— 加 Boss = 加数据；Hollow Crypt / Drowned Temple 共用引擎。

> **验收**：行为与 STEP 8 一致（阶段切换、小怪刷新、伤害数值）；`raid.js` 中不再出现写死的「拉戈斯」分支逻辑（喊话文案可留在数据表）。 ← **已通过**

### STEP 9c · 第二 Boss「玛格曼达」`P0` ✅

- 用四足族群配方 + `createBoss` 产出熔火之心一号位：**玛格曼达**（Magmadar）——岩浆猎犬。
- `DUNGEON.stage` 扩展：走廊熔岩犬 → **Boss1 玛格曼达** → 岩桥 → **Boss2 拉戈斯**。
- 技能（全数据）：直线岩浆喷吐 AoE、践踏震荡波、恐惧咆哮（短控）；掉落优秀/稀有犬牙项链。
- **验金石**：本 STEP 的 diff 里不应出现新的粒子循环或 `if (bossId==='magmadar')` 引擎分支。

> **WoC 对照**：content-as-data 验金石——从 1 Boss 扩到多 Boss 而核心不膨胀。

> **验收**：清走廊 → 打玛格曼达 → 岩桥 → 打拉戈斯；新增代码几乎全是 `BOSSES.magmadar` + 模型配方。 ← **已通过**

### STEP 10a · 天赋数据层 `P1` ✅

- 每职业 1 棵 3 层小树（升级得点，满级约 9 点）：  
  - 战士：武器（巨人之力）/ 防护（坚韧）  
  - 法师：火焰（炎爆连击）/ 冰霜（减速）  
  - 猎人（弓箭手）：射击（速射）/ 生存（毒箭）
- 天赋 = 修饰器 `mods[]`（`dmgMul` / `cdMul` / `hpMaxMul` / `addEffect`），挂数据表，**不改技能函数本体**。
- 数值全部进 `BALANCE.talents`；拓扑在 `talents.js` 的 `TALENTS`。
- 验收 API：`cheatTalent.give / spend / fillArms / dump`（控制台）。

> **WoC 对照**：`talents.ts` / `talent_rows.ts` —— 被动修饰器 + 少量主动；可导出 build 字符串（本步先不做导出）。

> **验收**：用 `cheatTalent` 加点后，技能栏 `title` 显示 CD 变化；未加点时与 STEP 9c 行为完全一致。 ← **已通过（数据层）**

### STEP 10b · 天赋 UI（N 键）`P1` ✅

- HTML 覆盖层（风格同 `#dlg` / `#bag`）：树状节点、剩余点数、重置按钮。
- `N` 键 / 底部 ✨ 按钮开关；与背包互斥。
- 升级时 `announce`「获得 1 点天赋！按 N 打开天赋」。
- 图标来自 `icons.js`（节点 `icon` 字段映射配方）。

> **验收**：点满一棵树 → 重置 → 改点另一枝；刷新前内存态正确（持久化交给 STEP 11）。 ← **已通过**

### STEP 11 · 存档系统 `P1` ✅

- `saveGame()` / `loadGame()`：只存纯数据——等级经验、背包装备、`QUEST`、天赋、金币、区域与坐标；**绝不序列化 Three.js 对象**。
- `localStorage` 主存（`BAL.save.key`）；「导出/导入」JSON→Base64（兼容 `file://` / 无痕窗口）。
- 启动页：「继续冒险」+ 「新的旅程」+ 存档码导入/导出。
- 自动存：升级 / 交任务（含接取与野猪击杀进度）/ 装备变更 / 天赋变更 / 击杀 Boss / 离开副本 / 隐藏页签与关闭前。
- 加载时按等级+任务奖励+天赋+装备重建修饰，避免重复叠加。

> **WoC 对照**：角色 JSONB，30s + 登出落盘；「只存数据、加载重建」——将来联机同一份 schema 可上服务器。

> **验收**：升级+装备+任务+天赋 → 刷新 → 继续冒险状态还原；无痕窗口可导入导出码。 ← **已通过**

### STEP 12 · 工程基底（FPS）`P1` ✅

- **FPS**：`#fps`，`Ctrl+F`（Mac：`⌘+F`）切换；目标桌面 60 / 移动 30+（`BAL.fps`）。
- `?dev` 或 `?fps=1` 进入时默认显示。

> **验收**：打开 `game.html?dev` 可见 FPS；`Ctrl+F` 可开关。 ← **已通过**

> **后续**：原 STEP 12 的 `debug.js` / dispose / 移动端阴影等仍待拆步落地（见进度表备注）。

---

## 六 · v2.5 经典系统补全——更像一台「小号 WoW」

> WoC 在三区开放世界之前，已有完整 HUD：角色、法术书、任务日志、小地图、商人、墓地。本阶段把这些经典骨架补齐，**仍单地图（莫高雷）+ 熔火之心**，为多地图做 UI/数据准备。

### STEP 13 · 金币经济 + 营地商人 `P1` ✅

- `S.p.gold`（铜为最小单位，显示金/银/铜）；野怪/任务/Boss/小怪掉铜。
- 营地商人「火蹄」（复用 `#dlg`）：出售硬面饼 / 亚麻绷带；打开时背包右键回购。
- 物品加 `vendorBuy` / `vendorSell`；消耗品左键使用（坐下进食 / 包扎，移动打断）。
- 存档已含金币（STEP 11）。

> **WoC 对照**：Vendor + bags UI 全是 HTML 覆盖层；金币展示经典三段。

> **验收**：杀猪有铜 → 买食物坐下回血 → 卖垃圾装；存档含金币。 ← **已通过**

### STEP 14 · 角色面板 / 法术书 / 任务日志 `P1` ✅

- `C` 角色面板（属性、装备评分摘要）、`P` 法术书（技能说明+天赋修饰后数值）、`L` 任务日志（当前目标追踪）。
- 顶部任务追踪器规范化：显示「野猪 n/3」类进度；与 L 同步。
- 实现于 `panels.js`；键位与背包/天赋互斥。

> **WoC 对照**：经典键位 `C P L M B`；HUD 与 sim 解耦。

> **验收**：三面板可同时理解「我是谁、我会什么、我在做什么」；不打开 3D 场景内 UI。 ← **已通过**

### STEP 15 · 死亡与灵魂医者 `P1` ✅

- 死亡不再 `game over` 锁死：释放灵魂 → 营地灵魂医者旁复活（半血 + 资源重置；装备耐久暂不做）。
- 副本内死亡：走廊入口复活（`wipePolicy: keep_stage` 保留分段、重置当前遭遇）或退出回营地。
- `BALANCE.death`：虚弱 10s、移速 ×0.7；`worldSpawn` / `raidSpawn`。
- 营地 NPC「灵魂医者 · 风语」。

> **WoC 对照**：graveyards + release spirit；失败可恢复，鼓励再战。

> **验收**：野外死亡 → 复活 → 继续任务；副本团灭可重来且进度（走廊已清）按 `DUNGEON.wipePolicy` 保留。 ← **已通过**

### STEP 16 · 小地图 + 简易世界地图 `P2` ✅

- 右上角 Canvas 小地图：玩家、任务 NPC、传送门、稀有精英点。
- `M` 打开世界地图（手绘风程序化：莫高雷轮廓 + 标注）；多区域预留图层接口。
- 实现于 `map.js`（`MAP_ZONES` / `updateMinimap` / `toggleWorldMap`）；`BAL.map`；任务追踪下移避让。

> **WoC 对照**：minimap blips + world map；我们保持程序化，零贴图。

> **验收**：靠小地图能找到传送门与长老；地图开关无泄漏。 ← **已通过**

---

## 七 · v3.0 卡利姆多扩张——走出莫高雷

> **世界观锚点**（经典部落路线，程序化再现，非商业素材）：  
> 莫高雷（1–10）→ **贫瘠之地**（10–18，十字路口枢纽）→ 熔火之心仍为 1 号团队目标；另开 5 人副本 **哀嚎洞穴** / **怒焰裂谷**（择一先做）。  
> **WoC 映射**：Eastbrook Vale / Mirefen / Thornpeak 三区 ≈ 我们的莫高雷 / 贫瘠之地 /（预留）灰谷；五副本 ≈ 我们的熔火 + 5 人本。

### STEP 17 · 多场景注册表 `P0` ✅

- 把 `sceneWorld / sceneRaid` 升为 `ZONES` 注册表：`{id, seed, build(scene), music, levelRange, portals[]}`。
- `enterZone(id, gate)` 统一淡入淡出；传送门数据化。
- 世界种子：`WORLD_SEED ^ hash(zoneId)`，保证每区确定性且互不干扰。
- 实现于 `zones.js`；`enterRaid` / `leaveRaid` 为薄包装；存档含 `zoneId`（兼容旧 `zone`）。

> **WoC 对照**：`zone1.ts` / `zone2.ts` / `zone3.ts` + 固定世界种子；换区不换引擎。

> **验收**：莫高雷 ↔ 熔火之心走注册表；刷新后同区布局不变。 ← **已通过**（`node test_step01.js`）

### STEP 18 · 新地图「贫瘠之地」`P0` ✅

- 新 zone：干燥大地色、巨型枯树、半人马营地、野猪人、斑马/疾行陆行鸟配方复用。
- 枢纽 NPC：**十字路口**哨塔（任务链入口）；北接莫高雷土路传送门。
- 本 STEP：1 条可玩任务「十字路口的麻烦」（清 4 野猪人）；补给/半人马/哀嚎洞穴为对话 stub（完整网 STEP 22）。
- 实现于 `barrens.js`；等级上限 18；Lv10+ 开放莫高雷南口；存档含 `zoneId` + `barrensQuest`。

> **验收**：10 级左右自然流向贫瘠之地；小地图/存档记录 `zoneId`。 ← **已通过**（`node test_step01.js`）

### STEP 19 · 第四职业「牧师」`P1` ✅

- `CLASSES.priest` + `HUMANOIDS.priest`：治疗术 / 快速治疗 / 神圣惩击 / 真言术：盾。
- **吸收盾**：`S.p.absorb` / `absorbT`；在 `playerHit` 先扣盾再扣血（玩家受击入口非 `hitEntity`）；到期与复活清盾并 `dispose` 视觉 mesh。
- 启程界面第四职业卡；`icons.js` 补 `holy` / `holy_shield` / `flash_heal`；天赋双枝神圣/戒律；`sfx` 补 `heal`/`holy`。

> **验收**：牧师可清莫高雷主线并进本；盾吸收数值正确；存档兼容旧三角色。 ← **已通过**（`node test_step01.js`）

### STEP 20 · AI 队友（伪组队）`P1` ✅

- 新建 `companions.js`：营地长老招募 1 名 AI（四职业可选）；状态机 `IDLE / FOLLOW / COMBAT / HEAL / RETREAT`。
- 集火 `S.currentTarget` / `getFocusTarget`；牧师同伴在玩家或自身低血时治疗。
- 解散/换区 `dispose` + `transferCompanionZone`；存档字段 `companion:{classKey,hp}`。

> **验收**：带 AI 打玛格曼达不卡死；解散/招募无泄漏 mesh。 ← **已通过**（`node test_step01.js`）

### STEP 21 · 5 人风格副本「哀嚎洞穴」`P0` ✅

- 新建 `wailing.js` + `DUNGEONS.wailing_caverns`：走廊变异蛇 → 考布莱恩（毒液喷吐）→ 吞噬者。
- 复用 `createBoss` / `getDungeon` / `spawnAdd(addCfg)`；入口在贫瘠之地南口（Lv15+）；掉落蓝装 `serpent_fang` / `moss_mantle`。
- `leaveRaid` / 读档按副本 hub 回贫瘠之地或莫高雷。

> **验收**：加本 = 加 `DUNGEONS.wailing` 数据 + 少量摆件；引擎零分支。 ← **已通过**（`node test_step01.js`）

---

## 八 · v3.5 内容密度——让世界「值得刷」

### STEP 22 · 任务枢纽与故事线 `P1` ⏳

- 任务数据结构升级：`QUESTS[]` 多任务、前置、`zone`、奖励表；取代单一 `QUEST` 状态机。
- 莫高雷「长老的试炼」→ 贫瘠之地「十字路口的麻烦」→ 熔火「炎魔的低语」主线贯通。
- 任务日志 `L` 支持多条目。

> **WoC 对照**：近 80 任务 + 单一阴谋故事线；我们先做 **12–15 条** 贯通三章。

### STEP 23 · 专业技能（采集/制作精简版）`P2` ⏳

- 采集点：草药 / 矿脉（SeededRng 摆放）；制作：绷带、初级药水、磨刀石。
- 营地制作台交互；配方表数据化。

> **WoC 对照**：`gather_nodes.ts` + `professions.ts` + 世界市场（市场留到 v5）；我们只做单人制作。

### STEP 24 · 世界 Boss + 稀有精英框架 `P1` ⏳

- 通用 `RARES` / `WORLD_BOSSES` 表：长刷新、金色姓名板、公告、必掉。
- 贫瘠之地世界 Boss：「半人马战争使者」（小规模，1–2 人可摸）。
- 老灰鬃逻辑抽成框架，莫高雷/贫瘠之地各挂一只稀有。

### STEP 25 · 成就「功绩之书」`P2` ⏳

- `Shift+Z`：击杀、任务、首通副本、满天赋等；奖励称号（姓名板前缀）与外观边框。
- 数据 `DEEDS[]`；存档持久化。

> **WoC 对照**：Book of Deeds；我们做 15–20 条起步。

---

## 九 · v4.0 开荒团——无需真人的团队感

> WoC 用 5-bot 脚本清 Hollow Crypt；Delve 用 AI 同伴。本阶段把「单人 +1 AI」扩成「可配 5 人角色的开荒模拟」，仍全部本地、零服务器。

### STEP 26 · 5 人 AI 小队框架 `P1` ⏳

- 队伍栏 UI（头像+血条）；角色：坦克 / 治疗 / 3 DPS（可从已实装职业抽）。
- 共享目标、拾取规则（自由拾取简化）；小队经验小幅加成（经典 3/4/5 人系数可缩水写入 BALANCE）。

### STEP 27 · 仇恨与职责 `P1` ⏳

- 简易 threat 表：坦克技能高仇恨；Boss 打仇恨最高者。
- 治疗 AI 优先级：坦克 <30% > 自己 <40% > 最低血 DPS。
- 失败条件：全灭；成功条件：Boss 死。

### STEP 28 · 团队副本「黑石深渊前厅」或「奥妮克希亚巢穴·精简」`P0` ⏳

- 择一：3 Boss 短团本（建议 **黑翼之巢门厅风格** 或 **奥妮克希亚单 Boss 三阶段**——飞天/喷吐/深呼吸简化）。
- 必须用 `createBoss` + 阶段表；机制教玩家走位（出红圈、躲直线）。

### STEP 29 · 本地「地下城查找器」`P2` ⏳

- `Shift+I`：选本、选难度（普通）、一键填充 AI 职责队列、传送至入口。
- 对标 WoC Dungeon Finder，但全程本地。

---

## 十 · v4.5 逻辑渲染分离——为联机修路

> 这是 WoC「One sim, three hosts」在我们体量上的最小可行版：不追求 TypeScript monorepo，但必须让「数值结算」能在无 DOM / 无 Three 环境下跑通回归。

### STEP 30 · 抽出 `sim/` 纯逻辑层 `P0` ⏳

- 新建 `sim/`（或 `sim.js` 起步）：`hitEntity`、技能结算、Boss 阶段、掉落掷骰、任务进度 —— **零** `THREE` / `document` 引用。
- 渲染层只读快照：`{entities, projectiles, uiEvents}`。
- 固定 tick 可选：逻辑 20Hz，渲染跟 `requestAnimationFrame`（对齐 WoC `DT=1/20`）。

> **验收**：Node 下 `node test_sim.js` 能打完「虚拟拉戈斯」并断言胜负；浏览器行为不变。

### STEP 31 · 无头机器人 + 回归套件 `P1` ⏳

- `scripts/raid_bot.mjs`：战士 bot 清熔火走廊+两 Boss（对标 `crypt_raid.mjs`）。
- `test_step*.js` 覆盖：掉落权重统计、天赋修饰、存档 schema、zone 切换。
- `?dev` cheat 供 bot 使用。

> **验收**：CI 或本地一条命令 2 分钟内绿灯；每个 STEP 合并前必跑。

---

## 十一 · v5.0 真联机——艾泽拉斯服务器权威

> **原则照抄 WoC，内容仍走 WoW 背景**：客户端只发意图，服务器跑同一份 `sim`，Postgres（或先 SQLite）存角色。本阶段可分仓库/子目录 `server/`，但协议与存档 schema 继承 STEP 11/30。

### STEP 32 · 权威服务器骨架 `P0` ⏳

- Node WebSocket 服务器：20Hz tick；客户端上行 `move/cast/interact`；下行兴趣范围内快照。
- 离线模式保留（同一份 sim）。
- 鉴权：简易账号密码（scrypt）或先做「房间码」访客模式。

### STEP 33 · 角色持久化与多角色 `P1` ⏳

- 每账号多角色；字段对齐 STEP 11 schema。
- 自动存 30s + 登出；名字唯一。

### STEP 34 · 社交：小队 / 低语 / 交易 `P1` ⏳

- 组队邀请、小队聊天、点击交易（双方确认、原子交换）。
- 副本：队长进本创建实例副本（私有 `DUNGEON` 实例）。

### STEP 35 · 竞技场精简（可选）`P2` ⏳

- 1v1 决斗场（到 1 血判定，不真死）；评分可后置。
- 对标 WoC Ashen Coliseum 的最小切片。

### STEP 36 · 发布与运营基底 `P2` ⏳

- Docker Compose 一键起（db + server + 静态客户端）。
- 基本速率限制、版本门闸、`ALLOW_DEV_COMMANDS` 生产禁用。
- 部署文档升级 `DEPLOY.md`。

---

## 十二 · 世界观与内容路线图（WoW 背景总表）

| 版本 | 地理 / 副本 | 职业 | 人数体验 |
| --- | --- | --- | --- |
| ≤v2.0 | 莫高雷 + 熔火之心（玛格曼达→拉戈斯） | 战 / 法 / 猎 | 单人 |
| v2.5 | 同上 + 经典 HUD/商人/墓地 | 同上 | 单人 |
| v3.0 | +贫瘠之地 +哀嚎洞穴；熔火仍在 | +牧师 | 单人+1 AI |
| v3.5 | 任务网 / 专业 / 世界 Boss / 成就 | 同上 | 单人+1 AI |
| v4.0 | +短团本（黑石/奥妮克希亚精简） | 职责齐备即可 | 5 AI 开荒 |
| v4.5 | ——（工程） | —— | 无头 bot |
| v5.0 | 同世界真联机 | 可继续加萨满/盗贼等 | 真人小队 |

**职业扩张顺序（建议）**：牧师（治疗锚）→ 萨满（部落招牌）→ 盗贼 → 术士 → 德鲁伊 / 圣骑士（按产能选做，均走 `buildHumanoid` 配置）。

**副本扩张顺序（建议）**：熔火之心（已有）→ 哀嚎洞穴 → 怒焰裂谷 → 影牙城堡风味 5 人本 → 奥妮克希亚/黑翼精简团本。

**明确不做（除非单开文档）**：拍卖行联网经济、公会大系统、Web3、完整 1–60 等级、商业美术资源、手机原生壳。

---

## 十三 · 贯穿始终的工程习惯——从 WoC 抄来的纪律

- **每步一个可玩交付**：每个 STEP 结束游戏都是完整可玩的，绝不留半成品过夜。
- **debug.js 作弊台**：`cheat.level / give / tp / kill / god / zone / boss`——对标 `ALLOW_DEV_COMMANDS`。
- **回归清单（人工 ~4 分钟）**：出生 → 接任务 → 杀 3 猪 → 交任务 → 进熔火 → 走廊 → 玛格曼达 → 拉戈斯。
- **无头回归（v4.5 起强制）**：`node scripts/raid_bot.mjs` + `test_step*.js`。
- **性能预算随行**：新粒子必有 dispose；移动端阴影 ≤1024。
- **资源纪律**：工厂 + 数据；仓库 0 个 `.png/.glb/.mp3`（入口 CSS 渐变除外）。
- **借 WoC 的是架构，不是 IP**：代码模式可抄，叙事与命名走艾泽拉斯经典粉丝作品路线，注意自用/开源展示边界。

---

## 十四 · 里程碑总览

| 阶段 | STEP | 交付 | 状态 | 预估投入 |
| --- | --- | --- | --- | --- |
| 地基 | 0–1 | BALANCE、SeededRng、Entity 统一 | ✅ 完成 | 1 次迭代 |
| v1.4 成长闭环 | 2–4 | 掉落拾取、等级、背包装备 | ✅ 完成 | 2–3 次迭代 |
| v1.5 世界呼吸 | 5–7 | 族群工厂、sfx、昼夜 | ✅ 完成 | 2–3 次迭代 |
| v2.0 火焰之地 | 8 | raid.js + 分段 + 拉戈斯三阶段 | ✅ 完成 | 1 次迭代 |
| v2.0 火焰之地 | 9a | VFX 注册表（projectile/impact/aura + 6 配方） | ✅ 完成 | 0.5 次迭代 |
| v2.0 火焰之地 | 9b | createBoss + BOSSES.ragnaros 数据驱动 | ✅ 完成 | 1 次迭代 |
| v2.0 火焰之地 | 9c | 玛格曼达 + 双 Boss 分段 | ✅ 完成 | 1 次迭代 |
| v2.0 成长/工程 | 10a | 天赋数据层（TALENTS + BAL.talents + cheatTalent） | ✅ 完成 | 0.5 次迭代 |
| v2.0 成长/工程 | 10b | 天赋 UI（N 键面板 + 重置） | ✅ 完成 | 0.5 次迭代 |
| v2.0 成长/工程 | 11 | 存档（localStorage + Base64 导入导出） | ✅ 完成 | 1 次迭代 |
| v2.0 成长/工程 | 12 | debug/FPS/dispose | ⏳ 下一步 | 1–2 次迭代 |
| v2.5 经典系统 | 13 | 金币经济 + 营地商人 | ✅ 完成 | 1 次迭代 |
| v2.5 经典系统 | 14 | 角色 / 法术书 / 任务日志（C P L） | ✅ 完成 | 0.5 次迭代 |
| v2.5 经典系统 | 15 | 死亡与灵魂医者 | ✅ 完成 | 1 次迭代 |
| v2.5 经典系统 | 16 | 小地图 | ✅ 完成 | 1 次迭代 |
| v3.0 卡利姆多 | 17–21 | 多区、贫瘠之地、牧师、AI 队友、哀嚎洞穴 | ✅ STEP 17–21 完成 | 4–6 次迭代 |
| v3.5 内容密度 | 22–25 | 任务网、专业、世界 Boss、成就 | ⏳ 待开始 | 3–4 次迭代 |
| v4.0 开荒团 | 26–29 | 5 AI、仇恨职责、短团本、本地查找器 | ⏳ 待开始 | 4–5 次迭代 |
| v4.5 修路 | 30–31 | sim 抽离、无头 bot 回归 | ⏳ 待开始 | 2–3 次迭代 |
| v5.0 真联机 | 32–36 | 权威服、存档、社交、可选竞技场、Docker | 🔮 远景 | 开放式 |

### 进度快照（2026-07-21）

| STEP | 状态 | 关键落地 |
| --- | --- | --- |
| 0 | ✅ | `core.js`：`BALANCE` + `SeededRng` / `srand` + 文件头依赖清单 + `makeLabel` |
| 1 | ✅ | `combat.js`：`hitEntity` 统一受击；野猪 / 烈焰之子 / Boss 走 `onDeath` |
| 2 | ✅ | `icons.js` + `items.js`：尸体拾取（F）、品质掉落、拉戈斯必掉萨弗拉斯之柄 |
| 3 | ✅ | `S.p.{level,xp,xpMax}`、升级金光、经验条 UI |
| 4 | ✅ | `buildHumanoid` + 背包装备栏（B 键）、换装换武器组 |
| 5 | ✅ | `buildQuadruped` / `buildHumanoidMob`；狼 / 陆行鸟 / 鹰身女妖 / 老灰鬃；社群仇恨 + 脱战回巢 |
| 6 | ✅ | `sfx.js`：`SFX.play` / `SFX.music`；草原 ↔ 副本音乐切换 |
| 7 | ✅ | `BALANCE.dayNight` + `main.js` 日照/雾色插值（render-only） |
| 8 | ✅ | `raid.js`：`buildRaidScene` + `DUNGEON.stage` + Boss 三阶段；`combat.js` 精简为通用战斗 |
| 9a | ✅ | `vfx.js`：`VFX.spawn` + 6 配方；`BAL.vfx`；`fireProjectile`/`spawnTelegraph`/`spawnBurst` 薄包装；dispose 路径 |
| 9b | ✅ | `BOSSES.ragnaros` + `createBoss` / `bossAI` 通用驱动；`S.b.next[skillId]`；无 `nextMelee` 硬编码 |
| 9c | ✅ | `BOSSES.magmadar` + `QUADS.magmadar`；`DUNGEON`：corridor→boss1→bridge→boss；`cast_fear`；犬牙项链掉落 |
| 10a | ✅ | `talents.js` + `BAL.talents`；三职业双枝三层；`getSkillCd` / `spendTalent`；`cheatTalent` |
| 10b | ✅ | `#talent` 面板；N / ✨ 开关；重置；与背包互斥；升级 announce |
| 11 | ✅ | `save.js`：localStorage + Base64；继续/新旅程；自动存挂点；`cheatSave` |
| 12 | ✅ | `#fps` + `Ctrl+F`；`BAL.fps`；`?dev` 默认开 |
| 12+ | ⏳ | `debug.js` / dispose / 移动端（原 STEP 12 余项） |
| 13 | ✅ | 金币 HUD；野怪/Boss/任务掉铜；商人火蹄；食物/绷带；右键出售 |
| 14 | ✅ | `panels.js`：C 角色 / P 法术书 / L 任务日志；追踪器规范化 |
| 15 | ✅ | 释放灵魂复活；灵魂医者；副本走廊复活 / 退出；虚弱 debuff |
| 16 | ✅ | `map.js`：小地图 blip + M 世界地图；`MAP_ZONES` 预留 |
| 17 | ✅ | `zones.js`：`ZONES` / `enterZone`；分区种子 `WORLD_SEED ^ hash(zoneId)`；传送门数据化 |
| 18 | ✅ | `barrens.js`：贫瘠之地 + 十字路口任务；南口 Lv10+；存档 `zoneId`/`barrensQuest` |
| 19–21 | ✅ | 牧师 / AI 队友 / 哀嚎洞穴 |
| 22–36 | 🔮 | v3.5–v5.0 已规划，待前置完成 |

**当前模块清单**（`game.html` 加载序）：`core → zones → sfx → icons → items → models → world → barrens → combat → companions → talents → panels → map → vfx → main → raid → wailing → save`

**下一步行动**：从 **STEP 22** 做任务枢纽与故事线。

---

*MOLTEN CORE PROJECT · PLAN v3.0（含 ASSETS DESIGN + 路线至 v5.0）· 2026-07-21 · 参考 [WORLD OF CLAUDECRAFT](https://github.com/levy-street/world-of-claudecraft)（代码 MIT / 少量资源 CC0）· 世界观：经典 WoW 粉丝向 · 进度：STEP 21 完成，下一步 STEP 22*
