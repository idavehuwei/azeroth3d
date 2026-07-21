/* ============================================================
   熔火之心 · items.js
   物品与掉落系统（STEP 2）：品质表 / 物品定义 / 按权重掉落表
   世界掉落实体（发光方块 + 图标悬浮牌 + 品质色名字）与尸体拾取
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ rand BAL makeLabel；运行时读 scene）
          icons.js（Icons）· models.js 运行时（setWeapon）
          combat.js 运行时（S log fct）· world.js 运行时（player）· vfx.js 运行时（VFX）
          talents.js 运行时（talentOpen closeTalentPanel；与背包互斥）
          save.js 运行时（saveGame；换装自动存）
   [导出] QUALITY ITEMS LOOT rollLoot dropLoot updateDrops nearestDrop
          tryLoot removeDropOf logLoot DROPS
          equipItem unequipItem toggleBag renderBag applyEquipStats bagOpen
          useItem sellItem buyVendorItem cancelConsume（STEP 13）
   ============================================================ */
"use strict";
/* ---------------- 品质表：颜色即一切（描边/名字/方块光） ---------------- */
const QUALITY={
  common   :{name:"普通",color:"#e8e8e8",hex:0xe8e8e8},
  uncommon :{name:"优秀",color:"#1eff00",hex:0x1eff00},
  rare     :{name:"稀有",color:"#4aa8ff",hex:0x4aa8ff},
  epic     :{name:"史诗",color:"#a335ee",hex:0xa335ee},
  legendary:{name:"传说",color:"#ff8000",hex:0xff8000},
};

/* ---------------- 物品定义：{id,name,icon,quality,slot,stats,vendorBuy?,vendorSell?,use?}
   slot: weapon|armor|misc|consumable；铜价见 vendorBuy/vendorSell（STEP 13） */
const ITEMS={
  boar_meat    :{id:"boar_meat",    name:"野猪肋排",    icon:"meat",  quality:"common",   slot:"misc",  stats:null, vendorSell:6},
  boar_tusk    :{id:"boar_tusk",    name:"破损的獠牙",  icon:"tusk",  quality:"common",   slot:"misc",  stats:null, vendorSell:4},
  boar_hide    :{id:"boar_hide",    name:"粗糙的兽皮",  icon:"hide",  quality:"common",   slot:"misc",  stats:null, vendorSell:8},
  tusk_blade   :{id:"tusk_blade",   name:"獠牙短刃",    icon:"sword", quality:"uncommon", slot:"weapon",stats:{dmgMul:1.05},model:"sword",vendorSell:45},
  hide_vest    :{id:"hide_vest",    name:"硬化皮甲",    icon:"armor", quality:"uncommon", slot:"armor", stats:{hpMax:250},vendorSell:50},
  plains_blade :{id:"plains_blade", name:"草原猎手战刃",icon:"sword", quality:"rare",     slot:"weapon",stats:{dmgMul:1.12},model:"sword",vendorSell:180},
  mesa_guard   :{id:"mesa_guard",   name:"红岩守卫胸甲",icon:"armor", quality:"rare",     slot:"armor", stats:{hpMax:600},vendorSell:200},
  sulf_ash     :{id:"sulf_ash",     name:"熔岩灰烬",    icon:"hide",  quality:"common",   slot:"misc",  stats:null, vendorSell:10},
  sulf_core    :{id:"sulf_core",    name:"灼热核心",    icon:"fireball",quality:"common", slot:"misc",  stats:null, vendorSell:14},
  sulf_ring    :{id:"sulf_ring",    name:"烈焰指环",    icon:"armor", quality:"uncommon", slot:"armor", stats:{hpMax:180},vendorSell:70},
  sulf_blade   :{id:"sulf_blade",   name:"熔火利刃",    icon:"sword", quality:"rare",     slot:"weapon",stats:{dmgMul:1.08},model:"sword",vendorSell:220},
  sulfuras_haft:{id:"sulfuras_haft",name:"萨弗拉斯之柄",icon:"hammer",quality:"legendary",slot:"weapon",stats:{dmgMul:1.3},model:"sulfuras",vendorSell:2500},
  /* —— STEP 5 新怪掉落 —— */
  wolf_pelt    :{id:"wolf_pelt",    name:"灰狼皮",      icon:"hide",   quality:"common",  slot:"misc",  stats:null, vendorSell:7},
  wolf_fang    :{id:"wolf_fang",    name:"锋利的狼牙",  icon:"tusk",   quality:"common",  slot:"misc",  stats:null, vendorSell:5},
  bird_feather :{id:"bird_feather", name:"陆行鸟羽毛",  icon:"feather",quality:"common",  slot:"misc",  stats:null, vendorSell:5},
  bird_meat    :{id:"bird_meat",    name:"陆行鸟腿肉",  icon:"meat",   quality:"common",  slot:"misc",  stats:null, vendorSell:6},
  wind_blade   :{id:"wind_blade",   name:"疾风之刃",    icon:"sword",  quality:"uncommon",slot:"weapon",stats:{dmgMul:1.06},model:"sword",vendorSell:55},
  harpy_charm  :{id:"harpy_charm",  name:"鹰羽护符",    icon:"feather",quality:"uncommon",slot:"armor", stats:{hpMax:220},vendorSell:60},
  greyjaw_tusk :{id:"greyjaw_tusk", name:"老灰鬃的獠牙刃",icon:"sword",quality:"rare",    slot:"weapon",stats:{dmgMul:1.15},model:"sword",vendorSell:240},
  /* —— STEP 9c 玛格曼达 —— */
  magma_fang   :{id:"magma_fang",   name:"熔岩犬牙项链",icon:"tusk",  quality:"uncommon",slot:"armor", stats:{hpMax:320},vendorSell:90},
  magma_collar :{id:"magma_collar", name:"焚犬项圈",    icon:"armor", quality:"rare",    slot:"armor", stats:{hpMax:520},vendorSell:260},
  /* —— STEP 21 哀嚎洞穴 —— */
  serpent_fang :{id:"serpent_fang", name:"毒牙弯刃",    icon:"sword", quality:"rare",    slot:"weapon",stats:{dmgMul:1.14},model:"sword",vendorSell:280},
  moss_mantle  :{id:"moss_mantle",  name:"苔藓披风甲",  icon:"armor", quality:"rare",    slot:"armor", stats:{hpMax:720},vendorSell:300},
  /* —— STEP 28 奥妮克希亚 —— */
  onyxia_fang  :{id:"onyxia_fang",  name:"奥妮克希亚之牙",icon:"sword", quality:"epic",   slot:"weapon",stats:{dmgMul:1.22},model:"sword",vendorSell:800},
  dragonscale  :{id:"dragonscale",  name:"黑龙鳞胸甲",  icon:"armor", quality:"epic",   slot:"armor", stats:{hpMax:1100},vendorSell:850},
  scale_cloak  :{id:"scale_cloak",  name:"龙鳞披风",    icon:"armor", quality:"rare",    slot:"armor", stats:{hpMax:680},vendorSell:420},
  whelp_claw   :{id:"whelp_claw",   name:"幼龙利爪",    icon:"sword", quality:"uncommon",slot:"weapon",stats:{dmgMul:1.08},model:"sword",vendorSell:160},
  /* —— STEP 24 世界 Boss —— */
  warbringer_spear:{id:"warbringer_spear",name:"战争使者战矛",icon:"sword",quality:"rare",slot:"weapon",stats:{dmgMul:1.16},model:"sword",vendorSell:320},
  warbringer_plate:{id:"warbringer_plate",name:"半人马督军胸甲",icon:"armor",quality:"rare",slot:"armor",stats:{hpMax:780},vendorSell:340},
  /* —— STEP 13 商人消耗品 —— */
  plain_bread  :{id:"plain_bread",  name:"硬面饼",      icon:"bread",  quality:"common", slot:"consumable",use:"food",
                 stats:null, vendorBuy:25, vendorSell:5},
  linen_bandage:{id:"linen_bandage",name:"亚麻绷带",    icon:"bandage",quality:"common", slot:"consumable",use:"bandage",
                 stats:null, vendorBuy:40, vendorSell:8},
  /* —— STEP 23 制作产出 —— */
  minor_potion :{id:"minor_potion", name:"初级治疗药水",icon:"potion", quality:"common", slot:"consumable",use:"potion",
                 stats:null, vendorSell:12},
  whetstone    :{id:"whetstone",    name:"磨刀石",      icon:"whetstone",quality:"common",slot:"consumable",use:"whetstone",
                 stats:null, vendorSell:10},
  /* —— V1-B2 任务物品 / 分区装备 —— */
  quest_sacred_oil  :{id:"quest_sacred_oil",  name:"圣油",        icon:"potion", quality:"common", slot:"consumable",use:"quest",
                      stats:null, quest:true},
  quest_signal_horn :{id:"quest_signal_horn", name:"信号号角",    icon:"tusk",   quality:"common", slot:"consumable",use:"quest",
                      stats:null, quest:true},
  quest_supply_crate:{id:"quest_supply_crate",name:"军需木箱",    icon:"armor",  quality:"common", slot:"misc",
                      stats:null, quest:true},
  quest_ochre_report:{id:"quest_ochre_report",name:"斥候急报",    icon:"hide",   quality:"common", slot:"misc",
                      stats:null, quest:true},
  zebra_hide        :{id:"zebra_hide",        name:"斑马皮",      icon:"hide",   quality:"common", slot:"misc",
                      stats:null, vendorSell:9},
  scorp_stinger     :{id:"scorp_stinger",     name:"蝎刺",        icon:"tusk",   quality:"common", slot:"misc",
                      stats:null, vendorSell:8},
  barrens_cleaver   :{id:"barrens_cleaver",   name:"贫瘠劈刀",    icon:"sword",  quality:"uncommon",slot:"weapon",
                      stats:{dmgMul:1.09},model:"sword",vendorSell:160},
  barrens_cuirass   :{id:"barrens_cuirass",   name:"十字路口胸甲",icon:"armor",  quality:"uncommon",slot:"armor",
                      stats:{hpMax:420},vendorSell:170},
  ochre_fang        :{id:"ochre_fang",        name:"赭岩毒牙刃",  icon:"sword",  quality:"rare",    slot:"weapon",
                      stats:{dmgMul:1.13},model:"sword",vendorSell:260},
  ochre_plate       :{id:"ochre_plate",       name:"哨站硬皮甲",  icon:"armor",  quality:"uncommon",slot:"armor",
                      stats:{hpMax:480},vendorSell:190},
};

/* ---------------- 掉落表：品质三档池，权重见 BALANCE.loot.weights ---------------- */
const LOOT={
  boar:{
    common  :["boar_meat","boar_tusk","boar_hide"],
    uncommon:["tusk_blade","hide_vest"],
    rare    :["plains_blade","mesa_guard"],
  },
  add:{
    common  :["sulf_ash","sulf_core"],
    uncommon:["sulf_ring"],
    rare    :["sulf_blade"],
  },
  /* —— STEP 5 —— */
  wolf:{
    common  :["wolf_pelt","wolf_fang"],
    uncommon:["tusk_blade","hide_vest"],
    rare    :["plains_blade","mesa_guard"],
  },
  bird:{
    common  :["bird_feather","bird_meat"],
    uncommon:["hide_vest"],
    rare    :["plains_blade"],
  },
  harpy:{                      /* 精英表：配 eliteWeights，必掉优秀以上 */
    uncommon:["wind_blade","harpy_charm"],
    rare    :["plains_blade","mesa_guard"],
  },
  boarKing:{
    uncommon:["tusk_blade","hide_vest"],
    rare    :["greyjaw_tusk","mesa_guard"],
  },
  centaurHerald:{
    uncommon:["wind_blade","hide_vest"],
    rare    :["warbringer_spear","warbringer_plate"],
  },
  magmadar:{
    uncommon:["magma_fang","sulf_ring"],
    rare    :["magma_collar","sulf_blade"],
  },
  /* —— STEP 21 哀嚎洞穴 —— */
  wailingAdd:{
    common  :["boar_hide","bird_feather"],
    uncommon:["hide_vest","tusk_blade"],
    rare    :["serpent_fang"],
  },
  wailing:{
    uncommon:["hide_vest","wind_blade"],
    rare    :["serpent_fang","moss_mantle"],
  },
  /* —— STEP 28 奥妮克希亚 —— */
  onyxiaAdd:{
    common  :["sulf_ash","bird_feather"],
    uncommon:["whelp_claw","sulf_ring"],
    rare    :["scale_cloak"],
  },
  onyxia:{
    uncommon:["scale_cloak","whelp_claw"],
    rare    :["onyxia_fang","dragonscale","scale_cloak"],
  },
  /* —— STEP 18 贫瘠之地 —— */
  quilboar:{
    common  :["boar_meat","boar_tusk","boar_hide"],
    uncommon:["tusk_blade","hide_vest"],
    rare    :["plains_blade"],
  },
  scorp:{
    common  :["boar_hide","bird_feather","scorp_stinger"],
    uncommon:["hide_vest","tusk_blade"],
    rare    :["ochre_fang","plains_blade"],
  },
  razorback:{
    common  :["boar_meat","boar_tusk","boar_hide"],
    uncommon:["tusk_blade","hide_vest","ochre_plate"],
    rare    :["plains_blade","mesa_guard"],
  },
  cliffHarpy:{
    uncommon:["wind_blade","harpy_charm","ochre_fang"],
    rare    :["plains_blade","mesa_guard"],
  },
  centaur:{
    common  :["wolf_pelt","bird_feather"],
    uncommon:["wind_blade","hide_vest","barrens_cuirass"],
    rare    :["barrens_cleaver","plains_blade","mesa_guard"],
  },
  zebra:{
    common  :["bird_meat","bird_feather","zebra_hide"],
    uncommon:["hide_vest","barrens_cuirass"],
    rare    :["barrens_cleaver","plains_blade"],
  },
};
/* 按权重掷品质档（可传 BAL.loot.eliteWeights 等），再从该档均匀取一件（玩法随机 → rand 路线） */
function rollLoot(table,weights){
  const w=weights||BAL.loot.weights;
  let total=0; for(const k in w)total+=w[k];
  let r=rand(0,total);
  for(const k in w){
    r-=w[k];
    if(r<0){const pool=table[k];return ITEMS[pool[(Math.random()*pool.length)|0]];}
  }
  const pool=table.common||table[Object.keys(table)[0]];   /* 浮点兜底 */
  return ITEMS[pool[0]];
}

/* ============================================================
   掉落实体：发光小方块 + Canvas 图标悬浮牌 + 品质色悬浮名
   ============================================================ */
const DROPS=[];
function dropLoot(pos,items,owner,onLooted){
  const it=items[0], q=QUALITY[it.quality];
  const grp=new THREE.Group(); grp.position.copy(pos).setY(0);
  const cube=new THREE.Mesh(new THREE.BoxGeometry(.55,.55,.55),
    new THREE.MeshStandardMaterial({color:q.hex,emissive:q.hex,emissiveIntensity:.65,roughness:.4}));
  cube.position.y=.6; cube.castShadow=true; grp.add(cube);
  const icSp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(Icons.canvas(it.icon,q.color)),
    transparent:true,depthWrite:false}));
  icSp.scale.set(1.15,1.15,1); icSp.position.y=1.9; grp.add(icSp);
  const label=makeLabel(it.name,5.5,q.color,q.color);
  label.position.y=2.9; grp.add(label);
  scene.add(grp);
  DROPS.push({grp,cube,items,owner,onLooted,scn:scene,t:0});
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
   背包与装备栏（STEP 4）：B 键开关，16 格 + 武器/护甲两个装备位
   武器加 dmgMul（叠加制，与等级/任务奖励同路）、护甲加 hpMax；
   换装时只换武器组：setWeapon(player, item.model)
   STEP 13：消耗品左键使用；商人打开时右键出售
   ============================================================ */
function applyEquipStats(it,sign){
  const st=it.stats||{};
  if(st.dmgMul)S.p.dmgMul+=(st.dmgMul-1)*sign;
  if(st.hpMax){
    S.p.hpMax+=st.hpMax*sign;
    S.p.hp=sign>0?Math.min(S.p.hpMax,S.p.hp+st.hpMax):Math.min(S.p.hp,S.p.hpMax);
  }
}
function cancelConsume(){
  if(S.p.eating){S.p.eating=null;log("进食被打断。","lg-sys");}
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
    S.p.eating={t:E.duration,healPerSec:total/E.duration,name:it.name};
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
    if(S.p.whetstoneT>0&&S.p.whetstoneAdd)S.p.dmgMul-=S.p.whetstoneAdd;
    S.p.whetstoneAdd=add;
    S.p.whetstoneT=W.duration|0;
    S.p.dmgMul+=add;
    announce("磨刀石 · 锋利");
    log(`使用【${it.name}】，伤害提升 ${Math.round(add*100)}%（${W.duration|0} 秒）。`,"lg-sys");
    renderBag();
    if(typeof saveGame==="function")saveGame(true);
    return true;
  }
  if(it.use==="quest"){
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
  else if(it.slot==="weapon"||it.slot==="armor")equipItem(id);
}
function equipItem(id){
  const it=ITEMS[id];
  if(!it||(it.slot!=="weapon"&&it.slot!=="armor")){log("该物品无法装备。");return;}
  const idx=S.inv.indexOf(id); if(idx<0)return;
  S.inv.splice(idx,1);
  const old=S.eq[it.slot];
  if(old){applyEquipStats(ITEMS[old],-1);S.inv.push(old);}   /* 旧装备回背包 */
  S.eq[it.slot]=id;
  applyEquipStats(it,+1);
  if(it.slot==="weapon")setWeapon(player,it.model||player.userData.defaultWeapon);
  log(`装备【${it.name}】。`,"lg-me");
  SFX.play("pickup");
  VFX.spawn("loot_spark",{pos:player.position.clone().setY(1.5),color:QUALITY[it.quality].hex,count:20,spread:1.4});
  renderBag();
  if(typeof renderCharPanel==="function")renderCharPanel();
  if(typeof saveGame==="function")saveGame(true);
}
function unequipItem(slot){
  const id=S.eq[slot]; if(!id)return;
  if(S.inv.length>=BAL.bag.size){log("背包已满，无法卸下。","lg-sys");return;}
  S.eq[slot]=null; applyEquipStats(ITEMS[id],-1); S.inv.push(id);
  if(slot==="weapon")setWeapon(player,player.userData.defaultWeapon);
  log(`卸下【${ITEMS[id].name}】。`,"lg-sys");
  renderBag();
  if(typeof renderCharPanel==="function")renderCharPanel();
  if(typeof saveGame==="function")saveGame(true);
}

/* ---------------- 背包 UI（HTML 覆盖层，#dlg 同风格） ---------------- */
function bagOpen(){return $("#bag").style.display==="block";}
function toggleBag(){
  if(!S.started)return;
  if(bagOpen()){$("#bag").style.display="none";return;}
  if(typeof closeAllHudPanels==="function")closeAllHudPanels("bag");
  else if(typeof talentOpen==="function"&&talentOpen())closeTalentPanel();
  $("#bag").style.display="block";
  renderBag();
}
function itemTitle(it){
  const st=it.stats||{}, parts=[];
  if(st.dmgMul)parts.push(`伤害 +${Math.round((st.dmgMul-1)*100)}%`);
  if(st.hpMax)parts.push(`生命上限 +${st.hpMax}`);
  if(it.slot==="consumable"&&it.use==="food")parts.push("坐下回血");
  if(it.slot==="consumable"&&it.use==="bandage")parts.push("包扎回血");
  if(it.vendorSell!=null)parts.push(`售价 ${formatCopperText(it.vendorSell)}`);
  if(it.vendorBuy!=null)parts.push(`买入 ${formatCopperText(it.vendorBuy)}`);
  return `${it.name}（${QUALITY[it.quality].name}）${parts.length?" · "+parts.join(" · "):""}`;
}
function renderBag(){
  if(!bagOpen())return;
  /* 装备位 */
  document.querySelectorAll("#bag .eqSlot").forEach(el=>{
    const slot=el.dataset.slot, id=S.eq[slot];
    el.innerHTML=`<span class="eqTag">${slot==="weapon"?"武器":"护甲"}</span>`;
    if(id){
      const it=ITEMS[id], q=QUALITY[it.quality];
      const img=document.createElement("img");
      img.src=Icons.get(it.icon,q.color); img.style.borderColor=q.color;
      img.title=itemTitle(it)+" · 点击卸下";
      el.appendChild(img);
    }
  });
  /* 16 格 */
  const grid=$("#bagGrid"); grid.innerHTML="";
  for(let i=0;i<BAL.bag.size;i++){
    const cell=document.createElement("div"); cell.className="bagCell";
    const id=S.inv[i];
    if(id){
      const it=ITEMS[id], q=QUALITY[it.quality];
      const img=document.createElement("img");
      img.src=Icons.get(it.icon,q.color); img.style.borderColor=q.color;
      let tip=itemTitle(it);
      if(it.slot==="weapon"||it.slot==="armor")tip+=" · 点击装备";
      else if(it.slot==="consumable")tip+=" · 点击使用";
      if(S.vendorOpen&&it.vendorSell!=null)tip+=" · 右键出售";
      img.title=tip;
      img.addEventListener("click",()=>onBagItemClick(id));
      img.addEventListener("contextmenu",e=>{
        e.preventDefault();
        sellItem(id);
      });
      cell.appendChild(img);
    }
    grid.appendChild(cell);
  }
}
/* 装备位点击卸下 / 关闭按钮 / 移动端背包按钮（监听挂容器，渲染重建不掉） */
document.querySelectorAll("#bag .eqSlot").forEach(el=>{
  el.addEventListener("click",()=>unequipItem(el.dataset.slot));
});
$("#bagClose").addEventListener("click",toggleBag);
$("#bagBtn").addEventListener("pointerdown",()=>toggleBag());
