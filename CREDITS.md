# 资源致谢

本项目以程序化生成为主；树木 / 岩石 / 建筑 / 天空外观采用 **CC0** 外部资源（plan-beautify · A 线）。技能图标保持 **Canvas 程序化**，不使用采购美术。

## 外部依赖

| 依赖 | 用途 | 许可 |
|------|------|------|
| [Three.js r165](https://github.com/mrdoob/three.js/releases/tag/r165) | 3D 渲染引擎 | MIT |

Three.js 与 addons 打包为 `vendor/three.r165.js`（`npm run build:three`，依赖 `three@0.165.0`）。

## 3D 模型（CC0 · 可再分发）

仓库路径：`models/foliage/` · `models/props/`（解压为标准浮点 GLB，兼容 r165 GLTFLoader）。

| 包 | 作者 | 官方 URL | 许可 | 可再分发 | 本项目使用 |
|------|------|----------|------|----------|------------|
| Stylized Nature MegaKit | Quaternius | https://quaternius.itch.io/stylized-nature-megakit | CC0 1.0 | 是 | 松/橡/枯木/扭曲树/灌木/蕨/蘑菇/**岩石** |
| Medieval Village Pack / MegaKit | Quaternius | https://quaternius.com/packs/medievalvillage.html | CC0 1.0 | 是 | 房子 / 旅店 / 铁匠铺 / 钟楼 / **围栏** |
| Graveyard Kit | Kenney | https://kenney.nl | CC0 1.0 | 是 | **墓碑**（round/cross/bevel/decorative/cracked） |
| Pirate Kit | Quaternius | https://quaternius.com/packs/piratekit.html | CC0 1.0 | 是 | **码头平台** `dock_platform` |
| Survival Kit（帐篷） | Kenney | https://kenney.nl/assets/survival-kit | CC0 1.0 | 是 | `tent_small` / `tent_open` |

学习阶段对照实现参考了 [World of ClaudeCraft](https://github.com/levy-street/world-of-claudecraft)（代码 MIT；其 `public/models/**` 中的上述 CC0 转码成品）。正式资源链路以官方 CC0 包为准，见 `scripts/decode_glb.mjs`。

## 天空 HDRI（CC0 · 可再分发）

仓库路径：`env/*_1k.hdr`（Poly Haven 1K，对标 WoC `sky.ts`）。

| 资源 | 作者 | 官方 URL | 许可 | 本项目用途 |
|------|------|----------|------|------------|
| vale_day / marsh_overcast / peaks_dawn / night | Poly Haven | https://polyhaven.com | CC0 1.0 | 天空穹顶采样 + 可选 PMREM IBL；按分区生物群系切换，方位角对齐太阳 |

## 技能图标

全部由 `icons.js` Canvas 2D 配方绘制，**零图片文件**。

**未使用** WoC 仓库内 CraftPix 采购技能图标、商业自有美术、CC BY-NC 音效。

## 设计参考

架构与渲染工艺（InstancedMesh 分桶、风摆、camera-ghost、HDRI 方位对齐）参考 World of ClaudeCraft（MIT）。

## 字体

UI 使用系统字体 `Noto Sans SC` / `Microsoft YaHei`（由操作系统提供），不包含在仓库中。

---

*代码部分按 MIT 许可发布。*
