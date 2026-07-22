# 熔火之心 · plan-V2 —— 单机 · 渲染优先执行计划

**RENDER-FIRST PLAN (SINGLE PLAYER) — 参考 WORLD OF CLAUDECRAFT「呈现」清单**

> 基线：v1.3.5 五模块 + 已完成的 STEP 0（BALANCE / SeededRng / makeLabel 迁入 core.js）与 STEP 1（`hitEntity` 统一受击）
> 范围：**纯单机**。不做服务端、不做联网、不做账号与数据库
> 优先级：**世界渲染 > 人物与怪物渲染 > 玩法系统**
> 参考：`levy-street/world-of-claudecraft`（README.zh_CN 的「呈现」与「Play offline」两节；代码 MIT / 少量素材 CC0）

---

## 〇 · 本版相对 plan-merged 的范围裁剪

plan-merged 是一条「玩法闭环优先」的路线（掉落 → 等级 → 背包 → 新怪 → 副本 → 联机）。plan-V2 把优先级整个翻转过来，理由很简单：**这个项目现在缺的不是系统，是画面**。玩家打开页面看到的是纯色圆盘草地、方块野猪和三个手搭的木偶；掉落和等级再完整，第一印象也拉不回来。

| 类别 | plan-merged | plan-V2 | 说明 |
| --- | --- | --- | --- |
| 服务端 / WebSocket / Postgres | STEP 13 | **删除** | 单机不需要；WoC 的 `server/`、`src/net/`、docker-compose 整块不参考 |
| 账号 · 角色持久化 · 小队 · 交易 · 决斗 · 竞技场 | STEP 13 | **删除** | 全部是多人机制 |
| 存档 | STEP 11（localStorage + 导出码） | **保留**，降到 G7 | 单机存档仍然要做，只是往后排 |
| 掉落 / 等级 / 背包 / 天赋 | STEP 2-4 / 10（P0） | 降级为 G1-G3 / G7 | 渲染做完再做 |
| 世界渲染（地形 / 植被 / 天空 / 水 / 光照） | 散见、无独立步骤 | **提升为 R2-R4（P0）** | 本版核心 |
| 人物与怪物渲染（骨架 / 动画 / 族群） | STEP 4 / STEP 5 的前置 | **提升为 R5-R6（P0）** | 本版核心 |
| 程序化纹理 | 未涉及 | **新增 R1（P0）** | WoC 有 `src/render/textures.ts`，我们完全缺这一层 |

**保持不变的三条纪律**（从 plan-merged 继承）：

1. **零素材文件** —— 仓库永远没有 `.png / .glb / .mp3`，一切由 canvas / 几何体 / WebAudio 运行时生成。
2. **渲染层不碰数值** —— 昼夜、天气、后期处理一律 render-only，任何 AI、伤害、刷新逻辑都不读它们。
3. **摆放类随机全走 `srand` / `worldRng`** —— 世界一草一木刷新后位置不变；玩法随机（伤害浮动、掉落掷骰）仍走 `rand`。

---

## 一 · 差距对照：WoC 的「呈现」清单 vs 我们的现状

WoC README「呈现」一节列了它的画面家底。逐条对照我们当前代码，差距一目了然：

| WoC 呈现清单 | 我们现在（v1.3.5） | 目标 | 对应步骤 |
| --- | --- | --- | --- |
| 绘入地形的道路、草丛、松树 + 橡树 | `CircleGeometry(138,64)` 纯色平面 + `SphereGeometry` 树冠 + `Dodecahedron` 岩石 | 高度场地形 + 顶点着色 + 压入地形的土路 + instanced 草丛 + 两种树 | **R2 · R3** |
| 带动画水面的湖泊 | 无 | 镜湖 shader（波纹 + 菲涅尔 + 岸线渐变） | **R3** |
| 飘动的云朵、实时阴影 | `Color(0x8fc0e8)` 纯色天空 + 全图 ±110 阴影相机（精度极差） | 天空穹顶 shader + 云 fbm + 阴影相机跟随玩家 | **R4** |
| 木桁架房屋、教堂、集市摊位、帐篷、带闪烁灯光的营火 | 圆锥帐篷 ×3、图腾柱 ×2、篝火 ×1，全部纯色 | 带纹理的营地 + 兽皮细节 + 更好的火焰与光闪烁 | **R3** |
| 十二个绑定骨骼的生物族类，配走 / 攻 / 施法 / 坐 / 死动画 | `buildBoar` / `buildFlameSpawn` 各一份硬编码，无骨架、无动画层级 | 3 个族群工厂（四足 / 人形 / 元素），共享动画状态机 | **R6** |
| 九职业共用程序化人形骨架，按职业换武器配色 | `buildPlayer` / `buildMage` / `buildArcher` 三份重复代码，`userData` 只有 `{armR,armL,legR,legL,cape}` 四个平铺挂点 | `buildHumanoid(cfg)` 真骨架层级 + `Anim` 状态机，职业 = 一条配置 | **R5** |
| 为每个法术 / 物品 / 增益绘制的程序化图标 | 无（技能栏是文字） | `icons.js` canvas 图标工厂 | G1 |
| 浮动战斗文字、施法条、增益条、单位框架 | 已有 FCT / 血条 / bossFrame（雏形可用） | 打磨：暴击放大、姓名板遮挡淡出、AoE 地面预警 | **R7** |
| 程序化 WebAudio 音效 | 无 | `sfx.js` | G5 |

**一句话结论**：我们缺的是 ①纹理层 ②地形层 ③骨架动画层 —— 三层补齐，观感会有跨代级变化，且全部不影响任何玩法逻辑。

---

## 二 · 渲染管线总设计

### 2.1 目标文件布局

现在是 5 个文件、`models.js` 与 `world.js` 各自臃肿。渲染重做后拆成职责清晰的工厂层：

```
js/
├─ core.js       工具 · BALANCE · SeededRng · 渲染器 · 相机 · makeLabel   （已有）
├─ palette.js    色板 PALETTE + 共享材质工厂 MAT                （R0 新增，≈120 行）
├─ textures.js   Canvas 程序化贴图库 Tex（含缓存）              （R1 新增，≈260 行）
├─ terrain.js    高度场 · heightAt(x,z) · 顶点着色 · 道路        （R2 新增，≈200 行）
├─ props.js      草丛 / 树 / 岩石 / 湖泊 / 云 / 营地道具         （R3 新增，≈320 行）
├─ sky.js        天空穹顶 · 光照 · 阴影跟随 · 昼夜（render-only）（R4 新增，≈150 行）
├─ rig.js        人形骨架 buildHumanoid + 动画状态机 Anim        （R5 新增，≈300 行）
├─ creatures.js  生物族群工厂：四足 / 人形怪 / 元素              （R6 新增，≈280 行）
├─ vfx.js        特效注册表：projectile / impact / aura / trail   （R7 新增，≈220 行）
├─ models.js     瘦身为「配方表」：职业配置 / 怪物配置 / NPC 配置  （R5-R6 后 ≈150 行）
├─ world.js      世界装配：调用上面各工厂摆场景 + 野怪 / 任务      （已有，瘦身）
├─ combat.js     战斗逻辑                                        （已有，不动）
├─ main.js       主循环 · 输入 · UI                               （已有）
└─ debug.js      作弊台 · 帧率 · 单步截图钩子                     （R8 新增）
```

`index.html` 的 `<script>` 顺序：`core → palette → textures → terrain → props → sky → rig → creatures → vfx → models → world → combat → main → debug`。全局脚本、无打包工具，保持现有零构建体验。

### 2.2 三个新地基的接口契约

**① 材质工厂 `MAT`（R0）** —— 现在每个 `build*` 函数内部 `new MeshStandardMaterial(...)`，同一种「兽皮棕」在 4 个地方写了 4 遍不同的十六进制。收敛为：

```js
MAT.get('fur.boar')      // 同名只创建一次，全场景共享实例
MAT.get('metal.plate', { color: PALETTE.steel })   // 变体：基材 + 覆写
```

收益：①统一调色只改 `PALETTE` 一处；②材质实例共享直接降 draw call；③R1 的纹理挂上去只需改工厂，不用改任何 `build*`。

**② 纹理库 `Tex`（R1）** —— 纯 Canvas 2D，带缓存：

```js
Tex.get('bark')     // → THREE.CanvasTexture，repeat wrap，缓存复用
Tex.get('grass')
Tex.rough('rock')   // 由同一张 canvas 的灰度导出 roughnessMap
Tex.normal('rock')  // 简易 Sobel → normalMap（可选，开销可控）
```

**③ 地形 `heightAt(x, z)`（R2）** —— 这是唯一会外溢到玩法的接口。所有需要贴地的东西统一调用：玩家移动、野猪游荡、树木岩石摆放、掉落物落地、NPC 站位。

```js
heightAt(x, z)   // → number，确定性（由 worldRng 派生的 value noise），任何时候同参数同结果
```

---

## 三 · R 阶段 · 渲染重做（本版主体）

### R0 · 色板与共享材质工厂 `P0` · 半天 · ✅ 完成（2026-07-22）

**改动**

- 新建根目录 `palette.js`（仓库无 `js/` 子目录，与现有全局脚本布局一致）：`PALETTE` 常量表（草绿 / 土黄 / 岩灰 / 兽皮棕 / 钢蓝 / 熔岩橙 / 骨白 …），每种给 base / dark / light 三档。
- `MAT` 工厂：`get(key, overrides)`，内部 Map 缓存；预置约 30 个基材（`fur.*` / `metal.*` / `cloth.*` / `wood.*` / `rock.*` / `lava.*` / `emissive.*` …）；`disposeMaterial` 跳过共享实例。
- `game.html`：`core.js` 之后插入 `palette.js`。
- 把全仓库 12 个文件共 ~112 处 `new THREE.MeshStandardMaterial(...)` 替换为 `MAT.get(...)`（plan 原文写 `core.js`，实际熔火材质在 `raid.js`；`core.js` 本身无 MeshStandardMaterial）。
- `models.js` 的 `makeMats` / `_quadMat` 收敛进 MAT；弓箭手皮甲绿绑定 `PALETTE.grass.dark`。
- 统一 `flatShading` 策略：自然物预设开，人造物（金属甲 / 布料）关。

**验收**

- [x] 全局搜索 `new THREE.MeshStandardMaterial` 结果只剩 `palette.js` 内部。
- [x] 改 `PALETTE.grass` 一个值，草地 + 树冠 + 弓箭手皮甲绿同时变色（刷新后）。
- [ ] `renderer.info.memory.materials` 从改前的 40+ 降到 20 出头（需浏览器手动确认）。
- [x] `node test_step01.js` 含 R0 冒烟（脚本顺序 / 无残留 / MAT 去重）。

**风险**：零。纯替换，观感不变。这一步的价值是让 R1 一改就全场景生效。

---

### R1 · 程序化纹理库 `textures.js` `P0` · 1 次迭代

这是**单位工作量收益最高的一步**。现在所有材质都是纯色 + 光照，塑料感的根源就在这。

**改动**

- 底层画笔（`textures.js` 内部，不导出）：
  - `valueNoise(cx, size, scale, octaves)` —— fbm 灰度底，全部走 `SeededRng`（贴图也要确定性）
  - `streaks(cx, dir, count, color, alpha)` —— 定向条纹（树皮、金属划痕、毛发）
  - `speckle(cx, count, sizeRange, colors)` —— 噪点（草地、砂石）
  - `cracks(cx, count, jitter)` —— 折线裂纹（岩石、熔岩地面）
- 配方表（新增贴图 = 加一条配方，不写新画布代码）：

  | key | 做法 | 用在 |
  | --- | --- | --- |
  | `grass` | 绿色 fbm 底 + 深浅斑块 + 细碎草叶笔触 | 地形草区 |
  | `dirt` | 土黄 fbm + 小石子 speckle | 地形土区 / 道路 |
  | `rock` | 灰 fbm + cracks + 高对比噪点 | 岩石 / 台地 / 副本地面 |
  | `bark` | 棕底 + 竖向 streaks + 节疤 | 树干 / 图腾柱 / 法杖 |
  | `leaf` | 绿底 + 团块噪声（模拟叶簇） | 树冠 |
  | `fur` | 棕底 + 短促方向性 streaks | 野猪 / 狼 / 牛头人 |
  | `hide` | 皮革底 + 缝线 + 磨损边 | 帐篷 / 皮甲 |
  | `plate` | 钢底 + 划痕 streaks + 轻微高光斑 | 板甲 / 武器 |
  | `cloth` | 织物交叉纹 | 法袍 / 披风 / 旗帜 |
  | `bone` | 骨白 + 细裂纹 | 獠牙 / 角 / 骨饰 |
  | `magma` | 黑底 + 橙色裂纹（配 emissiveMap） | Boss 躯干 / 岩浆兽 |
- 导出：`Tex.get(key)` / `Tex.rough(key)`（灰度反相作 roughnessMap）/ `Tex.normal(key)`（Sobel，仅给岩石与树皮用，其余不开以省内存）。
- 分辨率：统一 256×256（移动端 128），`wrapS/T = RepeatWrapping`，按物体尺寸设 `repeat`。
- 把 R0 的 `MAT` 基材挂上对应贴图 —— **这一步改完，一行 `build*` 代码都不用动，整个世界立刻有质感**。

**验收**

- 每张贴图有独立预览页 `tools/tex_preview.html`（纯本地打开，网格铺满所有配方，方便调参）。
- 内存：`renderer.info.memory.textures` ≤ 16。
- 世界种子固定时，贴图逐像素一致（同一 canvas 复用，不是每次重画）。

---

### R2 · 地形升级：高度场 + 顶点着色 + 道路 `P0` · 1-2 次迭代

**现状**：`grass = Mesh(CircleGeometry(WORLD_R+50, 64))`，全平、单色、无路。

**改动**

- 新建 `terrain.js`：`PlaneGeometry(280, 280, 180, 180)`（约 3.2 万三角形，可接受），逐顶点用 fbm 求高度。
- 高度公式分层：大尺度缓丘（振幅 6m，波长 90m）+ 中尺度起伏（1.5m / 20m）+ 细节（0.3m / 5m）。营地与传送门周边用平滑衰减掩膜压平，保证 NPC 与建筑不歪。
- 导出 `heightAt(x, z)`：与顶点生成用**同一份**噪声函数，保证贴地与视觉严丝合缝。
- **顶点着色**（`vertexColors: true`，比多材质分区便宜得多）：
  - 高度 < 0.3 → 沙 / 湖岸
  - 坡度 > 0.45 → 岩色（陡坡自动露岩，是画面立刻「像地形」的关键）
  - 其余 → 草色，按高度往土色渐变
  - 全部用 `smoothstep` 混合，避免硬边
- **道路**：定义营地 → 传送门的一条二次贝塞尔曲线，顶点到曲线距离 < 3.5m 时 ①高度向曲线高度插值（压平）②顶点色混入 `dirt`。WoC 说的「绘入地形的道路」就是这个做法，比铺一条道路 Mesh 干净得多。
- **接线（重要，唯一外溢到玩法的部分）**：
  - `player.position.y = heightAt(px, pz)`（主循环里，跟在现有移动之后）
  - 野怪 `moveToward` 之后同样贴地
  - `world.js` 里树 / 岩 / 帐篷 / 图腾 / 篝火 / 长老 / 野猪巢穴的 `position.set(x, 0, z)` 全部改为 `heightAt(x,z)`
  - 相机跟随目标高度加 `heightAt`，并对高度做 `lerp` 平滑，避免上下坡抖动
  - 掉落物、`makeLabel` 悬浮标签的 y 基准同理

**验收**

- 站在营地能看见远处丘陵起伏与山脊露岩；土路从营地一直延伸到传送门口。
- 玩家 / 野猪 / 长老四只脚都踩在地上，没有半截埋进土里或悬空。
- 刷新页面地形完全一致（种子固定）。
- 跑一遍完整回归（出生 → 接任务 → 杀 3 猪 → 交任务 → 进本 → 击杀）无异常。

**风险 · 中**：贴地是唯一可能引入手感问题的改动。缓解方案：起伏振幅先设小（大尺度 ≤3m），确认所有实体贴地正确后再调大；`heightAt` 加单测（同参数同结果、返回值在合理区间）。

---

### R3 · 植被 · 水体 · 场景道具 `props.js` `P0` · 1-2 次迭代

**改动**

- **草丛（InstancedMesh）**：8000 株十字面片（两个交叉 Plane），在半径 70m 内按 `srand` 撒点、贴 `heightAt`、只在草色区域（坡度小）生成。自定义 vertexShader 做风摆：`x += sin(uTime*1.6 + wpos.x*0.35) * 0.25 * heightWeight`，越靠顶端摆幅越大；距离 > 55m 逐渐缩到 0（省填充率）。alphaTest 剪影，不用透明排序。
- **树（两族）**：
  - `buildPine(seed)` —— 树干锥 + 4-6 层递减圆锥冠，层高与半径按 `srand` 抖动
  - `buildOak(seed)` —— 主干 + 2-3 根分叉枝（`CylinderGeometry` 加旋转）+ 3-5 个交错球冠，冠层用 `leaf` 贴图 + 顶点色轻微变化
  - 共享几何体：只造 4 个松树变体 + 4 个橡树变体，摆放时克隆 + 随机缩放旋转（`clone()` 共享 geometry/material，成本极低）
- **岩石**：`DodecahedronGeometry` 逐顶点 `srand` 扰动 15%，配 `rock` 贴图 + normalMap，成组摆放（1 大 + 2-3 小）而非单个孤零零站着。
- **镜湖**：在地形低洼处放一片多边形水面，shader：两层错向流动的法线扰动 + 菲涅尔边缘增亮 + 近岸透明度渐变 + 天空色反射近似。岸边地形顶点色改沙。
- **云**：8-12 片大尺寸半透明面片，位于 y=70 高空，缓慢平移 + 轻微缩放呼吸；面向相机不做 billboard（保留体积感）。
- **营地道具升级**：帐篷加 `hide` 贴图 + 缝线细节几何 + 门帘；图腾柱贴 `bark` + 彩绘环加噪；篝火升级为「柴堆 + 多层火焰锥（不同频率上下呼吸）+ 火星粒子 + 光照闪烁」，复用现有 `worldFlames` 数组。
- 全部摆放走 `srand`；`props.js` 只导出工厂，`world.js` 负责调用与摆位。

**验收**

- 站在营地转一圈：近处草在风里摆，中景有成组的树与岩石，远处有湖面反光与飘云。
- Draw call 增量 < 60（草是 1 个 instanced call；树 8 个几何体共享）。
- 帧率：桌面 ≥ 60，移动端 ≥ 30（移动端草数量降到 3000、关 normalMap）。

---

### R4 · 天空 · 光照 · 阴影 · 昼夜 `P0` · 1 次迭代

**改动**

- **天空穹顶**：`SphereGeometry(500, 32, 16)`、`side: BackSide`，shader 做「天顶深蓝 → 地平线浅青 → 地面色」三段渐变 + 太阳方向的辉光 + 缓慢流动的 fbm 云带。替换现在的 `sceneWorld.background = Color(0x8fc0e8)`。
- **阴影质量（收益极大、成本极低）**：现在 `sun.shadow.camera` 是 ±110 全图、2048 贴图 —— 每像素覆盖 10cm 以上，边缘全是锯齿。改为**阴影相机跟随玩家**，范围 ±35，每帧更新 `sun.position = player.position + offset`、`sun.target = player`。同样 2048 贴图，精度提升 ~10 倍。
- **光照分层**：暖色主平行光（太阳）+ 天空半球光（冷蓝天顶 / 暖绿地面反弹）+ 轻微的补光。雾色与天空地平线色绑定，随昼夜一起插值。
- **昼夜（render-only 铁律）**：10 分钟一循环，插值太阳角度与颜色（黎明橙 → 正午白 → 黄昏红 → 夜蓝）、半球光强度、雾色、天空 shader 的 `uSunDir`。夜晚：篝火 / 传送门 / 火盆光照权重上调，天空出现星点（shader 里的高频噪声阈值），萤火虫粒子（100 个点，正弦游荡）。
  - **铁律**：任何 AI、伤害、刷新、掉落逻辑都不读时间变量。写一条注释钉在 `sky.js` 顶部。
- **副本侧**：岩浆光 `lavaLight` 强度做低频脉动（呼吸感），雾密度轻微起伏模拟热浪，`embers` 火星密度上调并加入上升气流扰动。

**验收**

- 玩家脚下与身后的树影边缘清晰，不再是马赛克块。
- 站在营地看完一个完整昼夜循环无卡顿；夜晚篝火氛围明显。
- 战斗数值与白天完全一致（跑一遍 `test_step` 回归确认无差异）。

---

### R5 · 人形骨架 `rig.js` + 动画状态机 `P0` · 1-2 次迭代

**现状问题**：`buildPlayer` / `buildMage` / `buildArcher` 是三份互不相干的 300 行，`userData` 只有 `{armR, armL, legR, legL, cape}` 五个平铺挂点，动画只能做「手臂整体转一下」，没有肘、膝、脊柱、头部，走路像木板漂移。

**改动**

- `buildHumanoid(cfg)` 返回 `{ group, rig }`，`rig` 是**真正的父子层级**：

```
root
└─ hips
   ├─ spine ── chest ── neck ── head ── (headgear)
   │            ├─ shoulderL ── upperArmL ── forearmL ── handL ── (offhand)
   │            └─ shoulderR ── upperArmR ── forearmR ── handR ── (weapon)
   ├─ thighL ── shinL ── footL
   └─ thighR ── shinR ── footR
```

- 部件由配置生成，职业差异全部收敛为一条数据：

```js
CLASS_LOOK.warrior = {
  build:   { height: 1.0, bulk: 1.15 },
  armor:   'plate',            // plate / leather / robe → 决定各部件几何体与厚度
  palette: { primary: 'steel', accent: 'gold', cloth: 'crimson' },
  headgear:'helm_plume',
  weapon:  'greatsword',       // 挂到 rig.handR
  offhand: null,
  cape:    { color: 'crimson', length: 1.3 },
};
```

- `Anim` 状态机（`rig.js` 导出），每个动作是一个**纯函数**：输入 `(rig, t, params)`，输出关节旋转，不改任何游戏状态。

  | 动作 | 要点 |
  | --- | --- |
  | `idle` | 胸腔呼吸缩放 + 头部微幅左右 + 手臂轻晃，周期 3.2s |
  | `walk` | 髋膝反相摆动 + 骨盆上下起伏 + 脊柱微扭 + 手臂反向摆，脚步落地时相机轻微下沉 |
  | `run` | 同 walk 提高频率与幅度 + 躯干前倾 |
  | `attack1h` / `attack2h` | 蓄力后仰 → 快速下劈 → 收势，武器尾迹在 R7 接入 |
  | `cast` | 双臂前抬、手心朝前、法杖顶端光球放大 |
  | `shoot` | 拉弦 → 松弦回弹 |
  | `hit` | 上半身后仰 0.15s + 整体闪白（emissive 脉冲） |
  | `die` | 膝盖软化 → 侧倒 → 静止（为 G1 尸体拾取铺路） |

- 混合：状态切换时对关节旋转做 0.15s `lerp` 过渡，避免动作跳变。
- `main.js` 里根据移动速度 / 施法状态 / 受击标记自动选状态，不需要在战斗逻辑里插动画调用。
- `models.js` 瘦身：三个 `build*` 删除，改为三条 `CLASS_LOOK` 配置；长老 NPC 也走同一骨架（牛头人 = `build.height 1.35` + 角 + 蹄 + 兽皮配置）。

**验收**

- 三职业外观**不劣于**重构前（并排截图对比），走路 / 攻击明显更自然。
- 增加第四个职业（牧师）只需要写一条 `CLASS_LOOK` 配置，`rig.js` 一行不改 —— 这是本步的验金石。
- `rig.handR` 挂点存在且可运行时替换（为 G3 换装准备）。

---

### R6 · 生物族群工厂 `creatures.js` `P0` · 1-2 次迭代

**改动**

- **四足族群 `buildQuadruped(cfg)`**：骨架 = 脊柱 2 节 + 颈 + 头 + 四腿（大腿 / 小腿 / 蹄）+ 尾。参数：

```js
{ size, bulk, neck: 'short'|'long', head: 'boar'|'wolf'|'beak',
  fur: 'fur.boar', tusks: true, mane: false, horns: null,
  tail: 'short'|'bushy'|'whip', gait: { freq: 2.2, lift: 0.18 } }
```

  产出：草原野猪（现有）、草原狼、陆行鸟（长颈 + 喙 + 无毛）、熔岩巨兽（R6 做模型，Boss 逻辑留给 G6）。
- **人形怪 `buildHumanoidMob(cfg)`**：直接复用 R5 的 `buildHumanoid`，加 `wings` / `claws` / `tail` 可选部件。产出：鹰身女妖、小恶魔。
- **元素族群 `buildElemental(cfg)`**：核心球 + 3-6 块环绕碎岩（各自轨道旋转）+ 火焰锥（多层不同频率呼吸）+ 内部点光源。产出：烈焰之子（升级现有 `buildFlameSpawn`）、岩浆核心。
- **动画共享**：每族一套 `walk / attack / hit / die / idle`，写一次全族群受益。四足的 `die` = 前腿先软 → 侧倒；元素的 `die` = 碎块炸散 + 核心熄灭。
- **Boss 拉戈斯升级**：现在 `userData` 只有 `{armR, armL, core, bossLight}`。改造为 rig 化的巨型人形：双臂各带肘关节（挥锤有蓄力）、胸口熔核随血量降低而亮度上升、行走时地面震屏（相机 shake，render-only）、沉入 / 升起时岩浆表面涟漪扩散。
- `models.js` 里 `MOB_LOOK` 配方表：加一种怪 = 加一条配置。

**验收**

- 加「草原狼」的代码只有一条 `MOB_LOOK` 配置 + 一条 `BALANCE.mobs.wolf` 数值，`creatures.js` 一行不改。
- 野猪走路是四条腿交替迈步，不是整体滑动；死亡会侧倒而不是直接 `visible = false`。
- Boss 挥锤有蓄力 → 挥出 → 收势三段，配合现有 `delayMs: 450` 的伤害判定时机对齐。
- 回归：三类目标受击 / 死亡逻辑与 R6 前完全一致（`test_step01.js` 全绿）。

---

### R7 · 战斗表现层 `vfx.js` `P1` · 1 次迭代

**改动**

- **VFX 注册表**（四类模板 + 参数，新增特效 = 加一条配方）：
  - `projectile` —— 核心球 + 拖尾（点列衰减）+ 点光源随行，参数控制颜色 / 尺寸 / 拖尾长度
  - `impact` —— 径向粒子爆散 + 一圈快速扩散的环 + 短暂光照
  - `aura` —— 脚下旋转法阵（shader 环 + 符文）/ 护盾球（菲涅尔）
  - `ground_warn` —— AoE 预警圈：地面 shader 环由内向外填充，填满 = 伤害落地（对应 `eruption` 的 `delay: 2.2`）
- Boss 技能表按数据引用：`{ name:'火球', vfx:'lava_ball' }`，不写新粒子循环。
- **受击反馈**：模型 emissive 脉冲闪白 0.12s + `hit` 动画后仰 + FCT 暴击时字号放大与轻微抖动。
- **姓名板 / 血条打磨**：距离衰减缩放、被地形遮挡时淡出、精英怪金色描边、Boss 血条分段刻度。
- **死亡溶解**：`die` 动画结束后用 shader 的噪声 alpha 溶解消失（G1 接入尸体拾取后改为「溶解延迟到拾取完成」）。
- **粒子池化**：现在 `spawnBurst` 每次 new geometry 且不 dispose —— 改为固定容量对象池 + 复用几何体，顺手解决内存泄漏（plan-merged 里也列了这条）。

**验收**

- Boss 的岩浆喷发落地前地面有预警圈，玩家能靠视觉躲开。
- 连续战斗 5 分钟，`renderer.info.memory.geometries` 稳定不增长。
- 加一个新特效只需在注册表加一条配方。

---

### R8 · 性能预算与可选后期 `P1` · 半天

**预算（写进 `debug.js`，超标即告警）**

| 指标 | 桌面 | 移动 |
| --- | --- | --- |
| 帧率 | ≥ 60 | ≥ 30 |
| Draw calls | ≤ 300 | ≤ 150 |
| 三角形 | ≤ 350k | ≤ 150k |
| 纹理 | ≤ 16 张 256² | ≤ 16 张 128² |

**手段**

- 材质 / 几何共享（R0、R3 已天然带来）
- 草与远景植被 InstancedMesh，超距离剔除
- 阴影相机跟随（R4）而非全图覆盖；移动端阴影贴图降到 1024，草数量减半，关 normalMap
- 粒子对象池（R7）
- `debug.js`：帧率 + draw call 实时显示（`` ` `` 键开关）、作弊指令 `cheat.tp / cheat.level / cheat.time(h) / cheat.seed(n)`

**可选后期处理**（默认关，设置面板可开）

- 从 CDN 引入 three 的 `EffectComposer` + `UnrealBloomPass` + 一个自写的 vignette shader。
- Bloom 只吃高亮：熔岩、火焰、法术球、Boss 熔核 —— 副本场景收益极大。
- 一旦引入 examples 模块要留意 three 版本对齐；若嫌麻烦，退路是「假 bloom」：给发光物体加一层半透明外扩壳（`BackSide` + additive），成本几乎为零，效果七成。

---

## 四 · G 阶段 · 单机玩法闭环（渲染之后）

这部分基本沿用 plan-merged，但**去掉全部多人内容**，并且能吃到 R 阶段的红利（换装真换模型、新怪只写配置、尸体是真的倒地）。

| 步骤 | 内容 | 依赖 | 优先级 |
| --- | --- | --- | --- |
| **G1** | `icons.js` canvas 图标工厂 + `items.js` 掉落表 + 尸体拾取（按 `F`） | R7（溶解延迟）、R6（die 动画） | P0 |
| **G2** | 经验与等级（1→10，`BALANCE.levels`），升级金光 + 经验条 | 挂 `hitEntity` 的 `onDeath` | P1 |
| **G3** | 背包（`B` 键）+ 装备栏，武器 `dmgMul` / 护甲 `hpMax`，**换装真的替换 `rig.handR` 上的武器组** | R5 | P0 |
| **G4** | 野怪 AI 升级（社群仇恨 / 脱战回巢 / 稀有精英）+ 三种新怪 | R6 | P1 |
| **G5** | `sfx.js` WebAudio 程序合成（音色数据化，族群共用吼叫） | 无 | P1 |
| **G6** | 抽出 `raid.js` + 副本分段 + `createBoss(config)` 工厂 + 第二个 Boss「熔岩巨兽」 | R6、R7 | P0 |
| **G7** | 天赋树（每职业 3 层）+ **localStorage 单机存档**（只存纯数据 + Base64 导出码） | G2、G3 | P1 |

**明确不做**：服务端、WebSocket、账号系统、数据库、小队 / 交易 / 决斗 / 竞技场 / 拾取权 / 多人副本实例。如果将来想做，R 阶段的成果全部可直接复用（渲染层与逻辑层本来就是分开的），但那是另一份计划的事。

---

## 五 · 推荐执行顺序与里程碑

镜头 90% 的时间对着角色和它脚下 20 米。所以顺序不是「按文件依赖」排，而是**按玩家视野收益**排：

```
R0 ─ R1 ──┬─ R5 ─ R6 ──┬─ R2 ─ R3 ──┬─ R4 ─ R7 ─ R8 ──┬─ G1..G7
 地基半天  │  人物怪物   │   地面植被  │  天空/特效/性能  │  玩法闭环
           │  (最高收益) │             │                  │
        纹理一挂        角色一动        脚下一有细节      整体调性
        全场景生效      画面就活了      世界就成立了      成片感
```

| 里程碑 | 步骤 | 交付物 | 预估 |
| --- | --- | --- | --- |
| **M1 · 有质感** | R0 + R1 | 色板统一、11 张程序化贴图挂满全场景 | 1-1.5 次迭代 |
| **M2 · 会动了** | R5 + R6 | 人形骨架 + 动画状态机、3 个生物族群、Boss rig 化 | 2-3 次迭代 |
| **M3 · 有世界** | R2 + R3 | 高度场地形 + 顶点着色 + 道路、草 / 树 / 岩 / 湖 / 云 | 2-3 次迭代 |
| **M4 · 有氛围** | R4 + R7 + R8 | 天空穹顶、跟随阴影、昼夜、VFX 注册表、性能达标 | 2 次迭代 |
| **M5 · 有玩法** | G1-G7 | 掉落 / 等级 / 背包 / 新怪 / 音效 / 副本 / 天赋 / 存档 | 5-7 次迭代 |

M1 到 M4 结束时，游戏玩法与今天完全一致，但**看起来像换了个项目**。这就是本版的赌注。

---

## 六 · 验收与回归

**每步固定动作**

1. **回归清单**（约 4 分钟，每个 R/G 步骤收尾必跑）：出生 → 接任务 → 杀 3 猪 → 交任务 → 进传送门 → Boss P1 → P2 小怪 → 击杀。
2. **单测**：扩展现有 `test_step01.js`（Node + vm + THREE，已 stub 掉 DOM 与 WebGL）为 `test_render.js`，覆盖**不依赖 GPU 的部分**：
   - `heightAt` 确定性与值域
   - `Tex.get` 缓存命中（同 key 返回同一实例）
   - `MAT.get` 材质去重
   - `buildHumanoid` 产出的 rig 层级完整（每个关节都存在、父子关系正确）
   - `Anim.walk(rig, t)` 是纯函数（调用后游戏状态无变化）
   - `hitEntity` 链路在 R6 改造后行为不变（沿用现有断言）
3. **截图对照**：`tools/shot.html` —— 固定种子、固定相机机位 ×6（营地 / 路口 / 湖畔 / 树林 / 传送门 / Boss 平台），每步前后各存一组，肉眼对照回归。这是 WoC `visual_tour.mjs` 的单机极简版。
4. **性能**：`` ` `` 键打开 `debug.js` 面板，确认帧率 / draw call / 三角形在 R8 的预算内。

---

## 七 · 风险与取舍

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| **R2 贴地外溢到玩法**（唯一真实风险） | 角色悬空 / 陷地 / 相机抖 / 野怪卡坡 | 起伏振幅先小后大；`heightAt` 单测；营地与传送门用平滑掩膜压平；相机高度 lerp 平滑 |
| R5/R6 重构导致战斗回归 | 受击 / 死亡 / 任务计数异常 | 骨架只改渲染，`hitEntity` 与 `onDeath` 一行不动；每步跑 `test_step01.js` |
| 移动端性能 | 草 + 阴影 + 高度场三重压力 | R8 的移动端降级档；草数量、阴影贴图、normalMap、后期处理全部可关 |
| 后期处理引入 three examples 模块 | 版本对齐 / CDN 依赖，破坏零构建体验 | 默认关闭；提供「假 bloom 外扩壳」作为零依赖退路 |
| 计划过长中途失焦 | 半成品堆积 | 每个 R/G 步骤结束游戏都必须完整可玩，绝不留半成品过夜（沿用 plan-merged 纪律） |

**取舍记录**

- 不做骨骼蒙皮（`SkinnedMesh` + `Bone`），只做**刚体层级动画**（关节 Group 旋转）。低多边形风格下差异很小，代码量和调试成本差一个数量级。WoC 说的「绑定骨骼的生物族类」在我们这个体量上用层级动画就够。
- 不做地形分块 / LOD / 四叉树。世界半径只有 88m，一整块 180×180 网格完全扛得住。
- 不做实时反射（湖面用天空色近似）与阴影级联（一层跟随阴影够用）。
- 不引入构建工具。全局脚本 + CDN three 的零构建体验是这个项目的优点，不为了模块化牺牲掉。

---

*MOLTEN CORE PROJECT · PLAN V2（单机 · 渲染优先）· 2026-07-22*
*参考：levy-street/world-of-claudecraft README.zh_CN「呈现」与「Play offline」两节（代码 MIT / 少量素材 CC0）*
*基线：v1.3.5 + STEP 0 / STEP 1 已完成*
