#!/usr/bin/env node
/**
 * 批量将 Quaternius Cute RPG Demo glTF 转为 GLB，放入 models/creatures/
 * 三包合并 + 去重（Big 优先）+ 纹理嵌入
 * 用法: node scripts/convert_rpg_creatures.mjs
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
const BASE = path.join(process.env.HOME, "Downloads/Cute_Rpg_Demo");
const DST = path.join(root, "models/creatures");

// 三包 + 优先级（Big 最高，覆盖 Blob 同名）
const PACKS = [
  { dir: "Big", prio: 3 },
  { dir: "Blob", prio: 2 },
  { dir: "Flying", prio: 1 },
];

// 目标文件名（去重 key）
function dstName(srcName) {
  return srcName.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

async function convert(srcPath, atlasPath, dstPath) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  let doc;
  try {
    doc = await io.read(srcPath);
  } catch (e) {
    console.warn("  FAIL read:", path.basename(srcPath), e.message || e);
    return false;
  }

  try {
    await doc.transform(dequantize(), dedup(), prune());
  } catch (e) { /* ok */ }

  try {
    await doc.transform(textureCompress({
      encoder: sharp, targetFormat: "png", resize: [512, 512],
    }));
  } catch (e) { /* ok */ }

  const STRIP = new Set(["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp"]);
  for (const ext of [...doc.getRoot().listExtensionsUsed()]) {
    if (STRIP.has(ext.extensionName)) ext.dispose();
  }
  for (const ext of [...doc.getRoot().listExtensionsRequired()]) {
    if (STRIP.has(ext.extensionName)) ext.dispose();
  }

  try {
    const outIo = new NodeIO();
    await outIo.write(dstPath, doc);
    return true;
  } catch (e) {
    console.warn("  FAIL write:", path.basename(srcPath), e.message || e);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(BASE)) {
    console.error("源目录不存在:", BASE);
    process.exit(1);
  }
  if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });

  // 去重：记录已处理的模型名 → {prio, srcPath}
  const seen = new Map();
  for (const pack of PACKS) {
    const gltfDir = path.join(BASE, pack.dir, "glTF");
    if (!fs.existsSync(gltfDir)) continue;
    for (const f of fs.readdirSync(gltfDir)) {
      if (!f.endsWith(".gltf")) continue;
      const name = path.basename(f, ".gltf");
      const key = dstName(name);
      const existing = seen.get(key);
      if (!existing || pack.prio > existing.prio) {
        seen.set(key, { name, srcPath: path.join(gltfDir, f), dir: pack.dir, prio: pack.prio });
      }
    }
  }

  const entries = [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`去重后 ${entries.length} 个独特模型\n`);

  let ok = 0, fail = 0;
  for (const [key, info] of entries) {
    const dstPath = path.join(DST, key + ".glb");
    console.log(`  [${info.dir}] ${info.name} → ${key}.glb`);
    const success = await convert(info.srcPath, null, dstPath);
    if (success) {
      const kb = (fs.statSync(dstPath).size / 1024).toFixed(1);
      console.log(`    OK: ${kb}KB`);
      ok++;
    } else {
      fail++;
    }
  }

  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
}

main().catch(e => { console.error(e); process.exit(1); });
