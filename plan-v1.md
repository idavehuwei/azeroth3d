# 熔火之心 · plan-v1（单机内容补齐计划）

**对比基准：** [World of ClaudeCraft](https://github.com/levy-street/world-of-claudecraft)（v0.28 · MIT / 少量 CC0）  
**本项目基线：** `plan-merged.md` 已完成 **STEP 0–29**（v4.0 开荒团闭环）  
**立场：** **不联机** —— 十一章（真联机）与 Web3 / RL / 桌面壳 **默认不做**；十章（sim 抽离）仅作可选工程项  
**更新：** 2026-07-21

> **借 WoC 的是管线与内容密度，不是体量对等。**  
> WoC ≈ 完整经典 MMO；我们 ≈ 程序化单页可玩切片。目标是「每一刀都切在手感与密度上」，而不是复刻 9 职业 / 80 任务 / 权威服。

---

## 〇 · 一句话结论

| 维度 | 要不要追 WoC？ | 说明 |
|------|----------------|------|
| 程序化美术管线 | **要加深** | 已对齐路线；差在城镇建筑、动画完整度、天气、图标覆盖 |
| 开放世界内容 | **要补** | 2 大区 → 至少再 1 大区 + 枢纽密度；任务网仍偏薄 |
| 职业 / 技能 | **要扩** | 4 职业 → 建议补到 6（萨满、盗贼）；技能等级 / Buff 条 |
| 副本 / 机制 | **要加深** | 3 本够玩，但缺 Heroic、可复玩 Delve、更清晰的机制教学 |
| 经济 / 专业 | **要加深** | 有采集制作，缺邮件、银行、拍卖（本地伪市场即可） |
| 工程 / 联机 / RL | **不做** | 除非以后改主意；与单机体验无关 |

`plan-merged.md` 继续作为 **历史执行账本**；本文件是 **下一阶段产品路线图**。

---

## 一 · 现状快照（我们已有什么）

### 1.1 模块（约 10k LOC · 零 `.png/.glb/.mp3`）

| 层 | 已有 |
|----|------|
| 世界 | 莫高雷 · 贫瘠之地 · 分区种子 · 昼夜 · 稀有 / 世界 Boss |
| 副本 | 熔火之心 · 哀嚎洞穴 · 奥妮克希亚巢穴 · 本地查找器（Shift+I） |
| 战斗 | `hitEntity` · 仇恨 · 3 人 AI 小队 · 天赋 · VFX / SFX |
| 成长 | 等级 · 背包装备 · 金币商人 · 任务枢纽 · 专业 · 功绩之书 |
| 工程 | localStorage 存档 · `test_step01.js` 冒烟 · FPS |

### 1.2 硬约束（继续遵守）

1. 零美术资源文件（工厂 + 数据）  
2. 数值外置 `BALANCE`  
3. 世界摆放走 `srand()`  
4. Entity 统一受击 + `onDeath`  
5. 每步可玩交付  

---

## 二 · WoC 对照总表（差距雷达）

图例：✅ 已有近似 · 🟡 有雏形需加深 · ❌ 缺失 · 🚫 单机明确不做

### 2.1 美术 / 程序化资源

| WoC | 我们 | 状态 | 补齐方向 |
|-----|------|------|----------|
| 固定种子地形 + 生物群系起伏 | 分区种子 + 平台/岩壁摆放 | 🟡 | 高度图式起伏；河/路更可读 |
| 木桁架城镇建筑 | NPC + 少许平台/门 | 🟡 | `buildBuilding()` 房屋/营帐/围栏工厂 |
| 12 生物族群 + 走攻施坐死动画 | `anim.js` 全量挂点 | ✅ | V1-A3 完成；新区怪按挂点规范扩展 |
| 9 职业共用人形骨架换装 | 4 职业 `buildHumanoid` | 🟡 | 加职业 = 配置；换装外观件（肩甲/披风） |
| Canvas 图标全覆盖 | `icons.js` 有配方，技能栏仍偏 emoji | 🟡 | 技能栏 / 物品 / Buff **全面 Icons.get** |
| WebAudio 93+ 音色 + 编辑器 | ~10 条合成音 | 🟢 | **V1-A5 ✅**：≥45 音色 + 材质脚步 + studio |
| 生物群系天气（雨雪雾，render-only） | `weather.js` 晴/沙尘/洞雾 | ✅ | `BAL.weather.enabled` 可关 |
| 实时阴影 / 氛围光 | 有基础光 | 🟡 | 副本火光、营地篝火、移动端阴影预算 |
| 少量 CC0 HDRI / 水面法线 | 无（全代码） | ✅/可选 | 保持零资源；若引入必须进 `CREDITS.md` |

### 2.2 内容（世界 · 任务 · 副本）

| WoC | 我们 | 状态 | 补齐方向 |
|-----|------|------|----------|
| 3 开放区 Lv1–20，枢纽环绕 | 2 开放区 + 营地/十字路口 | 🟡 | **杜隆塔尔或灰谷风味第三区** |
| ~80 任务 + 主线阴谋 | 主线三章 + 少量支线 | 🟡 | 每区 8–12 条；交付物/护送/使用物 |
| 5 副本 + Heroic | 3 副本，仅普通 | 🟡 | 怒焰裂谷精简；**Heroic 数值档** |
| Delve（随机小室 · AI 同伴） | 无 | ❌ | 本地 Delve：固定种子房间链 |
| 世界 Boss / 稀有 | 有（战争使者等） | ✅ | 每新区 +1 稀有 +1 世界 Boss |
| 编年史 NPC / 声望 | 功绩之书有 | 🟡 | 阵营声望条（部落轻量） |

### 2.3 系统（战斗 · 成长 · 经济 · 社交本地版）

| WoC | 我们 | 状态 | 补齐方向 |
|-----|------|------|----------|
| 9 职业 · 技能随等级升阶 | 4 职业 · 固定 4 技能 | 🟡 | 萨满 / 盗贼；技能 R1–R3 |
| 天赋 3 专精 × 9 | 双枝浅层 | 🟡 | 第三枝或加深层数 |
| Buff / Debuff 条 | 吸收盾等散落 | ❌ | `buffs.js` + HUD 图标条 |
| 仇恨 / 职责 / AI 小队 | ✅（STEP 26–27） | ✅ | 坦克嘲讽技能；治疗更稳 |
| 本地 Dungeon Finder | ✅（STEP 29） | ✅ | 难度档、最近清本记录 |
| 专业 + 世界市场 + 邮件 | 采集/制作雏形 | 🟡 | 银行箱 · 本地邮箱 · 伪拍卖 |
| 功绩 / 称号 / 边框 | ✅ | ✅ | 副本 Heroic 功绩；坐骑外观（cosmetic） |
| 真联机小队 / 公会 / 交易 | AI 小队 | 🚫 | 不做 |
| 竞技场 / 球类赛季 | 无 | 🚫/可选 | 可选本地 1v1 木桩决斗 |
| i18n 22 语言 | 中文硬编码 | 🚫/低优 | 单机可后置 |
| Electron / 手机壳 | 浏览器单页 | 🚫 | 不做 |
| Web3 / 商店 | 无 | 🚫 | **永不做** |
| Headless RL / Gym | 无 | 🚫 | 不做；可选轻量 `raid_bot` |

---

## 三 · 目标产品形态（v1.x 单机）

**一句话：** 打开 `game.html` 就能玩的「卡利姆多经典切片」——三区贯通、六职业可选、四副本可清、专业与经济自洽、AI 小队开荒，全程离线。

| 指标 | 当前 | v1 目标 |
|------|------|---------|
| 开放区 | 2 | **3** |
| 实例副本 | 3 | **4**（+ 怒焰或影牙风味） |
| 职业 | 4 | **6** |
| 主线+支线任务 | ~十几 | **40+** |
| 可感知天气 | `weather.js` | 晴/沙尘/洞雾 |
| 可感知音效材质 | 单一 hit/swing | **V1-A5** 脚步+受击分层 |
| 城镇可读性 | 弱 | 程序化房屋街区 |
| 回归 | 冒烟静态 | 冒烟 + 可选无头清本 |

---

## 四 · 分轨执行计划（STEP V1-xx）

编号独立于 `plan-merged`，避免与旧 STEP 30+ 联机路线混淆。

### 轨 A · 美术与氛围（手感地基）`P0–P1`

#### V1-A1 · 城镇建筑工厂 `P0` ✅

- `buildHut` / `buildTent` / `buildFence` / `buildWatchtower`（程序化，走 `srand`）
- 莫高雷营地、十字路口各落 4–8 栋，形成「能认出的镇子」
- **验收：** 刷新后建筑位置不变；无新资源文件 ← **已通过**（固定坐标摆放 + `node test_step01.js`）

#### V1-A2 · 图标全面替换 emoji `P0` ✅

- 技能栏、背包、商人、查找器、功绩奖励图标全部 `Icons.get`
- 补史诗紫品质描边（已有 `QUALITY.epic`）
- **验收：** 启程后技能栏无裸 emoji（或仅保留数字键提示）← **已通过**（`applySkillBarIcons` + `node test_step01.js`）

#### V1-A3 · 生物动画挂点 `P1` ✅（全量完成）

> **目标：** 程序化模型具备可驱动挂点，运行时统一走 / 攻 / 死 / 吟唱；死亡侧倒与终局下沉插值，禁止瞬切。  
> **铁律：** 动画纯表现，不改伤害 / 仇恨 / AI 决策；幅度与频率进 `BALANCE.anim`。  
> **交付状态：** 基线 + A3+ 原怪打磨 + 终局死亡 API + DESIGN/调试/脚步钩 **全部完成**。

##### 现状 → 交付对照

| 维度 | 交付前 | 已交付（✅） | 建议继续打磨（A3+） |
|------|--------|-------------|-------------------|
| 数据挂点 | 仅玩家人形有肢组 | 四足 `userData.legs[]`；人形 `leg/arm`；奥妮 `wingL/R`；`kind` + `anim` | 鹰身女妖翼枢轴；火焰元素 stretch；NPC 待机手势 |
| 三态 | 无统一状态 | `idle` / `walk` / `attack` / `dead`（`userData.anim.state`） | `cast`（吟唱站定抬臂）；`hitreact` 短闪 |
| 四足走 | 仅整体 Y bob | 对角腿 `rotation.x` 摆动（野猪追击可见） | 速度联动频率；转弯外倾；陆行鸟双足可再加大步幅 |
| 攻击 | 玩家/同伴有 | 野怪近战置 `attackAnim=1`；有 `armR` 则挥臂 | 四足低头冲撞（头/颈 Group）；无臂怪用全身 pitch |
| 死亡 | `rotation.z=π/2` 瞬切 | `beginDeathRoll` 插值；野怪/小怪/同伴/中段 Boss | 拉戈斯终局下沉与侧倒统一 API；落地顿挫感 |
| Boss | 拉戈斯 bob；奥妮飞高 | `updateBossWingAnim` 翼拍；死亡可侧倒 | 尾摆；落地抖尘；飞天时翼幅加大 |
| 半人马 | 静态 | 外层 `legs` 指向马身腿 | 上半身挥矛与 `attackAnim` 绑定 |
| 数值 | 散落魔法数 | `BAL.anim`：walkFreq/Amp、deathRollSpd、bobAmp、wingFlap | `enabled` 总开关；按 `kind` 覆盖表 |
| 模块 | 无 | `anim.js` + main/world/raid/companions 接线 | `DESIGN.md` 动画一小节；可选 `?dev anim` |

##### A · 已交付架构（基线）

```
models.js  ──挂点──►  userData.{legs|legR/L|armR/L|wingL/R, kind, anim}
main.js    ──tick──►  updateMobAnim(m,dt) / updateBossWingAnim(boss,dt,alive)
world.js   ──死亡──►  setCorpse → beginDeathRoll / 重生 resetDeathRoll
raid.js    ──死亡──►  addDie / bossDie(非 final) → beginDeathRoll
companions ──死亡──►  beginDeathRoll + tickDeathRoll；复活 resetDeathRoll
core.js    ────────►  BALANCE.anim
```

**状态机（实体侧）：**

| state | 进入条件 | 驱动 |
|-------|----------|------|
| `idle` | 未移动且无 attackAnim | 腿回中；可保留轻 bob |
| `walk` | `m.moving` | `walkPhase += walkFreq*dt`；腿正弦 |
| `attack` | `m.attackAnim>0` | 衰减 `attackDecay`；臂/可选头 |
| `dead` | `beginDeathRoll` | `deathRoll → π/2`；不再摆腿 |

##### B · 模型挂点规范（加新怪必遵）

1. **四足 / 双足**（`buildQuadruped`）：腿必须是髋部 `THREE.Group` 枢轴，mesh 为子节点；写入 `legs[]`（四足顺序：左前、左后、右前、右后；双足两条）
2. **人形**（`buildHumanoid`）：保持 `legR/L` `armR/L`；`anim` 对象与玩家一致
3. **半人马**：外层 Group 的 `userData.legs` **引用**马身子挂点，勿复制 Mesh
4. **龙形**：翼为 Group；拍打只改 Group 旋转，勿每帧重建几何
5. **无肢怪**（烈焰之子）：允许无 `legs`；死亡仍走 `beginDeathRoll`；idle 可用已有 flame scale
6. **禁止**在工厂里用 `Math.random` 摆挂点；摆放类随机仍走 `srand`

##### C · API 契约（`anim.js`）

| API | 职责 |
|-----|------|
| `ensureAnim(mesh)` | 保证 `userData.anim` 字段齐全 |
| `updateMobAnim(m,dt)` | 野怪 / adds：走攻死 |
| `updateBossWingAnim(mesh,dt,alive)` | 翼拍；`alive===false` 时转侧倒 |
| `beginDeathRoll(ent\|mesh)` | 开始侧倒，不瞬切 |
| `tickDeathRoll(mesh,dt)` | 单网格侧倒步进 |
| `resetDeathRoll(mesh)` | 重生 / 同伴振作清零 |

调用方约定：先写 `position.y` bob（若需要），再 `updateMobAnim`；死亡分支每帧仍要 tick，直到插值结束。

##### D · `BALANCE.anim`（已有 + 建议补）

```js
anim: {
  enabled: true,          /* A3+：总开关 */
  walkFreq: 9, walkAmp: .55, walkDecay: 8,
  attackDecay: 4,
  deathRollSpd: 6,
  bobAmp: .22,
  wingFlap: { freq: 1.4, amp: .35 },
  /* A3+ 可选 */
  byKind: {
    quad:  { walkAmp: .55, walkFreq: 9 },
    biped: { walkAmp: .7,  walkFreq: 8 },
    dragon:{ wingFlap: { freq: 1.2, amp: .5 } },
  }
}
```

##### E · 验收（基线已通过）

- [x] 野猪追击腿摆（对角步态）
- [x] 死亡侧倒插值（野怪 / 副本小怪 / 同伴 / 中段 Boss）
- [x] 奥妮存活翼拍
- [x] `BAL.anim` 外置；`node test_step01.js` 冒烟
- [x] 无新 `.glb` / 骨骼文件

##### F · A3+ / 原有怪物重构打磨（本波要做透）

> **原则：** 不只加新怪——**现有** `MOB_TYPES` / Boss 小怪全部过一遍挂点与表现，能摆的肢都摆，能分的态都分。

| 怪物 | 模型 | 重构要点 |
|------|------|----------|
| 野猪 / 狼 / 斑马 / 野猪人 / 灰鬃 | `buildQuadruped` | 头颈 Group 攻击俯冲；步频随追击略加快 |
| 陆行鸟 | 双足 | 大步幅 `byKind.biped` |
| 半人马 / 战争使者 | `buildCentaur` | 马腿已挂；**上半身臂枢轴**挥矛 |
| 鹰身女妖 | `buildHumanoidMob` | **翼/臂/腿枢轴**；悬停 bob；吟唱 `cast` 抬臂快翼 |
| 烈焰之子 | `buildFlameSpawn` | 躯干脉动 + 火焰 stretch（无腿） |
| 哀嚎蛇怪 / 考布 / 吞噬 | 四足配方 | 同四足俯冲；体型大者 `walkAmp` 略减 |
| 玛格曼达 | 巨型四足 | 同挂点；Boss AI 已有 bob |
| 奥妮 | 龙形 | 翼拍已有；A3+ 飞天翼幅加大 |
| 拉戈斯 | 人形臂 | 保持挥锤；终局死亡统一插值可后置 |

**实施顺序：** `byKind` 表 → 四足 `head` → 鹰身全挂点 → 半人马臂 → 烈焰脉动 → `cast`/`attack` 驱动 → 测试。

**本波已落地（全量）：** `enabled`/`byKind` · 四足俯冲 · 鹰身全挂点 · 半人马臂 · 烈焰脉动/前倾 · `hitReact` · 转弯外倾 · 奥妮翼+尾 · 落地扬尘 · 玩家/Boss终局统一死亡 API · 落地顿挫 · NPC 待机臂 · `?anim=1` · `DESIGN` 动画节 · `emitAnimFootstep`→`SFX.playFoot` 钩。

A3+ 清单 1–9：**全部勾完**（V1-A5 仅需补 `foot_*` 音色表，钩子已就绪）。

##### G · 明确不做

- FBX/GLTF 骨骼蒙皮、Mixamo、IK  
- 布料物理、面部口型  
- 动画驱动逻辑碰撞盒或 AI 路径  

##### H · 回归要点（改 A3+ 时必跑）

- 刷新世界：野猪腿仍摆；击杀侧倒约 0.3–0.5s 完成  
- 进奥妮：翼动；飞天高度逻辑不被翼拍覆盖  
- `setCorpse(m,false)` 重生直立、材质还原  
- 同伴倒下→振作：无残留下沉角  

#### V1-A4 · 天气层（render-only）`P1` ✅

- `weather.js`：晴 / 雨（贫瘠沙尘可选）
- 粒子 + 雾色；**禁止**改伤害/视野逻辑数值
- **验收：** 切换区天气跟随生物群系；`BALANCE` 可关 ← **已通过**（`BAL.weather.enabled` + `node test_step01.js`）

#### V1-A5 · SFX 扩表 + 材质脚步 `P1`（音效完善波）✅

> **目标：** 在零音频文件前提下，把 WebAudio 合成做到「能听出材质、族群、场景」；
> 对标 WoC「音色数据化 + 表面脚步」，本项一次做透，不留半成品。
> **铁律：** 仍禁止 `.mp3/.ogg/.wav`；调音只改 `SOUNDS` / `MUSIC` / `BALANCE.sfx` 表。
> **落地：** 59 音色 · 分轨 · 材质脚步 · 受击分层 · studio · 回归绿。

##### 现状差距

| 维度 | 现状 | 完善后 |
|------|------|--------|
| 音色条数 | ~10（swing/arrow/fireball/hit/roar/growl/pickup/levelup/heal/holy） | **≥45** 具名音色（含变体别名） |
| 脚步 | 无 | 草 / 土 / 石 / 木 / 熔岩渣 · 随区与移动触发 |
| 受击 | 单一 `hit` | 肉体 / 甲壳 / 龙鳞 / 元素 / 玩家护甲 |
| 施法/技能 | 职业 1 键绑 1 音 | 每技能可绑独立音色；吟唱起手 / 施放 / 打断分轨 |
| Boss | 几乎全是 `roar` | 龙息 / 毒液 / 熔岩喷发 / 阶段切换专用 |
| UI | pickup / levelup | 面板开合、任务接交、商人买卖、功绩解锁、死亡/复活 |
| 音乐 | world / barrens / raid | + 哀嚎洞 / 奥妮巢穴；可选天气层环境垫底（雨/风，render-only） |
| 工程 | `SFX.play(name)` | + `playHit(kind)` / `playFoot(surface)` / 音量分轨 / 节流 |
| 调音台 | 无 | **必做** `sfx_studio.html`（列表试听、改参数、导出 JSON 片段） |

##### A · 合成器能力升级（`sfx.js` 内核）

1. **分轨 Gain：** `master` → `sfxGain` / `musicGain` / `ambienceGain`；静音按钮可分「音效 / 音乐」或总静音（UI 小扩展可放设置面板或长按静音）
2. **播放 API 扩展（保持兼容）：**
   - `SFX.play(name, opts?)` — `opts.vol` / `opts.detune` / `opts.rate`（轻随机，防机械重复）
   - `SFX.playHit(surfaceOrKind)` / `SFX.playFoot(surface)` / `SFX.playUI(action)`
   - `SFX.music(mode)` 支持新区 mode；`SFX.ambience(mode|null)` 垫底循环（雨滴噪声、风噪）
3. **节流 / 叠音上限：** 同类脚步 ≥90ms 间隔；同名 hit 同时 ≤3 声；避免团战刺耳
4. **合成原语补齐（仍数据驱动）：**  
   `noise` / `osc` / `arp` 之外增加可选：`noiseBurst`（短冲击）、`dualOsc`（双振荡器和声）、`sweep+noise` 层叠（龙息）  
   单条 `SOUNDS` 配方可声明 `layers:[{...},{...}]` 同触发多声部
5. **`BALANCE.sfx`：**  
   `enabled` / `footstepInterval` / `hitVariance` / `footVol` / `uiVol` / `ambienceVol`  
   全部可关：`BAL.sfx.enabled===false` → play no-op（音乐可另开关）

##### B · 材质脚步（验收核心）

1. **表面表 `FOOT_SURFACES`：** `grass` · `dirt` · `stone` · `wood` · `ash`（熔岩渣）  
   每表面一条噪声配方（滤波中心频率、衰减、音量不同）
2. **区 → 默认表面：**  
   - mulgore → `grass`（营地建筑附近 `wood`）  
   - barrens → `dirt`  
   - molten_core / onyxias_lair → `ash`  
   - wailing_caverns → `stone`  
   - 可选：脚下近建筑/桥用简易半径检测切 `wood`/`stone`（无碰撞网格时用兴趣点列表）
3. **触发：** 玩家 `moving` 且存活时按 `BAL.sfx.footstepInterval`（约 0.32–0.38s）交替左右；同伴可选同表面低音量；坐骑日后复用 API
4. **天气联动（可选精致项）：** 雨天 `grass`/`dirt` 略加湿泥变体（`grass_wet`），仍 render-only

##### C · 受击与击打分层

| 事件 | 音色键 | 接线点 |
|------|--------|--------|
| 玩家挨打 | `hit_player` / 护盾时 `hit_shield` | `playerHit` |
| 野猪/狼等肉体 | `hit_flesh` | `hitEntity` → mob `onHit` 或统一出口 |
| 野猪人/甲壳感 | `hit_shell` | quilboar / deviate 等 type 映射 |
| 龙/奥妮 | `hit_scale` | boss / onyxia |
| 火焰元素 | `hit_element` | flame spawn / ragnaros 近战反馈 |
| 玩家打出暴击感（可选） | `hit_crit` 短金属叮 | 伤害浮动顶档时 |

族群映射表 `SFX_MOB_HIT[type]` 放 `sfx.js` 或 `BALANCE.sfx.mobHit`，**加新怪 = 加一行，不改合成器**。

##### D · 技能 / 施法 / 战斗反馈音色清单（最低完备集）

**通用战斗**

- `swing`（保留）· `swing_heavy`（旋风/英勇）· `arrow` · `arrow_multi`
- `cast_start` · `cast_done` · `cast_interrupt`（为 V1-C5 打断预留）
- `block` / `dodge`（有闪避/屏障时）· `death_player` · `respawn`

**职业（在现有 CLS.sfx 之上按技能覆盖）**

- 战士：`charge` · `whirlwind`
- 法师：`fireball`（保留）· `frost_nova` · `blink` · `ice_block`
- 猎人：`aimed` · `multi_shot` · `roll`
- 牧师：`heal` · `flash_heal` · `holy` · `holy_shield`

**Boss / 环境技能**

- `breath_fire`（奥妮深呼吸 / 喷火）· `breath_poison`（哀嚎）
- `lava_burst` · `eruption` · `wing_flap`（可与动画同拍，低频）
- `portal` · `teleport`

**UI / 进度**

- `ui_open` · `ui_close` · `quest_accept` · `quest_complete`
- `vendor_buy` · `vendor_sell` · `deed` · `loot_rare`（蓝）· `loot_epic`（紫，短琶音）

##### E · 音乐与氛围

| mode | 用途 | 调性方向 |
|------|------|----------|
| `world` | 莫高雷 | 保留五声平静 |
| `barrens` | 贫瘠 | 保留偏干略快 |
| `wailing` | 哀嚎洞穴 | 小调、潮湿垫底、慢 |
| `onyxia` | 巢穴 | 低弦压迫 + 稀疏鼓点 |
| `raid` | 熔火 | 保留 |
| ambience `rain` / `wind` / `cave_drip` | 随 `getWeatherType()` 或 zone | 极低音量循环噪声，可关 |

`enterZone` → `SFX.music(to.music)` 已有；各 `registerZone` 的 `music` 字段对齐上表。  
`updateWeather` 或 `setWeather` 末尾可选 `SFX.ambience(...)`（须 `BAL.sfx.ambience!==false`）。

##### F · `sfx_studio.html`（本项**必做**，非可选）

极简单页（可无 Three.js）：

1. 列出全部 `SOUNDS` 键；点击试听  
2. 显示/编辑当前条 JSON 参数（textarea），「应用并试听」  
3. 「导出当前条」复制到剪贴板，便于贴回 `sfx.js`  
4. 分轨音量滑条；脚步表面试听矩阵  
5. **不进主游戏包强制加载**——独立打开即可；`README` / `CLAUDE` 记一条命令说明  

##### G · 接线与文件清单

| 文件 | 改动 |
|------|------|
| `sfx.js` | 内核 + SOUNDS/MUSIC 扩表 + 新 API |
| `core.js` | `BALANCE.sfx` |
| `main.js` | 脚步 tick；可选 ambience |
| `combat.js` / `world.js` / `raid.js` / `onyxia.js` / `wailing.js` | 受击/技能/Boss 换键 |
| `panels.js` / `items.js` / `deeds.js` / `quests.js` | UI 音 |
| `zones.js` 或各 zone | `music` 字段 |
| `sfx_studio.html` | 新建 |
| `test_step01.js` | 音色数量、API、无二进制音频、脚步/受击键存在 |
| `DESIGN.md` | 补一节「音频设计语言」（短） |

##### H · 验收标准（全部满足才 ✅）

- [x] `SOUNDS` 具名键 **≥45**；`SFX.list()` 可枚举  
- [x] 莫高雷跑步可分辨草步；进熔火变为渣/石步；`BAL.sfx.enabled=false` 无脚步  
- [x] 打野猪与打火焰之子受击音色不同；奥妮阶段/深呼吸可听出 `breath_fire`  
- [x] 打开法术书/交任务/出紫装各有独立短音  
- [x] 哀嚎 / 奥妮音乐与熔火可区分；静音总闸仍可用  
- [x] `sfx_studio.html` 可试听并导出一条参数  
- [x] 仓库无新增音频二进制；`node test_step01.js` 绿  
- [x] 团战叠音不破音（节流生效）；移动端 Safari 仍须「启程」后 `init`

##### I · 明确不做（本项边界）

- 真实采样库、音乐 Mid 文件、空间化 HRTF（可远景）  
- 语音台词 / TTS  
- 按键音效全键盘覆盖（只覆盖游戏内动作）  

##### J · 实施顺序建议

1. 内核（分轨、layers、节流、`BALANCE.sfx`）  
2. 脚步 + 区表面  
3. 受击分层 + 技能键替换  
4. Boss/UI/音乐/氛围  
5. `sfx_studio.html` + 测试 + `DESIGN.md`  
6. QA：人工戴耳机走一遍「营地→贫瘠→哀嚎→奥妮」

---

### 轨 B · 内容扩张（可玩密度）`P0`

#### V1-B1 · 第三开放区「杜隆塔尔风」`P0`

- 新 `durotar.js`（或灰谷）：橙土 + 兽人哨站风味（命名走粉丝向，避免直接商标图腾）
- 传送：贫瘠东/北口或奥格瑞玛外门风格旋涡
- 野怪：蝎、刺猪变体、鹰身加强
- **验收：** `enterZone` + 小地图 + 存档 `zoneId`；等级门 ~12

#### V1-B2 · 任务网加厚 `P0`

- 每区目标：**主线 1 条链（3–5 节）+ 支线 ≥6**
- 新目标类型：交付物品、使用物品、到达地点、护送（简化跟随 NPC）
- **验收：** L 日志可滚动；存档不丢进度

#### V1-B3 · 第四副本「怒焰裂谷·精简」`P0`

- 单 Boss 或双 Boss；复用 `createBoss` + 红圈/直线
- 挂查找器 `BAL.lfg.entries`
- **验收：** Shift+I 可进；通关功绩一条

#### V1-B4 · Heroic 难度档 `P1`

- `BAL.difficulty.heroic`：怪物 HP/伤害倍率、掉落权重偏蓝紫
- 查找器可选普通/英雄（仍本地）
- **验收：** 同本英雄更疼；掉落表可统计差异

#### V1-B5 · 本地 Delve（可选）`P2`

- 固定种子房间序列（3–5 室）+ AI 同伴
- 对标 WoC Delve 的最小切片，不做无限随机炫技

---

### 轨 C · 职业与战斗系统 `P0–P1`

#### V1-C1 · 第五职业「萨满」`P0`

- `buildHumanoid` 配置 + 图腾式技能（地面 aura 简易版）
- 天赋双枝；查找器职责填表更新

#### V1-C2 · 第六职业「盗贼」`P1`

- 能量 + 潜行（脱战隐身简化）+ 背后伤害倍率
- **验收：** 潜行时野怪 aggro 半径缩小

#### V1-C3 · Buff / Debuff 条 `P0`

- `buffs.js`：`applyBuff` / `tickBuffs` / HUD 行
- 迁入：盾、虚弱、恐惧、磨刀石、食物
- **验收：** 所有持续效果可在 HUD 看见剩余时间

#### V1-C4 · 技能等级（Rank）`P1`

- 技能随角色等级自动升 R2/R3（数据表，不改 UI 槽位数）
- **验收：** 同键位高阶数值变；法术书显示 Rank

#### V1-C5 · 坦克嘲讽 / 打断 `P1`

- 战士嘲讽：强制顶仇恨一段时间
- 通用打断（对 cast 条）
- **验收：** 奥妮 P1 坦克可稳定拉住

---

### 轨 D · 经济与生活系统 `P1`

#### V1-D1 · 银行（营地箱）`P1`

- 额外 16–24 格仓库，存档字段 `bank[]`
- **验收：** 背包满时可存；换角不影响（单角色制则仅本档）

#### V1-D2 · 本地邮箱 `P2`

- NPC「邮差」：任务奖励延迟到达 / 系统补偿
- 不做玩家间邮件

#### V1-D3 · 伪拍卖行（单机）`P2`

- 只读货架：系统挂单轮换（`srand` 日种子）
- 玩家上架 → 本地超时售出（伪买手），非联网

#### V1-D4 · 坐骑 / 飞行器外观 `P2`

- 移速 buff + 程序化坐骑模型（狼/科多风）
- **纯外观或微移速**，不破坏副本设计

---

### 轨 E · 工程体验（单机友好，非联机）`P1–P2`

#### V1-E1 · `debug.js` 作弊台收口 `P1`

- `?dev`：`level / give / tp / kill / god / zone / boss / weather`
- 对标 WoC `ALLOW_DEV_COMMANDS` 的**本地子集**

#### V1-E2 · dispose / 移动端阴影预算 `P1`

- 补完 `plan-merged` STEP 12 余项
- 移动端默认阴影 ≤1024 或关

#### V1-E3 · 可选无头清本 bot `P2`

- `scripts/raid_bot.mjs` 打通熔火（**不**抽完整 `sim/`）
- 若日后要联机再升级为 STEP 30

#### V1-E4 · 🚫 明确不做清单

- 权威服务器 / Postgres / WebSocket 同步  
- 公会、真实交易、点击交易原子交换  
- Electron / iOS / Android 壳  
- Web3、代币、内购外观店  
- Gymnasium RL、22 语言 i18n（可远景）  

---

## 五 · 建议排期（单机优先）

```
波次 1（手感 + 可读性）     V1-A1 A2 · V1-C3 · V1-E1 E2
波次 2（内容爆发）           V1-B1 B2 · V1-C1
波次 3（副本与难度）         V1-B3 B4 · V1-C5
波次 4（职业与生活）         V1-C2 C4 · V1-D1 · V1-A3 A4
波次 4.5（音效完善）         V1-A5（单独质量波，一次做透）
波次 5（可选甜点）           V1-B5 · V1-D2 D3 D4 · V1-E3
```

每波次结束：更新本文件进度表 + `node test_step01.js` 绿灯 + 人工 4 分钟烟测（出生→任务→进本→出本）。

---

## 六 · 与 `plan-merged.md` 的关系

| 文件 | 角色 |
|------|------|
| `plan-merged.md` | v1.4→v4.0 **已执行账本**（STEP 0–29 ✅）；十/十一章联机规划保留作远景备忘 |
| **`plan-v1.md`（本文件）** | **下一阶段单机产品路线**；执行时开新 STEP 分支，勿与旧 30–36 编号混用 |
| `DESIGN.md` | 视觉与 UI 规范；轨 A 改动须遵守 |
| `AGENTS.md` | 仍用 architect → implementer → qa 流程 |

---

## 七 · 进度表（初始）

| ID | 标题 | 优先级 | 状态 |
|----|------|--------|------|
| V1-A1 | 城镇建筑工厂 | P0 | ✅ |
| V1-A2 | 图标全面 Icons | P0 | ✅ |
| V1-A3 | 生物动画挂点 | P1 | ✅ 全量 |
| V1-A4 | 天气层 | P1 | ✅ |
| V1-A5 | SFX 扩表+材质脚步+studio | P1 | ✅ |
| V1-B1 | 第三开放区 | P0 | ⏳ |
| V1-B2 | 任务网加厚 | P0 | ⏳ |
| V1-B3 | 第四副本 | P0 | ⏳ |
| V1-B4 | Heroic | P1 | ⏳ |
| V1-B5 | Delve | P2 | ⏳ |
| V1-C1 | 萨满 | P0 | ⏳ |
| V1-C2 | 盗贼 | P1 | ⏳ |
| V1-C3 | Buff 条 | P0 | ⏳ |
| V1-C4 | 技能 Rank | P1 | ⏳ |
| V1-C5 | 嘲讽/打断 | P1 | ⏳ |
| V1-D1 | 银行 | P1 | ⏳ |
| V1-D2 | 邮箱 | P2 | ⏳ |
| V1-D3 | 伪拍卖 | P2 | ⏳ |
| V1-D4 | 坐骑 | P2 | ⏳ |
| V1-E1 | debug 作弊台 | P1 | ⏳ |
| V1-E2 | dispose/移动端 | P1 | ⏳ |
| V1-E3 | 无头 bot | P2 | ⏳ |

**下一步建议：** **V1-C3** Buff 条，或轨 B **V1-B1** 第三开放区。

---

## 八 · 参考

- WoC 仓库与 README：[levy-street/world-of-claudecraft](https://github.com/levy-street/world-of-claudecraft)  
- WoC 原则：程序化一切 · Content as data · 天气 render-only · 每步可验证  
- 本项目：`plan-merged.md` · `DESIGN.md` · `AGENTS.md` · `CLAUDE.md`

---

*AZEROTH3D · PLAN-V1 · 单机补齐路线 · 2026-07-21 · 对比 WoC 0.28 · 明确跳过联机/Web3/RL*
