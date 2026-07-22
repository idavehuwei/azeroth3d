/* ============================================================
   炽心 · items.js
   物品与掉落系统（STEP 2）：品质表 / 物品定义 / 按权重掉落表
   世界掉落实体（发光方块 + 图标悬浮牌 + 品质色名字）与尸体拾取
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ rand BAL makeLabel；运行时读 scene）
          icons.js（Icons）· models.js 运行时（setWeapon）
          combat.js 运行时（S log fct rebuildPlayerStatsFromEquip）· world.js 运行时（player）· vfx.js 运行时（VFX）
          js/ui/tooltip.js 运行时（showTipHtml hideTip bindTipHtml）
          talents.js 运行时（talentOpen closeTalentPanel；与背包互斥）
          save.js 运行时（saveGame；换装自动存）
   [导出] QUALITY ITEMS LOOT EQUIP_SLOTS EQUIP_SLOT_LABEL emptyEquipment
          normalizeItemSlot resolveEquipSlot itemFitsEqSlot isEquippable isItemEquipped
          normalizeEquipment reclaimUnequippedGear
          rollLoot rollMobLoot questLootNeedsFromTable dropLoot updateDrops nearestDrop
          tryLoot removeDropOf logLoot DROPS
          equipItem unequipItem toggleBag ensureBagOpen renderBag applyEquipStats
          getPlayerWeaponRange getPlayerAutoSpeed bagOpen
          itemTitle showItemTip hideItemTip bindItemTip itemTipHtml
          useItem sellItem buyVendorItem cancelConsume（STEP 13）
   ============================================================ */
"use strict";
/* ---------------- 品质表：颜色即一切（描边/名字/方块光） ---------------- */
const QUALITY={
  poor     :{name:"粗糙",color:"#9d9d9d",hex:0x9d9d9d},
  common   :{name:"普通",color:"#e8e8e8",hex:0xe8e8e8},
  uncommon :{name:"优秀",color:"#1eff00",hex:0x1eff00},
  rare     :{name:"稀有",color:"#4aa8ff",hex:0x4aa8ff},
  epic     :{name:"史诗",color:"#a335ee",hex:0xa335ee},
  legendary:{name:"传说",color:"#ff8000",hex:0xff8000},
};

/* C8：11+ 槽（头肩胸腰腿脚腕手 · 主副远程 · 保留颈/背/戒） */
const EQUIP_SLOTS=[
  "head","neck","shoulder","back","chest","waist",
  "legs","feet","wrist","hands","finger","mainhand","offhand","ranged",
];
const EQUIP_SLOT_LABEL={
  head:"头部",neck:"颈部",shoulder:"肩部",back:"背部",chest:"胸部",waist:"腰部",
  legs:"腿部",feet:"脚部",wrist:"腕部",hands:"手部",finger:"手指",
  mainhand:"主手",offhand:"副手",ranged:"远程",
};
function emptyEquipment(){
  const o={};
  for(const s of EQUIP_SLOTS)o[s]=null;
  return o;
}
/* 物品 slot → 规范种类；旧存档兼容 */
function normalizeItemSlot(slot){
  if(slot==="weapon")return "mainhand";
  if(slot==="armor")return "chest";
  if(slot==="wrists")return "wrist";
  if(slot==="trinket")return "neck";
  if(slot==="finger1"||slot==="finger2")return "finger";
  return slot;
}
function itemFitsEqSlot(it,eqSlot){
  if(!it||!eqSlot)return false;
  return normalizeItemSlot(it.slot)===eqSlot;
}
function isEquippable(it){
  if(!it)return false;
  return EQUIP_SLOTS.includes(normalizeItemSlot(it.slot));
}
function resolveEquipSlot(it){
  if(!isEquippable(it))return null;
  return normalizeItemSlot(it.slot);
}
function isItemEquipped(id){
  if(!id||!S.eq)return false;
  for(const s of EQUIP_SLOTS)if(S.eq[s]===id)return true;
  return false;
}
function normalizeEquipment(rawEq){
  const eq=emptyEquipment();
  const src=rawEq&&typeof rawEq==="object"?rawEq:{};
  const aliases={
    weapon:"mainhand",armor:"chest",
    finger1:"finger",finger2:"finger",
    wrists:"wrist",trinket:"neck",
  };
  const leftover=[];
  const used={};
  for(const key in src){
    const id=src[key];
    if(typeof id!=="string"||!ITEMS[id]||used[id])continue;
    const slot=aliases[key]||key;
    if(EQUIP_SLOTS.includes(slot)&&itemFitsEqSlot(ITEMS[id],slot)&&!eq[slot]){
      eq[slot]=id; used[id]=1;
    }else leftover.push(id);
  }
  for(const id of leftover){
    if(used[id])continue;
    const kind=normalizeItemSlot(ITEMS[id].slot);
    if(EQUIP_SLOTS.includes(kind)&&!eq[kind]){
      eq[kind]=id; used[id]=1;
    }
  }
  return eq;
}
/** 旧槽卸下的装备退回背包（读档用；equipped 为 normalize 后的 eq） */
function reclaimUnequippedGear(rawEq,inv,equipped){
  const bag=inv||[];
  const worn=new Set();
  const eq=equipped||{};
  for(const s of EQUIP_SLOTS)if(eq[s])worn.add(eq[s]);
  const src=rawEq&&typeof rawEq==="object"?rawEq:{};
  for(const key in src){
    const id=src[key];
    if(typeof id!=="string"||!ITEMS[id])continue;
    if(worn.has(id)||bag.includes(id))continue;
    if(bag.length>=BAL.bag.size)break;
    bag.push(id);
  }
  return bag;
}

/* ---------------- 物品定义：{id,name,icon,quality,slot,stats,vendorBuy?,vendorSell?,use?}
   slot: 装备位种类 | finger | misc | consumable；铜价见 vendorBuy/vendorSell（STEP 13） */
const ITEMS={
  /* —— 材料 / 杂物 —— */
  boar_meat    :{id:"boar_meat",    name:"野猪肋排",    icon:"meat",  quality:"common",   slot:"misc",  stats:null, vendorSell:6},
  boar_tusk    :{id:"boar_tusk",    name:"破损的獠牙",  icon:"tusk",  quality:"common",   slot:"misc",  stats:null, vendorSell:4},
  boar_hide    :{id:"boar_hide",    name:"粗糙的兽皮",  icon:"hide",  quality:"common",   slot:"misc",  stats:null, vendorSell:8},
  sulf_ash     :{id:"sulf_ash",     name:"熔岩灰烬",    icon:"hide",  quality:"common",   slot:"misc",  stats:null, vendorSell:10},
  sulf_core    :{id:"sulf_core",    name:"灼热核心",    icon:"fireball",quality:"common", slot:"misc",  stats:null, vendorSell:14},
  wolf_pelt    :{id:"wolf_pelt",    name:"灰狼皮",      icon:"hide",   quality:"common",  slot:"misc",  stats:null, vendorSell:7},
  wolf_fang    :{id:"wolf_fang",    name:"锋利的狼牙",  icon:"tusk",   quality:"common",  slot:"misc",  stats:null, vendorSell:5},
  bird_feather :{id:"bird_feather", name:"陆行鸟羽毛",  icon:"feather",quality:"common",  slot:"misc",  stats:null, vendorSell:5},
  plainstrider_pelt:{id:"plainstrider_pelt",name:"草原漫步者皮毛",icon:"hide",quality:"common",slot:"misc",stats:null,vendorSell:8},
  wind_essence :{id:"wind_essence", name:"风之精华",    icon:"feather",quality:"common",  slot:"misc",  stats:null, vendorSell:12},
  earth_shard  :{id:"earth_shard",  name:"土地元素碎片",icon:"ore",    quality:"common",  slot:"misc",  stats:null, vendorSell:12},
  soul_shard   :{id:"soul_shard",   name:"灵魂碎片",    icon:"tusk",   quality:"common",  slot:"misc",  stats:null, vendorSell:10},
  quilboar_gland:{id:"quilboar_gland",name:T("mob.quilboar")+"毒腺",icon:"potion", quality:"common",  slot:"misc",  stats:null, vendorSell:9},
  harpy_feather:{id:"harpy_feather",name:"鹰身人羽毛",  icon:"feather",quality:"uncommon",slot:"misc",  stats:null, vendorSell:15},
  blasting_powder:{id:"blasting_powder",name:"爆破炸药",icon:"fireball",quality:"common",slot:"misc",stats:null,vendorSell:14},
  quest_venture_crate:{id:"quest_venture_crate",name:"地精补给箱",icon:"armor",quality:"common",slot:"misc",stats:null,quest:true},
  bird_meat    :{id:"bird_meat",    name:"草原漫步者肉块",icon:"meat",   quality:"common",  slot:"misc",  stats:null, vendorSell:6},
  zebra_hide   :{id:"zebra_hide",   name:"斑马皮",      icon:"hide",   quality:"common",  slot:"misc",  stats:null, vendorSell:9},
  kodo_hide    :{id:"kodo_hide",    name:"科多兽皮",    icon:"hide",   quality:"common",  slot:"misc",  stats:null, vendorSell:12},
  scorp_venom  :{id:"scorp_venom",  name:"蝎子毒液",    icon:"potion", quality:"common",  slot:"misc",  stats:null, vendorSell:10},
  snake_venom  :{id:"snake_venom",  name:"蛇毒样本",    icon:"potion", quality:"common",  slot:"misc",  stats:null, vendorSell:11},
  mutated_hide :{id:"mutated_hide", name:"变异皮革",    icon:"hide",   quality:"uncommon",slot:"misc",  stats:null, vendorSell:18},
  scorp_stinger:{id:"scorp_stinger",name:"蝎刺",        icon:"tusk",   quality:"common",  slot:"misc",  stats:null, vendorSell:8},
  /* —— 主手（含原副手武器） —— */
  tusk_blade   :{id:"tusk_blade",   name:"獠牙短刃",    icon:"sword", quality:"uncommon", slot:"mainhand",ilvl:8,dmgRange:[18,28],speed:2.2,stats:{str:6,agi:4,dmgMul:1.05},model:"sword",vendorSell:45},
  plains_blade :{id:"plains_blade", name:"草原猎手战刃",icon:"sword", quality:"rare",     slot:"mainhand",ilvl:14,dmgRange:[28,42],speed:2.4,stats:{str:12,agi:8,dmgMul:1.12},model:"sword",vendorSell:180},
  sulf_blade   :{id:"sulf_blade",   name:"熔火利刃",    icon:"sword", quality:"rare",     slot:"mainhand",ilvl:16,dmgRange:[32,48],speed:2.5,stats:{str:14,sta:6,dmgMul:1.08},model:"sword",vendorSell:220},
  sulfuras_haft:{id:"sulfuras_haft",name:T("item.sulfuras_haft"),icon:"hammer",quality:"legendary",slot:"mainhand",ilvl:25,dmgRange:[55,78],speed:3.2,stats:{str:28,sta:14,armor:20,dmgMul:1.3},model:"sulfuras",vendorSell:2500},
  wind_blade   :{id:"wind_blade",   name:"疾风之刃",    icon:"sword",  quality:"uncommon",slot:"mainhand",ilvl:9,dmgRange:[20,30],speed:2.0,stats:{agi:8,str:3,dmgMul:1.06},model:"sword",vendorSell:55},
  greyjaw_tusk :{id:"greyjaw_tusk", name:"老灰鬃的獠牙刃",icon:"sword",quality:"rare",   slot:"mainhand",ilvl:15,dmgRange:[30,46],speed:2.3,stats:{str:14,agi:10,dmgMul:1.15},model:"sword",vendorSell:240},
  serpent_fang :{id:"serpent_fang", name:"毒牙弯刃",    icon:"sword", quality:"rare",    slot:"mainhand",ilvl:16,dmgRange:[31,47],speed:2.1,stats:{agi:14,str:8,dmgMul:1.14},model:"sword",vendorSell:280},
  onyxia_fang  :{id:"onyxia_fang",  name:T("item.onyxia_fang"),icon:"sword", quality:"epic",  slot:"mainhand",ilvl:22,dmgRange:[48,70],speed:2.6,stats:{str:20,agi:12,sta:8,dmgMul:1.22},model:"sword",vendorSell:800},
  warbringer_spear:{id:"warbringer_spear",name:"战争使者战矛",icon:"sword",quality:"rare",slot:"mainhand",ilvl:17,dmgRange:[34,50],speed:2.8,stats:{str:16,sta:8,dmgMul:1.16},model:"sword",vendorSell:320},
  barrens_cleaver:{id:"barrens_cleaver",name:"贫瘠劈刀",icon:"sword",quality:"uncommon",slot:"mainhand",ilvl:12,dmgRange:[24,36],speed:2.5,stats:{str:9,agi:5,dmgMul:1.09},model:"sword",vendorSell:160},
  ochre_fang   :{id:"ochre_fang",   name:"赭岩毒牙刃",  icon:"sword", quality:"rare",    slot:"mainhand",ilvl:15,dmgRange:[29,44],speed:2.2,stats:{agi:12,str:8,dmgMul:1.13},model:"sword",vendorSell:260},
  whelp_claw   :{id:"whelp_claw",   name:"幼龙利爪",    icon:"sword", quality:"uncommon",slot:"mainhand",ilvl:7,dmgRange:[16,24],speed:1.9,stats:{agi:6,str:2,dmgMul:1.04},model:"sword",vendorSell:160},
  /* —— 焰怒深渊 —— */
  rage_blade   :{id:"rage_blade",   name:"怒焰短刃",    icon:"sword", quality:"uncommon",slot:"mainhand",ilvl:11,dmgRange:[22,34],speed:2.0,stats:{str:8,agi:6,dmgMul:1.08},model:"sword",vendorSell:140},
  cinder_vest  :{id:"cinder_vest",  name:"燃烬皮甲",    icon:"armor", quality:"uncommon",slot:"chest",ilvl:12,armor:95,stats:{sta:12,str:4,hpMax:380},vendorSell:150},
  ember_band   :{id:"ember_band",   name:"余烬指环",    icon:"star",  quality:"rare",    slot:"finger",ilvl:14,stats:{sta:8,str:5,hpMax:240,dmgMul:1.03},vendorSell:220},
  slag_helm    :{id:"slag_helm",    name:"炉渣战盔",    icon:"armor", quality:"rare",    slot:"head",ilvl:15,armor:110,stats:{sta:10,str:6,hpMax:300},vendorSell:200},
  /* —— 头部 —— */
  plains_cap   :{id:"plains_cap",   name:"草原皮帽",    icon:"hide",  quality:"uncommon",slot:"head",ilvl:6,armor:40,stats:{sta:5,agi:3,hpMax:120},vendorSell:40},
  mesa_helm    :{id:"mesa_helm",    name:"红岩战盔",    icon:"armor", quality:"rare",    slot:"head",ilvl:13,armor:100,stats:{sta:9,str:5,hpMax:280},vendorSell:160},
  dragon_helm  :{id:"dragon_helm",  name:"黑龙骨盔",    icon:"armor", quality:"epic",    slot:"head",ilvl:20,armor:160,stats:{sta:16,str:10,hpMax:420},vendorSell:620},
  /* —— 颈部（含原饰品） —— */
  harpy_charm  :{id:"harpy_charm",  name:"鹰羽护符",    icon:"feather",quality:"uncommon",slot:"neck",ilvl:8,stats:{agi:6,spi:4,hpMax:220},vendorSell:60},
  magma_fang   :{id:"magma_fang",   name:"熔岩犬牙项链",icon:"tusk",  quality:"uncommon",slot:"neck",ilvl:10,stats:{sta:8,str:3,hpMax:320},vendorSell:90},
  magma_collar :{id:"magma_collar", name:"焚犬项圈",    icon:"armor", quality:"rare",    slot:"neck",ilvl:14,stats:{sta:12,str:6,hpMax:520},vendorSell:260},
  ash_charm    :{id:"ash_charm",    name:"灰烬护符",    icon:"fireball",quality:"uncommon",slot:"neck",ilvl:9,stats:{int:6,spi:4,dmgMul:1.03},vendorSell:80},
  onyx_ember   :{id:"onyx_ember",   name:"黑曜余烬",    icon:"star",  quality:"epic",    slot:"neck",ilvl:20,stats:{str:10,sta:8,dmgMul:1.06,hpMax:200},vendorSell:700},
  /* —— 肩部 —— */
  wind_pauldrons:{id:"wind_pauldrons",name:"疾风肩甲", icon:"feather",quality:"uncommon",slot:"shoulder",ilvl:8,armor:55,stats:{agi:5,sta:4,hpMax:160},vendorSell:50},
  war_shoulders:{id:"war_shoulders",name:"督军肩铠",   icon:"armor", quality:"rare",    slot:"shoulder",ilvl:14,armor:90,stats:{str:8,sta:7,hpMax:340},vendorSell:190},
  /* —— 背部 —— */
  moss_mantle  :{id:"moss_mantle",  name:"苔藓披风",    icon:"hide",  quality:"rare",    slot:"back",ilvl:13,armor:45,stats:{sta:10,spi:6,hpMax:480},vendorSell:300},
  scale_cloak  :{id:"scale_cloak",  name:"龙鳞披风",    icon:"armor", quality:"rare",    slot:"back",ilvl:16,armor:60,stats:{sta:12,agi:6,hpMax:680},vendorSell:420},
  plains_cloak :{id:"plains_cloak", name:"草原斗篷",    icon:"hide",  quality:"uncommon",slot:"back",ilvl:5,armor:25,stats:{sta:4,agi:2,hpMax:150},vendorSell:45},
  /* —— 胸部 —— */
  hide_vest    :{id:"hide_vest",    name:"硬化皮甲",    icon:"armor", quality:"uncommon", slot:"chest",ilvl:7,armor:70,stats:{sta:8,str:3,hpMax:250},vendorSell:50},
  mesa_guard   :{id:"mesa_guard",   name:"红岩守卫胸甲",icon:"armor", quality:"rare",     slot:"chest",ilvl:13,armor:130,stats:{sta:14,str:8,hpMax:600},vendorSell:200},
  dragonscale  :{id:"dragonscale",  name:"黑龙鳞胸甲",  icon:"armor", quality:"epic",     slot:"chest",ilvl:20,armor:200,stats:{sta:20,str:12,hpMax:1100},vendorSell:850},
  warbringer_plate:{id:"warbringer_plate",name:"半人马督军胸甲",icon:"armor",quality:"rare",slot:"chest",ilvl:16,armor:150,stats:{sta:16,str:10,hpMax:780},vendorSell:340},
  barrens_cuirass:{id:"barrens_cuirass",name:T("poi.crossroads")+"胸甲",icon:"armor",quality:"uncommon",slot:"chest",ilvl:11,armor:100,stats:{sta:11,str:5,hpMax:420},vendorSell:170},
  ochre_plate  :{id:"ochre_plate",  name:"哨站硬皮甲",  icon:"armor", quality:"uncommon",slot:"chest",ilvl:12,armor:105,stats:{sta:12,agi:4,hpMax:480},vendorSell:190},
  /* —— 手部（含原护腕 / 盾） —— */
  wolf_gauntlets:{id:"wolf_gauntlets",name:"灰狼手套",icon:"hide", quality:"uncommon",slot:"hands",ilvl:6,armor:35,stats:{agi:4,sta:3,hpMax:110},vendorSell:42},
  magma_gloves :{id:"magma_gloves", name:"焚爪手套",    icon:"armor", quality:"rare",    slot:"hands",ilvl:12,armor:55,stats:{str:6,sta:5,hpMax:240},vendorSell:150},
  hide_bracers :{id:"hide_bracers", name:"硬化护腕",    icon:"hide",  quality:"uncommon",slot:"wrist",ilvl:5,armor:28,stats:{sta:3,str:2,hpMax:90},vendorSell:35},
  sulf_bracers :{id:"sulf_bracers", name:"灼壳护腕",    icon:"armor", quality:"rare",    slot:"wrist",ilvl:12,armor:50,stats:{sta:6,str:4,hpMax:200},vendorSell:140},
  tusk_buckler :{id:"tusk_buckler", name:"獠牙圆盾",    icon:"armor", quality:"uncommon",slot:"offhand",ilvl:8,armor:120,stats:{sta:8,str:2,hpMax:200},vendorSell:55},
  /* —— 腿部（含原腰带） —— */
  hide_leggings:{id:"hide_leggings",name:"硬化皮裤",   icon:"hide",  quality:"uncommon",slot:"legs",ilvl:7,armor:60,stats:{sta:6,agi:3,hpMax:180},vendorSell:48},
  barrens_greaves:{id:"barrens_greaves",name:T("poi.crossroads")+"护腿",icon:"armor",quality:"rare",slot:"legs",ilvl:13,armor:95,stats:{sta:10,str:6,hpMax:360},vendorSell:200},
  boar_belt    :{id:"boar_belt",    name:"野猪皮带",    icon:"hide",  quality:"uncommon",slot:"waist",ilvl:5,armor:30,stats:{sta:4,str:2,hpMax:100},vendorSell:38},
  serpent_sash :{id:"serpent_sash", name:"毒牙腰带",    icon:"armor", quality:"rare",    slot:"waist",ilvl:12,armor:48,stats:{agi:7,sta:5,hpMax:260},vendorSell:170},
  /* —— 脚部 —— */
  plains_boots :{id:"plains_boots", name:"草原皮靴",    icon:"hide",  quality:"uncommon",slot:"feet",ilvl:5,armor:32,stats:{agi:3,sta:3,hpMax:100},vendorSell:40},
  ash_treads   :{id:"ash_treads",   name:"灰烬行靴",    icon:"armor", quality:"rare",    slot:"feet",ilvl:12,armor:52,stats:{sta:6,str:4,hpMax:220},vendorSell:155},
  /* —— 手指（含原副手宝珠） —— */
  sulf_ring    :{id:"sulf_ring",    name:"烈焰指环",    icon:"star",  quality:"uncommon",slot:"finger",ilvl:8,stats:{sta:5,str:3,hpMax:180},vendorSell:70},
  plains_band  :{id:"plains_band",  name:"草原指环",    icon:"star",  quality:"uncommon",slot:"finger",ilvl:5,stats:{agi:3,sta:2,hpMax:100},vendorSell:50},
  dragon_signet:{id:"dragon_signet",name:"黑龙徽戒",    icon:"star",  quality:"rare",    slot:"finger",ilvl:16,stats:{str:8,sta:7,hpMax:300},vendorSell:280},
  sulf_orb     :{id:"sulf_orb",     name:"熔核宝珠",    icon:"fireball",quality:"rare",  slot:"offhand",ilvl:14,stats:{int:10,spi:6,dmgMul:1.05},vendorSell:210},
  /* —— C8 新槽位样例 —— */
  hide_belt    :{id:"hide_belt",    name:"硬皮腰带",    icon:"hide",  quality:"uncommon",slot:"waist",ilvl:7,armor:35,stats:{sta:5,str:3},vendorSell:35},
  iron_bracer  :{id:"iron_bracer",  name:"铁片护腕",    icon:"armor", quality:"uncommon",slot:"wrist",ilvl:8,armor:40,stats:{sta:4,str:4},vendorSell:40},
  oak_buckler  :{id:"oak_buckler",  name:"橡木圆盾",    icon:"armor", quality:"uncommon",slot:"offhand",ilvl:9,armor:120,stats:{sta:8,str:2},vendorSell:55},
  horn_bow     :{id:"horn_bow",     name:"角木短弓",    icon:"aimed", quality:"uncommon",slot:"ranged",ilvl:8,dmgRange:[14,22],speed:2.0,stats:{agi:7},vendorSell:50},
  scrap_knife  :{id:"scrap_knife",  name:"锈蚀小刀",    icon:"sword", quality:"poor",    slot:"mainhand",ilvl:1,dmgRange:[3,6],speed:2.0,stats:{str:1},model:"sword",vendorSell:2},
  /* —— 商人消耗品 —— */
  plain_bread  :{id:"plain_bread",  name:"硬面饼",      icon:"bread",  quality:"common", slot:"consumable",use:"food",
                 stats:null, vendorBuy:25, vendorSell:5},
  linen_bandage:{id:"linen_bandage",name:"亚麻绷带",    icon:"bandage",quality:"common", slot:"consumable",use:"bandage",
                 stats:null, vendorBuy:40, vendorSell:8},
  minor_potion :{id:"minor_potion", name:"初级治疗药水",icon:"potion", quality:"common", slot:"consumable",use:"potion",
                 stats:null, vendorBuy:60, vendorSell:12},
  whetstone    :{id:"whetstone",    name:"磨刀石",      icon:"whetstone",quality:"common",slot:"consumable",use:"whetstone",
                 stats:null, vendorBuy:50, vendorSell:10},
  /* —— 任务物品 —— */
  quest_sacred_oil  :{id:"quest_sacred_oil",  name:"圣油",        icon:"potion", quality:"common", slot:"consumable",use:"quest",
                      stats:null, quest:true},
  quest_winterhoof_totem:{id:"quest_winterhoof_totem",name:"净化图腾",icon:"tusk",quality:"common",slot:"consumable",use:"quest",
                      stats:null, quest:true},
  quest_hawkwind_totem:{id:"quest_hawkwind_totem",name:"鹰风图腾",icon:"tusk",quality:"common",slot:"misc",stats:null,quest:true},
  quest_raoul_crate:{id:"quest_raoul_crate",name:"猎蹄补给箱",icon:"armor",quality:"common",slot:"misc",stats:null,quest:true},
  quest_mara_letter:{id:"quest_mara_letter",name:"雷蹄急信",icon:"hide",quality:"common",slot:"misc",stats:null,quest:true},
  quest_winterhoof_sample:{id:"quest_winterhoof_sample",name:"冬蹄水样",icon:"potion",quality:"common",slot:"misc",stats:null,quest:true},
  quest_dwarf_plans:{id:"quest_dwarf_plans",name:"矮人计划书",icon:"hide",quality:"common",slot:"misc",stats:null,quest:true},
  quest_signal_horn :{id:"quest_signal_horn", name:"信号号角",    icon:"tusk",   quality:"common", slot:"consumable",use:"quest",
                      stats:null, quest:true},
  quest_darsok_letter:{id:"quest_darsok_letter",name:T("poi.crossroads")+"急信",icon:"hide",quality:"common",slot:"misc",stats:null,quest:true},
  quest_kil_crate:{id:"quest_kil_crate",name:"斯特雷的货物",icon:"armor",quality:"common",slot:"misc",stats:null,quest:true},
  quest_grave_totem:{id:"quest_grave_totem",name:"大地净化图腾",icon:"tusk",quality:"common",slot:"consumable",use:"quest",
    tip:"在勇士之墓附近使用以净化污染。",quest:true},
  quest_cannon_charge:{id:"quest_cannon_charge",name:"火炮炸药",icon:"fireball",quality:"common",slot:"consumable",use:"quest",
    tip:"在北方城堡火炮旁使用。",quest:true},
  quest_supply_crate:{id:"quest_supply_crate",name:"军需木箱",    icon:"armor",  quality:"common", slot:"misc",
                      stats:null, quest:true},
  quest_ochre_report:{id:"quest_ochre_report",name:"斥候急报",    icon:"hide",   quality:"common", slot:"misc",
                      stats:null, quest:true},
};

/* ---------------- 掉落表：品质三档池，权重见 BALANCE.loot.weights ---------------- */
const LOOT={
  boar:{
    common  :["boar_meat","boar_tusk","boar_hide"],
    uncommon:["tusk_blade","hide_vest","boar_belt","plains_boots","tusk_buckler","hide_belt","iron_bracer"],
    poor    :["scrap_knife","boar_tusk"],
    rare    :["plains_blade","mesa_guard","mesa_helm"],
  },
  add:{
    common  :["sulf_ash","sulf_core"],
    uncommon:["sulf_ring","ash_charm","hide_bracers"],
    rare    :["sulf_blade","sulf_orb","sulf_bracers"],
    epic    :["sulf_blade","sulf_orb"],
  },
  wolf:{
    common  :["wolf_pelt","wolf_fang"],
    uncommon:["tusk_blade","hide_vest","wolf_gauntlets","plains_cap"],
    rare    :["plains_blade","mesa_guard","plains_band"],
  },
  bird:{
    common  :["bird_meat","bird_meat","bird_meat","plainstrider_pelt","plainstrider_pelt","bird_feather"],
    uncommon:["hide_vest","plains_cloak","plains_boots"],
    rare    :["plains_blade","plains_cap"],
  },
  thunderhawk:{
    common  :["bird_meat","bird_meat","bird_feather","bird_feather","harpy_feather"],
    uncommon:["hide_vest","plains_cloak","wind_pauldrons"],
    rare    :["plains_blade","wind_blade"],
  },
  youngBoar:{
    common  :["boar_meat","boar_hide"],
    uncommon:["hide_vest","boar_belt","plains_boots"],
    rare    :["tusk_blade","plains_cap"],
  },
  bristleback:{
    common  :["soul_shard","soul_shard","quilboar_gland","quilboar_gland","boar_meat"],
    uncommon:["hide_vest","boar_belt","tusk_blade"],
    rare    :["plains_blade","plains_cap"],
  },
  plainslion:{
    common  :["wolf_pelt","wolf_fang"],
    uncommon:["hide_vest","wolf_gauntlets","plains_boots"],
    rare    :["plains_blade","mesa_guard"],
  },
  windElement:{
    common  :["wind_essence","wind_essence","wind_essence","bird_feather"],
    uncommon:["wind_blade","plains_cloak"],
    rare    :["plains_blade","wind_pauldrons"],
  },
  waterElement:{
    common  :["earth_shard","earth_shard","mutated_hide","mutated_hide","bird_feather"],
    uncommon:["hide_vest","plains_boots"],
    rare    :["plains_blade","plains_band"],
  },
  earthElement:{
    common  :["earth_shard","earth_shard","earth_shard","boar_hide"],
    uncommon:["hide_vest","mesa_guard"],
    rare    :["plains_blade","mesa_helm"],
  },
  kodo:{
    common  :["kodo_hide","kodo_hide","kodo_hide","boar_hide","wolf_pelt"],
    uncommon:["hide_vest","plains_boots","mesa_guard"],
    rare    :["plains_blade","mesa_helm"],
  },
  palemane:{
    common  :["wolf_pelt","wolf_fang"],
    uncommon:["tusk_blade","hide_vest","wolf_gauntlets"],
    rare    :["plains_blade","mesa_guard"],
  },
  baeldun:{
    common  :["blasting_powder","blasting_powder","boar_hide"],
    uncommon:["tusk_blade","hide_vest","plains_boots"],
    rare    :["plains_blade","mesa_helm"],
  },
  baeldunDigger:{
    common  :["blasting_powder","blasting_powder","boar_hide"],
    uncommon:["hide_vest","tusk_blade","hide_bracers"],
    rare    :["plains_blade","mesa_guard"],
  },
  venture:{
    common  :["quest_venture_crate","quest_venture_crate","boar_hide"],
    uncommon:["hide_vest","tusk_blade","plains_boots"],
    rare    :["plains_blade","plains_band"],
  },
  ventureBoss:{
    uncommon:["wind_blade","hide_vest","mesa_guard","quest_venture_crate"],
    rare    :["plains_blade","mesa_helm","plains_band"],
  },
  raptor:{
    common  :["wolf_pelt","bird_feather"],
    uncommon:["hide_vest","plains_boots","tusk_blade"],
    rare    :["plains_blade","wind_blade"],
  },
  crocolisk:{
    common  :["snake_venom","snake_venom","snake_venom","mutated_hide","mutated_hide","boar_hide"],
    uncommon:["hide_vest","hide_bracers","tusk_blade"],
    rare    :["plains_blade","mesa_guard"],
  },
  windfury:{
    common  :["harpy_feather","harpy_feather","harpy_feather","bird_feather","wolf_fang"],
    uncommon:["wind_blade","harpy_charm","wind_pauldrons"],
    rare    :["plains_blade","mesa_guard"],
  },
  harpy:{
    common  :["harpy_feather","harpy_feather","bird_feather"],
    uncommon:["wind_blade","harpy_charm","wind_pauldrons"],
    rare    :["plains_blade","mesa_guard","mesa_helm"],
  },
  boarKing:{
    uncommon:["tusk_blade","hide_vest","boar_belt","tusk_buckler"],
    rare    :["greyjaw_tusk","mesa_guard","mesa_helm"],
  },
  centaurHerald:{
    uncommon:["wind_blade","hide_vest","war_shoulders"],
    rare    :["warbringer_spear","warbringer_plate","barrens_greaves"],
  },
  magmadar:{
    uncommon:["magma_fang","sulf_ring","magma_gloves","ash_charm"],
    rare    :["magma_collar","sulf_blade","ash_treads","sulf_orb"],
  },
  wailingAdd:{
    common  :["boar_hide","bird_feather"],
    uncommon:["hide_vest","tusk_blade","hide_leggings","hide_bracers"],
    rare    :["serpent_fang","serpent_sash"],
  },
  wailing:{
    uncommon:["hide_vest","wind_blade","hide_leggings"],
    rare    :["serpent_fang","moss_mantle","serpent_sash"],
    epic    :["serpent_fang","moss_mantle"],
  },
  onyxiaAdd:{
    common  :["sulf_ash","bird_feather"],
    uncommon:["whelp_claw","sulf_ring","ash_charm"],
    rare    :["scale_cloak","dragon_signet"],
  },
  onyxia:{
    uncommon:["scale_cloak","whelp_claw","dragon_signet"],
    rare    :["onyxia_fang","dragonscale","dragon_helm","onyx_ember"],
    epic    :["onyxia_fang","dragonscale","dragon_helm","onyx_ember"],
  },
  quilboar:{
    common  :["boar_meat","boar_tusk","boar_hide"],
    uncommon:["tusk_blade","hide_vest","boar_belt","ochre_plate"],
    rare    :["plains_blade","mesa_helm"],
  },
  scorp:{
    common  :["scorp_venom","scorp_venom","scorp_stinger","scorp_stinger","boar_hide"],
    uncommon:["hide_vest","tusk_blade","hide_bracers","plains_boots"],
    rare    :["ochre_fang","plains_blade","ash_treads"],
  },
  razorback:{
    common  :["boar_meat","boar_tusk","boar_hide"],
    uncommon:["tusk_blade","hide_vest","ochre_plate","wolf_gauntlets"],
    rare    :["plains_blade","mesa_guard","mesa_helm"],
  },
  cliffHarpy:{
    common  :["harpy_feather","harpy_feather","bird_feather"],
    uncommon:["wind_blade","harpy_charm","ochre_fang","wind_pauldrons"],
    rare    :["plains_blade","mesa_guard","war_shoulders"],
  },
  centaur:{
    common  :["wolf_pelt","bird_feather"],
    uncommon:["wind_blade","hide_vest","barrens_cuirass","war_shoulders"],
    rare    :["barrens_cleaver","plains_blade","barrens_greaves"],
  },
  zebra:{
    common  :["zebra_hide","zebra_hide","bird_meat","bird_feather"],
    uncommon:["hide_vest","barrens_cuirass","plains_cloak","plains_boots"],
    rare    :["barrens_cleaver","plains_blade","plains_band"],
  },
  ragefireAdd:{
    common  :["sulf_ash","sulf_core"],
    uncommon:["rage_blade","cinder_vest","hide_bracers"],
    rare    :["ember_band","sulf_blade"],
  },
  ragefire:{
    uncommon:["rage_blade","cinder_vest","ember_band"],
    rare    :["slag_helm","ember_band","sulf_blade","ash_treads"],
    epic    :["slag_helm","ember_band","sulf_blade"],
  },
};
/* 按权重掷品质档（可传 BAL.loot.eliteWeights / 英雄权重等），再从该档均匀取一件
   跳过表中不存在的档，避免英雄 epic 权重砸空池 */
function rollLoot(table,weights){
  if(!table)return null;
  const src=weights||BAL.loot.weights;
  const w={}; let total=0;
  for(const k in src){
    if(table[k]&&table[k].length){w[k]=src[k];total+=src[k];}
  }
  if(!total){
    const keys=Object.keys(table).filter(k=>table[k]&&table[k].length);
    if(!keys.length)return null;
    const pool=table[keys[keys.length-1]];
    return ITEMS[pool[(Math.random()*pool.length)|0]]||null;
  }
  let r=rand(0,total);
  for(const k in w){
    r-=w[k];
    if(r<0){const pool=table[k];return ITEMS[pool[(Math.random()*pool.length)|0]]||null;}
  }
  const fallback=table.common||table.uncommon||table.rare||table[Object.keys(table)[0]];
  return ITEMS[fallback[0]]||null;
}

/** 进行中交付任务所需、且出现在该怪掉落表中的物品 id */
function questLootNeedsFromTable(table){
  const out=[];
  if(!table||typeof QUESTS==="undefined"||typeof questStatus!=="function")return out;
  const inTable=new Set();
  for(const k of ["poor","common","uncommon","rare","epic","legendary"]){
    const pool=table[k]; if(!pool)continue;
    for(const id of pool)inTable.add(id);
  }
  for(const q of QUESTS){
    if(questStatus(q.id)!=="active")continue;
    const obj=q.objectives&&q.objectives[0];
    if(!obj||obj.type!=="deliver"||!obj.item||!inTable.has(obj.item))continue;
    const need=(typeof objectiveCount==="function"?objectiveCount(obj):obj.count|0)||1;
    const have=(typeof countInvItem==="function"?countInvItem(obj.item):0)|0;
    if(have<need)out.push(obj.item);
  }
  return out;
}

/** 野怪掉落：有进行中交付任务则高概率掉任务物，否则走普通权重 */
function rollMobLoot(m){
  if(!m||!m.loot)return null;
  const need=questLootNeedsFromTable(m.loot);
  const chance=(BAL.loot&&BAL.loot.questDropChance!=null)?BAL.loot.questDropChance:.9;
  if(need.length&&Math.random()<chance){
    const id=need[(Math.random()*need.length)|0];
    if(ITEMS[id])return ITEMS[id];
  }
  return rollLoot(m.loot,m.elite?BAL.loot.eliteWeights:null);
}

/* ============================================================
   掉落实体：发光小方块 + Canvas 图标悬浮牌 + 品质色悬浮名
   ============================================================ */
const DROPS=[];
function dropLoot(pos,items,owner,onLooted){
  const it=items&&items[0];
  if(!it||!QUALITY[it.quality])return;
  const q=QUALITY[it.quality];
  const grp=new THREE.Group();
  const gy=(typeof heightAt==="function"&&typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="mulgore")
    ?heightAt(pos.x,pos.z):(pos.y||0);
  grp.position.copy(pos).setY(gy);
  const cube=new THREE.Mesh(new THREE.BoxGeometry(.55,.55,.55),
    MAT.get("emissive.loot",{color:q.hex,emissive:q.hex,emissiveIntensity:.65,roughness:.4}));
  cube.position.y=.6; cube.castShadow=true; grp.add(cube);
  const icSp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(Icons.canvas(it.icon,q.color)),
    transparent:true,depthWrite:false}));
  icSp.scale.set(1.15,1.15,1); icSp.position.y=1.9; grp.add(icSp);
  const label=makeLabel(it.name,5.5,q.color,q.color);
  label.position.y=2.9; grp.add(label);
  scene.add(grp);
  DROPS.push({grp,cube,items:[it],owner,onLooted,scn:scene,t:0});
}
/* 每帧动画：方块旋转 + 浮沉 */
function updateDrops(dt){
  for(const d of DROPS){
    d.t+=dt;
    d.cube.rotation.y+=dt*2.2;
    d.cube.position.y=.6+Math.sin(d.t*2.6)*.12;
  }
}
/* 当前场景内最近的可拾取掉落 */
function nearestDrop(r){
  let best=r,hit=null;
  for(const d of DROPS){
    if(d.scn!==scene)continue;
    const dd=Math.hypot(player.position.x-d.grp.position.x,player.position.z-d.grp.position.z);
    if(dd<best){best=dd;hit=d;}
  }
  return hit;
}
function removeDrop(d){
  d.scn.remove(d.grp);
  const i=DROPS.indexOf(d); if(i>=0)DROPS.splice(i,1);
}
/* 野怪重生时清掉它未被拾取的掉落 */
function removeDropOf(owner){
  for(let i=DROPS.length-1;i>=0;i--)
    if(DROPS[i].owner===owner)removeDrop(DROPS[i]);
}

/* ---------------- 拾取（F 键 → tryInteract 优先调这里） ---------------- */
function tryLoot(){
  const d=nearestDrop(BAL.loot.pickupR);
  if(!d)return false;
  if(S.inv.length+d.items.length>BAL.bag.size){log("背包已满！（B 键打开背包整理）","lg-sys");return true;}
  for(const it of d.items){
    S.inv.push(it.id);          /* 纯数据入包，STEP 4 背包 UI 消费 */
    fct(d.grp.position.clone().setY(2),`获得【${it.name}】`,"#ffd76a",16);
    logLoot(it);
  }
  SFX.play("pickup");
  VFX.spawn("loot_spark",{pos:d.grp.position.clone().setY(1)});
  removeDrop(d);
  if(d.onLooted)d.onLooted();
  renderBag();
  if(typeof refreshDeliverObjectives==="function")refreshDeliverObjectives({noSave:true});
  if(typeof saveGame==="function")saveGame(true);
  return true;
}
/* 拾取日志：canvas 图标（品质描边）+ 品质色物品名 */
function logLoot(item){
  const q=QUALITY[item.quality];
  const el=document.createElement("div"); el.className="lg-loot";
  const img=document.createElement("img");
  img.src=Icons.get(item.icon,q.color); img.style.borderColor=q.color;
  const sp=document.createElement("span");
  sp.innerHTML=`拾取：<b style="color:${q.color}">[${item.name}]</b>（${q.name}）`;
  el.appendChild(img); el.appendChild(sp);
  const box=$("#log"); box.appendChild(el);
  while(box.children.length>9)box.removeChild(box.firstChild);
}

/* ============================================================
   背包与装备栏：B 键开关；角色面板纸娃娃换装
   主手换武器组 setWeapon；属性汇入 S.p.equipStats → C3 deriveStats
   保留 legacy dmgMul / hpMax；STEP 13 消耗品 / 商人右键出售
   ============================================================ */
const EQUIP_STAT_KEYS=["str","agi","sta","int","spi"];
function ensureEquipStats(){
  if(!S.p.equipStats){
    S.p.equipStats=typeof emptyStats==="function"?emptyStats(S.p.level):{str:0,agi:0,sta:0,int:0,spi:0,armor:0,level:S.p.level|1};
  }
  return S.p.equipStats;
}
function applyEquipStats(it,sign){
  if(!it)return;
  const st=it.stats||{};
  /* legacy：直接叠伤害/生命（任务奖励与天赋仍走 dmgMul） */
  if(st.dmgMul)S.p.dmgMul+=(st.dmgMul-1)*sign;
  if(st.hpMax){
    S.p.hpMax+=st.hpMax*sign;
    S.p.hp=sign>0?Math.min(S.p.hpMax,S.p.hp+st.hpMax):Math.min(S.p.hp,S.p.hpMax);
  }
  const eq=ensureEquipStats();
  for(const k of EQUIP_STAT_KEYS){
    const v=st[k]|0;
    if(v)eq[k]=(eq[k]|0)+v*sign;
  }
  const arm=(it.armor|0)+(st.armor|0);
  if(arm)eq.armor=(eq.armor|0)+arm*sign;
  if(typeof rebuildPlayerStatsFromEquip==="function")rebuildPlayerStatsFromEquip();
  else if(typeof refreshPlayerDerived==="function")refreshPlayerDerived();
}
/** 主手武器伤害区间（无装备则职业默认普攻） */
function getPlayerWeaponRange(){
  const id=S.eq&&S.eq.mainhand;
  const it=id&&ITEMS[id];
  if(it&&it.dmgRange&&it.dmgRange.length>=2)return [it.dmgRange[0],it.dmgRange[1]];
  if(typeof CLS!=="undefined"&&CLS)return [CLS.autoMin,CLS.autoMax];
  return [100,140];
}
function getPlayerAutoSpeed(){
  const id=S.eq&&S.eq.mainhand;
  const it=id&&ITEMS[id];
  if(it&&it.speed>0)return it.speed;
  return(typeof CLS!=="undefined"&&CLS&&CLS.autoSpd)||1.6;
}
function cancelConsume(){
  if(S.p.eating){
    if(typeof removeBuff==="function")removeBuff("eating","interrupt");
    else{S.p.eating=null;log("进食被打断。","lg-sys");}
  }
  if(S.p.bandaging){S.p.bandaging=null;log("包扎被打断。","lg-sys");}
  if(S.p.gathering){S.p.gathering=null;log("采集被打断。","lg-sys");}
}
function useItem(id){
  const it=ITEMS[id];
  if(!it||it.slot!=="consumable"){log("该物品无法使用。","lg-sys");return false;}
  if(!S.p.alive||S.over)return false;
  const idx=S.inv.indexOf(id); if(idx<0)return false;
  if(it.use==="food"){
    if(S.p.eating||S.p.bandaging||S.p.gathering){log("你正在忙碌中。","lg-sys");return false;}
    if(S.p.hp>=S.p.hpMax){log("生命已满。","lg-sys");return false;}
    S.inv.splice(idx,1);
    const E=BAL.economy.food;
    const total=Math.round(S.p.hpMax*E.healPct);
    if(typeof applyBuff==="function")
      applyBuff("eating",{duration:E.duration,healPerSec:total/E.duration,name:it.name});
    else S.p.eating={t:E.duration,healPerSec:total/E.duration,name:it.name};
    announce("坐下进食…");
    log(`开始食用【${it.name}】（移动会打断）。`,"lg-heal");
    renderBag();
    if(typeof saveGame==="function")saveGame(true);
    return true;
  }
  if(it.use==="bandage"){
    if(S.p.eating||S.p.bandaging||S.p.gathering){log("你正在忙碌中。","lg-sys");return false;}
    if(S.p.hp>=S.p.hpMax){log("生命已满。","lg-sys");return false;}
    S.inv.splice(idx,1);
    const E=BAL.economy.bandage;
    const heal=Math.round(S.p.hpMax*E.healPct);
    S.p.bandaging={t:E.cast,heal,name:it.name};
    announce("包扎中…");
    log(`开始使用【${it.name}】（移动会打断）。`,"lg-heal");
    renderBag();
    if(typeof saveGame==="function")saveGame(true);
    return true;
  }
  if(it.use==="potion"){
    if(S.p.hp>=S.p.hpMax){log("生命已满。","lg-sys");return false;}
    S.inv.splice(idx,1);
    const heal=Math.round(S.p.hpMax*(BAL.economy.minorPotion.healPct||.18));
    S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
    fct(player.position.clone().setY(2.2),`+${heal}`,"#7dff9a");
    log(`饮用【${it.name}】，回复 ${heal} 点生命。`,"lg-heal");
    if(typeof SFX!=="undefined")SFX.play("heal");
    renderBag();
    if(typeof saveGame==="function")saveGame(true);
    return true;
  }
  if(it.use==="whetstone"){
    S.inv.splice(idx,1);
    const W=BAL.economy.whetstone;
    const add=+(W.dmgMulAdd||0);
    if(typeof applyBuff==="function")
      applyBuff("whetstone",{duration:W.duration|0,dmgMulAdd:add});
    else{
      if(S.p.whetstoneT>0&&S.p.whetstoneAdd)S.p.dmgMul-=S.p.whetstoneAdd;
      S.p.whetstoneAdd=add;
      S.p.whetstoneT=W.duration|0;
      S.p.dmgMul+=add;
    }
    announce("磨刀石 · 锋利");
    log(`使用【${it.name}】，伤害提升 ${Math.round(add*100)}%（${W.duration|0} 秒）。`,"lg-sys");
    renderBag();
    if(typeof saveGame==="function")saveGame(true);
    return true;
  }
  if(it.use==="quest"){
    if(typeof canUseQuestItem==="function"&&!canUseQuestItem(id)){
      log("此处无法使用该物品。","lg-sys");
      return false;
    }
    S.inv.splice(idx,1);
    log(`使用【${it.name}】。`,"lg-sys");
    if(typeof onQuestUseItem==="function")onQuestUseItem(id);
    renderBag();
    if(typeof saveGame==="function")saveGame(true);
    return true;
  }
  return false;
}
function sellItem(id){
  if(!S.vendorOpen){log("需要在商人处才能出售。","lg-sys");return false;}
  const it=ITEMS[id];
  if(!it||it.quest||it.vendorSell==null){log("该物品无法出售。","lg-sys");return false;}
  const idx=S.inv.indexOf(id); if(idx<0)return false;
  S.inv.splice(idx,1);
  gainCopper(it.vendorSell,{silent:true});
  log(`出售【${it.name}】，获得 ${formatCopperText(it.vendorSell)}。`,"lg-sys");
  SFX.play("pickup");
  renderBag();
  if(typeof refreshVendorPanel==="function")refreshVendorPanel();
  if(typeof saveGame==="function")saveGame(true);
  return true;
}
function buyVendorItem(id){
  if(!S.vendorOpen)return false;
  const it=ITEMS[id];
  if(!it||it.vendorBuy==null){log("无法购买。","lg-sys");return false;}
  if(S.inv.length>=BAL.bag.size){log("背包已满。","lg-sys");return false;}
  if(!spendCopper(it.vendorBuy)){
    log(`金币不足（需要 ${formatCopperText(it.vendorBuy)}）。`,"lg-sys");
    return false;
  }
  S.inv.push(id);
  log(`购买【${it.name}】，花费 ${formatCopperText(it.vendorBuy)}。`,"lg-sys");
  SFX.play("pickup");
  renderBag();
  if(typeof refreshVendorPanel==="function")refreshVendorPanel();
  if(typeof saveGame==="function")saveGame(true);
  return true;
}
function onBagItemClick(id){
  const it=ITEMS[id]; if(!it)return;
  if(it.slot==="consumable")useItem(id);
  else if(isEquippable(it))equipItem(id);
}
function equipItem(id){
  const it=ITEMS[id];
  const slot=resolveEquipSlot(it);
  if(!slot){log("该物品无法装备。");return;}
  const idx=S.inv.indexOf(id); if(idx<0)return;
  S.inv.splice(idx,1);
  const old=S.eq[slot];
  if(old){applyEquipStats(ITEMS[old],-1);S.inv.push(old);}
  S.eq[slot]=id;
  applyEquipStats(it,+1);
  if(slot==="mainhand")setWeapon(player,it.model||player.userData.defaultWeapon);
  log(`装备【${it.name}】（${EQUIP_SLOT_LABEL[slot]||slot}）。`,"lg-me");
  SFX.play("pickup");
  VFX.spawn("loot_spark",{pos:player.position.clone().setY(1.5),color:QUALITY[it.quality].hex,count:20,spread:1.4});
  renderBag();
  if(typeof renderCharPanel==="function")renderCharPanel();
  if(typeof saveGame==="function")saveGame(true);
}
function unequipItem(slot){
  if(!EQUIP_SLOTS.includes(slot))return;
  const id=S.eq[slot]; if(!id)return;
  if(S.inv.length>=BAL.bag.size){log("背包已满，无法卸下。","lg-sys");return;}
  S.eq[slot]=null; applyEquipStats(ITEMS[id],-1); S.inv.push(id);
  if(slot==="mainhand")setWeapon(player,player.userData.defaultWeapon);
  log(`卸下【${ITEMS[id].name}】。`,"lg-sys");
  renderBag();
  if(typeof renderCharPanel==="function")renderCharPanel();
  if(typeof saveGame==="function")saveGame(true);
}

/* ---------------- 背包 UI（HTML 覆盖层，#dlg 同风格） ---------------- */
function bagOpen(){return $("#bag").style.display==="block";}
function ensureBagOpen(){
  if(!S.started)return;
  if(bagOpen()){renderBag();return;}
  $("#bag").style.display="block";
  renderBag();
}
function toggleBag(){
  if(!S.started)return;
  if(bagOpen()){
    $("#bag").style.display="none";
    hideItemTip();
    /* 交易中关背包时同步关商人（魔兽：可单独关包，此处保持买卖成对） */
    if(S.vendorOpen&&typeof closeVendorPanel==="function")closeVendorPanel();
    return;
  }
  ensureBagOpen();
}
function itemTitle(it){
  const st=it.stats||{}, parts=[];
  for(const k of EQUIP_STAT_KEYS)if(st[k])parts.push(`${({str:"力量",agi:"敏捷",sta:"耐力",int:"智力",spi:"精神"})[k]} +${st[k]}`);
  if(it.armor||st.armor)parts.push(`护甲 ${(it.armor|0)+(st.armor|0)}`);
  if(it.dmgRange)parts.push(`伤害 ${it.dmgRange[0]}–${it.dmgRange[1]}`);
  if(st.dmgMul)parts.push(`伤害 +${Math.round((st.dmgMul-1)*100)}%`);
  if(st.hpMax)parts.push(`生命上限 +${st.hpMax}`);
  if(it.slot==="consumable"&&it.use==="food")parts.push("坐下回血");
  if(it.slot==="consumable"&&it.use==="bandage")parts.push("包扎回血");
  if(it.vendorSell!=null)parts.push(`售价 ${formatCopperText(it.vendorSell)}`);
  if(it.vendorBuy!=null)parts.push(`买入 ${formatCopperText(it.vendorBuy)}`);
  return `${it.name}（${QUALITY[it.quality].name}）${parts.length?" · "+parts.join(" · "):""}`;
}
const SLOT_NAME={
  head:"头部",neck:"颈部",shoulder:"肩部",back:"背部",chest:"胸部",waist:"腰部",
  legs:"腿部",feet:"脚部",wrist:"腕部",hands:"手部",finger:"手指",
  mainhand:"主手",offhand:"副手",ranged:"远程",
  wrists:"腕部",trinket:"颈部",weapon:"主手",armor:"胸部",consumable:"消耗品",misc:"杂物",
};
const STAT_LABEL={str:"力量",agi:"敏捷",sta:"耐力",int:"智力",spi:"精神"};
const USE_NAME={food:"坐下进食回血",bandage:"引导包扎回血",potion:"立即回复生命",whetstone:"临时提升伤害",quest:"任务使用"};
function itemTipHtml(it,extraHint){
  if(!it)return "";
  const q=QUALITY[it.quality]||QUALITY.common;
  const st=it.stats||{};
  let html=`<div class="it-name" style="color:${q.color}">${it.name}</div>`;
  const meta=[];
  if(it.ilvl)meta.push(`物品等级 ${it.ilvl}`);
  meta.push(q.name);
  meta.push(SLOT_NAME[normalizeItemSlot(it.slot)]||SLOT_NAME[it.slot]||it.slot||"物品");
  html+=`<div class="it-meta">${meta.join(" · ")}</div>`;
  if(it.quest)html+=`<div class="it-line it-quest">任务物品</div>`;
  if(it.dmgRange){
    const spd=it.speed||2;
    const dps=((it.dmgRange[0]+it.dmgRange[1])/2/spd).toFixed(1);
    html+=`<div class="it-line">${it.dmgRange[0]} – ${it.dmgRange[1]} 伤害</div>`;
    html+=`<div class="it-line">速度 ${spd.toFixed(2)}（${dps} DPS）</div>`;
  }
  const arm=(it.armor|0)+(st.armor|0);
  if(arm)html+=`<div class="it-line">${arm} 点护甲</div>`;
  for(const k of EQUIP_STAT_KEYS){
    if(st[k])html+=`<div class="it-line it-stat">+${st[k]} ${STAT_LABEL[k]}</div>`;
  }
  if(st.dmgMul)html+=`<div class="it-line it-stat">伤害 +${Math.round((st.dmgMul-1)*100)}%</div>`;
  if(st.hpMax)html+=`<div class="it-line it-stat">生命上限 +${st.hpMax}</div>`;
  if(it.use&&USE_NAME[it.use])html+=`<div class="it-line it-stat">${USE_NAME[it.use]}</div>`;
  if(it.model)html+=`<div class="it-line">外观：${it.model}</div>`;
  if(it.vendorBuy!=null)html+=`<div class="it-line it-price">买入 ${formatCopperText(it.vendorBuy)}</div>`;
  if(it.vendorSell!=null)html+=`<div class="it-line it-price">售价 ${formatCopperText(it.vendorSell)}</div>`;
  else if(it.quest)html+=`<div class="it-line it-price">不可出售</div>`;
  if(extraHint)html+=`<div class="it-hint">${extraHint}</div>`;
  return html;
}
function showItemTip(it,clientX,clientY,extraHint){
  if(!it)return;
  if(typeof showTipHtml==="function")showTipHtml(itemTipHtml(it,extraHint),clientX,clientY);
  else{
    const tip=$("#itemTip"); if(!tip)return;
    tip.innerHTML=itemTipHtml(it,extraHint);
    tip.style.display="block";
    tip.setAttribute("aria-hidden","false");
    const pad=14, tw=tip.offsetWidth||200, th=tip.offsetHeight||120;
    let x=clientX+pad, y=clientY+pad;
    if(x+tw>innerWidth-8)x=clientX-tw-pad;
    if(y+th>innerHeight-8)y=clientY-th-pad;
    tip.style.left=Math.max(8,x)+"px";
    tip.style.top=Math.max(8,y)+"px";
  }
}
function hideItemTip(){
  if(typeof hideTip==="function")hideTip();
  else{
    const tip=$("#itemTip"); if(!tip)return;
    tip.style.display="none";
    tip.setAttribute("aria-hidden","true");
  }
}
function bindItemTip(el,it,extraHint){
  if(!el||!it)return;
  if(typeof bindTipHtml==="function"){
    bindTipHtml(el,()=>itemTipHtml(it,extraHint));
    return;
  }
  el.addEventListener("pointerenter",e=>showItemTip(it,e.clientX,e.clientY,extraHint));
  el.addEventListener("pointermove",e=>showItemTip(it,e.clientX,e.clientY,extraHint));
  el.addEventListener("pointerleave",hideItemTip);
}
function renderBag(){
  if(!bagOpen())return;
  hideItemTip();
  const cols=(BAL.bag&&BAL.bag.cols)|6;
  const grid=$("#bagGrid");
  if(grid)grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  grid.innerHTML="";
  for(let i=0;i<BAL.bag.size;i++){
    const cell=document.createElement("div"); cell.className="bagCell";
    const id=S.inv[i];
    if(id){
      const it=ITEMS[id], q=QUALITY[it.quality];
      const img=document.createElement("img");
      img.src=Icons.get(it.icon,q.color); img.style.borderColor=q.color;
      let hint="";
      if(isEquippable(it))hint="左键/右键装备";
      else if(it.slot==="consumable")hint="左键使用";
      if(S.vendorOpen&&it.vendorSell!=null)hint=(hint?hint+" · ":"")+"右键出售";
      cell.style.borderColor=q.color;
      cell.style.boxShadow=`inset 0 0 0 1px ${q.color}55`;
      bindItemTip(img,it,hint||null);
      img.addEventListener("click",()=>{hideItemTip();onBagItemClick(id);});
      img.addEventListener("contextmenu",e=>{
        e.preventDefault();
        hideItemTip();
        if(S.vendorOpen)sellItem(id);
        else if(isEquippable(it))equipItem(id);
      });
      cell.appendChild(img);
    }
    grid.appendChild(cell);
  }
  const title=$("#bag .bag-title");
  if(title){
    const n=S.inv.length|0, max=BAL.bag.size|0;
    title.childNodes[0].textContent=`🎒 背包（${n}/${max}）`;
  }
}
/* 关闭按钮 / 移动端背包按钮 */
$("#bagClose").addEventListener("click",toggleBag);
$("#bagBtn").addEventListener("pointerdown",()=>toggleBag());
