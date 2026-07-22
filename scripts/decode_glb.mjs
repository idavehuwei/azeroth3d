#!/usr/bin/env node
/**
 * 将 WoC meshopt+webp+quantized GLB 解压为 Three.js r128 可加载的标准浮点 GLB。
 * 用法: node scripts/decode_glb.mjs [paths...]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, dequantize, prune, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const STRIP = new Set([
  "EXT_meshopt_compression",
  "KHR_mesh_quantization",
  "EXT_texture_webp",
]);

async function convert(file) {
  const abs = path.resolve(file);
  const tmp = abs + ".tmp.glb";
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(abs);
  await doc.transform(dequantize(), dedup(), prune());
  try {
    await doc.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: "png",
        resize: [512, 512],
      })
    );
  } catch (e) {
    console.warn("texture warn", path.relative(root, abs), e.message || e);
  }
  for (const ext of [...doc.getRoot().listExtensionsUsed()]) {
    if (STRIP.has(ext.extensionName)) ext.dispose();
  }
  for (const ext of [...doc.getRoot().listExtensionsRequired()]) {
    if (STRIP.has(ext.extensionName)) ext.dispose();
  }
  const outIo = new NodeIO();
  await outIo.write(tmp, doc);
  fs.renameSync(tmp, abs);
  const kb = (fs.statSync(abs).size / 1024).toFixed(1);
  console.log("ok", path.relative(root, abs), kb + "KB");
}

async function main() {
  let files = process.argv.slice(2);
  if (!files.length) {
    for (const dir of ["models/foliage", "models/props"]) {
      const full = path.join(root, dir);
      if (!fs.existsSync(full)) continue;
      for (const name of fs.readdirSync(full)) {
        if (name.endsWith(".glb")) files.push(path.join(full, name));
      }
    }
  }
  if (!files.length) {
    console.error("no glb files");
    process.exit(1);
  }
  for (const f of files) await convert(f);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
