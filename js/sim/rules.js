/* ============================================================
   炽心 · js/sim/rules.js
   plan-v4 STEP 15：经典公式层入口（聚合索引，零重复实现）
   实现分布：
     命中/护甲 → formulas.js
     属性转换 → stats.js
     怒气/GCD/五秒回蓝 → resources.js
     经验/灰怪 → xp.js
   决策：等级上限沿用 V3 的 20（贫瘠/赭岩/多副本内容已铺）；
         原稿「1–12」作两区域节奏参考，不截断现有曲线。
   依赖：formulas / stats / resources / xp（须先加载）
   导出：RULES（只读索引，便于测试与文档）
   ============================================================ */
"use strict";

var RULES={
  version:"step15",
  maxLevelDecision:20,
  note:"公式实现分文件；本对象仅作索引，避免 script 标签重复声明",
  hit:{
    meleeTable:typeof meleeTable==="function"?meleeTable:null,
    spellHitChance:typeof spellHitChance==="function"?spellHitChance:null,
    rollAttack:typeof rollAttack==="function"?rollAttack:null,
    armorReduction:typeof armorReduction==="function"?armorReduction:null
  },
  stats:{
    hpFromStamina:typeof hpFromStamina==="function"?hpFromStamina:null,
    manaFromInt:typeof manaFromInt==="function"?manaFromInt:null,
    deriveStats:typeof deriveStats==="function"?deriveStats:null
  },
  resources:{
    rageConstant:typeof rageConstant==="function"?rageConstant:null,
    rageFromDamage:typeof rageFromDamage==="function"?rageFromDamage:null,
    gcdDuration:typeof gcdDuration==="function"?gcdDuration:null,
    applyManaSpend:typeof applyManaSpend==="function"?applyManaSpend:null,
    tickResources:typeof tickResources==="function"?tickResources:null
  },
  xp:{
    xpToNext:typeof xpToNext==="function"?xpToNext:null,
    isGreyMob:typeof isGreyMob==="function"?isGreyMob:null,
    baseMobXp:typeof baseMobXp==="function"?baseMobXp:null,
    scaledMobXp:typeof scaledMobXp==="function"?scaledMobXp:null
  },
  auras:{
    applyAura:typeof applyAura==="function"?applyAura:null,
    tickAuras:typeof tickAuras==="function"?tickAuras:null,
    hasAura:typeof hasAura==="function"?hasAura:null
  }
};

(function _rulesReadyCheck(){
  const need=[
    ["rollAttack",RULES.hit.rollAttack],
    ["armorReduction",RULES.hit.armorReduction],
    ["hpFromStamina",RULES.stats.hpFromStamina],
    ["rageFromDamage",RULES.resources.rageFromDamage],
    ["isGreyMob",RULES.xp.isGreyMob]
  ];
  const miss=need.filter(function(p){return!p[1];}).map(function(p){return p[0];});
  if(miss.length&&typeof console!=="undefined"&&console.warn)
    console.warn("[sim/rules] 公式未就绪:",miss.join(", "));
})();
