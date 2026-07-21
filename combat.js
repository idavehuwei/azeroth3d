/* ============================================================
   熔火之心 · combat.js
   战斗系统：游戏状态 / 职业配置 / UI 与输入 / 玩家技能
            统一受击入口 hitEntity / 玩家胜负
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ clamp rand R BAL scene camera ARENA_R）
          icons.js（Icons）
          models.js（buildPlayer buildMage buildArcher buildPriest buildFlameSpawn）
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
          useSkill hitEntity dmgBoss pickTarget firePlayerShot playerHit
          isTargetAlive setCurrentTarget getFocusTarget
          gainXP updateLevelUI gainCopper spendCopper formatCopperText updateGoldUI
          clearShieldVisual applyHeal
          （S.quests · STEP 22 任务运行时）
   ============================================================ */
"use strict";
/* ============================================================
   游戏状态
   ============================================================ */
const S={
  started:false,over:false,t:0,mode:"world",zoneId:"mulgore",
  portalHinted:false,portalHints:{},portalLockT:0,
  currentTarget:null,   /* STEP 20：玩家集火目标，供 AI 队友共用 */
  quests:{},            /* STEP 22：任务运行时 {id:{status,kills,flags}} */
  mats:{},              /* STEP 23：采集材料堆叠 {matId:count} */
  deeds:null,           /* STEP 25：功绩之书（ensureDeeds 初始化） */
  craftOpen:false,
  p:{hp:5200,hpMax:5200,rage:20,rageMax:100,speed:10.5,alive:true,dmgMul:1,
     atkTimer:0,attackAnim:0,walkPhase:0,face:0,invuln:0,
     absorb:0,absorbT:0,shieldMesh:null,   /* STEP 19 真言术：盾 */
     level:1,xp:0,xpMax:BAL.levels.xpMax[0],gold:0,   /* 经验与等级（STEP 3）· 金币铜（STEP 13） */
     eating:null,bandaging:null,gathering:null,weaknessT:0,
     whetstoneT:0,whetstoneAdd:0},
  b:{id:"ragnaros",hp:BAL.boss.hp,hpMax:BAL.boss.hp,alive:true,rising:true,riseT:0,
     phase:1,swingT:0,casting:null,castT:0,castDur:0,
     next:{},submerged:false,submergeT:0,canLeave:false,nextAddSpawn:0,addWave:null},
  adds:[],projectiles:[],pShots:[],telegraphs:[],bursts:[],
  cds:[0,0,0,0],gcd:0,
  inv:[],      /* 背包（STEP 2 起：拾取的物品 id 列表） */
  eq:{weapon:null,armor:null},   /* 装备位（STEP 4）：物品 id */
  god:false,   /* 上帝模式：启程时由首页勾选决定（hitEntity 消费） */
  cam:{dist:16,pitch:.38,yawOff:0,lmb:false,rmb:false,lx:0,ly:0}, /* 魔兽式视角状态 */
  vendorOpen:false,
  deathUi:false, /* STEP 15：死亡面板打开中 */
};
/* ============================================================
   职业系统：战士 / 法师 / 弓箭手 / 牧师
   ============================================================ */
let SKILLS=[];
const CLASSES={
  warrior:{title:"⚔️ 你 · 人类战士",hp:5200,resMax:100,resStart:20,resName:"怒气",
    regen:0,hitGain:8,speed:10.5,ranged:false,range:10,sfx:"swing",
    autoMin:150,autoMax:210,autoSpd:1.6,shotColor:0xffffff,build:buildPlayer,
    barCss:"linear-gradient(180deg,#ffd76a,#c98a1f 60%,#7a4d0c)",
    tip:"提示：近身自动攻击积攒怒气；【冲锋】可迅速贴近目标并额外获得怒气。",
    skills:[
      {name:"英勇打击",icon:"sword",cd:5, rage:20,fn:heroicStrike,bal:"heroicStrike",
       desc:"奋力一击，对面前敌人造成物理伤害。"},
      {name:"旋风斩",  icon:"whirlwind",cd:9, rage:30,fn:whirlwind,bal:"whirlwind",
       desc:"旋转兵器，对周围敌人造成范围物理伤害。"},
      {name:"冲锋",    icon:"charge",cd:12,rage:0, fn:charge,bal:"charge",
       desc:"向目标冲锋并贴近，额外积攒怒气。"},
      {name:"治疗药水",icon:"potion",cd:22,rage:0, fn:potion,bal:"potion",
       desc:"喝下药水，立即回复生命。"}]},
  mage:{title:"🔮 你 · 人类法师",hp:3800,resMax:100,resStart:100,resName:"法力",
    regen:7,hitGain:0,speed:10,ranged:true,range:30,sfx:"fireball",
    autoMin:175,autoMax:235,autoSpd:1.8,shotColor:0xff8a30,build:buildMage,
    barCss:"linear-gradient(180deg,#7ab8ff,#2a5ec9 60%,#123a7a)",
    tip:"提示：法力随时间恢复；远程自动施放火球，【闪现】拉开距离，危急时开【寒冰屏障】免疫伤害。",
    skills:[
      {name:"炎爆术",  icon:"fireball",cd:7, rage:30,fn:pyroblast,bal:"pyroblast",
       desc:"蓄力投出巨大火球，造成高额火焰伤害。"},
      {name:"冰霜新星",icon:"frost",cd:11,rage:25,fn:frostNova,bal:"frostNova",
       desc:"冻结周围敌人并造成冰霜伤害，短暂定身。"},
      {name:"闪现",    icon:"blink",cd:12,rage:15,fn:blink,bal:"blink",
       desc:"瞬间向前传送一段距离。"},
      {name:"寒冰屏障",icon:"ice_block",cd:25,rage:0, fn:iceBlock,bal:"iceBlock",
       desc:"把自己封进寒冰，短时间内免疫伤害。"}]},
  archer:{title:"🏹 你 · 精灵弓箭手",hp:4300,resMax:100,resStart:100,resName:"能量",
    regen:11,hitGain:0,speed:11.5,ranged:true,range:32,sfx:"arrow",
    autoMin:140,autoMax:190,autoSpd:1.25,shotColor:0xd0ffa0,build:buildArcher,
    barCss:"linear-gradient(180deg,#d8ff7a,#7fb32a 60%,#3d6a0c)",
    tip:"提示：能量随时间恢复；边走边射保持距离，【翻滚】可位移并短暂闪避一切伤害。",
    skills:[
      {name:"瞄准射击",icon:"aimed",cd:6, rage:30,fn:aimedShot,bal:"aimedShot",
       desc:"精确瞄准，射出高伤害箭矢。"},
      {name:"多重射击",icon:"multi_shot",cd:10,rage:35,fn:multiShot,bal:"multiShot",
       desc:"同时射出多支箭，打击多个目标。"},
      {name:"翻滚",    icon:"roll",cd:9, rage:20,fn:roll,bal:"roll",
       desc:"向前翻滚位移，短暂闪避一切伤害。"},
      {name:"治疗药水",icon:"potion",cd:22,rage:0, fn:potion,bal:"potion",
       desc:"喝下药水，立即回复生命。"}]},
  priest:{title:"✨ 你 · 人类牧师",hp:4000,resMax:100,resStart:100,resName:"法力",
    regen:8,hitGain:0,speed:10,ranged:true,range:28,sfx:"holy",
    autoMin:155,autoMax:205,autoSpd:1.65,shotColor:0xfff0a0,build:buildPriest,
    barCss:"linear-gradient(180deg,#fff8d0,#d4af37 60%,#8a7020)",
    tip:"提示：法力随时间恢复；远程自动施放神圣惩击；【治疗术】续航，【真言术：盾】先吸收伤害。",
    skills:[
      {name:"治疗术",    icon:"heal", cd:8,  rage:35,fn:heal,           bal:"heal",
       desc:"施放圣光，恢复大量生命。"},
      {name:"快速治疗",  icon:"flash_heal", cd:4,  rage:20,fn:flashHeal,     bal:"flashHeal",
       desc:"迅速施法，立即恢复中等生命。"},
      {name:"神圣惩击",  icon:"holy", cd:6,  rage:25,fn:smite,         bal:"smite",
       desc:"对目标造成神圣伤害。"},
      {name:"真言术：盾",icon:"holy_shield", cd:12, rage:30,fn:powerWordShield,bal:"powerWordShield",
       desc:"为自己施加吸收护盾，持续一段时间。"}]},
};
let CLS=CLASSES.warrior;

/** V1-A2：技能栏 / 法术书用 Icons 画布，不再写 emoji（须在 setClass 调用前初始化） */
const SKILL_ICON_BORDER="#e8b34a";
function applySkillBarIcons(){
  document.querySelectorAll(".skill").forEach((el,i)=>{
    const sk=SKILLS[i]; if(!sk)return;
    const nm=el.querySelector(".nm"); if(nm)nm.textContent=sk.name;
    let ic=el.querySelector(".ic");
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
  CLS=CLASSES[key];
  const pos=player.position.clone(),rot=player.rotation.y;
  clearShieldVisual();
  scene.remove(player);
  player=CLS.build(); player.position.copy(pos); player.rotation.y=rot; scene.add(player);
  S.p.hpMax=CLS.hp; S.p.hp=CLS.hp;
  S.p.rageMax=CLS.resMax; S.p.rage=CLS.resStart; S.p.speed=CLS.speed;
  S.p.absorb=0; S.p.absorbT=0;
  SKILLS=CLS.skills;
  if(typeof initTalentsForClass==="function")initTalentsForClass(key);
  else updateLevelUI();
  updateLevelUI();
  $("#pRage").style.background=CLS.barCss;
  applySkillBarIcons();
  if(typeof updateSkillBarStats==="function")updateSkillBarStats();
  if(typeof renderCharPanel==="function")renderCharPanel();
  if(typeof renderSpellPanel==="function")renderSpellPanel();
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
function fct(worldPos,text,color,size=17){
  v3.copy(worldPos).project(camera);
  if(v3.z>1)return;
  const el=document.createElement("div"); el.className="fct";
  el.style.left=((v3.x*.5+.5)*innerWidth+rand(-18,18))+"px";
  el.style.top =((-v3.y*.5+.5)*innerHeight)+"px";
  el.style.color=color; el.style.fontSize=size+"px"; el.textContent=text;
  document.body.appendChild(el); setTimeout(()=>el.remove(),1150);
}
function hurtFlash(){const f=$("#hurtFlash");f.style.transition="none";f.style.opacity=.9;
  requestAnimationFrame(()=>{f.style.transition="opacity .5s";f.style.opacity=0;});}

/* ---------------- 输入 ---------------- */
const keys={};
addEventListener("keydown",e=>{
  keys[e.key.toLowerCase()]=true;
  if(["1","2","3","4"].includes(e.key))useSkill(+e.key-1);
  if(e.key.toLowerCase()==="f")tryInteract();
  if(e.key.toLowerCase()==="b")toggleBag();
  if(e.key.toLowerCase()==="n")toggleTalentPanel();
  if(e.key.toLowerCase()==="c")toggleCharPanel();
  if(e.key.toLowerCase()==="p")toggleSpellPanel();
  if(e.key.toLowerCase()==="l")toggleQuestLog();
  if(e.key.toLowerCase()==="m")toggleWorldMap();
  if(e.shiftKey&&e.key.toLowerCase()==="z"&&typeof toggleDeedsPanel==="function"){e.preventDefault();toggleDeedsPanel();}
  if(e.shiftKey&&e.key.toLowerCase()==="i"&&typeof toggleDungeonFinderPanel==="function"){e.preventDefault();toggleDungeonFinderPanel();}
  if(e.key==="Escape"&&typeof worldMapOpen==="function"&&worldMapOpen())closeWorldMap();
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
document.getElementById("interactBtn").addEventListener("pointerdown",()=>tryInteract());
document.querySelectorAll(".skill").forEach(el=>{
  el.addEventListener("pointerdown",()=>useSkill(+el.dataset.sk));
});

/* ---- 魔兽式相机：滚轮远近 · 左键环绕 · 右键转向/俯仰 · 双键前进 ---- */
function camOnCanvas(e){
  const c=typeof renderer!=="undefined"&&renderer.domElement;
  return !!(c&&(e.target===c));
}
function camApplyDrag(dx,dy){
  if(!S.started||!S.cam)return;
  const C=BAL.camera||{}, sens=C.mouseSens||.0042;
  if(S.cam.rmb){
    /* 右键：鼠标转向（角色朝向=镜头），俯仰 */
    S.p.face-=dx*sens;
    S.cam.yawOff=0;
    S.cam.pitch=clamp(S.cam.pitch+dy*sens,C.pitchMin||.12,C.pitchMax||.78);
  }else if(S.cam.lmb){
    /* 左键：仅环绕镜头，不改角色朝向 */
    S.cam.yawOff-=dx*sens;
    S.cam.pitch=clamp(S.cam.pitch+dy*sens,C.pitchMin||.12,C.pitchMax||.78);
  }
}
addEventListener("wheel",e=>{
  if(!S.started||!S.cam)return;
  if(!camOnCanvas(e)&&e.target&&e.target.closest&&e.target.closest(".hudPanel,#bag,#dlg,#overlay"))return;
  const C=BAL.camera;
  const step=(C.zoomStep||1.15)*(e.deltaY>0?1:-1);
  S.cam.dist=clamp(S.cam.dist+step,C.distMin||6,C.distMax||32);
},{passive:true});
addEventListener("pointerdown",e=>{
  if(!S.started||!S.cam)return;
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
  if(e.button===0)S.cam.lmb=false;
  if(e.button===2)S.cam.rmb=false;
});
addEventListener("pointercancel",()=>{if(S.cam){S.cam.lmb=false;S.cam.rmb=false;}});
addEventListener("pointermove",e=>{
  if(!S.cam||!S.started)return;
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

/* ============================================================
   玩家技能
   ============================================================ */
function useSkill(i){
  if(!S.started||S.over||!S.p.alive)return;
  if(S.cds[i]>0||S.gcd>0)return;
  const sk=SKILLS[i];
  if(S.p.rage<sk.rage){log(`${CLS.resName}不足！（${sk.name} 需要 ${sk.rage} ${CLS.resName}）`,"lg-sys");return;}
  if(sk.fn()){S.p.rage-=sk.rage;S.cds[i]=typeof getSkillCd==="function"?getSkillCd(i):sk.cd;S.gcd=.8;}
}
/* bossTargetable 在 raid.js 定义 */

/* ============================================================
   统一受击入口（STEP 1，参考 WoC 单一 Sim 战斗结算）
   流程：乘系数 → 扣血 → 飘字 → 日志(onHit) → 死亡回调(onDeath)
   实体接口：{hp, variance, dead(), fctPos(), fctSize?, onHit?, onDeath}
   野猪 / 烈焰之子 / Boss 全部走这一个函数；
   掉落（STEP 2）与经验（STEP 3）只需挂接各实体的 onDeath。
   ============================================================ */
function hitEntity(ent,amount,label,opts){
  if(ent.dead&&ent.dead())return;
  const v=ent.variance;
  /* 上帝模式：固定伤害，跳过系数与浮动 */
  amount=S.god?BAL.god.dmg:Math.round(amount*S.p.dmgMul*(v?rand(v[0],v[1]):1));
  ent.hp=Math.max(0,ent.hp-amount);
  fct(ent.fctPos(),`-${amount}`,"#ffdf8a",ent.fctSize?ent.fctSize(label):14);
  /* V1-A5：受击分层（肉体/甲壳） */
  if(typeof SFX!=="undefined"&&SFX.playHit){
    let kind=ent.type||ent.hitKind||"hit";
    if(typeof BOSS_ENT!=="undefined"&&ent===BOSS_ENT&&S.b&&S.b.id)kind=S.b.id;
    SFX.playHit(kind);
  }
  if(ent.onHit)ent.onHit(amount,label);
  /* STEP 27：默认记玩家仇恨；同伴须传 opts.sourceKey */
  if(typeof addThreat==="function"&&!(opts&&opts.noThreat)){
    addThreat(ent,(opts&&opts.sourceKey)||"player",amount,opts&&opts.skillId);
  }
  if(ent.hp<=0)ent.onDeath();
}
/* Boss 受击：薄包装（保留旧调用方签名） → BOSS_ENT 在 raid.js 定义 */
function dmgBoss(amount,label,opts){hitEntity(BOSS_ENT,amount,label,opts);}
function heroicStrike(){
  let hit=false;
  const thr={skillId:"heroicStrike"};
  if(S.mode==="world"){
    for(const m of MOBS){
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<BAL.skills.heroicStrike.reach){
        mobDamage(m,R(BAL.skills.heroicStrike.dmg),"英勇打击",thr);hit=true;break;
      }
    }
  }else{
    if(distToBoss()<=BAL.skills.heroicStrike.bossReach){dmgBoss(R(BAL.skills.heroicStrike.dmg),"英勇打击",thr);hit=true;}
    S.adds.forEach(a=>{
      if(player.position.distanceTo(a.mesh.position)<BAL.skills.heroicStrike.addReach){addDamage(a,R(BAL.skills.heroicStrike.addDmg),thr);hit=true;}
    });
  }
  if(!hit){log("没有目标在近战范围内。");return false;}
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
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<BAL.skills.whirlwind.radius){
        mobDamage(m,R(BAL.skills.whirlwind.dmg),"旋风斩",thr);any=true;
      }
    });
  }else{
    if(distToBoss()<=BAL.skills.whirlwind.bossRadius){dmgBoss(R(BAL.skills.whirlwind.bossDmg),"旋风斩",thr);any=true;}
    S.adds.forEach(a=>{
      if(player.position.distanceTo(a.mesh.position)<BAL.skills.whirlwind.radius){addDamage(a,R(BAL.skills.whirlwind.dmg),thr);any=true;}
    });
  }
  if(!any)log("旋风斩没有命中任何目标。");
  return true;
}
function charge(){
  let target=null,best=1e9;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(!mobTargetable(m))return;
      const d=player.position.distanceTo(m.mesh.position);
      if(d<best){best=d;target=m.mesh.position.clone().setY(0);}
    });
  }else{
    if(bossTargetable()){target=new THREE.Vector3(boss.position.x,0,boss.position.z);best=distToBoss();}
    S.adds.forEach(a=>{const d=player.position.distanceTo(a.mesh.position);
      if(d<best){best=d;target=a.mesh.position.clone().setY(0);}});
  }
  if(!target||best<BAL.skills.charge.minDist){log("没有可冲锋的目标。");return false;}
  const dir=target.clone().sub(player.position).normalize();
  const dest=target.clone().sub(dir.clone().multiplyScalar(BAL.skills.charge.stopDist));
  player.position.copy(clampArena(dest));
  S.p.rage=Math.min(S.p.rageMax,S.p.rage+BAL.skills.charge.rageGain);
  spawnBurst(player.position.clone().setY(.6),0xffe9a0,18,1.2);
  /* STEP 27：冲锋产生瞬时仇恨 */
  if(typeof addThreat==="function"){
    if(S.mode==="world"){
      let nearest=null,nd=1e9;
      for(const m of MOBS){
        if(!mobTargetable(m))continue;
        const d=player.position.distanceTo(m.mesh.position);
        if(d<nd){nd=d;nearest=m;}
      }
      if(nearest)addThreat(nearest,"player",0,"charge");
    }else if(bossTargetable())addThreat(BOSS_ENT,"player",0,"charge");
  }
  log(`你向敌人发起冲锋！获得 ${BAL.skills.charge.rageGain} 点怒气。`,"lg-me");
  return true;
}
function potion(){
  const heal=Math.round(R(BAL.skills.potion.heal));
  S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
  fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",18);
  VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
  log(`你饮下强效治疗药水，恢复 ${heal} 点生命值。`,"lg-heal");
  return true;
}

/* ---------------- 远程职业通用：索敌 & 投射物 ---------------- */
function pickTarget(range,fromPos){
  const origin=fromPos||player.position;
  let tgt=null,best=range;
  if(S.mode==="world"){
    for(const m of MOBS){
      if(!mobTargetable(m))continue;
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
    const d=origin.distanceTo(a.mesh.position);
    if(d<best){best=d;tgt={type:"add",a};}
  }
  return tgt;
}
function isTargetAlive(tgt){
  if(!tgt)return false;
  if(tgt.type==="mob")return mobTargetable(tgt.m);
  if(tgt.type==="boss")return typeof bossTargetable==="function"&&bossTargetable();
  if(tgt.type==="add")return !!(tgt.a&&S.adds.includes(tgt.a)&&tgt.a.hp>0);
  return false;
}
function setCurrentTarget(tgt){
  if(tgt&&isTargetAlive(tgt))S.currentTarget=tgt;
}
function getFocusTarget(range){
  const r=range!=null?range:(BAL.companion?BAL.companion.combatEngageR:24);
  if(isTargetAlive(S.currentTarget))return S.currentTarget;
  S.currentTarget=null;
  return pickTarget(r);
}
function firePlayerShot(tgt,dmg,label,scale=1){
  setCurrentTarget(tgt);
  SFX.play(CLS.sfx||"fireball");
  const m=new THREE.Mesh(new THREE.SphereGeometry(.3*scale,8,8),
    new THREE.MeshBasicMaterial({color:CLS.shotColor}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.55*scale,8,8),
    new THREE.MeshBasicMaterial({color:CLS.shotColor,transparent:true,opacity:.35}));
  m.add(glow);
  m.position.copy(player.position); m.position.y=1.9;
  scene.add(m);
  S.pShots.push({mesh:m,tgt,dmg,label,speed:28,shotColor:CLS.shotColor});
}

/* ---------------- 法师技能 ---------------- */
function pyroblast(){
  const t=pickTarget(CLS.range);
  if(!t){log("目标超出施法距离！");return false;}
  S.p.attackAnim=1;
  firePlayerShot(t,R(BAL.skills.pyroblast.dmg),"炎爆术",1.7);
  log("你吟唱出巨大的炎爆术！","lg-me");
  return true;
}
function frostNova(){
  spawnBurst(player.position.clone().setY(.8),0x8ad8ff,36,2.4);
  let any=false;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<BAL.skills.frostNova.radius){
        mobDamage(m,R(BAL.skills.frostNova.dmg),"冰霜新星"); m.rootT=BAL.skills.frostNova.rootT; any=true;
      }
    });
  }else{
    if(bossTargetable()&&distToBoss()<=BAL.skills.frostNova.bossRadius){dmgBoss(R(BAL.skills.frostNova.bossDmg),"冰霜新星");any=true;}
    S.adds.forEach(a=>{
      if(player.position.distanceTo(a.mesh.position)<BAL.skills.frostNova.radius){
        addDamage(a,R(BAL.skills.frostNova.dmg)); a.rootT=BAL.skills.frostNova.rootT; any=true;
      }
    });
  }
  log(any?"冰霜新星冻结了周围的敌人！（定身 3 秒）":"寒气四溢，但没有敌人在范围内。","lg-me");
  return true;
}
function blink(){
  const dir=new THREE.Vector3(Math.sin(S.p.face),0,Math.cos(S.p.face));
  player.position.add(dir.multiplyScalar(BAL.skills.blink.dist));
  clampArena(player.position);
  spawnBurst(player.position.clone().setY(1.4),0xb08aff,22,1.6);
  log("你闪现到了新的位置！","lg-me");
  return true;
}
function iceBlock(){
  S.p.invuln=BAL.skills.iceBlock.invuln;
  const p=player;
  const ice=new THREE.Mesh(new THREE.IcosahedronGeometry(1.9,0),
    new THREE.MeshStandardMaterial({color:0x9ad8ff,transparent:true,opacity:.5,roughness:.15,metalness:.2}));
  ice.position.y=1.8; p.add(ice);
  setTimeout(()=>p.remove(ice),3000);
  log("寒冰屏障！3 秒内免疫所有伤害。","lg-me");
  return true;
}

/* ---------------- 弓箭手技能 ---------------- */
function aimedShot(){
  const t=pickTarget(CLS.range);
  if(!t){log("目标超出射程！");return false;}
  S.p.attackAnim=1;
  firePlayerShot(t,R(BAL.skills.aimedShot.dmg),"瞄准射击",1.4);
  log("你屏息凝神，射出致命一箭！","lg-me");
  return true;
}
function multiShot(){
  let n=0;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<=CLS.range){
        firePlayerShot({type:"mob",m},R(BAL.skills.multiShot.dmg),"多重射击");n++;
      }
    });
  }else{
    if(bossTargetable()&&distToBoss()<=CLS.range){firePlayerShot({type:"boss"},R(BAL.skills.multiShot.dmg),"多重射击");n++;}
    S.adds.forEach(a=>{
      if(player.position.distanceTo(a.mesh.position)<=CLS.range){
        firePlayerShot({type:"add",a},R(BAL.skills.multiShot.dmg),"多重射击");n++;
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
  player.position.add(dir.multiplyScalar(BAL.skills.roll.dist));
  clampArena(player.position);
  S.p.invuln=Math.max(S.p.invuln,BAL.skills.roll.invuln);
  spawnBurst(player.position.clone().setY(.6),0xd0ffa0,14,1);
  log("你灵巧地翻滚，短暂闪避一切伤害！","lg-me");
  return true;
}

/* ---------------- 牧师技能（STEP 19） ---------------- */
function clearShieldVisual(){
  const m=S.p.shieldMesh;
  if(!m)return;
  if(m.parent)m.parent.remove(m);
  if(m.geometry)m.geometry.dispose();
  if(m.material)m.material.dispose();
  S.p.shieldMesh=null;
}
function applyHeal(amount,label){
  if(S.p.hp>=S.p.hpMax){log("生命已满。");return false;}
  const mul=1+((S.p.talentFx&&S.p.talentFx.healMul)||0);
  const heal=Math.round(amount*mul);
  S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
  fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",18);
  VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
  if(typeof SFX!=="undefined")SFX.play("heal");
  log(`你施放【${label}】，恢复 ${heal} 点生命值。`,"lg-heal");
  return true;
}
function heal(){
  return applyHeal(R(BAL.skills.heal.heal),"治疗术");
}
function flashHeal(){
  return applyHeal(R(BAL.skills.flashHeal.heal),"快速治疗");
}
function smite(){
  const t=pickTarget(CLS.range);
  if(!t){log("目标超出施法距离！");return false;}
  S.p.attackAnim=1;
  firePlayerShot(t,R(BAL.skills.smite.dmg),"神圣惩击",1.5);
  log("你唤来神圣惩击！","lg-me");
  return true;
}
function powerWordShield(){
  const bal=BAL.skills.powerWordShield;
  const mul=1+((S.p.talentFx&&S.p.talentFx.shieldMul)||0);
  const absorb=Math.round(R(bal.absorb)*mul);
  clearShieldVisual();
  S.p.absorb=absorb;
  S.p.absorbT=bal.duration;
  const ice=new THREE.Mesh(new THREE.IcosahedronGeometry(1.85,0),
    new THREE.MeshStandardMaterial({color:0xffe080,transparent:true,opacity:.42,roughness:.2,metalness:.15,
      emissive:0xffd060,emissiveIntensity:.25}));
  ice.position.y=1.75; player.add(ice);
  S.p.shieldMesh=ice;
  fct(player.position.clone().setY(3.2),`盾 ${absorb}`,"#ffe9a0",16);
  if(typeof SFX!=="undefined")SFX.play("holy");
  log(`真言术：盾！吸收 ${absorb} 点伤害，持续 ${bal.duration} 秒。`,"lg-heal");
  return true;
}

function playerHit(amount,source){
  if(!S.p.alive||S.p.invuln>0)return;
  amount=Math.round(amount*R(BAL.variance.player));
  /* STEP 19：吸收盾先扣，溢出再扣血（玩家受击入口在 playerHit，非 hitEntity） */
  if(S.p.absorb>0){
    const absorbed=Math.min(S.p.absorb,amount);
    S.p.absorb-=absorbed;
    amount-=absorbed;
    if(absorbed>0){
      fct(player.position.clone().setY(3.2),`-${absorbed}(盾)`,"#ffe9a0",16);
      log(`真言术：盾吸收了 ${absorbed} 点伤害。`,"lg-heal");
    }
    if(S.p.absorb<=0){S.p.absorb=0;S.p.absorbT=0;clearShieldVisual();}
  }
  if(amount<=0)return;
  S.p.hp-=amount; hurtFlash(); SFX.play("hit");
  fct(player.position.clone().setY(3),`-${amount}`,"#ff6a5a",18);
  log(`${source} 对你造成 ${amount} 点伤害！`,"lg-dmg");
  if(S.p.hp<=0){S.p.hp=0;playerDie();}
}

/* ============================================================
   经验与等级（STEP 3）：唯一入口 gainXP——只由 onDeath 与任务回调调用
   升级：每级 +5% 基础伤害、+8% 生命上限（BALANCE.levels），金光 + 大字提示
   ============================================================ */
function gainXP(amount){
  const P=S.p,L=BAL.levels;
  if(P.level>=L.max)return;
  if(typeof partyAliveCount==="function"&&partyAliveCount()>0&&BAL.party&&BAL.party.xpMul)
    amount=Math.round(amount*BAL.party.xpMul);
  P.xp+=amount;
  fct(player.position.clone().setY(3.6),`+${amount} 经验`,"#c9a0ff",14);
  while(P.level<L.max&&P.xp>=P.xpMax){
    P.xp-=P.xpMax; P.level++;
    P.xpMax=L.xpMax[P.level-1]||P.xpMax;
    const hpGain=Math.round(CLS.hp*L.perLevel.hpMax);
    P.hpMax+=hpGain; P.hp=Math.min(P.hpMax,P.hp+hpGain);
    P.dmgMul+=L.perLevel.dmgMul;
    if(P.level>=L.max)P.xp=0;
    SFX.play("levelup");
    announce(`升 级 ！ Lv.${P.level}`);
    log(`你升到了 ${P.level} 级！生命上限 +${hpGain}，基础伤害 +${Math.round(L.perLevel.dmgMul*100)}%。`,"lg-heal");
    VFX.spawn("loot_spark",{pos:player.position.clone().setY(1.5),color:0xffd76a,count:60,spread:3});
    if(typeof grantTalentPointOnLevel==="function")grantTalentPointOnLevel(P.level);
    if(typeof onDeedLevelUp==="function")onDeedLevelUp(P.level);
  }
  updateLevelUI();
  if(typeof saveGame==="function")saveGame(true);
}

/* ---------------- 金币（STEP 13）：铜为最小单位 ---------------- */
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
function formatCopperHtml(copper){
  const {g,s,c}=formatCopperParts(copper);
  let h="";
  if(g)h+=`<span class="g">${g}金</span>`;
  if(s||g)h+=`<span class="s">${s}银</span>`;
  h+=`<span class="c">${c}铜</span>`;
  return h;
}
function updateGoldUI(){
  const el=$("#pGold"); if(!el)return;
  el.innerHTML=formatCopperHtml(S.p.gold|0);
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
