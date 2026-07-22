# 资源致谢

本项目以程序化生成为主；树木与建筑外观采用 **CC0** 外部模型（plan-beautify · A 线）。

## 外部依赖

| 依赖 | 用途 | 许可 |
|------|------|------|
| [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) | 3D 渲染引擎 | MIT |

Three.js 通过 CDN 加载；`vendor/GLTFLoader.js` 来自 three@0.128.0 examples。

## 3D 模型（CC0 · 可再分发）

仓库路径：`models/foliage/` · `models/props/`（已从官方管线成品解压为 r128 可用的浮点 GLB）。

| 包 | 作者 | 官方 URL | 许可 | 可再分发 | 本项目使用 |
|------|------|----------|------|----------|------------|
| Stylized Nature MegaKit | Quaternius | https://quaternius.itch.io/stylized-nature-megakit | CC0 1.0 | 是 | 松/橡/枯木/扭曲树/灌木 |
| Medieval Village Pack | Quaternius | https://quaternius.com/packs/medievalvillage.html | CC0 1.0 | 是 | 房子 / 旅店 / 铁匠铺 / 钟楼 |
| Survival Kit（帐篷） | Kenney | https://kenney.nl | CC0 1.0 | 是 | `tent_small` / `tent_open` |

学习阶段对照实现参考了 [World of ClaudeCraft](https://github.com/levy-street/world-of-claudecraft)（代码 MIT；其 `public/models/**` 中的上述 CC0 转码成品）。正式资源链路以官方 CC0 包为准，见 `scripts/decode_glb.mjs`。

**未使用** WoC 仓库内 CraftPix 采购技能图标、商业自有美术、CC BY-NC 音效。

## 设计参考

架构与渲染工艺（InstancedMesh 分桶、风摆、camera-ghost）参考 World of ClaudeCraft（MIT）。

## 字体

UI 使用系统字体 `Noto Sans SC` / `Microsoft YaHei`（由操作系统提供），不包含在仓库中。

---

*代码部分按 MIT 许可发布。*
