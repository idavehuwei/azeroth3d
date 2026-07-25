#!/usr/bin/env node
/**
 * 批量将 Quaternius Animated Animals glTF 转为 GLB，放入 models/creatures/
 * 用法: node scripts/convert_creatures.mjs
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

const SRC = path.join(process.env.HOME, "Downloads/glTF 2");
const DST = path.join(root, "models/creatures");

// 新模型映射：源文件名 → 目标 GLB 名
// 跳过已存在的 Bull/Fox/Stag/Wolf
const MODELS = {
  "Horse": "horse",
  "Horse_White": "horse_white",
  "Cow": "cow",
  "Deer": "deer",
  "Alpaca": "alpaca",
  "Donkey": "donkey",
  "Husky": "husky",
  "ShibaInu": "shiba_inu",
};

async function convert(srcName, dstName) {
  const gltfPath = path.join(SRC, srcName + ".gltf");
  const dstPath = path.join(DST, dstName + ".glb");

  if (!fs.existsSync(gltfPath)) {
    console.warn("  SKIP (no file):", srcName);
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

  try {
    await doc.transform(dequantize(), dedup(), prune());
  } catch (e) {
    console.warn("  transform warn:", srcName, e.message || e);
  }

  // 压缩纹理
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
  console.log(`转换 ${names.length} 个生物模型: ${SRC} → ${DST}\n`);

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
