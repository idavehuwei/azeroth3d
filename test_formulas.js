#!/usr/bin/env node
/* plan-V3 C3–C5：sim 公式无头单测（不加载 THREE） */
"use strict";
const fs=require("fs");
const path=require("path");
const vm=require("vm");

let failed=0;
function assert(cond,msg){
  if(cond)console.log("PASS:",msg);
  else{console.log("FAIL:",msg);failed++;}
}

const root=__dirname;
const ctx={console,Math};
vm.createContext(ctx);
for(const f of [
  "js/sim/content.js",
  "js/sim/stats.js",
  "js/sim/formulas.js",
  "js/sim/resources.js",
  "js/sim/entity.js"
]){
  vm.runInContext(fs.readFileSync(path.join(root,f),"utf8"),ctx,{filename:f});
}

const{
  SIM_CONTENT,hpFromStamina,manaFromInt,attackPower,critFromAgi,dodgeFromAgi,armorFromAgi,
  deriveStats,emptyStats,meleeTable,armorReduction,spellHitChance,rollMeleeAttack,rollSpellAttack,
  rageConstant,rageFromDamage,gcdDuration,createResourceState,tickResources,addComboPoints,
  clearComboPoints,getComboPoints,spendComboPoints,
  settleDamage,buildAttackerCtx,buildTargetCtx,
  applyAbsorbShield,applyEntityHpDamage,allocEntityId
}=ctx;

assert(!!SIM_CONTENT&&SIM_CONTENT.stats&&SIM_CONTENT.melee,"SIM_CONTENT 含 stats/melee");
assert(hpFromStamina(0)===0,"hpFromStamina(0)=0");
assert(hpFromStamina(20)===20,"hpFromStamina(20)=20（前 20 点每点 +1）");
assert(hpFromStamina(30)===20+10*10,"hpFromStamina(30)=120（超出每点 +10）");
assert(manaFromInt(20)===20,"manaFromInt(20)=20");
assert(manaFromInt(25)===20+5*15,"manaFromInt(25)=95");
assert(armorFromAgi(10)===20,"armorFromAgi = agi×2");
assert(attackPower({str:45,agi:0,level:1},"warrior")>0,"战士 AP > 0");
const der=deriveStats({str:45,agi:25,sta:40,int:10,spi:15,armor:120,level:1},"warrior");
assert(der.ap>0&&der.critPct>5&&der.apDmgMul>=1,"deriveStats 产出 AP/暴击/伤害乘区");
{
  const {cloneStats,mergeStats}=ctx;
  const base=cloneStats(SIM_CONTENT.baseStats.warrior); base.level=1;
  const bare=deriveStats(base,"warrior");
  const gear=emptyStats(1); gear.str=12; gear.agi=8;
  const withG=deriveStats(mergeStats(base,gear),"warrior");
  assert(withG.ap>bare.ap,"C8 装备力量/敏捷提升 AP");
  assert(withG.critPct>bare.critPct,"C8 装备敏捷提升暴击");
}

/* 护甲 */
assert(armorReduction(0,60)===0,"护甲 0 → 减伤 0");
const big=armorReduction(1e9,60);
assert(big<=.75+1e-9,"护甲减伤上限 75%");
assert(armorReduction(400,1)>0&&armorReduction(400,1)<.75,"中等护甲有减伤");

/* 命中表和为 100 */
const tab=meleeTable({level:1,critPct:10},{level:1,dodgePct:5});
const sum=["miss","dodge","parry","glancing","block","crit","hit"].reduce((a,k)=>a+(tab[k]|0),0);
assert(Math.abs(sum-100)<1e-6,"近战表概率和 = 100");
assert(spellHitChance(1,1)===96,"法术同级命中 96%");
assert(spellHitChance(1,4)===83,"法术 +3 命中 83%");

/* 采样：同级应有 hit/crit；对 +3 应有更多 miss/glancing */
function sampleMelee(atkLv,tgtLv,n){
  const counts={};
  let i=0;
  const rng=()=>{i++;return((i*1103515245+12345)&0x7fffffff)/0x7fffffff;};
  for(let k=0;k<n;k++){
    const r=rollMeleeAttack(
      {level:atkLv,critPct:15,apDmgMul:1,dmgMul:1},
      {level:tgtLv,dodgePct:5,armor:100},
      {base:100,rng}
    );
    counts[r.outcome]=(counts[r.outcome]|0)+1;
  }
  return counts;
}
const same=sampleMelee(10,10,20000);
assert((same.hit|0)+(same.crit|0)>same.miss,"同级 hit+crit 多于 miss");
const bossLike=sampleMelee(10,13,20000);
assert((bossLike.miss|0)+(bossLike.glancing|0)>(same.miss|0)+(same.glancing|0),"+3 等级差 miss+glancing 上升");

/* 法术暴击倍率（含 rebalance 乘区） */
{
  const r=rollSpellAttack({level:1,critPct:100,dmgMul:1,apDmgMul:1},{level:1},{base:100,rng:()=>0});
  assert(r.outcome==="crit","法术高暴击率 → crit");
  const reb=(SIM_CONTENT.rebalance&&SIM_CONTENT.rebalance.outgoingMul)||1;
  assert(r.damage===Math.round(100*reb*1.5),"法术暴击 = base×rebalance×1.5");
}

/* 资源 */
assert(rageConstant(1)>0&&rageConstant(60)>rageConstant(1),"怒气常数随等级上升");
assert(rageFromDamage(1000,1,"deal")>rageFromDamage(1000,60,"deal"),"同伤害低等级获怒更多");
assert(gcdDuration("rage")===1.5&&gcdDuration("energy")===1.0,"GCD 1.5 / 能量 1.0");
const rs=createResourceState();
const p={rage:0,rageMax:100};
addComboPoints(rs,2);
addComboPoints(rs,2);
assert(rs.combo===4,"连击点累加");
addComboPoints(rs,10);
assert(rs.combo===5,"连击点上限 5");
const spent=spendComboPoints(rs);
assert(spent===5&&rs.combo===0,"spendComboPoints 消费并清零");
addComboPoints(rs,3);
assert(getComboPoints(rs)===3,"getComboPoints");
clearComboPoints(rs);
assert(getComboPoints(rs)===0,"clearComboPoints");
/* 背后判定（与 combat.isBehindTarget 同式） */
function behindAt(tx,tz,tRot,ax,az,arc){
  const half=(arc!=null?arc:1.35)*.5;
  const toAtk=Math.atan2(ax-tx,az-tz);
  let d=toAtk-tRot;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return Math.abs(d)>Math.PI-half;
}
assert(behindAt(0,0,0,0,-2),"正后方可背刺");
assert(!behindAt(0,0,0,0,2),"正前方不可背刺");
assert(!behindAt(0,0,0,2,0),"侧面不可背刺");
/* 能量 tick：2 秒 +20 */
rs.energyAcc=0;
tickResources(p,rs,{dt:2.0,resKind:"energy"});
assert(p.rage===20,"能量 2 秒 tick +20");

/* settleDamage god */
const god=settleDamage({base:10,god:true,godDmg:5000});
assert(god.damage===5000&&god.outcome==="hit","上帝模式固定伤害");

/* STEP 14 纯扣血 / 吸收 */
{
  const sh={absorb:50,absorbT:10};
  const r=applyAbsorbShield(sh,30);
  assert(r.absorbed===30&&r.amount===0&&sh.absorb===20,"吸收盾部分吸收");
  const r2=applyAbsorbShield(sh,100);
  assert(r2.absorbed===20&&r2.amount===80&&r2.shieldBroken,"吸收盾击破");
  const ent={hp:100};
  const d=applyEntityHpDamage(ent,40);
  assert(d.hp===60&&!d.died&&ent.hp===60,"applyEntityHpDamage 扣血");
  assert(allocEntityId("mob")!==allocEntityId("mob"),"allocEntityId 递增唯一");
}

const atk=buildAttackerCtx({level:5,dmgMul:1,debugMul:1},"warrior",der);
const tgt=buildTargetCtx({level:5,armor:80});
assert(atk.level===5&&tgt.armor===80,"attacker/target ctx");

/* 冒烟：源文件挂接 */
const combatSrc=fs.readFileSync(path.join(root,"combat.js"),"utf8");
const html=fs.readFileSync(path.join(root,"game.html"),"utf8");
assert(combatSrc.includes("settleDamage")&&combatSrc.includes("playerResKind"),"combat 接线 settleDamage");
assert(html.includes('src="js/sim/formulas.js"')&&html.includes('src="js/sim/resources.js"'),"game.html 加载 sim");
assert(fs.existsSync(path.join(root,"js/sim/content.js")),"content.js 存在");

/* ---- plan-V3 C6 经验 ---- */
vm.runInContext(fs.readFileSync(path.join(root,"js/sim/xp.js"),"utf8"),ctx,{filename:"js/sim/xp.js"});
const{
  getXpCurve,xpToNext,isGreyMob,xpLevelMul,baseMobXp,scaledMobXp,applyRestXp,restFromOfflineHours
}=ctx;
assert(getXpCurve()[0]===400&&getXpCurve()[1]===900,"XP_CURVE 1→2=400, 2→3=900");
assert(xpToNext(1)===400&&xpToNext(3)===1400,"xpToNext 对齐曲线");
assert(isGreyMob(5,1)===true,"5 级打 1 级猪为灰色（零经验）");
assert(isGreyMob(4,1)===false,"4 级打 1 级猪仍有经验");
assert(scaledMobXp(6,1)===0,"灰色线 scaledMobXp=0");
assert(baseMobXp(1)===50&&baseMobXp(10)===95,"基础野怪 XP = 45+5×Lv");
assert(scaledMobXp(1,1)>0&&scaledMobXp(1,3)>scaledMobXp(1,1),"打高等级怪经验更高");
const rested=applyRestXp(100,80,400);
assert(rested.total===180&&rested.bonus===80&&rested.restLeft===0,"休息经验双倍消耗池");
assert(restFromOfflineHours(10,1000)>0,"离线休息经验 > 0");

console.log(failed?`\n失败 ${failed} 项`:"\n全部通过 · plan-V3 C3–C5 formulas");
process.exitCode=failed?1:0;
if(failed)process.exit(1);
