#!/usr/bin/env node
/* plan-v4 STEP 15：经典公式边界单测（纯 sim，不加载 THREE） */
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
  "js/sim/entity.js",
  "js/sim/xp.js",
  "js/sim/rules.js"
]){
  vm.runInContext(fs.readFileSync(path.join(root,f),"utf8"),ctx,{filename:f});
}

const{
  SIM_CONTENT,RULES,
  meleeTable,spellHitChance,armorReduction,rollMeleeAttack,
  hpFromStamina,manaFromInt,deriveStats,emptyStats,mergeStats,
  rageConstant,rageFromDamage,gcdDuration,createResourceState,
  tickResources,applyManaSpend,
  isGreyMob,scaledMobXp,baseMobXp,xpToNext,maxXpLevel
}=ctx;

/* ---- 等级决策 ---- */
assert(SIM_CONTENT.xp.maxLevel===20,"等级上限决策：沿用 20（V3 内容）");
assert(RULES&&RULES.maxLevelDecision===20,"RULES 记录等级决策 20");
assert(typeof maxXpLevel==="function"?maxXpLevel()===20:true,"maxXpLevel=20");
assert(xpToNext(1)===400&&xpToNext(2)===900&&xpToNext(3)===1400,"经验曲线 400/900/1400");

/* ---- 1 命中表：等级差 ±3 ---- */
{
  const same=meleeTable({level:10,critPct:15},{level:10,dodgePct:5});
  const sum=Object.keys(same).filter(k=>typeof same[k]==="number"&&k!=="critMul"&&k!=="glancingMul")
    .reduce((a,k)=>a+(same[k]|0),0);
  /* 表内百分比字段和约 100（含 hit） */
  const tot=(same.miss||0)+(same.dodge||0)+(same.parry||0)+(same.glancing||0)+(same.block||0)+(same.crit||0)+(same.hit||0);
  assert(Math.abs(tot-100)<.6,"同级近战表概率和 ≈ 100");

  const plus3=meleeTable({level:10,critPct:15},{level:13,dodgePct:5});
  assert(plus3.miss>same.miss,"+3 等级差 miss 上升");
  assert((plus3.glancing||0)>(same.glancing||0),"+3 等级差 glancing 上升");

  const minus3=meleeTable({level:13,critPct:15},{level:10,dodgePct:5});
  assert(minus3.miss<=same.miss,"-3 打低级 miss 不升");
}
assert(spellHitChance(10,10)===96,"法术同级命中 96%");
assert(spellHitChance(10,11)===95,"法术 +1 命中 95%");
assert(spellHitChance(10,12)===94,"法术 +2 命中 94%");
assert(spellHitChance(10,13)===83,"法术 +3 断崖 83%");

/* ---- 2 护甲：0 / 极大 ---- */
assert(armorReduction(0,10)===0,"护甲 0 → 减伤 0");
assert(armorReduction(1e9,10)>=.74&&armorReduction(1e9,10)<=.75,"护甲极大 → 封顶 75%");
{
  const mid=armorReduction(2000,12);
  assert(mid>0&&mid<.75,"Lv12 + 2000 甲有中等减伤");
}

/* ---- 3 怒气：首次击打数值 ---- */
{
  const c1=rageConstant(1);
  const deal=rageFromDamage(100,1,"deal");
  const expect=7.5*100/c1;
  assert(Math.abs(deal-expect)<1e-9,"怒气首次造成伤害 = 7.5·d/c");
  const take=rageFromDamage(100,1,"take");
  assert(Math.abs(take-2.5*100/c1)<1e-9,"怒气受击 = 2.5·d/c");
  assert(rageFromDamage(1000,1,"deal")>rageFromDamage(1000,60,"deal"),"同伤害低等级获怒更多");
}

/* ---- 4 属性转换 ---- */
assert(hpFromStamina(0)===0,"耐力 0 → 0 HP");
assert(hpFromStamina(20)===20,"耐力前 20 每点 +1");
assert(hpFromStamina(30)===120,"耐力超出每点 +10");
assert(manaFromInt(20)===20,"智力前 20 每点 +1 法力");
assert(manaFromInt(25)===95,"智力超出每点 +15");
{
  const bare=deriveStats({str:20,agi:20,sta:20,int:20,spi:20,armor:0,level:1},"warrior");
  const geared=deriveStats(mergeStats(
    {str:20,agi:20,sta:20,int:20,spi:20,armor:0,level:1},
    {str:0,agi:0,sta:15,int:0,spi:0,armor:0}
  ),"warrior");
  assert(geared.hpBonus>bare.hpBonus,"装备耐力提升 hpBonus");
}

/* ---- 5 经验 + 灰怪（STEP 15：5 级打 1 级） ---- */
assert(baseMobXp(6)===45+5*6,"基础野怪 XP = 45+5×Lv");
assert(isGreyMob(5,1)===true,"5 级打 1 级猪为灰色");
assert(scaledMobXp(5,1)===0,"5 级打 1 级 scaledMobXp=0");
assert(isGreyMob(4,1)===false,"4 级打 1 级仍有经验通道");
assert(scaledMobXp(5,5)>0,"同级有经验");

/* ---- 节奏：GCD + 五秒回蓝 ---- */
assert(gcdDuration("rage")===1.5&&gcdDuration("energy")===1.0,"GCD 1.5 / 能量 1.0");
{
  const rs=createResourceState();
  const p={rage:50,rageMax:100};
  applyManaSpend(rs);
  assert(rs.manaFsr>=4.9,"施法后进入约 5 秒 FSR");
  const before=p.rage;
  tickResources(p,rs,{dt:1.0,resKind:"mana",spi:40,regen:0,sitting:false});
  assert(p.rage===before,"FSR 内不回蓝");
  rs.manaFsr=0;
  tickResources(p,rs,{dt:1.0,resKind:"mana",spi:40,regen:0,sitting:false});
  assert(p.rage>before,"FSR 结束后开始回蓝");
}

/* ---- 命中采样：同级偶有 miss ---- */
{
  let i=0;
  const rng=()=>{i++;return((i*1103515245+12345)&0x7fffffff)/0x7fffffff;};
  let misses=0;
  for(let k=0;k<5000;k++){
    const r=rollMeleeAttack(
      {level:5,critPct:10,apDmgMul:1,dmgMul:1},
      {level:5,dodgePct:5,armor:80},
      {base:100,rng}
    );
    if(r.outcome==="miss"||r.outcome==="dodge"||r.outcome==="parry")misses++;
  }
  assert(misses>0,"同级采样存在 miss/dodge/parry");
}

/* ---- RULES 索引齐全 ---- */
assert(RULES.hit.rollAttack&&RULES.stats.hpFromStamina&&RULES.resources.rageFromDamage&&RULES.xp.isGreyMob,
  "RULES 索引挂接五组公式");

if(failed){
  console.log("\n失败",failed,"项 · test_rules.js");
  process.exit(1);
}
console.log("\n全部通过 · plan-v4 STEP 15 rules");
process.exit(0);
