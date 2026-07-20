/* ============================================================
   熔火之心 · combat.js
   战斗系统：游戏状态 / 职业配置 / UI 与输入 / 玩家技能
            统一受击入口 hitEntity / Boss AI / 投射物与胜负
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ clamp rand R BAL scene camera ARENA_R）
          models.js（buildPlayer buildMage buildArcher buildFlameSpawn）
          items.js（ITEMS DROPS removeDrop dropLoot）
          world.js（player boss MOBS QUEST mobDamage updateQuest tryInteract spawnExitPortal removeExitPortal）
          main.js 运行时（clampArena）
   [导出] S SKILLS CLASSES CLS setClass log announce fct hurtFlash keys joy
          useSkill hitEntity BOSS_ENT dmgBoss addDamage addDie spawnAdd
          pickTarget firePlayerShot playerHit bossAI startCast fireProjectile
          spawnTelegraph spawnBurst bossDie playerDie resetBoss distToBoss bossTargetable
   ============================================================ */
"use strict";
/* ============================================================
   游戏状态
   ============================================================ */
const S={
  started:false,over:false,t:0,mode:"world",portalHinted:false,
  p:{hp:5200,hpMax:5200,rage:20,rageMax:100,speed:10.5,alive:true,dmgMul:1,
     atkTimer:0,attackAnim:0,walkPhase:0,face:0,invuln:0,
     level:1,xp:0,xpMax:BAL.levels.xpMax[0]},   /* 经验与等级（STEP 3） */
  b:{hp:BAL.boss.hp,hpMax:BAL.boss.hp,alive:true,rising:true,riseT:0,
     phase:1,swingT:0,casting:null,castT:0,castDur:0,
     nextMelee:2.5,nextFireball:6,nextEruption:10,nextWrath:18,
     submerged:false,submergeT:0,canLeave:false},
  adds:[],projectiles:[],pShots:[],telegraphs:[],bursts:[],
  cds:[0,0,0,0],gcd:0,
  inv:[],      /* 背包（STEP 2 起：拾取的物品 id 列表） */
  eq:{weapon:null,armor:null},   /* 装备位（STEP 4）：物品 id */
  god:false,   /* 上帝模式：启程时由首页勾选决定（hitEntity 消费） */
};
/* ============================================================
   职业系统：战士 / 法师 / 弓箭手
   ============================================================ */
let SKILLS=[];
const CLASSES={
  warrior:{title:"⚔️ 你 · 人类战士",hp:5200,resMax:100,resStart:20,resName:"怒气",
    regen:0,hitGain:8,speed:10.5,ranged:false,range:10,
    autoMin:150,autoMax:210,autoSpd:1.6,shotColor:0xffffff,build:buildPlayer,
    barCss:"linear-gradient(180deg,#ffd76a,#c98a1f 60%,#7a4d0c)",
    tip:"提示：近身自动攻击积攒怒气；【冲锋】可迅速贴近目标并额外获得怒气。",
    skills:[
      {name:"英勇打击",icon:"⚔️",cd:5, rage:20,fn:heroicStrike},
      {name:"旋风斩",  icon:"🌀",cd:9, rage:30,fn:whirlwind},
      {name:"冲锋",    icon:"💨",cd:12,rage:0, fn:charge},
      {name:"治疗药水",icon:"🧪",cd:22,rage:0, fn:potion}]},
  mage:{title:"🔮 你 · 人类法师",hp:3800,resMax:100,resStart:100,resName:"法力",
    regen:7,hitGain:0,speed:10,ranged:true,range:30,
    autoMin:175,autoMax:235,autoSpd:1.8,shotColor:0xff8a30,build:buildMage,
    barCss:"linear-gradient(180deg,#7ab8ff,#2a5ec9 60%,#123a7a)",
    tip:"提示：法力随时间恢复；远程自动施放火球，【闪现】拉开距离，危急时开【寒冰屏障】免疫伤害。",
    skills:[
      {name:"炎爆术",  icon:"☄️",cd:7, rage:30,fn:pyroblast},
      {name:"冰霜新星",icon:"❄️",cd:11,rage:25,fn:frostNova},
      {name:"闪现",    icon:"✨",cd:12,rage:15,fn:blink},
      {name:"寒冰屏障",icon:"🧊",cd:25,rage:0, fn:iceBlock}]},
  archer:{title:"🏹 你 · 精灵弓箭手",hp:4300,resMax:100,resStart:100,resName:"能量",
    regen:11,hitGain:0,speed:11.5,ranged:true,range:32,
    autoMin:140,autoMax:190,autoSpd:1.25,shotColor:0xd0ffa0,build:buildArcher,
    barCss:"linear-gradient(180deg,#d8ff7a,#7fb32a 60%,#3d6a0c)",
    tip:"提示：能量随时间恢复；边走边射保持距离，【翻滚】可位移并短暂闪避一切伤害。",
    skills:[
      {name:"瞄准射击",icon:"🎯",cd:6, rage:30,fn:aimedShot},
      {name:"多重射击",icon:"🏹",cd:10,rage:35,fn:multiShot},
      {name:"翻滚",    icon:"🤸",cd:9, rage:20,fn:roll},
      {name:"治疗药水",icon:"🧪",cd:22,rage:0, fn:potion}]},
};
let CLS=CLASSES.warrior;
function setClass(key){
  CLS=CLASSES[key];
  const pos=player.position.clone(),rot=player.rotation.y;
  scene.remove(player);
  player=CLS.build(); player.position.copy(pos); player.rotation.y=rot; scene.add(player);
  S.p.hpMax=CLS.hp; S.p.hp=CLS.hp;
  S.p.rageMax=CLS.resMax; S.p.rage=CLS.resStart; S.p.speed=CLS.speed;
  SKILLS=CLS.skills;
  updateLevelUI();
  $("#pRage").style.background=CLS.barCss;
  document.querySelectorAll(".skill").forEach((el,i)=>{
    el.querySelector(".ic").textContent=SKILLS[i].icon;
    el.querySelector(".nm").textContent=SKILLS[i].name;
  });
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
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
document.getElementById("interactBtn").addEventListener("pointerdown",()=>tryInteract());
document.querySelectorAll(".skill").forEach(el=>{
  el.addEventListener("pointerdown",()=>useSkill(+el.dataset.sk));
});
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
function distToBoss(){return player.position.distanceTo(new THREE.Vector3(boss.position.x,0,boss.position.z));}
function useSkill(i){
  if(!S.started||S.over||!S.p.alive)return;
  if(S.cds[i]>0||S.gcd>0)return;
  const sk=SKILLS[i];
  if(S.p.rage<sk.rage){log(`${CLS.resName}不足！（${sk.name} 需要 ${sk.rage} ${CLS.resName}）`,"lg-sys");return;}
  if(sk.fn()){S.p.rage-=sk.rage;S.cds[i]=sk.cd;S.gcd=.8;}
}
function bossTargetable(){return S.b.alive&&!S.b.rising&&!S.b.submerged;}

/* ============================================================
   统一受击入口（STEP 1，参考 WoC 单一 Sim 战斗结算）
   流程：乘系数 → 扣血 → 飘字 → 日志(onHit) → 死亡回调(onDeath)
   实体接口：{hp, variance, dead(), fctPos(), fctSize?, onHit?, onDeath}
   野猪 / 烈焰之子 / Boss 全部走这一个函数；
   掉落（STEP 2）与经验（STEP 3）只需挂接各实体的 onDeath。
   ============================================================ */
function hitEntity(ent,amount,label){
  if(ent.dead&&ent.dead())return;
  const v=ent.variance;
  /* 上帝模式：固定伤害，跳过系数与浮动 */
  amount=S.god?BAL.god.dmg:Math.round(amount*S.p.dmgMul*(v?rand(v[0],v[1]):1));
  ent.hp=Math.max(0,ent.hp-amount);
  fct(ent.fctPos(),`-${amount}`,"#ffdf8a",ent.fctSize?ent.fctSize(label):14);
  if(ent.onHit)ent.onHit(amount,label);
  if(ent.hp<=0)ent.onDeath();
}
/* Boss 实体适配器：hp 代理到 S.b，可击杀性沿用 bossTargetable */
const BOSS_ENT={
  get hp(){return S.b.hp}, set hp(v){S.b.hp=v},
  variance:BAL.variance.boss,
  dead(){return !bossTargetable();},
  fctPos(){return new THREE.Vector3(boss.position.x,9,boss.position.z);},
  fctSize(label){return label?19:15;},
  onHit(amount,label){if(label)log(`你的【${label}】对炎魔造成 ${amount} 点伤害！`,"lg-me");},
  onDeath(){bossDie();},
};
/* Boss 受击：薄包装（保留旧调用方签名） */
function dmgBoss(amount,label){hitEntity(BOSS_ENT,amount,label);}
function heroicStrike(){
  let hit=false;
  if(S.mode==="world"){
    for(const m of MOBS){
      if(m.state!=="dead"&&player.position.distanceTo(m.mesh.position)<BAL.skills.heroicStrike.reach){
        mobDamage(m,R(BAL.skills.heroicStrike.dmg),"英勇打击");hit=true;break;
      }
    }
  }else{
    if(distToBoss()<=BAL.skills.heroicStrike.bossReach){dmgBoss(R(BAL.skills.heroicStrike.dmg),"英勇打击");hit=true;}
    S.adds.forEach(a=>{
      if(player.position.distanceTo(a.mesh.position)<BAL.skills.heroicStrike.addReach){addDamage(a,R(BAL.skills.heroicStrike.addDmg));hit=true;}
    });
  }
  if(!hit){log("没有目标在近战范围内。");return false;}
  S.p.attackAnim=1;
  return true;
}
function whirlwind(){
  S.p.attackAnim=1;
  spawnBurst(player.position.clone().setY(1),0x9ad0ff,26,1.6);
  let any=false;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(m.state!=="dead"&&player.position.distanceTo(m.mesh.position)<BAL.skills.whirlwind.radius){
        mobDamage(m,R(BAL.skills.whirlwind.dmg),"旋风斩");any=true;
      }
    });
  }else{
    if(distToBoss()<=BAL.skills.whirlwind.bossRadius){dmgBoss(R(BAL.skills.whirlwind.bossDmg),"旋风斩");any=true;}
    S.adds.forEach(a=>{
      if(player.position.distanceTo(a.mesh.position)<BAL.skills.whirlwind.radius){addDamage(a,R(BAL.skills.whirlwind.dmg));any=true;}
    });
  }
  if(!any)log("旋风斩没有命中任何目标。");
  return true;
}
function charge(){
  let target=null,best=1e9;
  if(S.mode==="world"){
    MOBS.forEach(m=>{
      if(m.state==="dead")return;
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
  log(`你向敌人发起冲锋！获得 ${BAL.skills.charge.rageGain} 点怒气。`,"lg-me");
  return true;
}
function potion(){
  const heal=Math.round(R(BAL.skills.potion.heal));
  S.p.hp=Math.min(S.p.hpMax,S.p.hp+heal);
  fct(player.position.clone().setY(3),`+${heal}`,"#8aff9a",18);
  spawnBurst(player.position.clone().setY(1.4),0x66ff88,20,1.4);
  log(`你饮下强效治疗药水，恢复 ${heal} 点生命值。`,"lg-heal");
  return true;
}

/* ---------------- 远程职业通用：索敌 & 投射物 ---------------- */
function pickTarget(range){
  let tgt=null,best=range;
  if(S.mode==="world"){
    for(const m of MOBS){
      if(m.state==="dead")continue;
      const d=player.position.distanceTo(m.mesh.position);
      if(d<best){best=d;tgt={type:"mob",m};}
    }
    return tgt;
  }
  if(bossTargetable()&&distToBoss()<=range){tgt={type:"boss"};best=distToBoss();}
  for(const a of S.adds){
    const d=player.position.distanceTo(a.mesh.position);
    if(d<best){best=d;tgt={type:"add",a};}
  }
  return tgt;
}
function firePlayerShot(tgt,dmg,label,scale=1){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.3*scale,8,8),
    new THREE.MeshBasicMaterial({color:CLS.shotColor}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.55*scale,8,8),
    new THREE.MeshBasicMaterial({color:CLS.shotColor,transparent:true,opacity:.35}));
  m.add(glow);
  m.position.copy(player.position); m.position.y=1.9;
  scene.add(m);
  S.pShots.push({mesh:m,tgt,dmg,label,speed:28});
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
      if(m.state!=="dead"&&player.position.distanceTo(m.mesh.position)<BAL.skills.frostNova.radius){
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
      if(m.state!=="dead"&&player.position.distanceTo(m.mesh.position)<=CLS.range){
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

function playerHit(amount,source){
  if(!S.p.alive||S.p.invuln>0)return;
  amount=Math.round(amount*R(BAL.variance.player));
  S.p.hp-=amount; hurtFlash();
  fct(player.position.clone().setY(3),`-${amount}`,"#ff6a5a",18);
  log(`${source} 对你造成 ${amount} 点伤害！`,"lg-dmg");
  if(S.p.hp<=0){S.p.hp=0;playerDie();}
}

/* ============================================================
   Boss AI
   ============================================================ */
function startCast(name,dur,done){
  S.b.casting={name,done}; S.b.castT=0; S.b.castDur=dur;
  $("#castShell").style.display="block"; $("#castText").textContent=name;
}
function bossAI(dt){
  const B=S.b;
  if(!B.alive)return;

  /* 出场：从岩浆升起 */
  if(B.rising){
    B.riseT+=dt;
    boss.position.y=THREE.MathUtils.lerp(-16,0,Math.min(1,B.riseT/4));
    boss.position.y+=Math.sin(S.t*2)*.1;
    if(B.riseT>1.2&&B.riseT<1.3)spawnBurst(new THREE.Vector3(0,1,-14),0xff5a1a,60,4);
    if(B.riseT>=4){B.rising=false;
      announce("拉戈斯：太早了！你们竟敢太早唤醒我！");
      log("炎魔领主 拉戈斯 从熔岩中苏醒了！","lg-boss");}
    return;
  }
  /* 潜地阶段（阶段二召唤烈焰之子） */
  if(B.submerged){
    B.submergeT-=dt;
    boss.position.y=THREE.MathUtils.lerp(boss.position.y,-15,dt*2);
    if(B.submergeT<=0||S.adds.length===0){
      B.submerged=false;
      announce("拉戈斯重新浮出岩浆！");
      log("烈焰散去，拉戈斯再度现身！","lg-boss");
      B.nextMelee=S.t+2;B.nextFireball=S.t+5;B.nextEruption=S.t+8;B.nextWrath=S.t+14;
    }
    return;
  }
  boss.position.y=THREE.MathUtils.lerp(boss.position.y,Math.sin(S.t*1.6)*.25,dt*3);

  /* 阶段切换：50% 血量潜入岩浆并召唤小怪 */
  if(B.phase===1&&B.hp<=B.hpMax*BAL.boss.phase2At){
    B.phase=2; B.submerged=true; B.submergeT=BAL.boss.submergeT; B.casting=null; $("#castShell").style.display="none";
    announce("阶段二 · 烈焰之子！");
    log("拉戈斯沉入岩浆——烈焰之子从熔岩中涌出！消灭它们！","lg-boss");
    for(let i=0;i<BAL.boss.addCount;i++){
      const a=i/BAL.boss.addCount*Math.PI*2+rand(0,1);
      spawnAdd(Math.cos(a)*rand(10,16),Math.sin(a)*rand(10,16)-4);
    }
    return;
  }

  /* 读条处理 */
  if(B.casting){
    B.castT+=dt;
    $("#castFill").style.transform=`scaleX(${Math.min(1,B.castT/B.castDur)})`;
    if(B.castT>=B.castDur){
      const c=B.casting; B.casting=null; $("#castShell").style.display="none"; c.done();
    }
    return;
  }

  const d=distToBoss();
  /* 近战：熔火重击 */
  if(S.t>B.nextMelee){
    B.nextMelee=S.t+R(BAL.boss.melee.cd);
    if(d<BAL.boss.melee.range){
      B.swingT=1;
      setTimeout(()=>{ if(S.over)return;
        if(distToBoss()<BAL.boss.melee.hitRange&&S.p.alive){playerHit(R(BAL.boss.melee.dmg)*(B.phase===2?BAL.boss.melee.p2Mul:1),"拉戈斯的熔火重击");
          spawnBurst(player.position.clone().setY(.5),0xff6a1a,14,1.2);}
      },BAL.boss.melee.delayMs);
    }
  }
  /* 烈焰冲击（火球，可走位躲避的读条技能） */
  if(S.t>B.nextFireball){
    B.nextFireball=S.t+R(BAL.boss.fireball.cd);
    startCast("烈焰冲击",BAL.boss.fireball.cast,()=>{
      log("拉戈斯掷出烈焰冲击！","lg-boss");
      fireProjectile(player.position.clone());
    });
    return;
  }
  /* 熔岩喷发（地面红圈 AoE） */
  if(S.t>B.nextEruption){
    B.nextEruption=S.t+R(BAL.boss.eruption.cd);
    startCast("熔岩喷发",BAL.boss.eruption.cast,()=>{
      announce("熔岩喷发 · 快躲开红圈！");
      log("大地震颤，熔岩即将喷发！","lg-boss");
      const n=B.phase===2?BAL.boss.eruption.p2Count:BAL.boss.eruption.count;
      spawnTelegraph(player.position.x,player.position.z,4.5,BAL.boss.eruption.delay);
      for(let i=0;i<n;i++){
        const a=rand(0,6.28),r=rand(3,ARENA_R-4);
        spawnTelegraph(Math.cos(a)*r,Math.sin(a)*r,rand(3.5,5.5),BAL.boss.eruption.delay+i*.25);
      }
    });
    return;
  }
  /* 拉戈斯之怒（近身击退） */
  if(S.t>B.nextWrath){
    B.nextWrath=S.t+R(BAL.boss.wrath.cd);
    startCast("拉戈斯之怒",BAL.boss.wrath.cast,()=>{
      announce("拉戈斯之怒！");
      spawnBurst(new THREE.Vector3(boss.position.x,2,boss.position.z),0xffb040,70,7);
      if(distToBoss()<BAL.boss.wrath.range&&S.p.alive){
        playerHit(R(BAL.boss.wrath.dmg),"拉戈斯之怒");
        const dir=player.position.clone().sub(new THREE.Vector3(boss.position.x,0,boss.position.z)).normalize();
        S.p.knock={dir,t:.4};
        log("你被巨大的冲击波击飞！","lg-dmg");
      }
    });
  }
}

/* ---------------- 火球投射物 ---------------- */
function fireProjectile(targetPos){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.9,10,10),
    new THREE.MeshBasicMaterial({color:0xffa030}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(1.4,10,10),
    new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:.4}));
  m.add(glow);
  m.position.set(boss.position.x+2.5,9,boss.position.z+2);
  scene.add(m);
  S.projectiles.push({mesh:m,target:targetPos.clone().setY(.8),speed:BAL.boss.fireball.speed});
}
/* ---------------- 地面 AoE 红圈 ---------------- */
function spawnTelegraph(x,z,r,delay){
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*.86,r,40),
    new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:.85,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.set(x,.06,z);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(r,40),
    new THREE.MeshBasicMaterial({color:0xff3b00,transparent:true,opacity:.22,side:THREE.DoubleSide}));
  disc.rotation.x=-Math.PI/2;disc.position.set(x,.05,z);
  scene.add(ring);scene.add(disc);
  S.telegraphs.push({ring,disc,x,z,r,t:0,delay});
}
/* ---------------- 粒子爆发 ---------------- */
function spawnBurst(pos,color,count,spread){
  const geo=new THREE.BufferGeometry();
  const p=new Float32Array(count*3),vel=[];
  for(let i=0;i<count;i++){
    p[i*3]=pos.x;p[i*3+1]=pos.y;p[i*3+2]=pos.z;
    const a=rand(0,6.28),e=rand(.3,1.4);
    vel.push(new THREE.Vector3(Math.cos(a)*spread*rand(.4,1),e*spread*1.6,Math.sin(a)*spread*rand(.4,1)));
  }
  geo.setAttribute("position",new THREE.BufferAttribute(p,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size:.45,transparent:true,
    opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(pts);
  S.bursts.push({pts,vel,life:0});
}
/* ---------------- 烈焰之子 ---------------- */
function spawnAdd(x,z){
  const mesh=buildFlameSpawn();
  mesh.position.set(clamp(x,-ARENA_R+3,ARENA_R-3),0,clamp(z,-ARENA_R+3,ARENA_R-3));
  scene.add(mesh);
  S.adds.push({mesh,name:"烈焰之子",hp:BAL.add.hp,hpMax:BAL.add.hp,atkT:0,corpseT:0,
    /* —— 统一实体接口（STEP 1）；烈焰之子历史上无伤害浮动，variance 置 null —— */
    variance:null,
    dead(){return !S.adds.includes(this);},
    fctPos(){return this.mesh.position.clone().setY(2.6);},
    onDeath(){addDie(this);},
  });
  spawnBurst(mesh.position.clone().setY(1),0xff5a1a,20,1.6);
}
/* 烈焰之子受击：薄包装 → 统一受击入口 hitEntity（STEP 1） */
function addDamage(a,amount){hitEntity(a,amount);}
function addDie(a){
  spawnBurst(a.mesh.position.clone().setY(1),0xffa040,26,2);
  /* 尸体灰化 + 倒地（复用 corpseMat，参考 world.js setCorpse） */
  a.mesh.traverse(o=>{if(o.isMesh){o.userData.liveMat=o.material;o.material=corpseMat;}});
  a.mesh.rotation.z=Math.PI/2; a.mesh.position.y=.25;
  a.corpseT=BAL.loot.corpseT;
  /* 掉落 */
  dropLoot(a.mesh.position.clone().add(new THREE.Vector3(1.2,0,.6)),[rollLoot(LOOT.add)],a);
  log("一只烈焰之子被消灭了！","lg-me");
}

/* ============================================================
   经验与等级（STEP 3）：唯一入口 gainXP——只由 onDeath 与任务回调调用
   升级：每级 +5% 基础伤害、+8% 生命上限（BALANCE.levels），金光 + 大字提示
   ============================================================ */
function gainXP(amount){
  const P=S.p,L=BAL.levels;
  if(P.level>=L.max)return;
  P.xp+=amount;
  fct(player.position.clone().setY(3.6),`+${amount} 经验`,"#c9a0ff",14);
  while(P.level<L.max&&P.xp>=P.xpMax){
    P.xp-=P.xpMax; P.level++;
    P.xpMax=L.xpMax[P.level-1]||P.xpMax;
    const hpGain=Math.round(CLS.hp*L.perLevel.hpMax);
    P.hpMax+=hpGain; P.hp=Math.min(P.hpMax,P.hp+hpGain);
    P.dmgMul+=L.perLevel.dmgMul;
    if(P.level>=L.max)P.xp=0;
    announce(`升 级 ！ Lv.${P.level}`);
    log(`你升到了 ${P.level} 级！生命上限 +${hpGain}，基础伤害 +${Math.round(L.perLevel.dmgMul*100)}%。`,"lg-heal");
    spawnBurst(player.position.clone().setY(1.5),0xffd76a,60,3);
  }
  updateLevelUI();
}
function updateLevelUI(){$("#pName").textContent=`${CLS.title} · Lv.${S.p.level}`;}

/* ============================================================
   胜负
   ============================================================ */
function bossDie(){
  S.b.alive=false;
  S.b.canLeave=true;  /* 可自行离开副本，不清除进度 */
  if(QUEST.state===2){QUEST.state=3;updateQuest();}
  announce("炎魔领主 已被击败！");
  log("拉戈斯发出震天怒吼，缓缓沉回熔岩深处……","lg-boss");
  log("已拾取战利品后，走进出现的传送门即可离开副本。","lg-sys");
  gainXP(BAL.levels.xp.boss);   /* 经验（STEP 3）：Boss 击杀 +2000 */
  spawnBurst(new THREE.Vector3(boss.position.x,6,boss.position.z),0xffc060,120,9);
  let t=0;const iv=setInterval(()=>{t+=0.05;boss.position.y-=0.16;boss.rotation.z+=0.004;
    if(t>3)clearInterval(iv);},50);
  /* STEP 2：拉戈斯必掉「萨弗拉斯之柄」——尸体沉没后浮出战利品 */
  setTimeout(()=>{
    dropLoot(new THREE.Vector3(0,0,-8),[ITEMS.sulfuras_haft],null);
    announce("传说战利品 · 按 F 拾取");
    log("熔岩翻涌，一柄燃烧的锤柄浮出岩浆——靠近按 F 拾取。","lg-sys");
  },3400);
  /* 击杀胜利提示（短暂展示，自动消失）+ 生成出口传送门 */
  setTimeout(()=>{
    $("#endTitle").textContent="胜 利";
    $("#endTitle").style.color="#ffd9a0";
    $("#endSub").textContent="MOLTEN CORE · CLEARED";
    $("#endText").innerHTML="炎魔领主的躯体崩解为冷却的黑曜岩。<br>前往副本入口处，走进传送门离开。";
    $("#endOv").classList.remove("hide");
    /* 3 秒后自动隐藏胜利画面，生成出口传送门 */
    setTimeout(()=>{
      $("#endOv").classList.add("hide");
      spawnExitPortal();
      announce("离开副本的传送门已开启");
      log("一道旋涡传送门在副本入口处打开——走进即可离开。","lg-sys");
    },3000);
  },5000);
}
function playerDie(){
  S.p.alive=false;S.over=true;
  announce("你被击败了……");
  player.rotation.z=Math.PI/2;player.position.y=.5;
  setTimeout(()=>{
    $("#endTitle").textContent="团 灭";
    $("#endTitle").style.color="#ff5a3c";
    $("#endSub").textContent="YOU HAVE BEEN DEFEATED";
    $("#endText").innerHTML="烈焰吞没了你的身躯，拉戈斯的狂笑响彻洞穴。<br>灵魂医者在等着你——跑尸之后，再来一次。";
    $("#endOv").classList.remove("hide");
  },2200);
}

/* 重置 Boss 状态（再次进入副本时调用）：清空小怪/投射物/掉落，不碰玩家背包/等级/装备 */
function resetBoss(){
  S.b.hp=S.b.hpMax=BAL.boss.hp;
  S.b.alive=true; S.b.phase=1; S.b.rising=true; S.b.riseT=0;
  S.b.submerged=false; S.b.submergeT=0; S.b.casting=null; S.b.castT=0; S.b.castDur=0;
  S.b.canLeave=false; S.b.swingT=0;
  S.b.nextMelee=S.t+6; S.b.nextFireball=S.t+10;
  S.b.nextEruption=S.t+14; S.b.nextWrath=S.t+22;
  /* 清除出口传送门 */
  removeExitPortal();
  /* 清除遗留小怪 */
  for(const a of S.adds)scene.remove(a.mesh);
  S.adds.length=0;
  /* 清除遗留投射物 */
  for(const p of S.projectiles)scene.remove(p.mesh);
  S.projectiles.length=0;
  /* 清除地面预警 */
  for(const t of S.telegraphs){scene.remove(t.ring);scene.remove(t.disc);}
  S.telegraphs.length=0;
  /* 清除 BOSS 掉落 */
  for(let i=DROPS.length-1;i>=0;i--)removeDrop(DROPS[i]);
  /* 重置 Boss 位置（沉入岩浆） */
  boss.position.set(0,-16,-14); boss.rotation.z=0;
  $("#castShell").style.display="none";
}
