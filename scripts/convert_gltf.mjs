#!/usr/bin/env node
/**
 * 批量将 Quaternius Nature MegaKit glTF 转为自包含 GLB，放入 models/foliage/
 * 用法: node scripts/convert_gltf.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, dequantize, prune, textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SRC = path.join(
  process.env.HOME,
  "Downloads/Stylized Nature MegaKit[Standard]/glTF"
);
const DST = path.join(root, "models/foliage");

// 需要转换的模型列表：源文件名（不含扩展名） → 目标文件名
const MODELS = {
  // ---- 草簇（草地美化核心） ----
  "Grass_Common_Short": "grass_common_short",
  "Grass_Common_Tall": "grass_common_tall",
  "Grass_Wispy_Short": "grass_wispy_short",
  "Grass_Wispy_Tall": "grass_wispy_tall",
  // ---- 花（草地美化核心） ----
  "Flower_3_Group": "flower_3_group",
  "Flower_3_Single": "flower_3_single",
  "Flower_4_Group": "flower_4_group",
  "Flower_4_Single": "flower_4_single",
  // ---- 地被小植物 ----
  "Clover_1": "clover_1",
  "Clover_2": "clover_2",
  "Plant_1": "plant_1",
  "Plant_1_Big": "plant_1_big",
  "Plant_7": "plant_7",
  "Plant_7_Big": "plant_7_big",
  // ---- 花瓣（可组合成花） ----
  "Petal_1": "petal_1",
  "Petal_2": "petal_2",
  "Petal_3": "petal_3",
  "Petal_4": "petal_4",
  "Petal_5": "petal_5",
  // ---- 小石子（地面点缀） ----
  "Pebble_Round_1": "pebble_round_1",
  "Pebble_Round_2": "pebble_round_2",
  "Pebble_Round_3": "pebble_round_3",
  "Pebble_Round_4": "pebble_round_4",
  "Pebble_Round_5": "pebble_round_5",
  "Pebble_Square_1": "pebble_square_1",
  "Pebble_Square_2": "pebble_square_2",
  "Pebble_Square_3": "pebble_square_3",
  "Pebble_Square_4": "pebble_square_4",
  "Pebble_Square_5": "pebble_square_5",
  "Pebble_Square_6": "pebble_square_6",
  // ---- 新蘑菇变体 ----
  "Mushroom_Laetiporus": "mushroom_laetiporus",
  // ---- 中型岩石变体（已有 rock_1~3，这些是新的） ----
  "Rock_Medium_1": "rock_medium_1",
  "Rock_Medium_2": "rock_medium_2",
  "Rock_Medium_3": "rock_medium_3",
};

async function convert(srcName, dstName) {
  const gltfPath = path.join(SRC, srcName + ".gltf");
  const binPath = path.join(SRC, srcName + ".bin");
  const dstPath = path.join(DST, dstName + ".glb");

  if (!fs.existsSync(gltfPath)) {
    console.warn("  SKIP (no gltf):", srcName);
    return false;
  }

  console.log("  converting:", srcName, "→", dstName + ".glb");
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  let doc;
  try {
    doc = await io.read(gltfPath);
  } catch (e) {
    console.warn("  FAIL read:", srcName, e.message || e);
    return false;
  }

  // 去量化 + 去重 + 修剪未使用资源
  try {
    await doc.transform(dequantize(), dedup(), prune());
  } catch (e) {
    console.warn("  transform warn:", srcName, e.message || e);
  }

  // 纹理转 PNG（缩小到 512）
  try {
    await doc.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: "png",
        resize: [512, 512],
      })
    );
  } catch (e) {
    console.warn("  texture warn:", srcName, e.message || e);
  }

  // 移除不需要的扩展名
  const STRIP = new Set([
    "EXT_meshopt_compression",
    "KHR_mesh_quantization",
    "EXT_texture_webp",
  ]);
  for (const ext of [...doc.getRoot().listExtensionsUsed()]) {
    if (STRIP.has(ext.extensionName)) ext.dispose();
  }
  for (const ext of [...doc.getRoot().listExtensionsRequired()]) {
    if (STRIP.has(ext.extensionName)) ext.dispose();
  }

  // 写出自包含 GLB
  try {
    const outIo = new NodeIO();
    await outIo.write(dstPath, doc);
    const kb = (fs.statSync(dstPath).size / 1024).toFixed(1);
    console.log("  OK:", dstName + ".glb", kb + "KB");
    return true;
  } catch (e) {
    console.warn("  FAIL write:", srcName, e.message || e);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error("源目录不存在:", SRC);
    process.exit(1);
  }

  if (!fs.existsSync(DST)) {
    fs.mkdirSync(DST, { recursive: true });
  }

  const names = Object.keys(MODELS);
  console.log(`转换 ${names.length} 个模型: ${SRC} → ${DST}\n`);

  let ok = 0, fail = 0;
  for (const srcName of names) {
    const success = await convert(srcName, MODELS[srcName]);
    if (success) ok++;
    else fail++;
  }

  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
