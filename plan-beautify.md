# 熔火之心 · 美化计划（PLAN-BEAUTIFY v1.4）

**对标 `levy-street/world-of-claudecraft`（以下简称 WoC，v0.23.0，2026-07 抓取）**
基线：本项目 v1.3.5 五模块（core / models / world / combat / main）+ `game.html`

---

## 进展账本（2026-07-23）

对照〇节「WoC 真实做法」与第五节 STEP，当前落地情况：

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 树 / 石 / 灌木（〇·16） | ✅ | Quaternius Nature GLB · InstancedMesh 分桶 / 风摆 / 弱色调 · 各分区 `placeZoneTrees` + `rockCount` |
| 房子 / 帐篷 / 围栏 / 墓碑 / 码头（〇·17） | ✅ | Village + Kenney/Pirate GLB · `buildHut`/`Tent`/`Fence`/`Graveyard`/`Dock` · camera-ghost |
| 天空 HDRI（〇·18） | ✅ | `env/*_1k.hdr` · 分区生物群系 · 太阳方位 `uOff` · 可选 PMREM IBL |
| 技能图标（〇·19） | ✅ 守住程序化 | 仍走 `icons.js` Canvas；**不碰** CraftPix |
| 地形 / 摆放种子（〇·20） | ✅ 本就如此 | `srand` / 分区种子不变 |
| 地面细节 / 草簇 / 云（〇·21） | ✅ 本就如此 | `textures.js` / `props.js` canvas |
| **STEP B3.5** 资源试用与管线 | ✅（精简落地） | 成品 GLB 入库 + `scripts/decode_glb.mjs` + `CREDITS.md`；未建完整 `npm run assets` 压缩管线 |
| **STEP B4** 树 / 房子 | ✅ | 见第三节状态条与 B4 验收注记 |
| **STEP B0** 渲染管线 | 🟡 部分 | Three **r165** + ACES + `SRGBColorSpace` + HDRI IBL；**未做** UnrealBloom / N8AO / 调色 pass |
| **STEP B5** 角色与怪物 | 🟡 生物侧完成 | 12 种 Quaternius 生物 GLB 全接入（20 mob 类型自动 GLB + 9 新类型）；**玩家角色 GLB 未做**（KayKit Adventurers 待入库） |
| **STEP B1–B3 / B6–B8** | ❌ 未做 | UI token、名牌选择环、Bloom 等仍按原计划 |
| **附录 B** CC0 资源调研（2026-07-23） | ✅ | 角色/生物/武器/地下城/世界装饰 CC0 资源清单（见附录 B）；下一步取用验证 |
| **Quaternius 生物 GLB**（B.2/P0） | ✅ 入库 | 12 种：野猪/狼/蜘蛛/狐狸/雄鹿/公牛/地精/兽人/巨人/恶魔/龙/幽灵 · `models/creatures/` 2.3 MB |
| **生物 GLB 全接入**（B.2/P0） | ✅ | 9 种待接入生物已全部完成：QUADS 映射（12→20 种 mob 自动 GLB）+ humanoid GLB 优先 + MOB_TYPES 9 新条目 + BAL 数值 9 条 + 掉落表 9 条 + 稀有/世界 Boss 注册 + 莫高雷/杜隆塔尔/贫瘠之地/黑石山刷新点 |

**下一步建议（按性价比）**：补完 **B0 剩余**（Bloom + OutputPass）→ **B1** 目标框/token → **B5 剩余**（KayKit 玩家角色 GLB 入库 + 动画状态机接入）。

**当前模型库存**：`models/foliage/` 16 MB（松×5/橡×4/枯×3/扭曲×3/灌木×2/蕨/蘑菇/岩石×3）+ `models/props/` 2.7 MB（房×3/旅店/铁匠铺/钟楼/帐篷×2/围栏/码头/墓碑×5）+ `models/creatures/` 4.7 MB（野猪/狼/蜘蛛/狐狸/雄鹿/公牛/地精/兽人/巨人/恶魔/龙/幽灵 12 种，meshopt→标准浮点 GLB）· 合计 **23 MB**。

相关提交：`44cf8eb`（树/房）· `abd20eb`（石/围栏/墓碑/码头/HDRI）· `00a1678`（Three r165）。

---

## 〇 · 先说一件必须修正的事

现有 `plan-merged.md` 第 1.1 节写的是「WoC 95% 是代码生成，几乎不用第三方美术资源」。**这个结论对当年的 WoC 成立，对今天的 WoC 已经不成立了。** 直接看它今天的源码：

| 类别 | 今天 WoC 的真实做法 | 证据 |
| --- | --- | --- |
| 玩家 / 怪物 / NPC | **全部是 GLB 骨骼模型**，KayKit + Quaternius CC0 包 | `src/render/characters/CLAUDE.md`：「**Everything is GLB-loaded**，there is no procedural-rig path here anymore」 |
| 武器 | GLB，按骨骼挂点 `handslot.r/.l` 挂载 | `manifest.ts`：`sword_1handed.glb` / `staff.glb` / `crossbow_1handed.glb` … |
| 树 / 石 / 灌木 | **Quaternius Stylized Nature MegaKit（CC0）GLB** | `foliage.ts` 文件头注释原文 |
| 房子 / 帐篷 / 围栏 / 墓碑 / 码头 | **Quaternius medieval village + Kenney 套件（CC0）GLB** | `props.ts` 文件头注释原文 |
| 天空 | **Poly Haven 真 HDRI**，每生物群系一张，按方位角旋转对齐太阳 | `sky.ts` |
| 技能图标 | 大部分仍是 canvas 程序化配方；但主力职业图标是**采购的 CraftPix WebP 美术** | `ui/CLAUDE.md` + `CREDITS.md` |
| 地形高度 / 摆放位置 / 世界种子 | ✅ 仍然是确定性程序化 | `sim/world.ts` |
| 地面细节贴图 / 草簇 / 云 | ✅ 仍然是 canvas 程序化 | `textures.ts`：「Procedurally generated canvas textures — no external assets」 |
| UI / HUD | ✅ 仍然是纯 DOM + CSS，零框架 | `ui/CLAUDE.md` |
| 音效 | ✅ WebAudio 程序合成（另有少量 CC BY-NC 录音） | `CREDITS.md` |

**所以问题 2、3 的答案其实是同一个：WoC 的玩家、怪物、树、房子之所以「明显更精细」，不是因为它的程序化几何体代码写得比我们好，而是它在 2025→2026 之间换了路线——把「实体资产」从代码生成换成了 CC0 资源包，把渲染管线从裸 `MeshStandardMaterial` 升级成了 PBR + IBL + 后处理。**

这不是坏消息。CC0 = 公有领域，无署名要求、可商用、可再分发（Quaternius / KayKit / Kenney / ambientCG / Poly Haven 全部如此，见其 `CREDITS.md`）。真正**不可**照抄的只有三类：CraftPix 采购的技能图标、项目自有商业美术、CC BY-NC 的音效。

下面的计划因此分成 **A 线（换资源，追平观感）** 与 **B 线（守住零文件纪律，靠工艺追近）**，每一节都给两套，你可以逐项选择。我的建议在每节末尾。

---

## 一 · 面板与布局：1:1 对齐 WoC

### 1.1 WoC HUD 全量清单（源自 `index.html` 的 `#game-ui-template`）

这是它在游戏内的**全部**面板与按钮，一个不漏：

**常驻框体**

| 区域 | id | 定位（`hud.css` 实测值） | 内容 |
| --- | --- | --- | --- |
| 玩家框 | `#player-frame` | 底部动作条堆栈内，可拖出后 `top:12px` 绝对定位 | 54×54 头像 canvas、等级角标、战斗中⚔闪烁、休息 z 图标、名字、连击点行、HP 条（含吸收盾叠层）、资源条（含低资源标签） |
| 目标框 | `#target-frame` | `left:12px; top:12px` | 头像、等级、**ELITE 标签**、名字、HP+吸收、资源、目标读条、**下挂 debuff 条**、**目标的目标迷你框** `#totarget-frame` |
| 队伍框 | `#party-frames` | 左侧竖列 | 最多 5 人行 |
| Buff / Debuff | `#buff-bar` / `#debuff-bar` | `right:196px; top:14px`，`row-reverse` 换行，`max-width:320px` | 图标 + 层数 + 剩余时间；debuff 按法术学派染边框（火/冰/奥/暗/自然/神圣各一色） |
| 玩家读条 | `#castbar` | `bottom:260px` 居中，`300×24` | fill / label / timer 三层 |
| 攻击摆动条 | `#swingbar` | 读条下方 | 近战 swing timer |
| 经验条 | `#xpbar` | `612×10`，动作条上方 | fill + **rested 蓝色叠层** + 20 段刻度 + 文本 |
| 动作条堆栈 | `#actionbar` / `2` / `3` + `#stancebar` + `#petbar` | 底部居中 `#bottom-bar { bottom:6px }` | 按钮 `.action-btn` = **46×46，2px `#4a3d1d` 边框，6px 圆角，径向渐变底** |
| 小地图组 | `#minimap-wrap` | `right:12px; top:10px; width:170px` | 区域名（金色 Cinzel）、162×162 圆盘 canvas、**副本锁定按钮**、**邮件指示器**、时钟（可切 12/24h）、坐标、**罗盘条**、**缩放 −/1×/+** |
| 右侧追踪堆栈 | `#right-tracker-stack` | 小地图下方 | 任务追踪 / 成就追踪 / 探险追踪 |
| 聊天 | `#chatlog-wrap` | `left:12px; bottom:8px; width:min(370px, 50vw-330px)` | 标签页（聊天/战斗/自定义频道/+）、滚动区、输入框、移动端收键盘按钮 |
| 伤害统计 | `#meters-window` | 动作条右侧 | Dmg / Heal / Threat 三标签 + 上一段/下一段/关闭 |
| 微型菜单 | `#side-buttons` | `right:16px; bottom:74px`，竖列向上 | 见下 |
| 其他 | `#tooltip` `#ctx-menu` `#nameplates` `#banner` `#quest-banner` `#subzone-banner` `#error-msg` `#low-health-vignette` `#death-overlay` `#ghost-prompt` `#click-move-marker` `#perf-overlay` | | 提示框、右键菜单、3D 名牌、居中横幅、子区域横幅、低血红晕、死亡覆盖层（释放灵魂）、幽灵状态复活按钮、点击移动标记 |

**微型菜单按钮（`.micro-btn`，34×30，每个右下角带快捷键角标，hover 时背景向左伸出显示名称）**

`C` 角色 · `P` 法术书 · `N` 天赋 · 城镇焦点 · `L` 任务日志 · `Shift+Z` 功绩之书 · `Shift+P` 专业 · `M` 世界地图 · `B` 背包 · `T` 制造 · `G` 竞技场 · `Shift+I` 副本查找器 · `Y` 山谷杯 · 卡牌决斗 · `K` 排行榜 · `X` 表情 · 音乐 · `O` 社交 · `U` Discord · `Esc` 游戏菜单 · 商店

**窗口层（全部 `.window.panel`，共享拖动/缩放/焦点陷阱）**

任务对话、探险板、开锁、战利品、背包、角色、观察他人、拾取设置、法术书、天赋、任务日志、商人、训练师、卡牌决斗、城镇焦点、制造、世界地图（560×560 canvas + 缩放）、竞技场、副本查找器、山谷杯、排行榜、每日奖励、Claudium、市场、邮箱、银行、功绩、专业、日历、选项、表情编辑器、社交、举报、交易。

### 1.2 设计 token（**投入产出比最高的一步**）

WoC 的「像经典 MMO」感 80% 来自 `src/styles/tokens.css` 这套 token，抄过来只要改 CSS 变量，不动一行 JS：

```css
:root{
  --gold:#ffd100; --gold-dim:#c8a838; --border:#6f5a2a;
  --panel-base:#15151f;
  --panel-bg:linear-gradient(170deg,#15151ff2 0%,#0b0b12f2 60%,#08080df2 100%);
  --font-display:"Cinzel","Palatino Linotype",Palatino,Georgia,serif;  /* 标题/纹章 */
  --font-ui:"Alegreya Sans","Segoe UI",system-ui,sans-serif;           /* 正文/UI */
  --font-serif:"Alegreya",Palatino,Georgia,serif;                      /* 风味叙述文 */
  --color-hp:#1eb838; --color-mana:#2b7bd4; --color-rage:#c0392b; --color-energy:#e4c531;
  --color-hostile:#ff6b5e; --color-friendly:#9fdc7f;
  --color-buff:#3a6ea8; --color-debuff:#c0392b;
  --color-debuff-fire:#e8722a;  --color-debuff-frost:#4aa3df;
  --color-debuff-arcane:#3f8cff;--color-debuff-shadow:#9b59d0;
  --color-debuff-nature:#35a835;--color-debuff-holy:#d8b56b;
  --color-bg-dark:#08080d; --color-border-default:#4e3d1d;
  --color-text-light:#f0ebd8; --color-text-muted:#998d6a; --color-text-overlay:#f4eede;
}
```

我们当前是 `--ember/--lava/--gold/--coal` 一套熔岩橙。**建议：保留熔岩橙作为副本场景的强调色，但把面板底色、边框、字体、资源条颜色换成上面这套**——现在整个 UI 是橙色的，缺少「暗底 + 金边 + 彩色资源条」的层次对比，这正是观感差距的主因。字体尤其关键：`Cinzel` + `Alegreya Sans` 与现在的 `Noto Sans SC` 完全是两种气质（中文标题可用 `Cinzel` + 思源宋体的组合）。

### 1.3 我们的差距与补齐批次

| 面板 | 现状 | 批次 |
| --- | --- | --- |
| 目标框（含头像 / 等级 / ELITE / debuff / 目标的目标） | ❌ 完全没有 | **B1** |
| 玩家框头像 canvas + 等级角标 + 战斗/休息图标 | ⚠️ 只有名字 + 两条 | **B1** |
| 微型菜单竖列 | ❌ | **B1**（先做 6 个：角色/背包/技能/任务/地图/菜单） |
| 小地图组（圆盘 + 区域名 + 坐标 + 罗盘 + 缩放） | ❌ | **B2** |
| Buff / Debuff 条 | ❌ | **B2** |
| 经验条（含 rested 层 + 刻度） | ❌ | **B2**（与 plan STEP 3 合并） |
| 动作条按钮升级为 46×46 + 图标位 + 冷却扫描 | ⚠️ 58×58 emoji | **B1**（配合 `icons.js`） |
| 名牌 / 选择环 / 飘字池化 | ⚠️ 有飘字，无名牌无选择环 | **B3** |
| 聊天标签页 | ⚠️ 单一日志 | B4 |
| 提示框 tooltip / 右键菜单 | ❌ | B4 |
| 窗口通用底座（拖动 / 缩放 / Esc 关闭 / 焦点陷阱） | ❌ | **B2**（背包/角色/天赋都要用，先建底座再建窗口） |
| 死亡覆盖层 / 低血红晕 / 横幅 | ⚠️ 有红晕和 announce | B4 |

**关键工程建议（抄 WoC 的两条纪律）**

1. **窗口先有底座，再有窗口。** WoC 的 `window_drag_core` / `window_resize_core` / `focus_manager` / `movable_frame` 都是实例参数化的公共件，每个新窗口只写「纯 view 决定内容 + 薄 painter 画 DOM」。我们现在只有一个 `#dlg`，在做背包之前先把这层底座建起来，后面 10 个窗口就是复制粘贴。
2. **每帧写 DOM 必须过消除层。** WoC 强制所有每帧 DOM 写走 `setText/setWidth/setTransform` 包装，值不变就跳过。我们的 `updateUI()` 每帧直接写 `textContent` 和 `style.width`，面板一多必掉帧。这层大约 30 行，越早加越省事。

---

## 二 · 玩家与怪物的精细度

### 2.1 WoC 现在怎么做的

```
GLB（KayKit Adventurers / Skeletons，Quaternius creatures）
  → GLTFLoader 加载，SkeletonUtils.clone 每实体一份
  → 每实体一个 AnimationMixer + 剪辑状态机
  → 骨骼挂点 attach: [{url:'sword_1handed.glb', bone:'handslot.r'}]
  → rig_merge 把同材质的身体部件合并成 1 个 draw call
  → crowd_lod 按同屏 rig 数量降阴影/降动画频率
  → portrait.ts 用离屏 WebGL 渲染真模型出头像 PNG，缓存 dataURL
```

动画状态机（`anim_state.ts`，纯函数、可单测）：
`idle | walk | walkBack | run | cast | spin | swim | sit | jump`，
外加 `playAttack()` / `playHit()` / 死亡与复活的边沿触发一次性动画，
`locomotionTimeScale()` 做**脚步与移速匹配**（避免滑步）。
攻击剪辑还能按武器类型（双手/双持）和**具体技能**切换（`mortal_strike → 2H_Melee_Attack_Chop`）。

### 2.2 A 线：换 GLB 资源（追平，快）

- 资源：KayKit Adventurers（人形职业）、KayKit Skeletons、Quaternius 动物与怪物。全 CC0。**具体文件路径、体积、来源包见附录 A。**我们要用的是 `chars/players/knight.glb`（战士，1.2 MB）、`mage.glb`（法师，1.2 MB）、`ranger.glb`（弓箭手，1.2 MB）、`creatures/wild_boar.glb`（野猪，284 KB）三加一共四个文件，**总计约 3.9 MB 就能替换掉整个 `models.js` 的玩家与野猪**。
- 代码量意外地小：`GLTFLoader` + `SkeletonUtils.clone` + `AnimationMixer`，约 150 行就能替换掉整个 `models.js` 的玩家与野猪。
- 我们已有的 `models.js` 不必删——**保留给 Boss 拉戈斯**。程序化 Boss 是我们的特色（20 米高熔岩巨人、燃烧王冠、发光巨锤），换成通用资源包反而变平庸。
- 代价：仓库出现 `.glb` 文件，「零资源文件」纪律终结。约 5–15 MB。

### 2.3 B 线：守住程序化，靠工艺追近

如果你想保住零文件纪律，下面这些是**真正拉开差距的工艺**，与是不是程序化无关：

1. **骨骼化，别再用 Group 嵌套摆姿势。** 现在 `buildPlayer()` 是一堆 Box 直接 `g.add()`，`userData={armR,armL}` 手动转两个 Group。改成真 `THREE.Skeleton` + `SkinnedMesh`（程序化生成骨骼树与蒙皮权重完全可行），立刻能做走路摆臂、受击后仰、死亡侧倒、施法抬手，且全族群复用。
2. **剪辑状态机而不是 if 链。** 抄 `desiredBaseState(input) → BaseState` 的纯函数形状：输入速度/是否读条/是否坐下/是否死亡，输出一个状态名；`locomotionTimeScale` 让摆腿频率 = 移速 / 步幅，滑步感消失。这条对「精细感」的贡献超过多加 20 个几何体。
3. **别用纯 `BoxGeometry`。** 换 `RoundedBoxGeometry`（或 Box + 顶点位移倒角）、`LatheGeometry` 做肩甲/头盔、`ExtrudeGeometry` + `bevelEnabled` 做剑刃与盾牌。低模风格的精致度几乎全在**倒角与轮廓**，不在多边形数量。
4. **材质分层与程序化贴图。** 抄 `textures.ts`：canvas 画法线/粗糙度/AO 图（16 行一个函数），给盔甲加金属划痕、给皮毛加噪声、给岩石加斑驳。现在所有模型都是**单色纯 `MeshStandardMaterial`**，这是「塑料感」的直接来源。
5. **每个可选中实体加：选择环（地面发光圆环）+ 名牌（血条 + 名字 + 等级，按敌对/中立/友好染色）+ 受击闪白。** 这三样的「游戏感」增益远大于模型细节。
6. **头像。** 离屏 `WebGLRenderTarget` 渲染玩家/目标模型的头部，输出 dataURL 塞进目标框——我们程序化模型一样能做，代码 40 行。

### 2.4 建议

**混合：玩家 + 普通怪走 A 线（GLB），Boss + 特效 + 图标 + 音效守住程序化。**
理由：玩家角色和野猪是**每一秒都在屏幕中央**的东西，精细度收益最大而美术难度最高；Boss 是我们的招牌，程序化反而独一无二；图标/音效/VFX 程序化的成本收益本来就好。
如果决心零文件，走 B 线，优先级：**骨骼化 > 状态机 > 名牌/选择环 > 倒角几何 > 程序化贴图**。

---

## 三 · 树木与房子

> **状态（2026-07-23）：A 线已落地** — `models/foliage|props/*.glb`（树/石/灌木 + 房/帐篷/围栏/墓碑/码头）+ `env/*_1k.hdr`（Poly Haven HDRI）+ `assets.js` / `sky.js` + InstancedMesh 分桶/风摆/弱色调；技能图标仍走 `icons.js` 程序化（不碰 CraftPix）。地形高度/摆放/种子与 canvas 地面细节贴图保持程序化。见 `CREDITS.md`。引擎已升至 **Three.js r165**（`vendor/three.r165.js`）。

### 3.1 WoC 的做法（`foliage.ts` / `props.ts` 原文提炼）

**模型**：树 = Quaternius Stylized Nature MegaKit（松/橡/枯木/沼泽扭曲树），房子 = Quaternius medieval village + Kenney nature/pirate/graveyard/fantasy-town 套件。全 CC0 GLB。

**但真正让它「看起来精细」的是渲染工艺，这部分我们可以完全照抄，不需要任何资源文件：**

| 技法 | 做法 | 收益 |
| --- | --- | --- |
| **确定性摆放** | 位置仍由 `generateDecorations(seed)` 生成，模型只是替换外观 | 世界固定，与我们 STEP 0 的 `SeededRng` 完全兼容 |
| **InstancedMesh 分桶** | 按（x 左右半区 × 200 单位 z 带）分桶，每桶一个 InstancedMesh | 整片离屏森林被视锥/雾一次性剔除，几百棵树 = 几个 draw call |
| **每桶哈希选变体** | 用桶坐标哈希决定这桶用哪几个树模型变体 | 多样性高但 draw call 不爆炸 |
| **`instanceColor` 弱色调** | 每实例上色但**向白色收敛**（强色调会读成脏） | 一片树林有细微色差而不花 |
| **树冠 alpha-cutout 投影，树干不投影** | 只有 canopy `castShadow=true` | 阴影预算减半，观感不变 |
| **风摆 shader** | `onBeforeCompile` 注入共享 `uTime`，摆动权重随局部 y 上升（树干钉死、树梢摇） | 静态场景立刻「活」起来，成本近乎为零 |
| **草地按 chunk 流式** | 玩家周围按 chunk 生成/回收，而不是整环重建 | 移动时不卡帧 |
| **地面装饰哈希网格散布** | 灌木/蕨/蘑菇按哈希网格撒、无碰撞、可穿行 | 地面不空 |
| **烘焙节点变换** | glTF 节点变换一次性烘进 BufferGeometry | 省运行时矩阵 |

房子侧：重复件（墓碑、栅栏模块、小装饰）走 InstancedMesh 分带；一次性组合体烘进世界坐标后**按（材质 × z 带）合并**；**相机穿墙时自动隐藏挡住视线的道具**（`camera-ghost prop`）——这个细节我们现在完全没有，第三人称相机撞墙时体验很差。

### 3.2 我们现在的差距

> **（历史差距 · 已由 A 线关闭）** 升级前 `world.js` 的树是：`CylinderGeometry` 树干 + 一个 `SphereGeometry` 缩 y 的球当树冠，单色，逐个 `sceneWorld.add()`；房子是：`ConeGeometry` 帐篷 + 程序化木桁架。

当时「明显不精细」有三个独立原因，**A 线已一次性通解**：

1. ~~形体过简（一个球 = 一棵树）~~ → GLB 变体 + 分区生物群系权重
2. ~~单色无贴图无风摆（死物感）~~ → GLB 贴图 + `onBeforeCompile` 风摆 + `instanceColor` 弱色调
3. ~~逐个 add（draw call 爆炸）~~ → InstancedMesh 分桶

**仍未做（留给 B5 / 角色线）**：玩家 / 野怪仍是程序化人形 / 族群几何，未换 KayKit / Quaternius 角色 GLB。

### 3.3 两条路线

**A 线**：引入 Quaternius Stylized Nature MegaKit + Medieval Village（CC0），摆放逻辑一行不改，只把 `new THREE.Mesh(sphere, leafMat)` 换成 `InstancedMesh` 引用 GLB 几何。**这是 3.2 三个原因的一次性通解。**

体积小得出乎意料——WoC 压缩后的实际大小（见附录 A）：`pine_1.glb` 107 KB、`oak_1.glb` 180 KB、`dead_1.glb` 141 KB、`bush.glb` 48 KB、`house_1.glb` **83 KB**、`inn.glb` 91 KB、`blacksmith.glb` 95 KB、`tent_small.glb` **6 KB**。我们需要的最小集（5 树 + 2 灌木 + 3 房 + 1 帐篷 + 1 铁匠铺）**合计不到 1.2 MB**，比一张背景图还小。

**B 线（程序化，仍能大幅提升）**：

- **树**：树干用 `CylinderGeometry` 上下不同半径 + 轻微弯曲（顶点位移）；树冠改成 **3–5 个大小不一、互相偏移的低面数十二面体/锥体簇**，而不是一个球；每棵树随机倾斜 ±0.15 弧度；树冠顶点色从底部深绿到顶部亮绿渐变；加风摆 shader。这一条就能让树从「棒棒糖」变成「树」。
- **房子（木桁架套件化，WoC 早期就是这么做的）**：拆成 6 个部件工厂——地基石台 / 墙板（白灰泥）/ **深色木斜撑与横梁**（timber-frame 的灵魂）/ 双坡屋顶（可加瓦片条纹）/ 门窗洞 / 烟囱。然后 `buildHouse({w, d, floors, roof:'gable', chimney:true})` 参数化组合。**木桁架的黑白对比是「中世纪村庄」识别度的全部来源**，比多加多边形有效得多。
- **统一走 InstancedMesh 分带 + 视锥剔除**，把树的数量从现在的几十棵提到几百棵——数量本身就是精细度。

### 3.4 建议

树与房子**已走 A 线并收口**。后续世界装饰若再扩包（棕榈/悬崖等），继续 CC0 GLB + 同一套 InstancedMesh / 风摆管线即可。角色线见 **STEP B5**。

---

## 四 · 被忽略的大头：渲染管线与光照

三个问题都问「模型」，但 WoC 观感领先里有很大一块来自这里，且**完全不需要任何资源文件**：

| 项目 | WoC | 我们（2026-07-23） | 建议 |
| --- | --- | --- | --- |
| 色调映射 | ACES Filmic + sRGB 输出 | ✅ r165：`ACESFilmicToneMapping` + `SRGBColorSpace` + `toneMappingExposure` | 已落地；可按观感微调曝光 |
| 泛光 | UnrealBloom，`strength 0.32 / radius 0.55` | ❌ 无 | **下一步补 B0**；熔岩题材收益大 |
| 环境光遮蔽 | N8AO（high 半分辨率 / ultra 全分辨率） | ❌ 无 | 可选，成本较高 |
| 调色 pass | 提升/gamma/增益 + 饱和度 + 暗角 + 轻微动态颗粒 | ⚠️ 只有 CSS 暗角 | 建议，把 CSS `#vignette` 移进 shader |
| 环境贴图 IBL | Poly Haven HDRI → PMREM | ✅ HDRI 穹顶 + `PMREMGenerator.fromEquirectangular` | 已落地；可再调 gain/clamp |
| 画质分档 | `GfxTier: low/medium/high/ultra`，12 个分桶 | ⚠️ 已有 `GFX_PRESETS` low/balanced/high（阴影/粒子） | 可扩展到 Bloom/植被密度 |

**渲染管线乘数项：ACES/sRGB/HDRI 已接上；Bloom 仍是最大未做增益。**

---

## 五 · 分步执行计划

每步结束游戏都完整可玩，附验收标准。与 `plan-merged.md` 的 STEP 编号互不冲突（这里用 `B` 前缀）。

### STEP B0 · 渲染管线升级 `P0` · 半天
ACES 色调映射 + UnrealBloom(0.32/0.55) + OutputPass；`GFX` 两档配置（low/high，按 `devicePixelRatio` 与是否触屏自动选）；阴影贴图分辨率进 GFX 配置（移动端 1024）。
**验收**：熔岩湖与火焰有辉光但天空不过曝；低端档下帧率不低于改前；玩法数值零改动。
**🟡 部分完成（2026-07-23）**：Three.js **r165**（`vendor/three.r165.js`）+ ACES + sRGB 输出 + `BAL.sky.toneMappingExposure`；HDRI → PMREM IBL。**待补**：UnrealBloom + OutputPass；把 Bloom 强度挂进 `GFX_PRESETS`。

### STEP B1 · UI 骨架与 token `P0` · 1–1.5 天
换 token（第 1.2 节整段）+ 引入 Cinzel/Alegreya Sans（或本地等宽替代）；目标框（头像 canvas + 等级 + ELITE + 名字 + HP/资源 + 目标读条 + 下挂 debuff + 目标的目标）；玩家框补头像与等级角标、战斗/休息图标；微型菜单 6 键竖列；动作条按钮改 46×46 + `icons.js` 图标位 + 冷却扫描。同时落地**每帧 DOM 写消除层**（约 30 行）。
**验收**：截图与 WoC 并排，框体位置、配色、字体气质一致；Tab 切目标时目标框正确显示 ELITE 与 debuff；连续战斗 60 秒无掉帧。

### STEP B2 · 窗口底座 + 小地图组 + Buff 条 + 经验条 `P0` · 1.5 天
`window_drag / window_resize / focus_manager / esc-closeAll` 四个通用件（实例参数化）；小地图组（圆盘 canvas + 区域名 + 时钟 + 坐标 + 罗盘 + 缩放）；buff/debuff 条（含学派染色）；经验条（fill + rested + 刻度）。
**验收**：随便拖动/缩放/Esc 关闭任一窗口都正常；小地图能画出地形轮廓与玩家朝向；升级时经验条动画正确。

### STEP B3 · 名牌 + 选择环 + 头像渲染 `P1` · 1 天
3D 名牌（血条 + 名字 + 等级，敌对/中立/友好染色，带去重叠 declutter 与投影缓存）；地面选择环；离屏 WebGLRenderTarget 出头像。
**验收**：同屏 10 个怪名牌不重叠不闪烁；选中目标有明确视觉反馈。

### STEP B3.5 · 资源试用与管线（A 线专属，B 线跳过）`P0` · 半天试用 + 1 天管线
按**附录 A.3 第一阶段**稀疏克隆 WoC，取 `pine_1/2/3`、`oak_1/2`、`house_1/2/3`、`knight.glb`、`wild_boar.glb` 到 `assets/ref/`（**加 `.gitignore`，不提交**），用 `GLTFLoader` 替掉现有的树和玩家跑一遍，**看完效果再决定要不要继续走 A 线**。
决定继续后，进第二阶段：从官方 CC0 源自行下载原包，照抄 `build_assets.mjs` + `specs/*.json` 建自己的压缩管线（`@gltf-transform` + `meshoptimizer` + `sharp`），把 `assets/ref/` 的临时文件全部替换成管线产出，再建 `CREDITS.md` 登记。
**验收**：试用阶段有可对比的前后截图；正式阶段 `npm run assets` 能从 `tmp/asset_src/` 一键重建 `public/models/`，产出体积与 WoC 同量级（房子 <100 KB、树 <200 KB、角色 <1.3 MB）；`CREDITS.md` 每个包都有作者 / URL / 许可 / 可再分发性四列。
**✅ 精简落地（2026-07-23）**：已选定 A 线；树/建筑/岩石/HDRI 成品 GLB·HDR 入库；`scripts/decode_glb.mjs` 解压 meshopt/webp；`CREDITS.md` 已登记。完整 `npm run assets` 官方源压缩管线仍可选补做（当前用解码成品即可玩）。

### STEP B4 · 树 / 房子升级 `P0` · A 线 1 天 / B 线 2 天
按第三节选定路线。无论哪条，统一走 **InstancedMesh 分带 + 风摆 shader + 每实例弱色调 + 树冠投影树干不投影**；房子加相机穿墙自动隐藏。
**验收**：树木数量提升 3 倍以上而帧率不降；站营地看树梢随风摆动；相机贴墙时不被挡视线。
**✅ A 线已完成（2026-07-23）**：`treeCount` 48→160；GLB 分桶 + 风摆 + 弱色调 + 树冠投影；岩石 / 围栏 / 墓碑 / 码头 GLB；Poly Haven HDRI 穹顶（分区生物群系 + 太阳方位对齐）；`buildHut`/`buildTent` GLB；`ASSETS.updateCamGhosts`。技能图标保持程序化。引擎升至 r165。

### STEP B5 · 角色与怪物精细化 `P0` · A 线 1.5 天 / B 线 3 天
按第二节选定路线。无论哪条，必须落地：**纯函数动画状态机 `desiredBaseState()` + `locomotionTimeScale()` 脚步匹配 + 受击/死亡/施法一次性动画**。Boss 拉戈斯保留程序化。
**验收**：走路不滑步；受击有后仰、死亡有倒地；三职业外观差异明确；换武器时手上模型真的变。

### STEP B6 · 程序化贴图与材质分层 `P1` · 1 天
`textures.ts`：canvas 生成地面细节图、草簇图、岩石斑驳、金属划痕、云图；地形加细节贴图相乘；所有单色材质补 roughness/metalness 变化。
**验收**：地面在近处有细节不糊；盔甲有金属层次；仓库仍无任何图片文件。

### STEP B7 · 聊天标签页 / tooltip / 右键菜单 / 死亡覆盖层 `P2` · 1 天

### STEP B8 · 画质设置面板 + 移动端布局 `P2` · 1 天
选项窗口暴露画质档、UI 缩放、目标框缩放、显示目标的目标等；移动端独立 HUD 布局（触控 40×40 最小点击区、输入框 ≥16px 防 iOS 自动缩放）。

**总计**：A 线约 9.5 天（含 1.5 天资源管线），B 线约 12 天。

**路线决策（已定）**：世界实体（树/石/建筑/天空）走 **A 线 CC0**；技能图标守程序化。角色/怪物（B5）尚未选定 A/B。

---

## 六 · 附录 A：WoC 的 GLB 资源地图与取用路径

### A.1 全部 GLB 的位置

全在 **`public/models/`** 下，共 **959 个文件、56.9 MB**（已压缩过），按用途分 12 个子目录：

| 目录 | 数量 | 体积 | 内容 | 来源包 |
| --- | --- | --- | --- | --- |
| `chars/players/` | 11 | 12.6 MB | knight / mage / paladin / ranger / rogue / barbarian / druid / rogue_hooded / mage_classic / CombatMech / bow_anims | KayKit Adventurers |
| `chars/enemies/` | 7 | 7.7 MB | skeleton_warrior / _mage / _rogue / _dagger / _minion / _golem / necromancer | KayKit Skeletons |
| `creatures/` | 35 | 7.3 MB | wolf / wild_boar / fox / stag / bull / alpaca / spider / frog / goblin / orc / giant / yeti / demon / dragon / ghost / velociraptor / greyjaw（稀有精英）/ training_dummy… | Quaternius Animated Creatures |
| `weapons/` | 103 | 5.2 MB | 剑斧匕首法杖弩盾、`adv_*` 系列、命名神器 | KayKit |
| `foliage/` | 23 | 2.6 MB | `pine_1~5`、`oak_1~5`、`dead_1~3`、bush、bush_flowers、fern、mushroom | Quaternius Stylized Nature MegaKit |
| `props/` | 70 | 5.4 MB | **`house_1~3`、`inn`、`blacksmith`、`bell_tower`、`tent_open`/`tent_small`**、barrel、anvil、cart、bonfire、column、grave… | Quaternius Medieval Village + Fantasy Props；Kenney Survival Kit |
| `dungeon/` | 379 | 5.8 MB | 模块化墙/地/柱/拱/火把/旗帜/箱子/家具 | KayKit Dungeon Remastered + Kenney/Quaternius 地牢包 |
| `biome/` | 116 | 3.9 MB | 海滩/沼泽/雪山群系装饰（棕榈、码头、船锚、炮、海滩木屋） | Quaternius Pirate Kit、Kenney |
| `resources/` | 135 | 2.7 MB | 箱子木桶堆料（采集/制造用） | Kenney |
| `tools/` | 69 | 0.9 MB | 铁砧、斧、钓具、制造台工具 | Kenney / Quaternius |
| `quest/` | 11 | 2.9 MB | 任务专属道具（仪式圈、印记、货箱、魔典） | 项目自制 |

**我们要找的两类具体在这里：**

- **树** → `public/models/foliage/`：松 5 变体 + 橡 5 变体 + 枯树 3 变体，`foliage.ts` 按桶坐标哈希随机分配变体
- **房子** → `public/models/props/`：`house_1.glb` `house_2.glb` `house_3.glb` `inn.glb` `blacksmith.glb` `bell_tower.glb`

**关键单文件体积**（这是最反直觉的一点——远比想象中小）：

```
chars/players/knight.glb      1184 KB     foliage/pine_1.glb     107 KB
chars/players/mage.glb        1184 KB     foliage/oak_1.glb      180 KB
chars/players/ranger.glb      1209 KB     foliage/dead_1.glb     141 KB
creatures/wild_boar.glb        284 KB     foliage/bush.glb        48 KB
creatures/wolf_basic.glb       325 KB     foliage/fern.glb        57 KB
creatures/fox.glb              325 KB     props/house_1.glb       83 KB
creatures/stag.glb             310 KB     props/house_2.glb      101 KB
creatures/spider.glb           127 KB     props/house_3.glb       43 KB
                                          props/inn.glb           91 KB
                                          props/blacksmith.glb    95 KB
                                          props/tent_small.glb     6 KB
```

**我们的最小可用集：3 个玩家职业 + 野猪 + 5 树 + 2 灌木 + 5 建筑 ≈ 5 MB。** 「引入 GLB 会让仓库变重」这个顾虑基本不成立。

### A.2 来源包与官方下载地址（全部 CC0 1.0）

出自 WoC `CREDITS.md` 第 89–112 行的登记表：

| 包 | 作者 | 官方地址 | 我们要用的部分 |
| --- | --- | --- | --- |
| Character Pack: Adventurers 1.0 | KayKit | `github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0` | 玩家三职业 + 武器盾牌 |
| Character Animations (Rig_Medium) | KayKit | `kaylousberg.itch.io/kaykit-character-animations` | 全套人形动画库 |
| Character Pack: Skeletons 1.0 | KayKit | `github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0` | 亡灵怪（副本可用） |
| Dungeon Remastered 1.0 | KayKit | `github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0` | 熔火之心副本模块件 |
| **Stylized Nature MegaKit** | Quaternius | `quaternius.itch.io/stylized-nature-megakit` | **树 / 岩石 / 灌木 / 草** |
| **Medieval Village Pack** | Quaternius | `quaternius.com/packs/medievalvillage.html` | **房子 / 旅店 / 铁匠铺 / 井 / 货车** |
| Fantasy Props MegaKit | Quaternius | `quaternius.itch.io/fantasy-props-megakit` | 木桶木箱灯笼家具 |
| Animated Creatures | Quaternius | `poly.pizza/u/Quaternius` · `quaternius.com` | 野猪 / 狼 / 狐 / 鹿 / 蜘蛛… |
| Survival Kit / Nature Kit / Particle Pack | Kenney | `kenney.nl` | 帐篷、篝火、崖壁、VFX 贴图 |
| Terrain PBR 贴图 | ambientCG | `ambientcg.com` | 草地 / 岩石 / 雪地 PBR 套图 |
| HDRI 环境贴图 | Poly Haven | `polyhaven.com` | 天空 + IBL |

### A.3 取用路径：三阶段，先学习再入库

**第一阶段 · 同步学习（现在就做，直接取 WoC 仓库里的 GLB）**

目的是快速验证「换资源后我们的场景会变成什么样」，不做任何交付决策。

```bash
# 只拉需要的目录，不下 4491 次提交的历史，也不下 57 MB 全量模型
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/levy-street/world-of-claudecraft.git woc-ref
cd woc-ref
git sparse-checkout set public/models/foliage public/models/props \
                        public/models/chars/players public/models/creatures
```

然后把 `pine_1/2/3`、`oak_1/2`、`house_1/2/3`、`knight`、`wild_boar` 丢进我们的 `assets/ref/` 临时目录（**加进 `.gitignore`，不提交**），用 `GLTFLoader` 替换掉 `world.js` 的树和 `models.js` 的玩家，跑一遍看效果。半天内就能拿到「值不值得走 A 线」的答案。

> **为什么这一步取仓库里的而不是官方包**：WoC 仓库里的是**已经压缩过的成品**（贴图压到 512、meshopt 编码、清理无用节点），拿来就能跑；官方原包是未处理的 `.gltf` + 散贴图，要先过管线。学习阶段图快，直接拿成品最省事。

**第二阶段 · 正式入库（决定走 A 线之后）**

**不要长期依赖从 WoC fork 来的文件，改从官方 CC0 源自行下载并自建压缩管线。** 三个理由：

1. **权责清晰**：CC0 允许我们直接用 WoC 仓库里的副本，但「我们的资源从我们自己下载的官方包来」这条链路在任何审查场合都更干净，也避免误拿到它仓库里那些**非 CC0** 的文件（见 A.4）。
2. **可控**：官方包有我们用不到的 80% 内容，也有 WoC 砍掉但我们想要的部分；自己转一遍才知道手里有什么。
3. **可复现**：管线脚本进仓库后，换包、调压缩率、加新模型都是改一行配置。

抄它的管线（`scripts/assets/build_assets.mjs` + `scripts/assets/specs/*.json`），这套东西相当成熟：

```jsonc
// assets/specs/foliage.json —— 照抄 WoC 的规格格式
{
  "note": "Quaternius Stylized Nature MegaKit (CC0)",
  "items": [
    { "src": "tmp/asset_src/quaternius_nature/glTF/Pine_1.gltf",
      "out": "models/foliage/pine_1.glb",
      "type": "static",      // static | character | copy
      "maxTex": 512,          // 贴图边长上限
      "simplify": 0.45 }      // 面数保留比例（静态件才用）
  ]
}
```

管线依赖 `@gltf-transform/core` + `@gltf-transform/functions` + `meshoptimizer` + `sharp`，处理链是：

- `type: "static"`（树、房子、道具）→ `resample` + `prune` + `dedup` + `textureCompress(maxTex)` + `meshopt` + 可选 `simplify`
- `type: "character"`（玩家、怪物）→ 同上但**绝不 join / flatten / simplify**（会毁掉骨骼绑定和低模硬边）
- `type: "copy"` → 原样拷贝（HDRI、纯贴图）
- 额外能力：`keepClips` 只保留指定动画、`renameClips` 把 `AnimalArmature|Idle` 这类名字规整成引擎统一词表、`addClipsFrom` 从动画库合并剪辑、`attachMeshes` 把武器烘进骨骼（这样怪物 GLB 自带武器，运行时不用挂载）

WoC 的实测压缩效果就是 A.1 那张表——一栋房子 83 KB、一棵松树 107 KB。

**第三阶段 · 登记**

建 `CREDITS.md`，逐包记录：包名 / 作者 / 官方 URL / 许可 / 是否可再分发。这是 WoC 做得最专业的地方之一，也是将来真发布时唯一能救命的东西。同时在 `plan-merged.md` 的「验金石」里把「全仓库 0 个资源文件」改成明确的路线声明。

### A.4 从 WoC 仓库里**绝对不能拿**的东西

CC0 的模型包随便用，但它仓库里混着几类不同授权的资源，**取文件时务必按目录区分**：

| 路径 | 状态 |
| --- | --- |
| `public/models/**`（CC0 包转出的） | ✅ 可用 |
| `public/models/quest/**`（项目自制） | ⚠️ 标记「随项目使用」，可随 fork 用，**不可抽出单独发布** |
| **`public/ui/skills/**`（246 个技能图标）** | ❌ **CraftPix 采购授权，仅授权 Levy Street，明确不随 fork 转移。碰都不要碰，自己画或自己买。** |
| Season 1 Armory 武器模型、商店渲染图、Claudium 资源、功绩图标、精英龙徽章 | ❌ 商业自有美术，版权保留 |
| @jamiecypher 音效 | ⚠️ CC BY-NC 4.0：非商用 + 必须署名 |
| Twitch / X / Discord / Solana 等品牌图标 | ❌ 商标，不由该文件授权给任何人 |
| **源代码** | ✅ MIT，可自由参考与借鉴实现思路 |

**一个需要自己核实的点**：`scripts/assets/specs/characters_v2.json` 的备注写着玩家模型来自「the **paid** full pack (KayKit Adventurers **2.0** + Character Animations 1.1)」，而 `CREDITS.md` 登记的是 Adventurers **1.0 / CC0**。KayKit 的付费版通常也按 CC0 发布（付费买的是打包便利与对作者的支持），但两处说法不一致。**我们的做法：走 GitHub 上的免费 1.0 版**，来源明确、许可无争议；若确实需要 2.0 的模型或动画，去 itch 页面自行确认条款后再购买。

---

## 附录 B · 下一批 CC0 资源地图（角色 / 生物 / 武器 / 地下城 / 装饰）

> 调研日期：2026-07-23。全 CC0，可商用，可再分发。已在 CREDITS.md 登记的包不重复列。

### B.1 当前库存与缺口

| 类别 | 已入库 | 缺口 |
|------|--------|------|
| 植被 / 岩石 | ✅ 松/橡/枯/扭曲树、灌木、蕨、蘑菇、岩石（Quaternius Nature MegaKit） | 棕榈、沼泽树、雪松（若开新生物群系） |
| 建筑 / 道具 | ✅ 房子/旅店/铁匠铺/钟楼/帐篷/围栏/墓碑/码头（Quaternius Village + Kenney/Pirate） | 井/货车/桶/灯笼/摊位等村庄填充物 |
| 天空 | ✅ Poly Haven HDRI × 4 分区 | — |
| **玩家角色** | ❌ 仍为程序化 Box 几何体 | **最大缺口** |
| **生物 / 怪物** | ❌ 仍为族群程序化几何体 | **第二大缺口** |
| **武器** | ❌ 无 | 需配合角色装备系统 |
| **地下城模块** | ❌ 无 | 熔火之心/哀嚎/怒焰副本可用 |
| 技能图标 | ✅ 守 `icons.js` 程序化 | — |

### B.2 P0 · 角色与生物（STEP B5 对应，观感差距最大）

KayKit Adventurers（CC0，低多边形，骨骼动画，单纹理图集）：

| 文件 | 内容 | 参考体积 | 本项目用途 |
|------|------|----------|------------|
| `knight.glb` | 骑士（板甲、剑盾） | ~1.2 MB | 战士职业 |
| `mage.glb` | 法师（长袍、法杖） | ~1.2 MB | 法师职业 |
| `ranger.glb` | 游侠（兜帽、弓） | ~1.2 MB | 猎人职业 |
| `rogue.glb` | 盗贼（皮甲、双匕） | ~1.2 MB | 潜行者职业 |

- **官方源**：[GitHub KayKit Adventurers 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0)（CC0 1.0）
- **动画**：包内含 75 个动画剪辑（走/跑/持武器走跑/攻击/受击/死亡/施法/坐下/跳跃），`Rig_Medium` 骨架
- **配件**：25+ 武器/盾牌可挂骨骼挂点
- **注意**：GitHub 免费 1.0 版即可；若需 2.0 更多职业，去 [itch.io](https://kaylousberg.itch.io/) 确认条款后购买

KayKit Skeletons（CC0，亡灵系）：

| 文件 | 内容 | 参考体积 | 本项目用途 |
|------|------|----------|------------|
| `skeleton_warrior.glb` | 骷髅战士 | ~2 MB | 亡灵野怪 / 副本怪 |
| `skeleton_mage.glb` | 骷髅法师 | ~2 MB | 亡灵施法者 |
| `skeleton_rogue.glb` | 骷髅盗贼 | ~2 MB | — |

- **官方源**：[GitHub KayKit Skeletons 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0)（CC0 1.0）

Quaternius Animated Creatures（CC0，全动画，低多边形）：

| 推荐文件 | 参考体积 | 本项目用途 |
|----------|----------|------------|
| `wild_boar.glb` | ~284 KB | 莫高雷野猪（替换 `creatures.js` 族群） |
| `wolf_basic.glb` | ~325 KB | 狼（贫瘠之地 / 通用） |
| `spider.glb` | ~127 KB | 蜘蛛（哀嚎洞穴 / 灰烬峡谷） |
| `fox.glb` | ~325 KB | 狐狸（莫高雷环境生物） |
| `stag.glb` | ~310 KB | 雄鹿（莫高雷环境生物） |
| `bull.glb` | ~310 KB | 公牛（贫瘠之地） |
| `goblin.glb` | ~200 KB | 地精（副本 / 通用野怪） |
| `orc.glb` | ~300 KB | 兽人（杜隆塔尔 / 通用） |
| `giant.glb` | ~400 KB | 巨人（世界 Boss 候选） |
| `demon.glb` | ~350 KB | 恶魔（熔火之心） |
| `dragon.glb` | ~500 KB | 龙（奥妮克希亚 / 世界 Boss） |
| `ghost.glb` | ~200 KB | 幽灵（副本 / 任务） |

- **官方源**：[quaternius.com](https://quaternius.com) → Animated Creatures 标签页
- **备选源**：[poly.pizza/u/Quaternius](https://poly.pizza/u/Quaternius)（GLB 直下）
- **备选包**：[Quaternius 50 Animated Monsters](https://quaternius.itch.io/)（itch.io）
- **最小可用集**：野猪 + 狼 + 蜘蛛 3 种 ≈ 740 KB 即可覆盖当前新手区野怪

**建议**：玩家 3 职业（knight/mage/ranger）≈ 3.6 MB + 野怪 3 种 ≈ 0.7 MB，合计 **~4.3 MB** 换掉 `models.js` 和 `creatures.js` 的玩家与基础野怪。Boss 保留程序化。

### B.3 P1 · 武器（配角色装备系统）

KayKit Fantasy Weapons Bits（CC0）：

| 类别 | 件数 | 参考体积 |
|------|------|----------|
| 剑（单手/双手） | 6+ | 单件 <30 KB |
| 斧（单手/双手） | 4+ | 单件 <30 KB |
| 锤/权杖 | 4+ | 单件 <30 KB |
| 弓/弩 | 3+ | 单件 <30 KB |
| 法杖/魔杖 | 4+ | 单件 <30 KB |
| 盾牌 | 4+ | 单件 <30 KB |
| 矛/长柄 | 3+ | 单件 <30 KB |

- **官方源**：[itch.io KayKit Fantasy Weapons Bits](https://kaylousberg.itch.io/fantasy-weapons-bits)（CC0）
- **特点**：共用一个 1024×1024 渐变纹理图集；GLTF/FBX/OBJ 多格式；免费版 25+ 件，Extra 版（$4.99）加 15 件元素武器
- **引擎集成**：挂载到 KayKit Adventurers 骨骼的 `handslot.r` / `handslot.l` 挂点

### B.4 P2 · 地下城模块件（副本场景）

KayKit Dungeon Remastered 1.0（CC0）：

| 类别 | 内容 |
|------|------|
| 结构件 | 墙/地/柱/拱/台阶/天花板（模块化，可拼接） |
| 照明/氛围 | 火把/烛台/吊灯/旗帜 |
| 家具/容器 | 箱子/木桶/桌椅/床/书架 |
| 陷阱/机关 | 尖刺/铁栅栏 |
| 装饰 | 链条/骷髅堆/蜘蛛网 |

- **官方源**：[GitHub KayKit Dungeon Remastered 1.0](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0)（CC0 1.0）
- **规模**：200+ 件，单纹理图集；v1.1 新增酒馆家具、模块化台阶
- **本项目用途**：熔火之心（黑石山）· 哀嚎洞穴 · 怒焰裂谷 · 奥妮克希亚巢穴等副本场景替换
- **精选最小集**：取墙/地/柱/火把/箱子 5 类 ≈ 1–2 MB 即可显著改善副本场景

### B.5 P3 · 世界装饰补充（丰富已有场景）

这些填充物让你的村庄/营地不再只有房子：

| 资源包 | 推荐取用 | 参考体积 | 官方源 |
|--------|----------|----------|--------|
| **Quaternius Medieval Village** | 井 `well`、货车 `cart`、木桶 `barrel`、灯笼 `lantern`、路标 `signpost`、摊位 `market_stall`、砧 `anvil` | 单件 10–80 KB | [quaternius.com](https://quaternius.com/packs/medievalvillage.html) |
| **Kenney Survival Kit v2** | 篝火 `campfire`、工具箱、板条箱、更多帐篷变体（你已有 `tent_small`/`tent_open`，还有 `tent_large`） | <1 MB 精选 | [kenney.nl](https://kenney.nl/assets/survival-kit) |
| **Quaternius Fantasy Props MegaKit**（2025.6 新发布） | 200+ 道具：药水/书卷/金币袋/盾牌装饰/武器架/烛台/王座 | <2 MB 精选 | [quaternius.com](https://quaternius.com/packs/fantasypropsmegakit.html) |
| **Quaternius Pirate Kit** | 棕榈树、船锚 `anchor`、炮 `cannon`、海滩小屋（你已有 `dock_platform`） | <1 MB 精选 | [quaternius.com](https://quaternius.com/packs/piratekit.html) |
| **Kenney Fantasy Town Kit** | 城镇建筑模块、塔楼 | — | [kenney.nl](https://kenney.nl) |

### B.6 P4 · 渲染补完（不需资源文件）

按第八节「如果只能做三件事」，当前性价比排名：

1. **B0 收口 · UnrealBloom**（半天）：EffectComposer + UnrealBloomPass（strength 0.32 / radius 0.55），熔岩/火焰/技能辉光。对观感提升最大。
2. **B1 · UI token + 目标框**（1–1.5 天）：换 Cinzel/Alegreya 字体，暗底金边面板，目标框含头像/等级/HP/debuff。决定「像不像经典 MMO」。
3. **B5 · 角色/怪物 GLB**（1.5 天）：用本附录 B.2 的最小集替换玩家与野怪。

### B.7 取用路径（复用附录 A.3 三阶段）

**第一阶段 · 快速验证**：从 WoC 仓库稀疏克隆

```bash
# 若 woc-ref 目录还在，追加 sparse-checkout
cd woc-ref
git sparse-checkout add public/models/chars/players public/models/creatures \
                        public/models/weapons public/models/dungeon
```

**第二阶段 · 正式入库**：去 B.2–B.5 列的官方源自行下载原包，用 `scripts/decode_glb.mjs` 解码（或建 `npm run assets` 压缩管线），产出进 `models/`。

**第三阶段 · 登记**：更新 `CREDITS.md`，逐包记录作者/URL/许可/可再分发。

### B.8 绝对不能碰的

重申附录 A.4：
- ❌ CraftPix 技能图标（`public/ui/skills/**`）—— 采购授权，不随 fork 转移
- ❌ WoC `quest/` 目录下的项目自制模型 —— 可随 fork 用，不可抽出单独发布
- ❌ WoC 商业自有美术（Season 1 Armory、Claudium、功绩图标等）
- ❌ CC BY-NC 音效（@jamiecypher）
- ⚠️ KayKit Adventurers **2.0** 付费版 —— 走 GitHub 免费 1.0 版，许可无争议

---

## 七 · 对 `plan-merged.md` 的修订建议

1. **1.1 节结论改写**：WoC 今日的实际比例是「世界骨架程序化（地形/摆放/贴图/UI/图标/音效/天气）+ 实体资产 CC0 资源包（角色/生物/武器/树/建筑/HDRI）」。
2. **1.2 ② ③ 两条作废**（「12 个程序化生物族群骨架」「九职业共用程序化人形骨架」已不再是它的做法），替换为本文件第二节。
3. **验金石清单中的「全仓库 0 个图片/模型/音频文件」**：改成一条明确的路线选择题，并在 `CREDITS.md` 里记录选择结果。
4. 本文件的 STEP B0–B8 与原计划 STEP 0–13 **可以并行**：B0/B1 建议插在 STEP 0 之后立即做（收益最大、风险最低）；B2 的窗口底座是 STEP 4 背包的前置；B5 与 STEP 4/5 的人形基座与族群工厂是同一件事，应合并执行。

---

## 八 · 如果只能做三件事

1. ~~**STEP B0 渲染管线**~~ → **已部分完成**；补 **UnrealBloom**（半天内可收口 B0）
2. **STEP B1 的 token 替换 + 目标框**（一天，「像不像经典 MMO」的单点决定因素）
3. ~~**STEP B4 的风摆 + InstancedMesh**~~ → **已完成**；下一项换成 **STEP B5 角色/怪物**（或 B2 窗口底座，若先推 UI）

这三件（Bloom + B1 + B5）仍是吃掉剩余观感差距的最短路径。

## 九 · 今天就能做的第一件事

~~跑附录 A.3 第一阶段拖 GLB 进莫高雷~~ → **已做过**。

**现在更合适的第一件事**：接 EffectComposer，给熔岩/火焰加收敛的 UnrealBloom（B0 收口），截一张改前改后对比图。

---

*PLAN-BEAUTIFY v1.4 · 2026-07-23 · 对标 world-of-claudecraft v0.23.0（代码 MIT；资源许可见其 CREDITS.md）· 基线 熔火之心 v1.3.5*
*v1.1 变更：新增附录 A（GLB 资源地图 / 官方来源 / 三阶段取用路径 / 不可取用清单）、STEP B3.5 资源试用与管线、第九节。*
*v1.2 变更：新增「进展账本」；〇节 16–21 / B3.5 / B4 / B0 部分项标为完成；第三节差距改为历史说明；第四节渲染表与第八/九节对齐当前状态；记录 Three.js r165。*
*v1.3 变更：新增附录 B（下一批 CC0 资源地图 · P0–P4 优先级清单：角色/生物/武器/地下城/世界装饰 + 渲染补完建议），含当前模型库存统计、取用路径、不可碰清单。*
*v1.4 变更：12 种生物 GLB 入库 + 全接入（7 文件改动）：QUADS 映射 12→20 mob 类型自动 GLB、humanoid GLB 优先、MOB_TYPES 9 新条目、BAL 数值/掉落表各 9 条、稀有/世界 Boss 注册、多分区刷新点。STEP B5 生物侧收口。*
