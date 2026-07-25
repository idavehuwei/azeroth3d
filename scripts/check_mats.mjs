import fs from "fs";
import path from "path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const dir = "/Users/weihu/AI/azeroth3d/models/foliage";
const files = [
  "grass_common_short.glb", "grass_wispy_short.glb",
  "flower_3_single.glb", "flower_4_single.glb",
  "clover_1.glb", "plant_1.glb",
  "petal_1.glb", "mushroom_laetiporus.glb"
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of files) {
  try {
    const doc = await io.read(path.join(dir, f));
    const mats = doc.getRoot().listMaterials();
    const names = mats.map(m => m.getName() || "(unnamed)").join(", ");
    console.log(f + ": [" + names + "]");
  } catch (e) {
    console.log(f + ": ERROR - " + e.message);
  }
}
