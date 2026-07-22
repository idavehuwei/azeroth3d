/* ============================================================
   熔火之心 · palette.js
   色板 PALETTE + 共享材质工厂 MAT（plan-V2 · R0）
   ------------------------------------------------------------
   [依赖] THREE（全局，CDN 引入）
          textures.js（可选：Tex.bind 由 textures.js 挂钩 MAT.get）
   [导出] PALETTE MAT disposeMaterial
   ============================================================ */
"use strict";

/* 每种色给 base / dark / light 三档；改一处，全场景同系材质一起变 */
const PALETTE={
  grass :{base:0x6f9e46, dark:0x4a7a2e, light:0x7a9e46},
  dirt  :{base:0x9a7a4a, dark:0x6a4a28, light:0xb89060},
  rock  :{base:0x8a6a4a, dark:0x5a4028, light:0xa89078},
  wood  :{base:0x6a4520, dark:0x3a2810, light:0x7a5a30},
  fur   :{base:0xc9a06a, dark:0xb5854e, light:0xd8b888}, /* 兽皮 / 帐篷 */
  steel :{base:0xcfd8e6, dark:0x4a6a8a, light:0xe8eef5},
  lava  :{base:0xff3b00, dark:0x33130a, light:0xffa030},
  bone  :{base:0xe8e0c8, dark:0xc8b090, light:0xf5f0e0},
  water :{base:0x4a90c8, dark:0x2a6088, light:0x7ab8ff},
  gold  :{base:0xd9a441, dark:0xa08030, light:0xffd060},
  skin  :{base:0xd8a37a, dark:0xc09060, light:0xe0b088},
  ash   :{base:0x8a8a8a, dark:0x4a4a4a, light:0xc0c0c0},
  obsidian:{base:0x241812, dark:0x1a120e, light:0x3a2818},
  mesa  :{base:0xa8613a, dark:0x8a4820, light:0xc07848},
  paintRed :{base:0xd94f2a, dark:0xa03018, light:0xff6a40},
  paintBlue:{base:0x3a7ac9, dark:0x2a5080, light:0x5a9ae0},
  ice   :{base:0x9ad8ff, dark:0x4a80b0, light:0xc8e8ff},
  holy  :{base:0xffe080, dark:0xd4af37, light:0xfff0a0},
  teal  :{base:0x2a9a78, dark:0x1a6048, light:0x44e0a0},
};

/**
 * MAT.get(key, overrides?)
 * - 同名无覆写 → 共享同一 MeshStandardMaterial 实例
 * - 有覆写 → 按最终参数序列化缓存（同色同参仍共享）
 * 自然物预设开 flatShading；人造物（金属/布/木器）关。
 */
const MAT=(function(){
  const cache=new Map();

  /* 预设：color 等可为函数，创建时再读 PALETTE（改源码刷新后生效） */
  const presets={
    /* 自然 · flat */
    "grass.ground" :{color:()=>PALETTE.grass.base, roughness:1},
    "grass.canopy" :{color:()=>PALETTE.grass.dark, roughness:.95},
    "grass.mesaTop":{color:()=>PALETTE.grass.light, roughness:1},
    "grass.cloth"  :{color:()=>PALETTE.grass.dark, roughness:.85}, /* 长袍绿 / 皮甲绿 */
    "dirt.path"    :{color:()=>PALETTE.dirt.base, roughness:1},
    "rock.boulder" :{color:()=>PALETTE.rock.base, roughness:1, flatShading:true},
    "rock.mesa"    :{color:()=>PALETTE.mesa.base, roughness:1, flatShading:true},
    "rock.ore"     :{color:0x6a6058, roughness:.95, flatShading:true},
    "fur.hide"     :{color:()=>PALETTE.fur.base, roughness:.95},
    "fur.hideDark" :{color:()=>PALETTE.fur.dark, roughness:.95},
    "fur.boar"     :{color:0x6a4a2e, roughness:1, flatShading:true},
    "fur.centaur"  :{color:0x6a4a30, roughness:.95, flatShading:true},
    "fur.centaurD" :{color:0x4a3220, roughness:.95, flatShading:true},
    "wood.trunk"   :{color:()=>PALETTE.wood.base, roughness:.9},
    "wood.dead"    :{color:0x5a4028, roughness:.95},
    "wood.prop"    :{color:()=>PALETTE.wood.base, roughness:.9, flatShading:true},
    "wood.totem"   :{color:0x5a3820, roughness:.9, flatShading:true},
    "water.pond"   :{color:()=>PALETTE.water.base, roughness:.25, metalness:.3},
    "water.poison" :{color:0x1a4a20, roughness:.3, metalness:.1, emissive:0x0a2810, emissiveIntensity:.35},
    "lava.magma"   :{color:()=>PALETTE.lava.dark, roughness:.85, flatShading:true,
                     emissive:()=>PALETTE.lava.base, emissiveIntensity:.55},
    "lava.rock"    :{color:0x241009, roughness:1, flatShading:true,
                     emissive:0x992200, emissiveIntensity:.18},
    "lava.ember"   :{color:0x3a1408, flatShading:true, emissive:0xff4400, emissiveIntensity:.7},
    "lava.pool"    :{color:0x4a1808, roughness:.25, metalness:.15,
                     emissive:0xff3a00, emissiveIntensity:.45},
    "bone.horn"    :{color:()=>PALETTE.bone.dark, roughness:.55, metalness:.2},
    "bone.ivory"   :{color:()=>PALETTE.bone.base, roughness:.45, metalness:.15},
    "ash.corpse"   :{color:()=>PALETTE.ash.base, roughness:1, flatShading:true},
    /* 人造 · 非 flat */
    "metal.plate"  :{color:()=>PALETTE.steel.dark, roughness:.45, metalness:.7},
    "metal.blade"  :{color:()=>PALETTE.steel.base, roughness:.15, metalness:.95},
    "metal.iron"   :{color:0x5a5a60, roughness:.55, emissive:0x222228, emissiveIntensity:.1},
    "cloth.flag"   :{color:0xc04020, roughness:.9, side:()=>THREE.DoubleSide},
    "emissive.ice" :{color:()=>PALETTE.ice.base, transparent:true, opacity:.5, roughness:.15, metalness:.2},
    "emissive.holy":{color:()=>PALETTE.holy.base, transparent:true, opacity:.42, roughness:.2, metalness:.15,
                     emissive:()=>PALETTE.holy.light, emissiveIntensity:.25},
    "emissive.teal":{color:()=>PALETTE.teal.base, roughness:.55,
                     emissive:()=>PALETTE.teal.dark, emissiveIntensity:.35},
    "obsidian.gate":{color:()=>PALETTE.obsidian.base, roughness:.85, flatShading:true,
                     emissive:0x661a00, emissiveIntensity:.2},
    "obsidian.plat":{color:0x1c1412, roughness:.92, metalness:.15},
    "obsidian.pillar":{color:()=>PALETTE.obsidian.dark, roughness:.9,
                       emissive:0x6a2200, emissiveIntensity:.15},
    "quest.marker" :{color:0xc4a060, flatShading:true},
    "terrain.mulgore":{color:0xffffff, roughness:.95, vertexColors:true},
  };

  function resolve(obj){
    const out={};
    for(const k in obj){
      const v=obj[k];
      out[k]=typeof v==="function"?v():v;
    }
    return out;
  }

  function normalize(p){
    const opacity=p.opacity!=null?p.opacity:1;
    return {
      color:p.color!=null?p.color:0xffffff,
      roughness:p.roughness!=null?p.roughness:.9,
      metalness:p.metalness!=null?p.metalness:0,
      emissive:p.emissive!=null?p.emissive:0x000000,
      emissiveIntensity:p.emissiveIntensity!=null?p.emissiveIntensity:1,
      flatShading:!!p.flatShading,
      transparent:!!p.transparent||opacity<1,
      opacity,
      side:p.side!=null?p.side:THREE.FrontSide,
      vertexColors:!!p.vertexColors,
      map:p.map||null,
    };
  }

  function cacheKey(key, params){
    return key+"|"+[
      params.color|0,
      +params.roughness,
      +params.metalness,
      params.emissive|0,
      +params.emissiveIntensity,
      params.flatShading?1:0,
      params.transparent?1:0,
      +params.opacity,
      params.side===THREE.DoubleSide?2:1,
      params.vertexColors?1:0,
      params.map&&params.map.uuid?params.map.uuid:(params.map?"map":""),
    ].join(",");
  }

  function create(params){
    const mat=new THREE.MeshStandardMaterial({
      color:params.color,
      roughness:params.roughness,
      metalness:params.metalness,
      emissive:params.emissive,
      emissiveIntensity:params.emissiveIntensity,
      flatShading:params.flatShading,
      transparent:params.transparent,
      opacity:params.opacity,
      side:params.side,
      vertexColors:params.vertexColors,
      map:params.map||null,
    });
    mat.userData.sharedMat=true;
    return mat;
  }

  function get(key, overrides){
    const base=presets[key]?resolve(presets[key]):{};
    const params=normalize(Object.assign({}, base, overrides||{}));
    /* 无覆写且有预设：用短键共享；有覆写：按最终参数去重 */
    const ck=(!overrides&&presets[key])?key:cacheKey(key||"_", params);
    let mat=cache.get(ck);
    if(mat)return mat;
    mat=create(params);
    cache.set(ck, mat);
    return mat;
  }

  return {
    get,
    presets,
    size(){return cache.size;},
    /* 测试 / 调试 */
    _cache:cache,
  };
})();

/** 共享材质不可 dispose；贴图若带 sharedTex 亦跳过 */
function disposeMaterial(m){
  if(!m)return;
  if(m.userData&&m.userData.sharedMat)return;
  ["map","roughnessMap","normalMap","emissiveMap","alphaMap","bumpMap"].forEach(k=>{
    const t=m[k];
    if(t&&!(t.userData&&t.userData.sharedTex)&&typeof t.dispose==="function")t.dispose();
  });
  if(typeof m.dispose==="function")m.dispose();
}
