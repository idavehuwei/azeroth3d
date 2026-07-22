/* ============================================================
   炽心 · combat.js
   战斗系统：游戏状态 / 职业配置 / UI 与输入 / 玩家技能
            统一受击入口 hitEntity / 玩家胜负
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ clamp rand R BAL scene camera ARENA_R）
          icons.js（Icons）
          models.js（buildPlayer … buildWarlock buildDruid buildPaladin）
          creatures.js 运行时（buildFlameSpawn；raid/world 调用）
          items.js（ITEMS DROPS removeDrop dropLoot）
          world.js（player boss MOBS QUEST mobDamage updateQuest tryInteract）
          main.js 运行时（clampArena）
          vfx.js 运行时（VFX spawnBurst）
          talents.js 运行时（getSkillCd grantTalentPointOnLevel initTalentsForClass
            toggleTalentPanel；N 键）
          panels.js 运行时（toggleCharPanel toggleSpellPanel toggleQuestLog；C/P/L）
          map.js 运行时（toggleWorldMap；M 键）
          save.js 运行时（saveGame；升级自动存）
          raid.js 运行时（bossAI distToBoss bossTargetable fireProjectile
            spawnAdd addDamage addDie bossDie playerDie resetBoss BOSS_ENT DUNGEON）
          threat.js 运行时（addThreat）
   [导出] S SKILLS CLASSES CLS setClass applySkillBarIcons log announce fct hurtFlash keys joy
          getMoveIntent clearMoveTarget camApplyDrag
          initPlayerStats refreshPlayerDerived rebuildPlayerStatsFromEquip
          hitEntity playerHit gainXP updateLevelUI useSkill pickTarget setCurrentTarget getFocusTarget
          resolveSkillTarget cycleHostileTargets listHostileTargets targetDisplayInfo
          firePlayerShot
          useSkill hitEntity dmgBoss pickTarget firePlayerShot playerHit
          beginPlayerCast cancelPlayerCast tickPlayerCast finishSkillUse
          showUnitCastBar hideUnitCastBar setUnitCastBarProgress skillTargetOutOfRange
          isTargetAlive setCurrentTarget getFocusTarget clearCurrentTargetIf
          resolveSkillTarget cycleHostileTargets
          gainXP updateLevelUI gainCopper spendCopper formatCopperText updateGoldUI
          clearShieldVisual applyHeal clearAllTotems tickTotems
          breakStealth enterStealth getPlayerAggroMul getMobAggroRadius isBehindTarget
          skillRank getSkillBal tryInterrupt taunt
          （S.quests · STEP 22 任务运行时）
   ============================================================ */
"use strict";
/* ============================================================
   游戏状态
   ============================================================ */
const S={
  started:false,over:false,t:0,mode:"world",zoneId:"mulgore",
  portalHinted:false,portalHints:{},portalLockT:0,
  currentTarget:null,   /* plan-V3 C2 / STEP 20：当前目标（技能与 AI 共用） */
  target:null,          /* C2 别名，与 currentTarget 同步 */
  nameplatesShowAll:false, /* C2：V 键姓名板全显 */
  quests:{},            /* STEP 22：任务运行时 {id:{status,kills,flags}} */
  mats:{},              /* STEP 23：采集材料堆叠 {matId:count} */
  deeds:null,           /* STEP 25：功绩之书（ensureDeeds 初始化） */
  craftOpen:false,
  p:{hp:5200,hpMax:5200,rage:20,rageMax:100,speed:10.5,alive:true,dmgMul:1,debugMul:1,
     atkTimer:0,attackAnim:0,walkPhase:0,face:0,invuln:0,
     auras:[],
     absorb:0,absorbT:0,shieldMesh:null,   /* STEP 19 真言术：盾 */
     stealth:false,sprintT:0,              /* V1-C2 潜行 / 疾步 */
     level:1,xp:0,xpMax:BAL.levels.xpMax[0],gold:0,restXp:0,lastSeenAt:0,   /* C6 休息经验 */
     eating:null,drinking:null,bandaging:null,gathering:null,weaknessT:0,
     sitting:false,ghost:false,corpsePos:null,fallPeakY:null,
     whetstoneT:0,whetstoneAdd:0,
     vy:0,grounded:true,autoRun:false,_wantJump:false, /* plan-V3 C1 */
     stats:null,derived:null}, /* plan-V3 C3 五属性 */
  res:typeof createResourceState==="function"?createResourceState():{inCombat:false,combatT:0,manaFsr:0,energyAcc:0,combo:0},
  b:{id:"ragnaros",hp:BAL.boss.hp,hpMax:BAL.boss.hp,alive:true,rising:true,riseT:0,
     phase:1,swingT:0,casting:null,castT:0,castDur:0,
     next:{},submerged:false,submergeT:0,canLeave:false,nextAddSpawn:0,addWave:null},
  adds:[],projectiles:[],pShots:[],telegraphs:[],bursts:[],auras:[],
  totems:[], /* V1-C1：玩家图腾地面 aura */
  cds:[0,0,0,0],gcd:0,
  actionBar:[null,null,null,null], /* C7：动作条槽 → CLS.skills 下标 */
  inv:[],      /* 背包（STEP 2 起：拾取的物品 id 列表） */
  eq:emptyEquipment(), /* 纸娃娃装备位（items.js · EQUIP_SLOTS） */
  god:false,   /* 上帝模式：启程时由首页勾选决定（hitEntity 消费） */
  cam:{dist:BAL.camera.dist,pitch:BAL.camera.pitch,yawOff:0,lmb:false,rmb:false,lx:0,ly:0,colDist:null},
  camShake:0, /* R6：Boss 挥锤震屏（render-only） */
  vendorOpen:false,
  vendorNpcId:null, /* 当前商店 NPC id（对照 BAL.economy.vendorStockByNpc） */
  deathUi:false, /* STEP 15：死亡面板打开中 */
  difficulty:"normal", /* V1-B4：本次副本难度 normal|heroic */
  lfgPick:"normal",    /* 查找器当前选中的难度 */
};
/* ============================================================
   职业系统：战士 / 法师 / 弓箭手 / 牧师 / 萨满
   ============================================================ */
let SKILLS=[];
/** 先占位，避免 CLASSES 初始化失败时 CLS 落入 TDZ、主循环误报 */
let CLS=null;
const CLASSES={
  warrior:{title:"⚔️ 你 · 人类战士",hp:5200,resMax:100,resStart:20,resName:"怒气",resKind:"rage",
    regen:0,hitGain:0,speed:10.5,ranged:false,range:10,sfx:"swing",
    autoMin:150,autoMax:210,autoSpd:1.6,shotColor:0xffffff,build:buildPlayer,
    barCss:"linear-gradient(180deg,#ffd76a,#c98a1f 60%,#7a4d0c)",
    tip:"提示：近身积攒怒气；【冲锋】贴近并可打断读条；【嘲讽】强制拉住目标仇恨。",
    skills:[
      {name:"英勇打击",icon:"sword",cd:5, rage:20,fn:heroicStrike,bal:"heroicStrike",school:"physical",unlock:1,
       desc:"奋力一击，对面前敌人造成物理伤害。",range:5},
      {name:"旋风斩",  icon:"whirlwind",cd:9, rage:30,fn:whirlwind,bal:"whirlwind",school:"physical",unlock:6,
       desc:"旋转兵器，对周围敌人造成范围物理伤害。",range:8},
      {name:"冲锋",    icon:"charge",cd:12,rage:0, fn:charge,bal:"charge",unlock:4,
       desc:"向目标冲锋并贴近；若目标正在读条则可打断。",range:40},
      {name:"嘲讽",    icon:"taunt",cd:8, rage:0, fn:taunt,bal:"taunt",unlock:8,
       desc:"强制目标攻击你一段时间，并大幅拉高仇恨。",range:30}]},
  mage:{title:"🔮 你 · 人类法师",hp:3800,resMax:100,resStart:100,resName:"法力",resKind:"mana",
    regen:7,hitGain:0,speed:10,ranged:true,range:30,sfx:"fireball",
    autoMin:175,autoMax:235,autoSpd:1.8,shotColor:0xff8a30,build:buildMage,
    barCss:"linear-gradient(180deg,#7ab8ff,#2a5ec9 60%,#123a7a)",
    tip:"提示：法力随时间恢复；远程自动施放火球，【闪现】拉开距离，危急时开【寒冰屏障】免疫伤害。",
    skills:[
      {name:"炎爆术",  icon:"fireball",cd:7, rage:30,fn:pyroblast,bal:"pyroblast",school:"spell",unlock:1,
       desc:"蓄力投出巨大火球，造成高额火焰伤害。",range:30,cast:2.5},
      {name:"冰霜新星",icon:"frost",cd:11,rage:25,fn:frostNova,bal:"frostNova",school:"spell",unlock:4,
       desc:"冻结周围敌人并造成冰霜伤害，短暂定身。",range:12},
      {name:"闪现",    icon:"blink",cd:12,rage:15,fn:blink,bal:"blink",unlock:6,
       desc:"瞬间向前传送一段距离。"},
      {name:"寒冰屏障",icon:"ice_block",cd:25,rage:0, fn:iceBlock,bal:"iceBlock",unlock:10,
       desc:"把自己封进寒冰，短时间内免疫伤害。"}]},
  archer:{title:"🏹 你 · 精灵弓箭手",hp:4300,resMax:100,resStart:100,resName:"能量",resKind:"energy",
    regen:11,hitGain:0,speed:11.5,ranged:true,range:32,sfx:"arrow",minRange:5,
    autoMin:140,autoMax:190,autoSpd:1.25,shotColor:0xd0ffa0,build:buildArcher,
    barCss:"linear-gradient(180deg,#d8ff7a,#7fb32a 60%,#3d6a0c)",
    tip:"提示：能量随时间恢复；边走边射保持距离，【翻滚】可位移并短暂闪避一切伤害。",
    skills:[
      {name:"瞄准射击",icon:"aimed",cd:6, rage:30,fn:aimedShot,bal:"aimedShot",school:"physical",unlock:1,
       desc:"精确瞄准，射出高伤害箭矢。",range:32},
      {name:"多重射击",icon:"multi_shot",cd:10,rage:35,fn:multiShot,bal:"multiShot",school:"physical",unlock:4,
       desc:"同时射出多支箭，打击多个目标。",range:32},
      {name:"翻滚",    icon:"roll",cd:9, rage:20,fn:roll,bal:"roll",unlock:6,
       desc:"向前翻滚位移，短暂闪避一切伤害。"},
      {name:"治疗药水",icon:"potion",cd:22,rage:0, fn:potion,bal:"potion",unlock:8,
       desc:"喝下药水，立即回复生命。"}]},
  priest:{title:"✨ 你 · 人类牧师",hp:4000,resMax:100,resStart:100,resName:"法力",resKind:"mana",
    regen:8,hitGain:0,speed:10,ranged:true,range:28,sfx:"holy",
    autoMin:155,autoMax:205,autoSpd:1.65,shotColor:0xfff0a0,build:buildPriest,
    barCss:"linear-gradient(180deg,#fff8d0,#d4af37 60%,#8a7020)",
    tip:"提示：法力随时间恢复；【治疗术】续航，【恢复术】挂 HoT，【真言术：盾】先吸收伤害。",
    skills:[
      {name:"治疗术",    icon:"heal", cd:8,  rage:35,fn:heal,           bal:"heal",unlock:1,
       desc:"施放圣光，恢复大量生命。",cast:2.5},
      {name:"恢复术",    icon:"renew", cd:6,  rage:22,fn:castRenew,     bal:"renew",unlock:4,
       desc:"为自己施加圣光愈合，持续恢复生命。"},
      {name:"神圣惩击",  icon:"holy", cd:6,  rage:25,fn:smite,         bal:"smite",school:"spell",unlock:6,
       desc:"对目标造成神圣伤害。",range:28,cast:2},
      {name:"真言术：盾",icon:"holy_shield", cd:12, rage:30,fn:powerWordShield,bal:"powerWordShield",unlock:8,
       desc:"为自己施加吸收护盾，持续一段时间。"}]},
  shaman:{title:"🌀 你 · 兽人萨满",hp:4200,resMax:100,resStart:100,resName:"法力",resKind:"mana",
    regen:8,hitGain:0,speed:10.2,ranged:true,range:26,sfx:"lightning",
    autoMin:160,autoMax:210,autoSpd:1.7,shotColor:0x66ccff,build:buildShaman,
    barCss:"linear-gradient(180deg,#7ad0ff,#2a8a9a 60%,#104858)",
    tip:"提示：法力自动恢复；闪电箭远程输出；【治疗图腾】落地持续回血。",
    skills:[
      {name:"闪电箭",    icon:"lightning", cd:6,  rage:28,fn:lightningBolt, bal:"lightningBolt",school:"spell",unlock:1,
       desc:"投出闪电，对目标造成自然伤害。",range:26,cast:2},
      {name:"大地震击",  icon:"earth_shock", cd:7,  rage:25,fn:earthShock,    bal:"earthShock",school:"spell",unlock:4,
       desc:"以大地之力震击目标。",range:20},
      {name:"治疗波",    icon:"heal", cd:8,  rage:32,fn:healingWave,   bal:"healingWave",unlock:6,
       desc:"引导水流，恢复自身生命。",cast:2.5},
      {name:"治疗图腾",  icon:"totem", cd:18, rage:35,fn:placeHealingTotem,bal:"healingTotem",unlock:10,
       desc:"在脚下放置图腾，持续治疗范围内的自己。"}]},
  rogue:{title:"🗡 你 · 人类盗贼",hp:4100,resMax:100,resStart:100,resName:"能量",resKind:"energy",
    regen:12,hitGain:0,speed:11.2,ranged:false,range:8,sfx:"swing",
    autoMin:145,autoMax:195,autoSpd:1.35,shotColor:0xc0c8d8,build:buildRogue,
    barCss:"linear-gradient(180deg,#d0d8e8,#5a6a88 60%,#2a3448)",
    tip:"提示：能量自动恢复；影袭/背刺攒连击点，【剔骨】按连击点爆发；从背后【背刺】；脱战可【潜行】。",
    skills:[
      {name:"影袭",  icon:"sinister_strike", cd:5,  rage:25,fn:sinisterStrike, bal:"sinisterStrike",school:"physical",combo:1,unlock:1,
       desc:"迅捷一击，对近战目标造成物理伤害，获得 1 连击点。",range:5},
      {name:"背刺",  icon:"backstab", cd:8,  rage:35,fn:backstab,        bal:"backstab",school:"physical",combo:1,unlock:4,
       desc:"必须位于目标背后；潜行中伤害更高；获得 1 连击点。",range:5},
      {name:"潜行",  icon:"stealth", cd:10, rage:0, fn:stealth,         bal:"stealth",unlock:6,
       desc:"脱战后进入隐身，大幅缩小野怪主动仇恨半径。"},
      {name:"剔骨",  icon:"eviscerate", cd:6, rage:35,fn:eviscerate,    bal:"eviscerate",school:"physical",spendCombo:true,unlock:8,
       desc:"终结技：消耗全部连击点，对目标造成爆发物理伤害。",range:5}]},
  /* build / 技能 fn 惰性挂接：避免字面量解析期 ReferenceError → CLS TDZ */
  warlock:{title:"💀 你 · 人类术士",hp:3900,resMax:100,resStart:100,resName:"法力",resKind:"mana",
    regen:7,hitGain:0,speed:10,ranged:true,range:28,sfx:"shadow",
    autoMin:160,autoMax:210,autoSpd:1.75,shotColor:0xa040ff,
    build:function(){
      if(typeof buildWarlock==="function")return buildWarlock();
      if(typeof buildFromClassLook==="function")return buildFromClassLook("warlock");
      return buildMage();
    },
    barCss:"linear-gradient(180deg,#c090ff,#6a2088 60%,#301040)",
    tip:"提示：法力随时间恢复；【腐蚀】挂 DoT，【生命吸取】引导吸血；缺蓝时【生命分流】换法力。",
    skills:[
      {name:"暗影箭",    icon:"shadow_bolt", cd:6,  rage:28,fn:null, bal:"shadowBolt",school:"spell",unlock:1,
       desc:"投出暗影箭，对目标造成暗影伤害。",range:28,cast:2},
      {name:"腐蚀术",    icon:"corruption",  cd:8,  rage:22,fn:null, bal:"corruption",school:"spell",unlock:4,
       desc:"使目标感染腐蚀，持续受到暗影伤害。",range:28},
      {name:"生命吸取",  icon:"drain_life",  cd:10, rage:30,fn:null, bal:"drainLife",school:"spell",unlock:6,
       desc:"引导吸取目标生命，化为自身治疗。",range:24,cast:3,channel:true,channelInterval:1,channelTick:null},
      {name:"生命分流",  icon:"life_tap",    cd:4,  rage:0, fn:null, bal:"lifeTap",unlock:8,
       desc:"牺牲生命，立即回复法力。"}]},
  druid:{title:"🌿 你 · 暗夜精灵德鲁伊",hp:4100,resMax:100,resStart:100,resName:"法力",resKind:"mana",
    regen:8,hitGain:0,speed:10.3,ranged:true,range:28,sfx:"nature",
    autoMin:155,autoMax:205,autoSpd:1.7,shotColor:0x60d080,
    build:function(){
      if(typeof buildDruid==="function")return buildDruid();
      if(typeof buildFromClassLook==="function")return buildFromClassLook("druid");
      return buildShaman();
    },
    barCss:"linear-gradient(180deg,#90e070,#2a7040 60%,#104020)",
    tip:"提示：法力自动恢复；【月火】挂 DoT，【回春】持续自疗，【纠缠根须】定身敌人。",
    skills:[
      {name:"愤怒",      icon:"wrath",      cd:5,  rage:26,fn:null, bal:"wrath",school:"spell",unlock:1,
       desc:"投出自然怒火，对目标造成伤害。",range:28,cast:1.8},
      {name:"月火术",    icon:"moonfire",   cd:7,  rage:22,fn:null, bal:"moonfire",school:"spell",unlock:4,
       desc:"以月光灼烧目标，造成持续自然伤害。",range:28},
      {name:"回春术",    icon:"rejuvenation",cd:8, rage:28,fn:null, bal:"rejuvenation",unlock:6,
       desc:"为自己施加自然愈合，持续恢复生命。"},
      {name:"纠缠根须",  icon:"entangling", cd:12, rage:20,fn:null, bal:"entanglingRoots",school:"spell",unlock:8,
       desc:"根须缠绕目标，短暂定身。",range:26}]},
  paladin:{title:"✝️ 你 · 人类圣骑士",hp:4800,resMax:100,resStart:100,resName:"法力",resKind:"mana",
    regen:6,hitGain:0,speed:10.2,ranged:false,range:8,sfx:"holy",
    autoMin:155,autoMax:210,autoSpd:1.55,shotColor:0xffe080,
    build:function(){
      if(typeof buildPaladin==="function")return buildPaladin();
      if(typeof buildFromClassLook==="function")return buildFromClassLook("paladin");
      return buildPlayer();
    },
    barCss:"linear-gradient(180deg,#ffe9a0,#d4af37 60%,#8a6020)",
    tip:"提示：法力自动恢复；近战【十字军打击】输出，【圣光术】自疗，危急时开【圣盾术】。",
    skills:[
      {name:"十字军打击",icon:"crusader", cd:5,  rage:22,fn:null, bal:"crusaderStrike",school:"physical",unlock:1,
       desc:"以圣光祝福武器，对近战目标造成伤害。",range:5},
      {name:"审判",      icon:"judgement", cd:7,  rage:28,fn:null, bal:"judgement",school:"spell",unlock:4,
       desc:"降下神圣审判，对目标造成神圣伤害。",range:18},
      {name:"圣光术",    icon:"holy_light", cd:8,  rage:35,fn:null, bal:"holyLight",unlock:6,
       desc:"引导圣光，恢复大量生命。",cast:2.5},
      {name:"圣盾术",    icon:"divine_shield", cd:30, rage:0, fn:null, bal:"divineShield",unlock:10,
       desc:"圣光护体，短时间内免疫伤害。"}]},
};
CLS=CLASSES.warrior;

/** V1-A2 / C7：技能栏按 actionBar 绑定刷新图标 */
const SKILL_ICON_BORDER="#e8b34a";
function isSkillKnown(sk,level){
  if(!sk)return false;
  const lv=level!=null?level:((S.p&&S.p.level)|0||1);
  const need=sk.unlock!=null?sk.unlock:1;
  return lv>=need;
}
function getBarSkillIndex(slot){
  if(!S.actionBar)return null;
  const idx=S.actionBar[slot];
  if(idx==null||idx<0)return null;
  if(!SKILLS[idx]||!isSkillKnown(SKILLS[idx]))return null;
  return idx;
}
function getBarSkill(slot){
  const i=getBarSkillIndex(slot);
  return i==null?null:SKILLS[i];
}
function defaultActionBar(){
  const bar=[null,null,null,null];
  const known=[];
  for(let i=0;i<SKILLS.length;i++){
    if(isSkillKnown(SKILLS[i]))known.push(i);
  }
  known.sort((a,b)=>(SKILLS[a].unlock|0)-(SKILLS[b].unlock|0)||a-b);
  for(let s=0;s<4&&s<known.length;s++)bar[s]=known[s];
  return bar;
}
function bindSkillToBar(slot,skillIdx){
  slot=slot|0;
  if(slot<0||slot>3)return false;
  if(skillIdx==null){S.actionBar[slot]=null;refreshActionBarUI();return true;}
  skillIdx=skillIdx|0;
  if(!SKILLS[skillIdx]||!isSkillKnown(SKILLS[skillIdx]))return false;
  /* 同一技能从其他槽移除 */
  for(let i=0;i<4;i++)if(S.actionBar[i]===skillIdx)S.actionBar[i]=null;
  S.actionBar[slot]=skillIdx;
  refreshActionBarUI();
  return true;
}
function skillsLearnedAtLevel(level){
  const out=[];
  for(let i=0;i<SKILLS.length;i++){
    const sk=SKILLS[i];
    if((sk.unlock|0)===level)out.push(sk);
  }
  return out;
}
function notifyNewSpells(level){
  const learned=skillsLearnedAtLevel(level);
  if(!learned.length)return;
  for(const sk of learned){
    announce(`学会了新法术 · ${sk.name}`);
    log(`你学会了【${sk.name}】！（P 打开法术书，可拖到动作条）`,"lg-heal");
  }
  /* 自动填入空槽 */
  for(let i=0;i<SKILLS.length;i++){
    if((SKILLS[i].unlock|0)!==level)continue;
    let has=false;
    for(let s=0;s<4;s++)if(S.actionBar[s]===i){has=true;break;}
    if(has)continue;
    for(let s=0;s<4;s++){
      if(S.actionBar[s]==null){S.actionBar[s]=i;break;}
    }
  }
  refreshActionBarUI();
  if(typeof renderSpellPanel==="function")renderSpellPanel();
}
function refreshActionBarUI(){
  applySkillBarIcons();
  if(typeof updateSkillBarStats==="function")updateSkillBarStats();
}
function applySkillBarIcons(){
  document.querySelectorAll(".skill").forEach((el,slot)=>{
    const sk=getBarSkill(slot);
    const nm=el.querySelector(".nm");
    let ic=el.querySelector(".ic");
    el.classList.toggle("empty",!sk);
    if(!sk){
      if(nm)nm.textContent="";
      if(ic&&ic.tagName==="IMG"){ic.removeAttribute("src");ic.alt="";}
      el.title="空槽 · 从法术书拖入技能";
      return;
    }
    if(nm)nm.textContent=sk.name;
    if(!ic)return;
    if(ic.tagName!=="IMG"){
      const img=document.createElement("img");
      img.className="ic";
      ic.replaceWith(img);
      ic=img;
    }
    if(typeof Icons!=="undefined"){
      ic.src=Icons.get(sk.icon||"sword",SKILL_ICON_BORDER);
      ic.alt=sk.name;
    }
  });
}

function setClass(key){
  if(!CLASSES[key]){console.error("[setClass] 未知职业",key);key="warrior";}
  CLS=CLASSES[key];
  CLS.key=key;
  const pos=player.position.clone(),rot=player.rotation.y;
  clearShieldVisual();
  if(typeof clearAllTotems==="function")clearAllTotems();
  if(typeof breakStealth==="function")breakStealth("class",true);
  if(typeof clearAllBuffs==="function")clearAllBuffs("class");
  scene.remove(player);
  player=CLS.build(); player.position.copy(pos); player.rotation.y=rot; scene.add(player);
  S.p.hpMax=CLS.hp; S.p.hp=CLS.hp;
  S.p.rageMax=CLS.resMax; S.p.rage=CLS.resStart; S.p.speed=CLS.speed;
  S.p._appliedHpBonus=0; S.p._appliedManaBonus=0;
  S.p.absorb=0; S.p.absorbT=0;
  S.p.stealth=false; S.p.sprintT=0;
  if(typeof createResourceState==="function")S.res=createResourceState();
  else S.res={inCombat:false,combatT:0,manaFsr:0,energyAcc:0,combo:0};
  initPlayerStats(key);
  SKILLS=CLS.skills;
  S.actionBar=defaultActionBar();
  S.cds=[0,0,0,0];
  if(typeof initTalentsForClass==="function")initTalentsForClass(key);
  else updateLevelUI();
  updateLevelUI();
  $("#pRage").style.background=CLS.barCss;
  refreshActionBarUI();
  if(typeof renderCharPanel==="function")renderCharPanel();
  if(typeof renderSpellPanel==="function")renderSpellPanel();
  if(typeof refreshPlayerAvatar==="function")refreshPlayerAvatar();
}

/** plan-V3 C3：从 SIM_CONTENT.baseStats 初始化属性并派生 */
function initPlayerStats(clsKey){
  const key=clsKey||(CLS&&CLS.key)||"warrior";
  const base=(BAL.sim&&BAL.sim.baseStats&&BAL.sim.baseStats[key])||
    (typeof SIM_CONTENT!=="undefined"&&SIM_CONTENT.baseStats&&SIM_CONTENT.baseStats[key])||
    {str:20,agi:20,sta:20,int:20,spi:20,armor:50};
  S.p.baseStats=typeof cloneStats==="function"?cloneStats(base):Object.assign({},base,{level:S.p.level});
  S.p.baseStats.level=S.p.level|0||1;
  S.p.equipStats=typeof emptyStats==="function"?emptyStats(S.p.level):{str:0,agi:0,sta:0,int:0,spi:0,armor:0,level:S.p.level|1};
  rebuildPlayerStatsFromEquip();
}
/** C8：baseStats + equipStats → stats → derived（攻击强度/暴击等） */
function rebuildPlayerStatsFromEquip(){
  const lv=S.p.level|0||1;
  if(!S.p.baseStats){
    const key=(CLS&&CLS.key)||"warrior";
    const base=(BAL.sim&&BAL.sim.baseStats&&BAL.sim.baseStats[key])||{str:20,agi:20,sta:20,int:20,spi:20,armor:50};
    S.p.baseStats=typeof cloneStats==="function"?cloneStats(base):Object.assign({},base);
  }
  S.p.baseStats.level=lv;
  if(!S.p.equipStats){
    S.p.equipStats=typeof emptyStats==="function"?emptyStats(lv):{str:0,agi:0,sta:0,int:0,spi:0,armor:0,level:lv};
  }
  S.p.equipStats.level=lv;
  S.p.stats=typeof mergeStats==="function"
    ?mergeStats(S.p.baseStats,S.p.equipStats)
    :Object.assign({},S.p.baseStats);
  S.p.stats.level=lv;
  refreshPlayerDerived();
}
function refreshPlayerDerived(){
  if(!S.p.stats)return;
  S.p.stats.level=S.p.level|0||1;
  if(typeof deriveStats==="function")
    S.p.derived=deriveStats(S.p.stats,CLS.key||"warrior");
  else S.p.derived={ap:0,critPct:5,dodgePct:5,armor:S.p.stats.armor|0,hpBonus:0,manaBonus:0,apDmgMul:1};
  /* STEP 15：耐力/智力转换驱动生命与法力上限 */
  applyDerivedResourceCaps();
}

/** 将 derived.hpBonus / manaBonus 增量叠到 hpMax / rageMax（相对上次已应用值） */
function applyDerivedResourceCaps(){
  if(!S.p||!S.p.derived)return;
  const d=S.p.derived;
  const prevHp=S.p._appliedHpBonus|0;
  const nextHp=d.hpBonus|0;
  const dHp=nextHp-prevHp;
  if(dHp){
    S.p.hpMax=Math.max(1,(S.p.hpMax|0)+dHp);
    if(dHp>0)S.p.hp=Math.min(S.p.hpMax,(S.p.hp|0)+dHp);
    else S.p.hp=Math.min(S.p.hp|0,S.p.hpMax);
    S.p._appliedHpBonus=nextHp;
  }
  if(playerResKind()==="mana"){
    const prevM=S.p._appliedManaBonus|0;
    const nextM=d.manaBonus|0;
    const dM=nextM-prevM;
    if(dM){
      S.p.rageMax=Math.max(1,(S.p.rageMax|0)+dM);
      if(dM>0)S.p.rage=Math.min(S.p.rageMax,(S.p.rage|0)+dM);
      else S.p.rage=Math.min(S.p.rage|0,S.p.rageMax);
      S.p._appliedManaBonus=nextM;
    }
  }else{
    S.p._appliedManaBonus=0;
  }
}
function playerResKind(){
  return(CLS&&CLS.resKind)||(CLS&&CLS.resName==="法力"?"mana":CLS&&CLS.resName==="能量"?"energy":"rage");
}

setClass("warrior");

/* ---------------- UI 工具 ---------------- */
function log(msg,cls="lg-sys"){
  const el=document.createElement("div"); el.className=cls; el.textContent=msg;
  const box=$("#log"); box.appendChild(el);
  while(box.children.length>9)box.removeChild(box.firstChild);
}
function announce(t){const a=$("#announce");a.textContent=t;a.classList.remove("pop");void a.offsetWidth;a.classList.add("pop");}
const v3=new THREE.Vector3();
function fct(worldPos,text,color,size=17,opts){
  v3.copy(worldPos).project(camera);
  if(v3.z>1)return;
  const el=document.createElement("div");
  const kind=opts&&opts.kind;
  let cls="fct";
  if(opts&&opts.crit)cls+=" fct-crit";
  if(kind==="miss")cls+=" fct-miss";
  else if(kind==="dodge")cls+=" fct-dodge";
  else if(kind==="parry")cls+=" fct-parry";
  else if(kind==="glancing")cls+=" fct-glancing";
  else if(kind==="heal")cls+=" fct-heal";
  else if(kind==="xp")cls+=" fct-xp";
  el.className=cls;
  el.style.left=((v3.x*.5+.5)*innerWidth+rand(-18,18))+"px";
  el.style.top =((-v3.y*.5+.5)*innerHeight)+"px";
  if(color&&kind!=="heal"&&kind!=="xp"&&kind!=="miss"&&kind!=="dodge"&&kind!=="parry"&&kind!=="glancing")
    el.style.color=color;
  else if(color&&!kind)el.style.color=color;
  const sz=opts&&opts.crit?Math.round(size*((BAL.vfx&&BAL.vfx.critSizeMul)||1.45)):size;
  el.style.fontSize=sz+"px";
  el.textContent=opts&&opts.crit?`${text}!`:text;
  document.body.appendChild(el); setTimeout(()=>el.remove(),opts&&opts.crit?1300:1150);
}
function hurtFlash(){const f=$("#hurtFlash");f.style.transition="none";f.style.opacity=.9;
  requestAnimationFrame(()=>{f.style.transition="opacity .5s";f.style.opacity=0;});}

/* ---------------- 输入（plan-V3 C1：意图层 + 魔兽键位） ---------------- */
const keys={};
/** 统一移动意图：键鼠 / 摇杆 / 触控都映射到此，便于测试驱动 */
function getMoveIntent(){
  const intent={forward:0,back:0,strafeL:0,strafeR:0,turnL:0,turnR:0,jump:false};
  if(!S.p||!S.started)return intent;
  const mouselook=!!(S.cam&&(S.cam.rmb||S.cam.touchLook));
  if(keys.w||keys.arrowup)intent.forward=1;
  if(keys.s||keys.arrowdown)intent.back=1;
  if(mouselook){
    if(keys.q||keys.a||keys.arrowleft)intent.strafeL=1;
    if(keys.e||keys.d||keys.arrowright)intent.strafeR=1;
  }else{
    if(keys.a||keys.arrowleft)intent.turnL=1;
    if(keys.d||keys.arrowright)intent.turnR=1;
    if(keys.q)intent.strafeL=1;
    if(keys.e)intent.strafeR=1;
  }
  if(S.p.autoRun)intent.forward=Math.max(intent.forward,1);
  const Cam=BAL.camera||{};
  if(Cam.bothBtnForward!==false&&S.cam&&S.cam.lmb&&S.cam.rmb)intent.forward=Math.max(intent.forward,1);
  if(joy.active||joy.x||joy.y){
    if(joy.y< -.05)intent.forward=Math.max(intent.forward,-joy.y);
    if(joy.y> .05)intent.back=Math.max(intent.back,joy.y);
    if(joy.x< -.05)intent.strafeL=Math.max(intent.strafeL,-joy.x);
    if(joy.x> .05)intent.strafeR=Math.max(intent.strafeR,joy.x);
  }
  if(S.p._wantJump)intent.jump=true;
  return intent;
}
function clearMoveTarget(){
  if(S.currentTarget){
    setCurrentTarget(null);
    log(typeof T==="function"?T("combat.cancel_target"):"取消目标。","lg-sys");
    return true;
  }
  return false;
}
addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(e.key===" "){keys[" "]=true;if(!e.repeat&&S.started&&S.p&&S.p.alive)S.p._wantJump=true;e.preventDefault();}
  if(["1","2","3","4"].includes(e.key))useSkill(+e.key-1);
  if(k==="f")tryInteract();
  if(k==="b")toggleBag();
  if(k==="n")toggleTalentPanel();
  if(k==="c")toggleCharPanel();
  if(k==="p")toggleSpellPanel();
  if(k==="l")toggleQuestLog();
  if(k==="m")toggleWorldMap();
  if(k==="r"&&!e.repeat&&S.started&&S.p&&S.p.alive){
    S.p.autoRun=!S.p.autoRun;
    log(S.p.autoRun?"自动奔跑 · 开":"自动奔跑 · 关","lg-sys");
  }
  if(k==="v"&&!e.repeat&&S.started){
    S.nameplatesShowAll=!S.nameplatesShowAll;
    log(S.nameplatesShowAll
      ?(typeof T==="function"?T("combat.nameplates_on"):"姓名板 · 全显")
      :(typeof T==="function"?T("combat.nameplates_off"):"姓名板 · 常规"),"lg-sys");
  }
  if(e.key==="Tab"){
    e.preventDefault();
    if(S.started&&S.p&&S.p.alive)cycleHostileTargets(!!e.shiftKey);
  }
  if(e.shiftKey&&k==="z"&&typeof toggleDeedsPanel==="function"){e.preventDefault();toggleDeedsPanel();}
  if(e.shiftKey&&k==="i"&&typeof toggleDungeonFinderPanel==="function"){e.preventDefault();toggleDungeonFinderPanel();}
  if(e.key==="Escape"){
    if(typeof closeTopHudPanel==="function"&&closeTopHudPanel())return;
    if(typeof worldMapOpen==="function"&&worldMapOpen()){closeWorldMap();return;}
    if(typeof anyHudPanelOpen==="function"&&anyHudPanelOpen()){
      if(typeof closeAllHudPanels==="function")closeAllHudPanels();
      return;
    }
    if(typeof closeAllHudPanels==="function")closeAllHudPanels();
    clearMoveTarget();
  }
});
addEventListener("keyup",e=>{
  const k=e.key.toLowerCase();
  keys[k]=false;
  if(e.key===" ")keys[" "]=false;
  if(k==="s"||k==="arrowdown"){if(S.p)S.p.autoRun=false;}
});
document.getElementById("interactBtn").addEventListener("pointerdown",()=>tryInteract());
document.querySelectorAll(".skill").forEach(el=>{
  el.addEventListener("pointerdown",()=>useSkill(+el.dataset.sk));
});

/* ---- 魔兽式相机：滚轮远近 · 左键环绕 · 右键转向/俯仰 · 双键前进 ---- */
function camOnCanvas(e){
  const c=typeof renderer!=="undefined"&&renderer.domElement;
  return !!(c&&(e.target===c));
}
function camApplyDrag(dx,dy,sensOverride){
  if(!S.started||!S.cam)return;
  const C=BAL.camera||{}, sens=sensOverride!=null?sensOverride:(C.mouseSens||.0025);
  const pMin=C.pitchMin!=null?C.pitchMin:-.55, pMax=C.pitchMax!=null?C.pitchMax:.48;
  const yawMax=C.yawOffMax!=null?C.yawOffMax:.7;
  if(S.cam.rmb||S.cam.touchLook){
    /* 右键：角色转向 + 相机锁在背后（魔兽式） */
    S.p.face-=dx*sens;
    S.cam.yawOff=0;
    S.cam.pitch=clamp(S.cam.pitch+dy*sens,pMin,pMax);
  }else if(S.cam.lmb){
    /* 左键：仅小幅环绕/俯仰，偏航有上限 */
    S.cam.yawOff=clamp((S.cam.yawOff||0)-dx*sens,-yawMax,yawMax);
    S.cam.pitch=clamp(S.cam.pitch+dy*sens,pMin,pMax);
  }
}
addEventListener("wheel",e=>{
  if(!S.started||!S.cam)return;
  if(!camOnCanvas(e)&&e.target&&e.target.closest&&e.target.closest(".hudPanel,#bag,#dlg,#overlay,#startOv"))return;
  const C=BAL.camera;
  const step=(C.zoomStep||1.15)*(e.deltaY>0?1:-1);
  S.cam.dist=clamp(S.cam.dist+step,C.distMin||3,C.distMax||25);
},{passive:true});
addEventListener("pointerdown",e=>{
  if(!S.started||!S.cam)return;
  if(e.pointerType==="touch")return; /* 触控走 touch*（右半屏视角 / 捏合） */
  if(e.button===0){
    if(!camOnCanvas(e))return;
    S.cam.lmb=true; S.cam.lx=e.clientX; S.cam.ly=e.clientY;
    try{e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId);}catch(_){}
  }else if(e.button===2){
    S.cam.rmb=true; S.cam.lx=e.clientX; S.cam.ly=e.clientY;
  }
});
addEventListener("pointerup",e=>{
  if(!S.cam)return;
  if(e.pointerType==="touch")return;
  if(e.button===0)S.cam.lmb=false;
  if(e.button===2)S.cam.rmb=false;
});
addEventListener("pointercancel",()=>{if(S.cam){S.cam.lmb=false;S.cam.rmb=false;}});
addEventListener("pointermove",e=>{
  if(!S.cam||!S.started)return;
  if(e.pointerType==="touch")return;
  if(!S.cam.lmb&&!S.cam.rmb)return;
  const dx=e.clientX-S.cam.lx, dy=e.clientY-S.cam.ly;
  S.cam.lx=e.clientX; S.cam.ly=e.clientY;
  camApplyDrag(dx,dy);
});
addEventListener("contextmenu",e=>{if(S.started)e.preventDefault();});
/* 触屏摇杆 */
const joy={x:0,y:0,active:false};
const joyEl=$("#joy"),knob=$("#joyKnob");
function joyMove(e){
  const r=joyEl.getBoundingClientRect(),t=e.touches?e.touches[0]:e;
  let dx=t.clientX-(r.left+r.width/2), dy=t.clientY-(r.top+r.height/2);
  const d=Math.hypot(dx,dy),m=r.width/2;
  if(d>m){dx*=m/d;dy*=m/d;}
  knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  joy.x=dx/m; joy.y=dy/m;
}
joyEl.addEventListener("touchstart",e=>{joy.active=true;joyMove(e);e.preventDefault();},{passive:false});
joyEl.addEventListener("touchmove",e=>{joyMove(e);e.preventDefault();},{passive:false});
joyEl.addEventListener("touchend",()=>{joy.active=false;joy.x=joy.y=0;
  knob.style.transform="translate(-50%,-50%)";});

/* 移动端：右半屏拖动 = 鼠标视角；双指捏合 = 缩放 */
const touchCam={id:null,x:0,y:0,pinch:null};
function touchOnJoy(t){
  return !!(t&&t.target&&t.target.closest&&t.target.closest("#joy,#joyKnob,#skillBar,.skill,#interactBtn,#bagBtn"));
}
addEventListener("touchstart",e=>{
  if(!S.started||!S.cam)return;
  if(e.touches.length===2){
    const a=e.touches[0],b=e.touches[1];
    touchCam.pinch=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    return;
  }
  const t=e.changedTouches[0];
  if(!t||touchOnJoy(t))return;
  if(t.clientX<innerWidth*.42)return;
  touchCam.id=t.identifier; touchCam.x=t.clientX; touchCam.y=t.clientY;
  S.cam.touchLook=true; S.cam.yawOff=0;
},{passive:true});
addEventListener("touchmove",e=>{
  if(!S.started||!S.cam)return;
  if(e.touches.length===2&&touchCam.pinch!=null){
    const a=e.touches[0],b=e.touches[1];
    const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    const C=BAL.camera||{};
    const dd=(touchCam.pinch-d)*(C.pinchZoomScale||.05);
    S.cam.dist=clamp(S.cam.dist+dd,C.distMin||3,C.distMax||25);
    touchCam.pinch=d;
    return;
  }
  if(touchCam.id==null||!S.cam.touchLook)return;
  let t=null;
  for(let i=0;i<e.touches.length;i++)if(e.touches[i].identifier===touchCam.id){t=e.touches[i];break;}
  if(!t)return;
  const dx=t.clientX-touchCam.x, dy=t.clientY-touchCam.y;
  touchCam.x=t.clientX; touchCam.y=t.clientY;
  const sens=(BAL.camera&&BAL.camera.touchLookSens)||.0055;
  camApplyDrag(dx,dy,sens);
},{passive:true});
addEventListener("touchend",e=>{
  if(!S.cam)return;
  for(let i=0;i<e.changedTouches.length;i++){
    if(e.changedTouches[i].identifier===touchCam.id){
      touchCam.id=null; S.cam.touchLook=false;
    }
  }
  if(e.touches.length<2)touchCam.pinch=null;
});
addEventListener("touchcancel",()=>{
  touchCam.id=null; touchCam.pinch=null;
  if(S.cam)S.cam.touchLook=false;
});

/* ============================================================
   玩家技能
   ============================================================ */
/** V1-C4：根据角色等级返回技能 Rank（1–N） */
function skillRank(balKey){
  if(balKey&&typeof balKey==="object")balKey=balKey.bal||balKey.id;
  const raw=balKey&&BAL.skills[balKey];
  if(!raw)return 1;
  const ranks=raw.ranks;
  if(!ranks||!ranks.length)return 1;
  const lv=(S.p&&S.p.level)|0||1;
  let r=1;
  for(let i=0;i<ranks.length;i++){
    const min=ranks[i].minLevel!=null?ranks[i].minLevel
      :((BAL.skillRank&&BAL.skillRank.unlock&&BAL.skillRank.unlock[i])||1);
    if(lv>=min)r=i+1;
  }
  return r;
}
/** V1-C4：当前等级对应的技能数值表（无 ranks 时退回扁平字段） */
function getSkillBal(balKey){
  const raw=balKey&&BAL.skills[balKey];
  if(!raw)return{};
  const ranks=raw.ranks;
  if(!ranks||!ranks.length){
    const out={};
    for(const k in raw)if(k!=="ranks")out[k]=raw[k];
    return out;
  }
  const lv=(S.p&&S.p.level)|0||1;
  let pick=ranks[0];
  for(let i=0;i<ranks.length;i++){
    const min=ranks[i].minLevel!=null?ranks[i].minLevel
      :((BAL.skillRank&&BAL.skillRank.unlock&&BAL.skillRank.unlock[i])||1);
    if(lv>=min)pick=ranks[i];
  }
  const out={};
  for(const k in pick)if(k!=="minLevel")out[k]=pick[k];
  return out;
}
function useSkill(i){
  if(!S.started||S.over||!S.p.alive)return;
  if(S.p.ghost)return;
  if(S.p.casting){log("你正在施法。","lg-sys");return;}
  const skillIdx=getBarSkillIndex(i);
  if(skillIdx==null)return;
  const sk=SKILLS[skillIdx]; if(!sk)return;
  const qWin=(BAL.sim&&BAL.sim.resources&&BAL.sim.resources.gcd&&BAL.sim.resources.gcd.queueWindow)||.2;
  if(S.gcd>0){
    if(S.gcd<=qWin&&S.res){S.res.queuedSkill=i;return;}
    return;
  }
  if(S.cds[skillIdx]>0)return;
  if(S.p.rage<sk.rage){log(`${CLS.resName}不足！（${sk.name} 需要 ${sk.rage} ${CLS.resName}）`,"lg-sys");return;}
  /* STEP 20：有射程的技能，当前目标过远则不开读条、不进 CD */
  if(typeof skillTargetOutOfRange==="function"&&skillTargetOutOfRange(sk)){
    const msgOor=typeof T==="function"?T("combat.target_oor"):"目标超出射程！";
    log(msgOor,"lg-sys");
    return;
  }
  const castDur=sk.cast>0?+sk.cast:0;
  if(castDur>0){
    beginPlayerCast(sk,skillIdx,i,castDur);
    return;
  }
  finishSkillUse(sk,skillIdx);
}
/** 当前目标是否相对技能射程过远/过近（与动作栏 .oor 同口径） */
function skillTargetOutOfRange(sk){
  if(!sk||sk.range==null)return false;
  if(typeof isTargetAlive!=="function"||!isTargetAlive(S.currentTarget))return false;
  if(typeof targetDist!=="function")return false;
  const d=targetDist(S.currentTarget);
  if(d>sk.range)return true;
  if(CLS&&CLS.minRange&&d<CLS.minRange&&sk.range>=CLS.minRange)return true;
  return false;
}
function beginPlayerCast(sk,skillIdx,barSlot,dur){
  const channel=!!sk.channel;
  S.p.casting={
    sk, skillIdx, barSlot,
    name:sk.name, t:0, dur,
    channel,
    interruptible:true,
    tickAcc:0,
    prepaid:false,
  };
  /* 引导：开读条时预付资源与 CD（打断不退还） */
  if(channel){
    if(S.p.rage<(sk.rage|0)){
      S.p.casting=null;
      log(`${CLS.resName}不足！（${sk.name} 需要 ${sk.rage} ${CLS.resName}）`,"lg-sys");
      return;
    }
    S.p.rage-=sk.rage|0;
    S.cds[skillIdx]=typeof getSkillCd==="function"?getSkillCd(skillIdx):sk.cd;
    const g=typeof gcdDuration==="function"?gcdDuration(playerResKind()):1.5;
    S.gcd=g;
    if(playerResKind()==="mana"&&typeof applyManaSpend==="function")applyManaSpend(S.res);
    if(typeof markCombat==="function")markCombat(S.res);
    S.p.casting.prepaid=true;
  }
  showUnitCastBar("player",sk.name,{channel});
  log(channel?`开始引导【${sk.name}】…`:`开始施放【${sk.name}】…`,"lg-me");
}
/** STEP 20：玩家 / Boss 共用施法条驱动 */
function showUnitCastBar(kind,name,opts){
  opts=opts||{};
  if(kind==="boss"){
    const shell=$("#castShell"), fill=$("#castFill"), tx=$("#castText");
    if(shell){
      shell.style.display="block";
      shell.classList.toggle("interruptible",opts.interruptible!==false);
    }
    if(fill)fill.style.transform="scaleX(0)";
    if(tx)tx.textContent=name||"施法";
    return;
  }
  const shell=$("#pCastShell"), fill=$("#pCastFill"), tx=$("#pCastText");
  if(!shell)return;
  shell.classList.add("show");
  shell.classList.toggle("channel",!!opts.channel);
  shell.setAttribute("aria-hidden","false");
  if(fill)fill.style.transform="scaleX(0)";
  if(tx)tx.textContent=name||"施法";
}
function hideUnitCastBar(kind){
  if(kind==="boss"){
    const shell=$("#castShell");
    if(shell){shell.style.display="none";shell.classList.remove("interruptible");}
    return;
  }
  const shell=$("#pCastShell");
  if(!shell)return;
  shell.classList.remove("show","channel");
  shell.setAttribute("aria-hidden","true");
}
function setUnitCastBarProgress(kind,progress,channel){
  const fill=$(kind==="boss"?"#castFill":"#pCastFill");
  if(!fill)return;
  const k=Math.max(0,Math.min(1,progress));
  fill.style.transform=`scaleX(${channel?1-k:k})`;
}
function showPlayerCastUi(name,channel){showUnitCastBar("player",name,{channel});}
function hidePlayerCastUi(){hideUnitCastBar("player");}
function finishSkillUse(sk,skillIdx){
  if(!sk||!sk.fn)return false;
  if(!sk.fn())return false;
  S.p.rage-=sk.rage;
  S.cds[skillIdx]=typeof getSkillCd==="function"?getSkillCd(skillIdx):sk.cd;
  const g=typeof gcdDuration==="function"?gcdDuration(playerResKind()):1.5;
  S.gcd=g;
  if(playerResKind()==="mana"&&typeof applyManaSpend==="function")applyManaSpend(S.res);
  if(typeof markCombat==="function")markCombat(S.res);
  if(sk.combo&&!sk.spendCombo&&typeof addComboPoints==="function"){
    const n=addComboPoints(S.res,sk.combo|0);
    if(n>0)log(`连击点 · ${n}`,"lg-me");
  }
  return true;
}
function cancelPlayerCast(reason){
  if(!S.p.casting)return false;
  const nm=S.p.casting.name||"法术";
  S.p.casting=null;
  hidePlayerCastUi();
  if(reason==="move")log(`移动打断了【${nm}】。`,"lg-sys");
  else if(reason==="hit")log(`受击打断了【${nm}】。`,"lg-sys");
  else log(`【${nm}】被打断。`,"lg-sys");
  return true;
}
function tickPlayerCast(dt){
  const c=S.p&&S.p.casting;
  if(!c){hidePlayerCastUi();return;}
  if(!S.p.alive||S.over){cancelPlayerCast("death");return;}
  c.t+=dt;
  const k=Math.min(1,c.t/c.dur);
  const fill=$("#pCastFill"), tx=$("#pCastText"), shell=$("#pCastShell");
  if(shell&&!shell.classList.contains("show"))showUnitCastBar("player",c.name,{channel:c.channel});
  setUnitCastBarProgress("player",k,c.channel);
  if(tx)tx.textContent=`${c.name}  ${Math.max(0,c.dur-c.t).toFixed(1)}`;
  /* 引导周期结算（术士生命吸取等） */
  if(c.channel&&typeof c.sk.channelTick==="function"){
    const iv=c.sk.channelInterval!=null?+c.sk.channelInterval:1;
    c.tickAcc=(c.tickAcc||0)+dt;
    while(c.tickAcc>=iv){
      c.tickAcc-=iv;
      if(c.sk.channelTick()===false){
        S.p.casting=null;
        hidePlayerCastUi();
        log(`【${c.name}】中断（目标失效）。`,"lg-sys");
        return;
      }
    }
  }
  if(c.t>=c.dur){
    const sk=c.sk, idx=c.skillIdx, prepaid=!!c.prepaid;
    S.p.casting=null;
    hidePlayerCastUi();
    if(prepaid){
      if(typeof sk.fn==="function")sk.fn();
      return;
    }
    if(S.p.rage<(sk.rage|0)){log(`${CLS.resName}不足，施法失败。`,"lg-sys");return;}
    finishSkillUse(sk,idx);
  }
}
/* bossTargetable 在 raid.js 定义 */

/* ============================================================
   统一受击入口（STEP 1，参考 WoC 单一 Sim 战斗结算）
   流程：乘系数 → 扣血 → 飘字 → 日志(onHit) → 死亡回调(onDeath)
   实体接口：{hp, variance, dead(), fctPos(), fctSize?, onHit?, onDeath}
   野猪 / 火裔 / Boss / 玩家 / AI 队友全部走这一个函数；
   掉落（STEP 2）与经验（STEP 3）只需挂接各实体的 onDeath。
   opts.incoming：敌方→玩家/队友（跳过命中表与玩家输出系数；唯一扣血点仍在此）
   ============================================================ */
function hitEntity(ent,amount,label,opts){
  opts=opts||{};
  if(ent.dead&&ent.dead())return;

  /* —— 受击方向：玩家 / 队友（plan-v4 基线 #1） —— */
  if(opts.incoming){
    if(typeof markCombat==="function")markCombat(S.res);
    /* STEP 19 / STEP 14/16：吸收盾纯结算（玩家或带 absorb 的实体） */
    if(opts.applyAbsorb||(ent&&ent.absorb>0)){
      const owner=opts.absorbOwner||ent||S.p;
      const sh=typeof applyAbsorbShield==="function"
        ?applyAbsorbShield(owner,amount)
        :{amount,absorbed:0,shieldBroken:false};
      if(sh.absorbed>0){
        const pos=ent.fctPos?ent.fctPos():(player&&player.position?player.position.clone().setY(3.2):null);
        if(pos)fct(pos,`-${sh.absorbed}(盾)`,"#ffe9a0",16);
        log(`真言术：盾吸收了 ${sh.absorbed} 点伤害。`,"lg-heal");
      }
      if(sh.shieldBroken){
        if(typeof removeAura==="function")removeAura(owner,"power_word_shield","spent");
        if(owner===S.p){
          if(typeof removeBuff==="function")removeBuff("power_word_shield","spent",true);
          else{S.p.absorb=0;S.p.absorbT=0;clearShieldVisual();}
        }
      }else if(typeof syncAbsorbAuraFromEnt==="function"){
        syncAbsorbAuraFromEnt(owner);
      }
      amount=sh.amount;
    }
    if(amount<=0)return;
    if(typeof applyEntityHpDamage==="function")applyEntityHpDamage(ent,amount);
    else ent.hp=Math.max(0,ent.hp-amount);
    const col=opts.fctColor||"#ff6a5a";
    fct(ent.fctPos(),`-${amount}`,col,ent.fctSize?ent.fctSize(label):14);
    if(opts.hurtFlash)hurtFlash();
    if(typeof SFX!=="undefined")SFX.play(opts.sfx||"hit");
    if(ent.mesh&&typeof pulseHitFlash==="function")pulseHitFlash(ent.mesh);
    if(ent.onHit)ent.onHit(amount,label);
    /* C5：战士受击获怒 */
    if(opts.rageTake&&playerResKind()==="rage"&&amount>0&&typeof rageFromDamage==="function"){
      const gain=rageFromDamage(amount,S.p.level,"take");
      S.p.rage=Math.min(S.p.rageMax,S.p.rage+gain);
    }
    if(ent.hp<=0&&ent.onDeath)ent.onDeath();
    return;
  }

  /* 尸体 / 回巢不可再结算伤害（防自动普攻误锁） */
  if(ent.mesh&&typeof mobTargetable==="function"&&MOBS&&MOBS.includes(ent)&&!mobTargetable(ent))return;
  if(ent.mesh&&typeof addTargetable==="function"&&S.adds&&S.adds.includes(ent)&&!addTargetable(ent))return;

  if(typeof markCombat==="function")markCombat(S.res);
  if(!S.p.derived&&typeof refreshPlayerDerived==="function")refreshPlayerDerived();

  const school=opts.school||"physical";
  const attacker=typeof buildAttackerCtx==="function"
    ?buildAttackerCtx(S.p,CLS.key,S.p.derived)
    :{level:S.p.level,critPct:5,apDmgMul:1,dmgMul:S.p.dmgMul};
  /* C10：虚弱降低输出 */
  if(S.p.weaknessT>0&&BAL.death&&BAL.death.weaknessStatMul!=null)
    attacker.dmgMul=(attacker.dmgMul||1)*BAL.death.weaknessStatMul;
  let target;
  if(typeof BOSS_ENT!=="undefined"&&ent===BOSS_ENT){
    target=typeof buildTargetCtx==="function"
      ?buildTargetCtx({type:"boss",level:(S.b&&S.b.level)||((BAL.boss&&BAL.boss.level)||20),armor:600,elite:true})
      :{level:20,armor:600,dodgePct:5};
  }else{
    target=typeof buildTargetCtx==="function"?buildTargetCtx(ent):{level:ent.level||1,armor:ent.armor||0,dodgePct:5};
  }

  let result;
  if(typeof settleDamage==="function"){
    result=settleDamage({
      base:amount,attacker,target,school,
      god:!!S.god,godDmg:BAL.god&&BAL.god.dmg,
      variance:S.god?null:ent.variance,
      rng:Math.random
    });
  }else{
    const v=ent.variance;
    let mul=S.p.dmgMul||1;
    if(S.p.weaknessT>0&&BAL.death&&BAL.death.weaknessStatMul!=null)mul*=BAL.death.weaknessStatMul;
    const dmg=S.god?BAL.god.dmg:Math.round(amount*mul*(v?rand(v[0],v[1]):1));
    result={outcome:"hit",damage:dmg,mitigated:0,raw:dmg};
  }

  const outcome=result.outcome||"hit";
  if(outcome==="miss"||outcome==="dodge"||outcome==="parry"){
    const msg=typeof T==="function"?T("combat."+outcome):(outcome==="miss"?"未命中":outcome==="dodge"?"被躲闪":"被招架");
    fct(ent.fctPos(),msg,"#e8e8e8",ent.fctSize?ent.fctSize(label):14,{kind:outcome});
    return;
  }

  amount=result.damage|0;
  if(amount<=0&&outcome==="glancing"){
    fct(ent.fctPos(),typeof T==="function"?T("combat.glancing"):"偏斜","#a0a0a0",12,{kind:"glancing"});
    return;
  }
  if(typeof applyEntityHpDamage==="function")applyEntityHpDamage(ent,amount);
  else ent.hp=Math.max(0,ent.hp-amount);
  const crit=outcome==="crit";
  const glancing=outcome==="glancing";
  const col=glancing?"#a8a8a8":"#ffdf8a";
  const tx=glancing?`${typeof T==="function"?T("combat.glancing"):"偏斜"} -${amount}`:`-${amount}`;
  fct(ent.fctPos(),tx,col,ent.fctSize?ent.fctSize(label):14,{crit});
  if(crit&&typeof S!=="undefined"){
    /* 轻微顿帧 */
    S._hitStopT=.08;
  }
  if(ent.mesh&&typeof pulseHitFlash==="function")pulseHitFlash(ent.mesh);
  if(typeof SFX!=="undefined"&&SFX.playHit){
    let kind=ent.type||ent.hitKind||"hit";
    if(typeof BOSS_ENT!=="undefined"&&ent===BOSS_ENT&&S.b&&S.b.id)kind=S.b.id;
    SFX.playHit(kind);
  }
  if(ent.onHit)ent.onHit(amount,label);
  if(typeof addThreat==="function"&&!(opts&&opts.noThreat)){
    addThreat(ent,(opts&&opts.sourceKey)||"player",amount,opts&&opts.skillId);
  }
  /* C5：战士造成伤害获怒 */
  if(playerResKind()==="rage"&&amount>0&&typeof rageFromDamage==="function"){
    const gain=rageFromDamage(amount,S.p.level,"deal");
    S.p.rage=Math.min(S.p.rageMax,S.p.rage+gain);
  }
  if(ent.hp<=0)ent.onDeath();
}
/* Boss 受击：薄包装（保留旧调用方签名） → BOSS_ENT 在 raid.js 定义 */
function dmgBoss(amount,label,opts){hitEntity(BOSS_ENT,amount,label,opts);}
function heroicStrike(){
  const bal=getSkillBal("heroicStrike");
  const thr={skillId:"heroicStrike",school:"physical"};
  const tgt=resolveSkillTarget(bal.reach||5);
  if(!tgt)return false;
  setCurrentTarget(tgt);
  if(tgt.type==="mob")mobDamage(tgt.m,R(bal.dmg),"英勇打击",thr);
  else if(tgt.type==="boss"){
    if(distToBoss()>(bal.bossReach||bal.reach||5)){log(typeof T==="function"?T("combat.target_oor"):"目标超出射程！");return false;}
    dmgBoss(R(bal.dmg),"英勇打击",thr);
  }else if(tgt.type==="add")addDamage(tgt.a,R(bal.addDmg||bal.dmg),thr);
  S.p.attackAnim=1;
  SFX.play("swing");
  return true;
}
function whirlwind(){
  S.p.attackAnim=1;
  SFX.play("swing");
  spawnBurst(player.position.clone().setY(1),0x9ad0ff,26,1.6);
  let any=false;
  const thr={skillId:"whirlwind"};
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<getSkillBal("whirlwind").radius){
        mobDamage(m,R(getSkillBal("whirlwind").dmg),"旋风斩",thr);any=true;
      }
    });
  }else{
    if(distToBoss()<=getSkillBal("whirlwind").bossRadius){dmgBoss(R(getSkillBal("whirlwind").bossDmg),"旋风斩",thr);any=true;}
    S.adds.forEach(a=>{
      if(addTargetable(a)&&player.position.distanceTo(a.mesh.position)<getSkillBal("whirlwind").radius){addDamage(a,R(getSkillBal("whirlwind").dmg),thr);any=true;}
    });
  }
  if(!any)log("旋风斩没有命中任何目标。");
  return true;
}
function charge(){
  const bal=getSkillBal("charge");
  const tgt=resolveSkillTarget(40);
  if(!tgt)return false;
  const pos=targetWorldPos(tgt);
  if(!pos)return false;
  const best=targetDist(tgt);
  if(best<(bal.minDist||5)){log("目标太近，无法冲锋。");return false;}
  setCurrentTarget(tgt);
  const target=pos.clone().setY(0);
  const dir=target.clone().sub(player.position).normalize();
  const dest=target.clone().sub(dir.clone().multiplyScalar(bal.stopDist||2.5));
  player.position.copy(clampArena(dest));
  S.p.rage=Math.min(S.p.rageMax,S.p.rage+(bal.rageGain||15));
  spawnBurst(player.position.clone().setY(.6),0xffe9a0,18,1.2);
  /* STEP 27：冲锋产生瞬时仇恨 */
  if(typeof addThreat==="function"){
    if(tgt.type==="mob")addThreat(tgt.m,"player",0,"charge");
    else if(tgt.type==="boss"&&typeof BOSS_ENT!=="undefined")addThreat(BOSS_ENT,"player",0,"charge");
    else if(tgt.type==="add")addThreat(tgt.a,"player",0,"charge");
  }
  /* V1-C5：冲锋落地后尝试打断读条 */
  tryInterrupt((getSkillBal("interrupt").range)||8,"冲锋");
  log(`你向敌人发起冲锋！获得 ${bal.rageGain||15} 点怒气。`,"lg-me");
  return true;
}
function potion(){
  const heal=Math.round(R(getSkillBal("potion").heal));
  S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
  fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",18);
  VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
  log(`你饮下强效治疗药水，恢复 ${heal} 点生命值。`,"lg-heal");
  return true;
}

/** V1-C5：通用打断（Boss / 野怪读条） */
function tryInterrupt(range,label){
  const bal=getSkillBal("interrupt");
  const r=range!=null?range:(bal.range||8);
  const lock=bal.lockout!=null?bal.lockout:4;
  if(S.mode==="raid"){
    if(!S.b||!S.b.casting)return false;
    if(typeof bossTargetable==="function"&&!bossTargetable())return false;
    if(typeof distToBoss==="function"&&distToBoss()>r)return false;
    if(typeof interruptBossCast==="function")
      return interruptBossCast({lockout:lock,label:label||"打断"});
    return false;
  }
  if(typeof MOBS==="undefined")return false;
  for(const m of MOBS){
    if(!m||!m.casting)continue;
    if(typeof mobTargetable==="function"&&!mobTargetable(m))continue;
    if(player.position.distanceTo(m.mesh.position)>r)continue;
    const nm=(m.casting&&m.casting.name)||"法术";
    m.casting=null;
    if(m.castCd!=null)m.castCd=Math.max(m.castCd||0,lock);
    fct(m.mesh.position.clone().setY(2.8),"打断!","#ffe080",16);
    log(`${label||"你"}打断了【${m.name}】的${nm}！`,"lg-me");
    return true;
  }
  return false;
}

/** V1-C5：战士嘲讽 */
function taunt(){
  const bal=getSkillBal("taunt");
  const range=bal.range||16;
  const tgt=resolveSkillTarget(range);
  if(!tgt)return false;
  setCurrentTarget(tgt);
  let victim=null,label="";
  if(tgt.type==="mob"){
    victim=tgt.m; label=tgt.m.name||"敌人";
    if(tgt.m.state==="wander"&&typeof aggroMob==="function")aggroMob(tgt.m);
  }else if(tgt.type==="boss"){
    victim=typeof BOSS_ENT!=="undefined"?BOSS_ENT:null;
    label=(typeof getBossCfg==="function"&&getBossCfg().name)||"首领";
  }else if(tgt.type==="add"){
    victim=tgt.a; label=tgt.a.name||"小怪";
  }
  if(!victim){log(typeof T==="function"?T("combat.no_target"):"你没有目标。");return false;}
  if(typeof applyTaunt!=="function"){log("嘲讽系统未就绪。","lg-sys");return false;}
  applyTaunt(victim,"player",{dur:bal.dur,margin:bal.margin});
  S.p.attackAnim=1;
  SFX.play("swing");
  spawnBurst(player.position.clone().setY(1.2),0xffd76a,16,1.4);
  fct(player.position.clone().setY(3.2),"嘲讽!","#ffd76a",17);
  log(`你嘲讽了【${label}】，强制其攻击你 ${bal.dur} 秒！`,"lg-me");
  return true;
}

/* ---------------- 远程职业通用：索敌 & 投射物 ---------------- */
/* ---------------- 目标系统（plan-V3 C2） ---------------- */
function pickTarget(range,fromPos){
  const origin=fromPos||player.position;
  let tgt=null,best=range;
  if(S.mode==="world"){
    const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
    for(const m of MOBS){
      if(!mobTargetable(m))continue;
      if((m.zoneId||"mulgore")!==zid)continue;
      const d=origin.distanceTo(m.mesh.position);
      if(d<best){best=d;tgt={type:"mob",m};}
    }
    return tgt;
  }
  if(bossTargetable()){
    const d=Math.hypot(origin.x-boss.position.x,origin.z-boss.position.z);
    if(d<=range){tgt={type:"boss"};best=d;}
  }
  for(const a of S.adds){
    if(!addTargetable(a))continue;
    const d=origin.distanceTo(a.mesh.position);
    if(d<best){best=d;tgt={type:"add",a};}
  }
  return tgt;
}
function isTargetAlive(tgt){
  if(!tgt)return false;
  if(tgt.type==="mob")return mobTargetable(tgt.m);
  if(tgt.type==="boss")return typeof bossTargetable==="function"&&bossTargetable();
  if(tgt.type==="add")return typeof addTargetable==="function"?addTargetable(tgt.a):!!(tgt.a&&S.adds.includes(tgt.a)&&tgt.a.hp>0);
  return false;
}
function setCurrentTarget(tgt){
  const prev=S.currentTarget;
  if(tgt&&isTargetAlive(tgt)){S.currentTarget=tgt;S.target=tgt;}
  else{S.currentTarget=null;S.target=null;}
  /* C5：换目标清空连击点 */
  const clearOn=(BAL.sim&&BAL.sim.resources&&BAL.sim.resources.combo&&BAL.sim.resources.combo.clearOnRetarget!==false);
  if(clearOn&&typeof clearComboPoints==="function"&&S.res){
    const changed=!prev||!S.currentTarget||prev.type!==S.currentTarget.type||
      (prev.type==="mob"&&prev.m!==S.currentTarget.m)||
      (prev.type==="add"&&prev.a!==S.currentTarget.a)||
      (prev.type==="boss"&&S.currentTarget.type!=="boss");
    if(changed&&(!S.currentTarget||!prev))clearComboPoints(S.res);
    else if(changed&&prev&&S.currentTarget)clearComboPoints(S.res);
  }
  if(typeof refreshTargetFrame==="function")refreshTargetFrame();
}
function clearCurrentTargetIf(ent){
  const t=S.currentTarget;
  if(!t)return;
  if(t.type==="mob"&&t.m===ent)setCurrentTarget(null);
  if(t.type==="add"&&t.a===ent)setCurrentTarget(null);
  if(t.type==="boss"&&ent&&ent.type==="boss")setCurrentTarget(null);
}
function targetWorldPos(tgt){
  if(!tgt)return null;
  if(tgt.type==="mob"&&tgt.m&&tgt.m.mesh)return tgt.m.mesh.position;
  if(tgt.type==="add"&&tgt.a&&tgt.a.mesh)return tgt.a.mesh.position;
  if(tgt.type==="boss"&&typeof boss!=="undefined"&&boss)return boss.position;
  return null;
}
function targetDist(tgt,fromPos){
  const p=targetWorldPos(tgt);
  if(!p)return Infinity;
  const o=fromPos||player.position;
  return o.distanceTo(p);
}
function targetDisplayInfo(tgt){
  if(!isTargetAlive(tgt))return null;
  if(tgt.type==="mob"){
    const m=tgt.m;
    return{
      name:m.name||"敌人",level:m.level!=null?m.level:1,
      hp:m.hp,hpMax:m.hpMax,elite:!!m.elite,rare:!!(m.rare||m.worldBoss),
      kind:"mob",ent:m
    };
  }
  if(tgt.type==="add"){
    const a=tgt.a;
    return{
      name:a.name||T("mob.flame_spawn"),level:a.level!=null?a.level:15,
      hp:a.hp,hpMax:a.hpMax,elite:!!a.elite,rare:false,kind:"add",ent:a
    };
  }
  if(tgt.type==="boss"){
    const cfg=typeof BOSSES!=="undefined"&&S.b&&BOSSES[S.b.id]?BOSSES[S.b.id]:null;
    return{
      name:cfg&&cfg.name?cfg.name:(typeof T==="function"?T("boss.ragnaros"):"Boss"),
      level:S.b.level!=null?S.b.level:((BAL.boss&&BAL.boss.level)||20),
      hp:S.b.hp,hpMax:S.b.hpMax,elite:true,rare:false,kind:"boss",ent:null,
      title:cfg&&cfg.title?cfg.title:""
    };
  }
  return null;
}
function getFocusTarget(range){
  const r=range!=null?range:(BAL.companion?BAL.companion.combatEngageR:24);
  if(isTargetAlive(S.currentTarget))return S.currentTarget;
  setCurrentTarget(null);
  return pickTarget(r);
}
/** 技能索敌：优先当前目标 → 自动最近 → 否则「你没有目标」 */
function resolveSkillTarget(range,opts){
  opts=opts||{};
  const r=range!=null?range:((BAL.target&&BAL.target.skillDefaultRange)||30);
  const msgNo=typeof T==="function"?T("combat.no_target"):"你没有目标。";
  const msgOor=typeof T==="function"?T("combat.target_oor"):"目标超出射程！";
  if(isTargetAlive(S.currentTarget)){
    const d=targetDist(S.currentTarget);
    if(d<=r)return S.currentTarget;
    if(!opts.silent)log(msgOor);
    return null;
  }
  if(opts.requireExplicit){
    if(!opts.silent)log(msgNo);
    return null;
  }
  const auto=pickTarget(r);
  if(auto){setCurrentTarget(auto);return auto;}
  if(!opts.silent)log(msgNo);
  return null;
}
function listHostileTargets(maxRange){
  const Tcfg=BAL.target||{};
  const range=maxRange!=null?maxRange:(Tcfg.tabRange||48);
  const list=[];
  if(S.mode==="world"){
    const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
    for(const m of MOBS){
      if(!mobTargetable(m))continue;
      if((m.zoneId||"mulgore")!==zid)continue;
      const d=player.position.distanceTo(m.mesh.position);
      if(d<=range)list.push({type:"mob",m,d,pos:m.mesh.position});
    }
  }else{
    if(bossTargetable()){
      const d=Math.hypot(player.position.x-boss.position.x,player.position.z-boss.position.z);
      if(d<=range)list.push({type:"boss",d,pos:boss.position});
    }
    for(const a of S.adds){
      if(!addTargetable(a))continue;
      const d=player.position.distanceTo(a.mesh.position);
      if(d<=range)list.push({type:"add",a,d,pos:a.mesh.position});
    }
  }
  return list;
}
function cycleHostileTargets(reverse){
  const Tcfg=BAL.target||{};
  const cone=Tcfg.tabConeCos!=null?Tcfg.tabConeCos:.15;
  const list=listHostileTargets();
  if(!list.length){
    log(typeof T==="function"?T("combat.no_target"):"你没有目标。");
    return null;
  }
  /* 视锥：以相机朝向近似（face+yawOff） */
  const yaw=S.p.face+(S.cam&&!(S.cam.rmb||S.cam.touchLook)?(S.cam.yawOff||0):0);
  const fx=Math.sin(yaw), fz=Math.cos(yaw);
  const scored=[];
  for(const it of list){
    const dx=it.pos.x-player.position.x, dz=it.pos.z-player.position.z;
    const len=Math.hypot(dx,dz)||1;
    const dot=(dx*fx+dz*fz)/len;
    if(dot<cone&&it.d>((Tcfg.tabNearSkip!=null)?Tcfg.tabNearSkip:8))continue; /* 近距离放宽锥角 */
    scored.push({tgt:it.type==="boss"?{type:"boss"}:it.type==="mob"?{type:"mob",m:it.m}:{type:"add",a:it.a}, d:it.d, dot});
  }
  const pool=scored.length?scored:list.map(it=>({
    tgt:it.type==="boss"?{type:"boss"}:it.type==="mob"?{type:"mob",m:it.m}:{type:"add",a:it.a},
    d:it.d,dot:1
  }));
  pool.sort((a,b)=>a.d-b.d||b.dot-a.dot);
  let idx=0;
  if(isTargetAlive(S.currentTarget)){
    for(let i=0;i<pool.length;i++){
      const t=pool[i].tgt, c=S.currentTarget;
      if(t.type!==c.type)continue;
      if(t.type==="boss"){idx=i;break;}
      if(t.type==="mob"&&t.m===c.m){idx=i;break;}
      if(t.type==="add"&&t.a===c.a){idx=i;break;}
    }
    idx=reverse?(idx-1+pool.length)%pool.length:(idx+1)%pool.length;
  }else if(reverse)idx=pool.length-1;
  const next=pool[idx].tgt;
  setCurrentTarget(next);
  return next;
}
function firePlayerShot(tgt,dmg,label,scale=1,opts){
  opts=opts||{};
  setCurrentTarget(tgt);
  SFX.play(CLS.sfx||"fireball");
  /* 复用共享球几何，避免每次施法 new SphereGeometry */
  const coreGeo=typeof VFX_GEO!=="undefined"?VFX_GEO.sphere(.3*scale,6):new THREE.SphereGeometry(.3*scale,6,6);
  const glowGeo=typeof VFX_GEO!=="undefined"?VFX_GEO.sphere(.55*scale,6):new THREE.SphereGeometry(.55*scale,6,6);
  const m=new THREE.Mesh(coreGeo,new THREE.MeshBasicMaterial({color:CLS.shotColor}));
  const glow=new THREE.Mesh(glowGeo,new THREE.MeshBasicMaterial({color:CLS.shotColor,transparent:true,opacity:.35}));
  m.add(glow);
  if(BAL.vfx&&BAL.vfx.fakeBloom){
    const fb=BAL.vfx.fakeBloomShell||{};
    const r=(fb.shotR!=null?fb.shotR:.85)*scale;
    const op=fb.shotOp!=null?fb.shotOp:.18;
    const shellGeo=typeof VFX_GEO!=="undefined"?VFX_GEO.sphere(r,6):new THREE.SphereGeometry(r,6,6);
    m.add(new THREE.Mesh(shellGeo,new THREE.MeshBasicMaterial({
      color:CLS.shotColor,transparent:true,opacity:op,
      side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
    })));
  }
  m.position.copy(player.position); m.position.y=1.9;
  scene.add(m);
  S.pShots.push({
    mesh:m,tgt,dmg,label,speed:28,shotColor:CLS.shotColor,
    school:opts.school||(CLS.ranged&&CLS.resKind==="mana"?"spell":"physical"),
    skillId:opts.skillId,sourceKey:opts.sourceKey
  });
}

/* ---------------- 法师技能 ---------------- */
function pyroblast(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("pyroblast").dmg),"炎爆术",1.7,{school:"spell",skillId:"pyroblast"});
  log("你吟唱出巨大的炎爆术！","lg-me");
  return true;
}
function frostNova(){
  tryInterrupt(getSkillBal("frostNova").bossRadius||12,"冰霜新星");
  spawnBurst(player.position.clone().setY(.8),0x8ad8ff,14,2.2);
  const rootDur=getSkillBal("frostNova").rootT;
  let any=false;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<getSkillBal("frostNova").radius){
        mobDamage(m,R(getSkillBal("frostNova").dmg),"冰霜新星");
        if(typeof applyAura==="function")applyAura(m,"rooted",{duration:rootDur});
        else m.rootT=rootDur;
        any=true;
      }
    });
  }else{
    if(bossTargetable()&&distToBoss()<=getSkillBal("frostNova").bossRadius){dmgBoss(R(getSkillBal("frostNova").bossDmg),"冰霜新星");any=true;}
    S.adds.forEach(a=>{
      if(addTargetable(a)&&player.position.distanceTo(a.mesh.position)<getSkillBal("frostNova").radius){
        addDamage(a,R(getSkillBal("frostNova").dmg));
        if(typeof applyAura==="function")applyAura(a,"rooted",{duration:rootDur});
        else a.rootT=rootDur;
        any=true;
      }
    });
  }
  log(any?"冰霜新星冻结了周围的敌人！（定身 3 秒）":"寒气四溢，但没有敌人在范围内。","lg-me");
  return true;
}
function blink(){
  const dir=new THREE.Vector3(Math.sin(S.p.face),0,Math.cos(S.p.face));
  player.position.add(dir.multiplyScalar(getSkillBal("blink").dist));
  clampArena(player.position);
  spawnBurst(player.position.clone().setY(1.4),0xb08aff,22,1.6);
  log("你闪现到了新的位置！","lg-me");
  return true;
}
function iceBlock(){
  const dur=getSkillBal("iceBlock").invuln;
  if(typeof applyAura==="function")applyAura(S.p,"ice_block",{duration:dur});
  else S.p.invuln=dur;
  const p=player;
  const ice=new THREE.Mesh(new THREE.IcosahedronGeometry(1.9,0),
    MAT.get("emissive.ice"));
  ice.position.y=1.8; p.add(ice);
  setTimeout(()=>p.remove(ice),3000);
  log("寒冰屏障！3 秒内免疫所有伤害。","lg-me");
  return true;
}

/* ---------------- 弓箭手技能 ---------------- */
function aimedShot(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  tryInterrupt(CLS.range,"瞄准射击");
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("aimedShot").dmg),"瞄准射击",1.4);
  log("你屏息凝神，射出致命一箭！","lg-me");
  return true;
}
function multiShot(){
  let n=0;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<=CLS.range){
        firePlayerShot({type:"mob",m},R(getSkillBal("multiShot").dmg),"多重射击");n++;
      }
    });
  }else{
    if(bossTargetable()&&distToBoss()<=CLS.range){firePlayerShot({type:"boss"},R(getSkillBal("multiShot").dmg),"多重射击");n++;}
    S.adds.forEach(a=>{
      if(addTargetable(a)&&player.position.distanceTo(a.mesh.position)<=CLS.range){
        firePlayerShot({type:"add",a},R(getSkillBal("multiShot").dmg),"多重射击");n++;
      }
    });
  }
  if(!n){log("射程内没有任何目标！");return false;}
  S.p.attackAnim=1;
  log(`多重射击！${n} 支箭矢破空而出。`,"lg-me");
  return true;
}
function roll(){
  const dir=new THREE.Vector3(Math.sin(S.p.face),0,Math.cos(S.p.face));
  player.position.add(dir.multiplyScalar(getSkillBal("roll").dist));
  clampArena(player.position);
  const dur=getSkillBal("roll").invuln;
  if(typeof applyAura==="function")applyAura(S.p,"evasion",{duration:dur});
  else S.p.invuln=Math.max(S.p.invuln,dur);
  spawnBurst(player.position.clone().setY(.6),0xd0ffa0,14,1);
  log("你灵巧地翻滚，短暂闪避一切伤害！","lg-me");
  return true;
}

/* ---------------- 牧师技能（STEP 19） ---------------- */
function clearShieldVisual(){
  const m=S.p.shieldMesh;
  if(!m)return;
  if(S.auras){
    for(let i=S.auras.length-1;i>=0;i--)
      if(S.auras[i].mesh===m)S.auras.splice(i,1);
  }
  if(m.parent)m.parent.remove(m);
  if(typeof disposeVfxMesh==="function")disposeVfxMesh(m);
  else{
    if(m.geometry)m.geometry.dispose();
    if(m.material)disposeMaterial(m.material);
  }
  S.p.shieldMesh=null;
}
function applyHeal(amount,label){
  if(S.p.hp>=S.p.hpMax){log("生命已满。");return false;}
  const mul=1+((S.p.talentFx&&S.p.talentFx.healMul)||0);
  let heal=Math.round(amount*mul);
  /* STEP 16：治疗可暴击（走自身暴击率，倍率 1.5） */
  let crit=false;
  if(!S.p.derived&&typeof refreshPlayerDerived==="function")refreshPlayerDerived();
  const critPct=(S.p.derived&&S.p.derived.critPct)!=null?S.p.derived.critPct:5;
  if(Math.random()*100<critPct){
    heal=Math.round(heal*1.5);
    crit=true;
  }
  S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
  fct(player.position.clone().setY(3),crit?`暴击 +${heal}`:`+${heal}`,"#8aff9a",crit?22:18,{crit,kind:"heal"});
  VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
  if(typeof SFX!=="undefined")SFX.play("heal");
  log(crit?`你施放【${label}】，暴击恢复 ${heal} 点生命值！`:`你施放【${label}】，恢复 ${heal} 点生命值。`,"lg-heal");
  return true;
}
function heal(){
  return applyHeal(R(getSkillBal("heal").heal),"治疗术");
}
function flashHeal(){
  return applyHeal(R(getSkillBal("flashHeal").heal),"快速治疗");
}
function castRenew(){
  const bal=getSkillBal("renew");
  if(typeof applyAura!=="function"){log("无法施加恢复术。","lg-sys");return false;}
  applyAura(S.p,"renew",{
    duration:bal.duration,
    healPerSec:bal.healPerSec,
  });
  S.p.attackAnim=.4;
  spawnBurst(player.position.clone().setY(1.5),0xffe080,12,1.3);
  fct(player.position.clone().setY(3.2),"恢复","#ffe9a0",14,{kind:"heal"});
  if(typeof SFX!=="undefined")SFX.play("heal");
  log(`恢复术！持续恢复生命 ${bal.duration} 秒。`,"lg-heal");
  return true;
}
function smite(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  tryInterrupt(CLS.range,"神圣惩击");
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("smite").dmg),"神圣惩击",1.5);
  log("你唤来神圣惩击！","lg-me");
  return true;
}
function powerWordShield(){
  const bal=getSkillBal("powerWordShield");
  const mul=1+((S.p.talentFx&&S.p.talentFx.shieldMul)||0);
  const absorb=Math.round(R(bal.absorb)*mul);
  clearShieldVisual();
  if(typeof applyAura==="function"){
    applyAura(S.p,"power_word_shield",{duration:bal.duration,absorb});
  }
  if(typeof applyBuff==="function")applyBuff("power_word_shield",{duration:bal.duration,absorb});
  else{S.p.absorb=absorb;S.p.absorbT=bal.duration;}
  const ice=typeof attachShieldAura==="function"
    ?attachShieldAura(player):(function(){
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1.85,0),MAT.get("emissive.holy"));
      m.position.y=1.75; player.add(m); return m;
    })();
  S.p.shieldMesh=ice;
  fct(player.position.clone().setY(3.2),`盾 ${absorb}`,"#ffe9a0",16);
  if(typeof SFX!=="undefined")SFX.play("holy");
  log(`真言术：盾！吸收 ${absorb} 点伤害，持续 ${bal.duration} 秒。`,"lg-heal");
  return true;
}

/** STEP 16：对焦点野怪施加腐蚀 DoT（验收 / 作弊台） */
function applyCorruptionToTarget(stacks){
  const tgt=typeof getFocusTarget==="function"?getFocusTarget(40):null;
  let ent=null, label="目标";
  if(tgt&&tgt.type==="mob"&&tgt.m){ent=tgt.m;label=tgt.m.name||"野怪";}
  else if(tgt&&tgt.type==="add"&&tgt.a){ent=tgt.a;label=tgt.a.name||"小怪";}
  else if(tgt&&tgt.type==="boss"&&typeof BOSS_ENT!=="undefined"){ent=BOSS_ENT;label=(typeof targetDisplayInfo==="function"&&targetDisplayInfo(tgt)||{}).name||"首领";}
  if(!ent||typeof applyAura!=="function"){
    log("没有可施加腐蚀的目标。","lg-sys");
    return false;
  }
  const st=stacks!=null?stacks:3;
  const bal=typeof getSkillBal==="function"?getSkillBal("corruption"):null;
  applyAura(ent,"corruption",{
    stacks:st,
    duration:bal&&bal.duration!=null?bal.duration:undefined,
    dmgPerTick:bal&&bal.dmgPerTick!=null?bal.dmgPerTick:undefined,
  });
  log(`【腐蚀】附着在${label}身上（${st} 层）。`,"lg-me");
  if(typeof announce==="function")announce("腐蚀");
  return true;
}

/* ---------------- 术士技能 ---------------- */
function shadowBolt(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("shadowBolt").dmg),"暗影箭",1.5,{school:"spell",skillId:"shadowBolt"});
  log("你射出暗影箭！","lg-me");
  return true;
}
function castCorruption(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  let ent=null, label="目标";
  if(t.type==="mob"&&t.m){ent=t.m;label=t.m.name||"野怪";}
  else if(t.type==="add"&&t.a){ent=t.a;label=t.a.name||"小怪";}
  else if(t.type==="boss"&&typeof BOSS_ENT!=="undefined"){
    ent=BOSS_ENT;
    label=(typeof targetDisplayInfo==="function"&&targetDisplayInfo(t)||{}).name||"首领";
  }
  if(!ent||typeof applyAura!=="function"){log("无法腐蚀该目标。","lg-sys");return false;}
  const bal=getSkillBal("corruption");
  const stacks=bal.stacks!=null?bal.stacks:1;
  applyAura(ent,"corruption",{
    stacks,
    duration:bal.duration,
    dmgPerTick:bal.dmgPerTick,
  });
  S.p.attackAnim=.6;
  spawnBurst(player.position.clone().setY(1.6),0xa040ff,10,1.2);
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"shadow");
  log(`【腐蚀术】侵蚀了${label}！`,"lg-me");
  return true;
}
/** 引导每跳：伤害 + 吸血；目标失效返回 false */
function drainLifeTick(){
  const range=(CLS&&CLS.range)||24;
  const t=resolveSkillTarget(range,{silent:true});
  if(!t)return false;
  const bal=getSkillBal("drainLife");
  const dmg=R(bal.dmgPerTick||[80,110]);
  S.p.attackAnim=.45;
  if(t.type==="mob"&&t.m){
    if(typeof mobDamage==="function")mobDamage(t.m,dmg,"生命吸取");
    else if(typeof hitEntity==="function")hitEntity(t.m,dmg,"生命吸取");
  }else if(t.type==="add"&&t.a){
    if(typeof addDamage==="function")addDamage(t.a,dmg);
    else if(typeof hitEntity==="function")hitEntity(t.a,dmg,"生命吸取");
  }else if(t.type==="boss"){
    dmgBoss(dmg,"生命吸取");
  }else return false;
  const leech=(bal.leech!=null?+bal.leech:.55)*(1+((S.p.talentFx&&S.p.talentFx.leechMul)||0));
  const heal=Math.max(1,Math.round(dmg*leech));
  S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
  fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",15,{kind:"heal"});
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"shadow");
  return true;
}
function drainLifeEnd(){
  log("生命吸取引导结束。","lg-me");
  return true;
}
function lifeTap(){
  const bal=getSkillBal("lifeTap");
  const hpCost=bal.hpCost!=null?bal.hpCost|0:Math.round(S.p.hpMax*.12);
  const manaGain=bal.manaGain!=null?bal.manaGain|0:35;
  if(S.p.hp<=hpCost+1){log("生命过低，无法分流！","lg-sys");return false;}
  if(typeof applyEntityHpDamage==="function")applyEntityHpDamage(S.p,hpCost);
  else S.p.hp=Math.max(1,S.p.hp-hpCost);
  S.p.rage=Math.min(S.p.rageMax,(S.p.rage|0)+manaGain);
  fct(player.position.clone().setY(3.1),`-${hpCost}`,"#c070ff",14);
  fct(player.position.clone().setY(3.5),`+${manaGain} 法力`,"#a080ff",15);
  spawnBurst(player.position.clone().setY(1.4),0x8040c0,12,1.3);
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"shadow");
  log(`生命分流：牺牲 ${hpCost} 生命，回复 ${manaGain} 法力。`,"lg-me");
  return true;
}
/** 术士技能表在 CLASSES 字面量里占位，函数声明后再挂接 */
(function bindWarlockSkills(){
  const sk=CLASSES.warlock&&CLASSES.warlock.skills;
  if(!sk||sk.length<4)return;
  sk[0].fn=shadowBolt;
  sk[1].fn=castCorruption;
  sk[2].fn=drainLifeEnd;
  sk[2].channelTick=drainLifeTick;
  sk[3].fn=lifeTap;
})();

/* ---------------- 德鲁伊技能 ---------------- */
function wrath(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("wrath").dmg),"愤怒",1.4,{school:"spell",skillId:"wrath"});
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"nature");
  log("你唤来自然之怒！","lg-me");
  return true;
}
function castMoonfire(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  let ent=null, label="目标";
  if(t.type==="mob"&&t.m){ent=t.m;label=t.m.name||"野怪";}
  else if(t.type==="add"&&t.a){ent=t.a;label=t.a.name||"小怪";}
  else if(t.type==="boss"&&typeof BOSS_ENT!=="undefined"){
    ent=BOSS_ENT;
    label=(typeof targetDisplayInfo==="function"&&targetDisplayInfo(t)||{}).name||"首领";
  }
  if(!ent||typeof applyAura!=="function"){log("无法月火该目标。","lg-sys");return false;}
  const bal=getSkillBal("moonfire");
  applyAura(ent,"moonfire",{
    duration:bal.duration,
    dmgPerTick:bal.dmgPerTick,
    stacks:bal.stacks!=null?bal.stacks:1,
  });
  if(bal.impact){
    if(t.type==="mob"&&typeof mobDamage==="function")mobDamage(ent,R(bal.impact),"月火术");
    else if(t.type==="add"&&typeof addDamage==="function")addDamage(ent,R(bal.impact));
    else if(t.type==="boss")dmgBoss(R(bal.impact),"月火术");
  }
  S.p.attackAnim=.55;
  spawnBurst(player.position.clone().setY(1.6),0x80c0ff,10,1.2);
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"nature");
  log(`【月火术】灼烧了${label}！`,"lg-me");
  return true;
}
function castRejuvenation(){
  const bal=getSkillBal("rejuvenation");
  if(typeof applyAura!=="function"){log("无法施加回春。","lg-sys");return false;}
  applyAura(S.p,"rejuvenation",{
    duration:bal.duration,
    healPerSec:bal.healPerSec,
  });
  S.p.attackAnim=.4;
  spawnBurst(player.position.clone().setY(1.5),0x60e090,12,1.3);
  fct(player.position.clone().setY(3.2),"回春","#8aff9a",14,{kind:"heal"});
  if(typeof SFX!=="undefined")SFX.play("heal");
  log(`回春术！持续恢复生命 ${bal.duration} 秒。`,"lg-heal");
  return true;
}
function entanglingRoots(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  const bal=getSkillBal("entanglingRoots");
  const rootDur=bal.rootT!=null?bal.rootT:4;
  let ent=null, label="目标", any=false;
  if(t.type==="mob"&&t.m){ent=t.m;label=t.m.name||"野怪";}
  else if(t.type==="add"&&t.a){ent=t.a;label=t.a.name||"小怪";}
  else if(t.type==="boss"){
    /* Boss 仅造成伤害，不定身 */
    dmgBoss(R(bal.dmg||[200,280]),"纠缠根须");
    any=true;
  }
  if(ent){
    if(bal.dmg){
      if(t.type==="mob"&&typeof mobDamage==="function")mobDamage(ent,R(bal.dmg),"纠缠根须");
      else if(t.type==="add"&&typeof addDamage==="function")addDamage(ent,R(bal.dmg));
    }
    if(typeof applyAura==="function")applyAura(ent,"rooted",{duration:rootDur});
    else ent.rootT=rootDur;
    any=true;
  }
  S.p.attackAnim=.5;
  spawnBurst(player.position.clone().setY(.6),0x40a060,14,1.5);
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"nature");
  log(any?`纠缠根须缠住了${label}！`:"根须破土，但没有缠住目标。","lg-me");
  return any;
}
(function bindDruidSkills(){
  const sk=CLASSES.druid&&CLASSES.druid.skills;
  if(!sk||sk.length<4)return;
  sk[0].fn=wrath;
  sk[1].fn=castMoonfire;
  sk[2].fn=castRejuvenation;
  sk[3].fn=entanglingRoots;
})();

/* ---------------- 圣骑士技能 ---------------- */
function crusaderStrike(){
  const bal=getSkillBal("crusaderStrike");
  const thr={skillId:"crusaderStrike",school:"physical"};
  const tgt=resolveSkillTarget(bal.reach||5);
  if(!tgt)return false;
  setCurrentTarget(tgt);
  if(tgt.type==="mob")mobDamage(tgt.m,R(bal.dmg),"十字军打击",thr);
  else if(tgt.type==="boss"){
    if(distToBoss()>(bal.bossReach||bal.reach||5)){log(typeof T==="function"?T("combat.target_oor"):"目标超出射程！");return false;}
    dmgBoss(R(bal.dmg),"十字军打击",thr);
  }else if(tgt.type==="add")addDamage(tgt.a,R(bal.addDmg||bal.dmg),thr);
  S.p.attackAnim=1;
  if(typeof SFX!=="undefined")SFX.play(CLS.sfx||"holy");
  log("十字军打击！","lg-me");
  return true;
}
function judgement(){
  const bal=getSkillBal("judgement");
  const range=bal.range!=null?bal.range:18;
  const t=resolveSkillTarget(range);
  if(!t)return false;
  S.p.attackAnim=1;
  firePlayerShot(t,R(bal.dmg),"审判",1.35,{school:"spell",skillId:"judgement"});
  tryInterrupt(range,"审判");
  if(typeof SFX!=="undefined")SFX.play("holy");
  log("你降下神圣审判！","lg-me");
  return true;
}
function holyLight(){
  return applyHeal(R(getSkillBal("holyLight").heal),"圣光术");
}
function divineShield(){
  const bal=getSkillBal("divineShield");
  const dur=bal.invuln!=null?bal.invuln:3;
  if(typeof applyAura==="function")applyAura(S.p,"divine_shield",{duration:dur});
  else S.p.invuln=dur;
  const p=player;
  const aura=new THREE.Mesh(new THREE.IcosahedronGeometry(1.95,0),MAT.get("emissive.holy"));
  aura.position.y=1.8; p.add(aura);
  setTimeout(()=>{if(aura.parent)p.remove(aura);},Math.round(dur*1000));
  if(typeof SFX!=="undefined")SFX.play("holy");
  log(`圣盾术！${dur} 秒内免疫所有伤害。`,"lg-heal");
  return true;
}
(function bindPaladinSkills(){
  const sk=CLASSES.paladin&&CLASSES.paladin.skills;
  if(!sk||sk.length<4)return;
  sk[0].fn=crusaderStrike;
  sk[1].fn=judgement;
  sk[2].fn=holyLight;
  sk[3].fn=divineShield;
})();

/* ---- V1-C1 萨满技能 / 图腾 ---- */
function lightningBolt(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("lightningBolt").dmg),"闪电箭",1.45);
  if(typeof SFX!=="undefined")SFX.play("lightning");
  log("你唤来闪电箭！","lg-me");
  return true;
}
function earthShock(){
  const t=resolveSkillTarget(CLS.range);
  if(!t)return false;
  tryInterrupt(CLS.range,"大地震击");
  S.p.attackAnim=1;
  firePlayerShot(t,R(getSkillBal("earthShock").dmg),"大地震击",1.15);
  if(typeof SFX!=="undefined")SFX.play("lightning");
  log("大地震击！","lg-me");
  return true;
}
function healingWave(){
  return applyHeal(R(getSkillBal("healingWave").heal),"治疗波");
}
function disposeTotemMesh(mesh){
  if(!mesh)return;
  if(mesh.parent)mesh.parent.remove(mesh);
  mesh.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material))o.material.forEach(disposeMaterial);
      else disposeMaterial(o.material);
    }
  });
}
function clearAllTotems(){
  if(!S.totems){S.totems=[];return;}
  for(const t of S.totems)disposeTotemMesh(t.mesh);
  S.totems.length=0;
}
function buildHealingTotemMesh(){
  const g=new THREE.Group();
  const wood=MAT.get("wood.totem");
  const teal=MAT.get("emissive.teal");
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,1.8,6),wood);
  pole.position.y=.9; g.add(pole);
  const head=new THREE.Mesh(new THREE.ConeGeometry(.28,.55,6),teal);
  head.position.y=2.0; g.add(head);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.2,2.4,24),
    new THREE.MeshBasicMaterial({color:0x44e0a0,transparent:true,opacity:.28,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.04; g.add(ring);
  g.userData.auraRing=ring;
  return g;
}
function placeHealingTotem(){
  const bal=getSkillBal("healingTotem");
  const max=bal.max||1;
  if(!S.totems)S.totems=[];
  while(S.totems.filter(x=>x.kind==="heal").length>=max){
    const old=S.totems.find(x=>x.kind==="heal");
    if(!old)break;
    disposeTotemMesh(old.mesh);
    S.totems.splice(S.totems.indexOf(old),1);
  }
  const mesh=buildHealingTotemMesh();
  mesh.position.set(player.position.x,0,player.position.z);
  scene.add(mesh);
  S.totems.push({
    kind:"heal", mesh, t:bal.duration, tickAcc:0,
    radius:bal.radius, tick:bal.tick||1,
  });
  if(typeof SFX!=="undefined")SFX.play("heal");
  VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.2)});
  log(`你放置了【治疗图腾】，持续 ${bal.duration} 秒。`,"lg-heal");
  return true;
}
function tickTotems(dt){
  if(!S.totems||!S.totems.length)return;
  const bal=getSkillBal("healingTotem");
  for(let i=S.totems.length-1;i>=0;i--){
    const t=S.totems[i];
    t.t-=dt;
    const ring=t.mesh&&t.mesh.userData&&t.mesh.userData.auraRing;
    if(ring&&ring.material)ring.material.opacity=.18+.12*Math.sin(S.t*3);
    if(t.t<=0){
      disposeTotemMesh(t.mesh);
      S.totems.splice(i,1);
      continue;
    }
    if(t.kind!=="heal"||!S.p.alive)continue;
    t.tickAcc+=dt;
    const step=t.tick||1;
    while(t.tickAcc>=step){
      t.tickAcc-=step;
      const dx=player.position.x-t.mesh.position.x;
      const dz=player.position.z-t.mesh.position.z;
      if(Math.hypot(dx,dz)>t.radius)continue;
      if(S.p.hp>=S.p.hpMax)continue;
      const mul=1+((S.p.talentFx&&S.p.talentFx.healMul)||0);
      const heal=Math.round(R(bal.healPerTick)*mul);
      S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
      fct(player.position.clone().setY(2.5),`+${heal}`,"#7affc0",13);
    }
  }
}

/* ---- V1-C2 盗贼：潜行 / 背刺 ---- */
function isPlayerOutOfCombat(){
  if(S.mode==="raid")return false;
  if(!MOBS||!MOBS.length)return true;
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
  for(const m of MOBS){
    if((m.zoneId||"mulgore")!==zid)continue;
    if(m.state==="aggro")return false;
  }
  return true;
}
function getPlayerAggroMul(){
  if(!S.p.stealth||!BAL.stealth)return 1;
  let mul=BAL.stealth.aggroMul!=null?BAL.stealth.aggroMul:.35;
  const fx=S.p.talentFx&&S.p.talentFx.stealthAggro;
  if(fx)mul=Math.max(.12,mul-fx);
  return mul;
}
/** C11：等级差主动仇恨半径（中立 aggroR:0 / 灰怪 → 0；叠乘潜行倍率） */
function getMobAggroRadius(m){
  if(!m||!m.stats)return 0;
  const base=m.stats.aggroR|0;
  if(base<=0)return 0;
  const cfg=BAL.aggro||{};
  const pl=(S.p&&S.p.level)|0||1;
  const ml=m.level!=null?m.level:((m.stats.level)|0||1);
  if(cfg.greySkip!==false&&typeof isGreyMob==="function"&&isGreyMob(pl,ml))return 0;
  const diff=ml-pl;
  const above=cfg.perLevelAbove!=null?cfg.perLevelAbove:.15;
  const below=cfg.perLevelBelow!=null?cfg.perLevelBelow:.1;
  let levelMul=diff>0?(1+diff*above):(1+diff*below);
  const minM=cfg.minMul!=null?cfg.minMul:.4;
  const maxM=cfg.maxMul!=null?cfg.maxMul:2.4;
  levelMul=Math.max(minM,Math.min(maxM,levelMul));
  const stealth=typeof getPlayerAggroMul==="function"?getPlayerAggroMul():1;
  return base*levelMul*stealth;
}
function applyStealthVisual(on){
  if(typeof player==="undefined"||!player)return;
  const alpha=(BAL.stealth&&BAL.stealth.alpha!=null)?BAL.stealth.alpha:.42;
  player.traverse(o=>{
    if(!o.isMesh||!o.material)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats){
      if(!m)continue;
      if(on){
        if(m.userData._stealthSaved==null)
          m.userData._stealthSaved={transparent:!!m.transparent,opacity:m.opacity!=null?m.opacity:1};
        m.transparent=true;
        m.opacity=Math.min(m.userData._stealthSaved.opacity,alpha);
        m.needsUpdate=true;
      }else if(m.userData._stealthSaved){
        m.transparent=m.userData._stealthSaved.transparent;
        m.opacity=m.userData._stealthSaved.opacity;
        delete m.userData._stealthSaved;
        m.needsUpdate=true;
      }
    }
  });
}
function breakStealth(reason,silent){
  if(!S.p.stealth)return;
  S.p.stealth=false;
  applyStealthVisual(false);
  if(!silent)log("潜行解除。","lg-sys");
}
function enterStealth(){
  if(S.p.stealth){breakStealth("toggle");return true;}
  if(!isPlayerOutOfCombat()){log("战斗中无法潜行。","lg-sys");return false;}
  S.p.stealth=true;
  applyStealthVisual(true);
  if(typeof SFX!=="undefined")SFX.play("stealth");
  log("你隐入阴影，野怪更难发现你。","lg-me");
  return true;
}
function stealth(){return enterStealth();}
/** 目标背后判定：攻击者相对目标朝向接近正后方 */
function isBehindTarget(targetPos,targetRotY,attackerPos,arc){
  const half=(arc!=null?arc:(getSkillBal("backstab")&&getSkillBal("backstab").behindArc)||1.35)*.5;
  const toAtk=Math.atan2(attackerPos.x-targetPos.x,attackerPos.z-targetPos.z);
  let d=toAtk-targetRotY;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return Math.abs(d)>Math.PI-half;
}
function sinisterStrike(){
  const thr={skillId:"sinisterStrike"};
  const bal=getSkillBal("sinisterStrike");
  tryInterrupt((getSkillBal("interrupt").range)||8,"影袭");
  const tgt=resolveSkillTarget(bal.reach||5);
  if(!tgt)return false;
  setCurrentTarget(tgt);
  if(tgt.type==="mob")mobDamage(tgt.m,R(bal.dmg),"影袭",thr);
  else if(tgt.type==="boss"){
    if(distToBoss()>(bal.bossReach||bal.reach||5)){log(typeof T==="function"?T("combat.target_oor"):"目标超出射程！");return false;}
    dmgBoss(R(bal.dmg),"影袭",thr);
  }else if(tgt.type==="add")addDamage(tgt.a,R(bal.addDmg||bal.dmg),thr);
  breakStealth("attack");
  S.p.attackAnim=1;
  SFX.play("swing");
  return true;
}
function backstab(){
  const bal=getSkillBal("backstab");
  const reach=bal.reach||5;
  const tgt=resolveSkillTarget(reach);
  if(!tgt)return false;
  let targetMesh=null, deal=null;
  if(tgt.type==="mob"){
    targetMesh=tgt.m.mesh;
    deal=()=>{
      let dmg=R(bal.dmg);
      if(S.p.stealth)dmg=Math.round(dmg*(bal.stealthMul||1.25)*(1+((S.p.talentFx&&S.p.talentFx.stealthDmg)||0)));
      mobDamage(tgt.m,dmg,"背刺",{skillId:"backstab"});
    };
  }else if(tgt.type==="boss"){
    if(distToBoss()>(bal.bossReach||reach)){log(typeof T==="function"?T("combat.target_oor"):"目标超出射程！");return false;}
    targetMesh=boss;
    deal=()=>{
      let dmg=R(bal.dmg);
      if(S.p.stealth)dmg=Math.round(dmg*(bal.stealthMul||1.25)*(1+((S.p.talentFx&&S.p.talentFx.stealthDmg)||0)));
      dmgBoss(dmg,"背刺",{skillId:"backstab"});
    };
  }else if(tgt.type==="add"){
    targetMesh=tgt.a.mesh;
    deal=()=>{
      let dmg=R(bal.addDmg||bal.dmg);
      if(S.p.stealth)dmg=Math.round(dmg*(bal.stealthMul||1.25)*(1+((S.p.talentFx&&S.p.talentFx.stealthDmg)||0)));
      addDamage(tgt.a,dmg,{skillId:"backstab"});
    };
  }
  if(!targetMesh||!deal)return false;
  if(!isBehindTarget(targetMesh.position,targetMesh.rotation.y,player.position,bal.behindArc)){
    log("背刺必须位于目标背后！","lg-sys");return false;
  }
  setCurrentTarget(tgt);
  deal();
  breakStealth("attack");
  S.p.attackAnim=1;
  SFX.play("swing");
  log("背刺！","lg-me");
  return true;
}
function sprint(){
  const bal=getSkillBal("sprint");
  S.p.sprintT=bal.duration;
  spawnBurst(player.position.clone().setY(.5),0xa0c0ff,12,1.1);
  if(typeof SFX!=="undefined")SFX.play("stealth");
  log(`疾步！移动速度提高，持续 ${bal.duration} 秒。`,"lg-me");
  return true;
}
/** 盗贼终结技：消耗连击点造成爆发伤害 */
function eviscerate(){
  const pts=typeof getComboPoints==="function"?getComboPoints(S.res):0;
  if(pts<=0){log("需要连击点才能剔骨！","lg-sys");return false;}
  const bal=getSkillBal("eviscerate");
  const thr={skillId:"eviscerate",school:"physical"};
  const tgt=resolveSkillTarget(bal.reach||5);
  if(!tgt)return false;
  setCurrentTarget(tgt);
  const per=bal.perCombo!=null?bal.perCombo:.42;
  const base=R(bal.dmg);
  const dmg=Math.round(base*(1+per*(pts-1)));
  const addBase=R(bal.addDmg||bal.dmg);
  const addDmg=Math.round(addBase*(1+per*(pts-1)));
  if(tgt.type==="mob")mobDamage(tgt.m,dmg,"剔骨",thr);
  else if(tgt.type==="boss"){
    if(distToBoss()>(bal.bossReach||bal.reach||5)){log(typeof T==="function"?T("combat.target_oor"):"目标超出射程！");return false;}
    dmgBoss(dmg,"剔骨",thr);
  }else if(tgt.type==="add")addDamage(tgt.a,addDmg,thr);
  if(typeof spendComboPoints==="function")spendComboPoints(S.res);
  else if(typeof clearComboPoints==="function")clearComboPoints(S.res);
  breakStealth("attack");
  S.p.attackAnim=1;
  if(typeof SFX!=="undefined")SFX.play("swing");
  log(`剔骨（${pts} 连击点）！`,"lg-me");
  fct(player.position.clone().setY(2.6),`×${pts}`,"#d0e0ff",14);
  return true;
}

function playerHit(amount,source,atkLevel){
  if(S.p.ghost)return; /* 灵魂形态不受伤 */
  if(!S.p.alive||S.p.invuln>0||(typeof hasAura==="function"&&(hasAura(S.p,"ice_block")||hasAura(S.p,"evasion"))))return;
  /* C10：受击打断进食/饮水/包扎；Track E：打断读条 */
  if((S.p.eating||S.p.drinking||S.p.bandaging)&&typeof cancelConsume==="function")cancelConsume();
  if(S.p.casting&&BAL.cast&&BAL.cast.hitInterrupt!==false&&typeof cancelPlayerCast==="function")
    cancelPlayerCast("hit");
  amount=Math.round(amount*R(BAL.variance.player));
  /* C4：玩家护甲减伤（攻击者等级默认同级，可由第三参覆盖） */
  if(typeof armorReduction==="function"){
    if(!S.p.derived&&typeof refreshPlayerDerived==="function")refreshPlayerDerived();
    const atkLv=(typeof atkLevel==="number"&&isFinite(atkLevel))?Math.max(1,atkLevel|0):Math.max(1,S.p.level|0);
    const red=armorReduction((S.p.derived&&S.p.derived.armor)||0,atkLv);
    amount=Math.max(1,Math.round(amount*(1-red)));
  }
  /* 薄包装 → hitEntity(incoming)：扣血 / 盾 / 飘字 / 怒气 / onDeath 唯一入口 */
  hitEntity({
    get hp(){return S.p.hp;},
    set hp(v){S.p.hp=v;},
    dead(){return !S.p.alive||!!S.p.ghost;},
    fctPos(){return player.position.clone().setY(3);},
    fctSize(){return 18;},
    mesh:player,
    onHit(amt,src){
      if(BAL.stealth&&BAL.stealth.breakOnHit!==false)breakStealth("hit");
      S.p.animHitT=1;
      log(`${src} 对你造成 ${amt} 点伤害！`,"lg-dmg");
    },
    onDeath(){S.p.hp=0;playerDie();}
  },amount,source,{incoming:true,applyAbsorb:true,hurtFlash:true,rageTake:true,fctColor:"#ff6a5a"});
}

/* ============================================================
   经验与等级（STEP 3 / plan-V3 C6）
   唯一入口 gainXP；野怪走 gainMobXP（等级差 + 灰色线 + 休息双倍）
   ============================================================ */
function gainMobXP(mob){
  if(!mob)return;
  const pl=S.p.level|0;
  const ml=mob.level!=null?mob.level:((mob.stats&&mob.stats.level)|0)||1;
  let amount;
  if(typeof scaledMobXp==="function"){
    amount=scaledMobXp(pl,ml,{
      elite:!!(mob.elite&&!mob.worldBoss),
      worldBoss:!!mob.worldBoss
    });
  }else{
    amount=(mob.stats&&mob.stats.xp)|0;
  }
  if(amount<=0){
    if(typeof isGreyMob==="function"&&isGreyMob(pl,ml))
      log("目标等级过低，无法获得经验。","lg-sys");
    return;
  }
  gainXP(amount,{fromMob:true});
}
function gainXP(amount,opts){
  opts=opts||{};
  const P=S.p,L=BAL.levels;
  if(P.level>=L.max)return;
  amount=Math.max(0,Math.round(amount));
  if(!amount)return;
  if(typeof partyAliveCount==="function"&&partyAliveCount()>0&&BAL.party&&BAL.party.xpMul)
    amount=Math.round(amount*BAL.party.xpMul);

  /* C6：休息经验双倍消耗池 */
  let bonus=0;
  if(typeof applyRestXp==="function"){
    const r=applyRestXp(amount,P.restXp|0,P.xpMax);
    amount=r.total; bonus=r.bonus; P.restXp=r.restLeft;
  }

  P.xp+=amount;
  const col=bonus>0?"#7ec8ff":"#c9a0ff";
  const tx=bonus>0?`+${amount} 经验（休+${bonus}）`:`+${amount} 经验`;
  fct(player.position.clone().setY(3.6),tx,col,14,{kind:"xp"});

  while(P.level<L.max&&P.xp>=P.xpMax){
    P.xp-=P.xpMax; P.level++;
    P.xpMax=(typeof xpToNext==="function"?xpToNext(P.level):null)||L.xpMax[P.level-1]||P.xpMax;
    const hpGain=Math.round(CLS.hp*L.perLevel.hpMax);
    P.hpMax+=hpGain;
    /* C6：升级满血满资源 */
    P.hp=P.hpMax;
    P.rage=P.rageMax;
    P.dmgMul+=L.perLevel.dmgMul;
    if(P.baseStats){
      P.baseStats.str=(P.baseStats.str|0)+2;
      P.baseStats.sta=(P.baseStats.sta|0)+2;
      P.baseStats.agi=(P.baseStats.agi|0)+1;
      if(typeof rebuildPlayerStatsFromEquip==="function")rebuildPlayerStatsFromEquip();
      else if(typeof refreshPlayerDerived==="function")refreshPlayerDerived();
    }else if(P.stats){
      P.stats.str=(P.stats.str|0)+2;
      P.stats.sta=(P.stats.sta|0)+2;
      P.stats.agi=(P.stats.agi|0)+1;
      if(typeof refreshPlayerDerived==="function")refreshPlayerDerived();
    }
    if(P.level>=L.max)P.xp=0;
    /* 休息池上限随新 xpMax 收缩 */
    if(typeof restPoolCap==="function")
      P.restXp=Math.min(P.restXp|0,restPoolCap(P.xpMax));

    SFX.play("levelup");
    announce(`升 级 ！ Lv.${P.level}`);
    log(`你升到了 ${P.level} 级！生命与${CLS.resName}已回满。`,"lg-heal");
    const lu=L.levelUp||{};
    const luc=lu.color!=null?lu.color:0xffd76a;
    const pos=player.position.clone().setY(1.5);
    VFX.spawn("loot_spark",{pos:pos.clone(),color:luc,spread:lu.sparkSpread!=null?lu.sparkSpread:2.2});
    if(typeof spawnBurst==="function")
      spawnBurst(pos,luc,lu.burstCount!=null?lu.burstCount:18,lu.burstSpread!=null?lu.burstSpread:2.4);
    /* 全屏微光 */
    const flash=$("#hurtFlash")||$("#vignette");
    if(flash){
      const prev=flash.style.background;
      flash.style.transition="none";
      flash.style.background="radial-gradient(ellipse at center,rgba(255,220,120,.55),transparent 70%)";
      flash.style.opacity=lu.flashOp!=null?String(lu.flashOp):".55";
      setTimeout(()=>{
        flash.style.transition="opacity .35s";
        flash.style.opacity="0";
        setTimeout(()=>{flash.style.background=prev||"";},400);
      },lu.flashMs!=null?lu.flashMs:420);
    }
    if(typeof grantTalentPointOnLevel==="function")grantTalentPointOnLevel(P.level);
    if(typeof onDeedLevelUp==="function")onDeedLevelUp(P.level);
    if(typeof notifyNewSpells==="function")notifyNewSpells(P.level);
    if(typeof renderSpellPanel==="function")renderSpellPanel();
    if(typeof updateSkillBarStats==="function")updateSkillBarStats();
  }
  updateLevelUI();
  if(typeof saveGame==="function")saveGame(true);
}

/** 营火 / 旅店附近或离线攒休息经验 */
function tickRestXp(dt){
  const P=S.p;
  if(!P||P.level>=BAL.levels.max)return;
  const cfg=(BAL.sim&&BAL.sim.xp&&BAL.sim.xp.rest)||{};
  const cap=typeof restPoolCap==="function"?restPoolCap(P.xpMax):Math.round(P.xpMax*1.5);
  if((P.restXp|0)>=cap)return;
  const R=cfg.nearR!=null?cfg.nearR:14;
  let rate=0;
  /* 旅店 NPC */
  if(typeof vendor!=="undefined"&&vendor&&player){
    const d=Math.hypot(player.position.x-vendor.position.x,player.position.z-vendor.position.z);
    if(d<R)rate=Math.max(rate,cfg.innPerSec!=null?cfg.innPerSec:5);
  }
  /* 营火：worldFlames 条目可能是 {fl,li} 或火焰 Mesh */
  if(typeof worldFlames!=="undefined"&&worldFlames&&worldFlames.length&&player){
    for(let i=0;i<worldFlames.length;i++){
      const f=worldFlames[i];
      const pos=f&&f.fl&&f.fl.position?f.fl.position:(f&&f.position?f.position:null);
      if(!pos)continue;
      const d=Math.hypot(player.position.x-pos.x,player.position.z-pos.z);
      if(d<R){rate=Math.max(rate,cfg.campfirePerSec!=null?cfg.campfirePerSec:3);break;}
    }
  }
  if(rate>0){
    P.restXp=Math.min(cap,(P.restXp|0)+rate*dt);
  }
}
function applyOfflineRestXp(){
  const P=S.p;
  if(!P||!P.lastSeenAt)return;
  const hours=(Date.now()-P.lastSeenAt)/3600000;
  if(hours<.05)return;
  const add=typeof restFromOfflineHours==="function"
    ?restFromOfflineHours(hours,P.xpMax)
    :Math.round(P.xpMax*.08*Math.min(48,hours));
  if(add<=0)return;
  const cap=typeof restPoolCap==="function"?restPoolCap(P.xpMax):Math.round(P.xpMax*1.5);
  const before=P.restXp|0;
  P.restXp=Math.min(cap,before+add);
  if(P.restXp>before)
    log(`休息充足：休息经验 +${P.restXp-before}（离线约 ${hours.toFixed(1)} 小时）`,"lg-sys");
}

/* ---------------- 金币（STEP 13 / plan-v4 STEP 18）：铜为最小单位 ---------------- */
function formatCopperParts(copper){
  const E=BAL.economy;
  let c=Math.max(0,copper|0);
  const g=Math.floor(c/E.copperPerGold); c%=E.copperPerGold;
  const s=Math.floor(c/E.copperPerSilver); c%=E.copperPerSilver;
  return {g,s,c};
}
function formatCopperText(copper){
  const {g,s,c}=formatCopperParts(copper);
  const parts=[];
  if(g)parts.push(`${g}金`);
  if(s)parts.push(`${s}银`);
  if(c||!parts.length)parts.push(`${c}铜`);
  return parts.join(" ");
}
/** plan-v4 命名别名 */
function formatMoney(copper){return formatCopperText(copper);}
function formatCopperHtml(copper){
  const {g,s,c}=formatCopperParts(copper);
  let h="";
  if(g)h+=`<span class="g">${g}金</span>`;
  if(s||g)h+=`<span class="s">${s}银</span>`;
  h+=`<span class="c">${c}铜</span>`;
  return h;
}
function updateGoldUI(){
  const el=$("#pGold"); if(el)el.innerHTML=formatCopperHtml(S.p.gold|0);
  const bagEl=$("#bagGold");
  if(bagEl&&typeof formatCopperText==="function")
    bagEl.innerHTML=`金钱 <b>${formatCopperText(S.p.gold|0)}</b>`;
}
function gainCopper(amount,opts){
  amount=Math.max(0,Math.round(amount));
  if(!amount)return;
  S.p.gold=(S.p.gold|0)+amount;
  const silent=opts&&opts.silent;
  if(!silent){
    fct(player.position.clone().setY(2.8),`+${formatCopperText(amount)}`,"#ffd76a",13);
    log(`获得 ${formatCopperText(amount)}。`,"lg-sys");
  }
  updateGoldUI();
  if(!(opts&&opts.noSave)&&typeof saveGame==="function")saveGame(true);
}
function spendCopper(amount){
  amount=Math.max(0,Math.round(amount));
  if((S.p.gold|0)<amount)return false;
  S.p.gold-=amount;
  updateGoldUI();
  return true;
}
function rollCopperRange(range){
  if(range==null)return 0;
  if(typeof range==="number")return range|0;
  if(Array.isArray(range))return Math.round(rand(range[0],range[1]));
  return 0;
}
function updateLevelUI(){
  if(typeof updatePlayerNameplate==="function")updatePlayerNameplate();
  else $("#pName").textContent=`${CLS.title} · Lv.${S.p.level}`;
  updateGoldUI();
}
