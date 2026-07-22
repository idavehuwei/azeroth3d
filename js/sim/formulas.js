/* ============================================================
   炽心 · js/sim/formulas.js
   plan-V3 C4：近战命中表 / 法术命中 / 护甲减伤（纯函数）
   依赖：SIM_CONTENT 或 BAL.sim（可选）
   导出：levelDelta armorReduction meleeTable spellHitChance
         rollMeleeAttack rollSpellAttack rollAttack
   ============================================================ */
"use strict";

function _sim(){
  if(typeof SIM_CONTENT!=="undefined")return SIM_CONTENT;
  if(typeof BAL!=="undefined"&&BAL.sim)return BAL.sim;
  return{};
}
function _pick(arr,delta){
  if(!arr||!arr.length)return 0;
  const i=Math.max(0,Math.min(arr.length-1,delta|0));
  return arr[i];
}
function levelDelta(attackerLevel,targetLevel){
  return (targetLevel|0)-(attackerLevel|0);
}

/** reduction = armor / (armor + kLevel*atkLvl + kFlat)，上限 cap */
function armorReduction(armor,attackerLevel,cfg){
  cfg=cfg||_sim().armor||{};
  const a=Math.max(0,armor|0);
  const lv=Math.max(1,attackerLevel|0);
  const kL=cfg.kLevel!=null?cfg.kLevel:85;
  const kF=cfg.kFlat!=null?cfg.kFlat:400;
  const cap=cfg.cap!=null?cfg.cap:.75;
  const denom=a+kL*lv+kF;
  if(denom<=0)return 0;
  return Math.min(cap,a/denom);
}

/**
 * 近战命中表各档概率（百分比），之和应为 100（经归一）
 * 顺序：miss → dodge → parry → glancing → block → crit → hit
 */
function meleeTable(attacker,target,opts){
  opts=opts||{};
  const M=_sim().melee||{};
  const delta=Math.max(0,levelDelta(attacker.level,target.level));
  let miss=_pick(M.miss,delta);
  let dodge=Math.max(0,(target.dodgePct||0)+_pick(M.dodgeExtra,delta));
  let parry=_pick(M.parry,delta);
  if(opts.noParry)parry=0;
  let glancing=delta>0?_pick(M.glancing,delta):0;
  let block=_pick(M.block,delta);
  if(opts.noBlock)block=0;
  let crit=Math.max(0,(attacker.critPct||5)-_pick(M.critSuppress,delta));
  /* 依次占用；剩余为 hit */
  const parts={miss,dodge,parry,glancing,block,crit};
  let used=0;
  const order=["miss","dodge","parry","glancing","block","crit"];
  const out={};
  for(const k of order){
    const v=Math.max(0,parts[k]);
    const take=Math.min(v,Math.max(0,100-used));
    out[k]=take;
    used+=take;
  }
  out.hit=Math.max(0,100-used);
  out.delta=delta;
  out.glancingMul=_pick(M.glancingMul,delta);
  out.critMul=M.critMul!=null?M.critMul:2;
  return out;
}

function spellHitChance(attackerLevel,targetLevel){
  const S=_sim().spell||{};
  const delta=Math.max(0,levelDelta(attackerLevel,targetLevel));
  return _pick(S.hit,delta);
}

/**
 * @param {object} attacker {level,critPct,apDmgMul?,dmgMul?}
 * @param {object} target {level,dodgePct,armor?}
 * @param {object} opts {base, school:'physical'|'spell', rng, weapon?}
 * @returns {{outcome,damage,mitigated,raw,table}}
 */
function rollMeleeAttack(attacker,target,opts){
  opts=opts||{};
  if(typeof opts.rng!=="function")
    throw new Error("rollMeleeAttack: rng must be injected");
  const rng=opts.rng;
  const table=meleeTable(attacker,target,opts);
  const roll=rng()*100;
  let acc=0;
  const order=["miss","dodge","parry","glancing","block","crit","hit"];
  let outcome="hit";
  for(const k of order){
    acc+=table[k]||0;
    if(roll<acc){outcome=k;break;}
  }
  if(outcome==="miss"||outcome==="dodge"||outcome==="parry"){
    return{outcome,damage:0,mitigated:0,raw:0,table,roll};
  }
  let raw=opts.base|0;
  const mulA=(attacker.apDmgMul!=null?attacker.apDmgMul:1)*(attacker.dmgMul!=null?attacker.dmgMul:1);
  const reb=(_sim().rebalance&&_sim().rebalance.outgoingMul)||1;
  raw=Math.round(raw*mulA*reb);
  if(outcome==="crit")raw=Math.round(raw*(table.critMul||2));
  if(outcome==="glancing")raw=Math.round(raw*(table.glancingMul||.65));
  if(outcome==="block")raw=Math.max(0,Math.round(raw*.7));

  const red=armorReduction(target.armor||0,attacker.level);
  const mitigated=Math.round(raw*red);
  const damage=Math.max(0,raw-mitigated);
  return{outcome,damage,mitigated,raw,table,roll,armorRed:red};
}

function rollSpellAttack(attacker,target,opts){
  opts=opts||{};
  if(typeof opts.rng!=="function")
    throw new Error("rollSpellAttack: rng must be injected");
  const rng=opts.rng;
  const hitPct=spellHitChance(attacker.level,target.level);
  const Sp=_sim().spell||{};
  const critMul=Sp.critMul!=null?Sp.critMul:1.5;
  if(rng()*100>=hitPct){
    return{outcome:"miss",damage:0,mitigated:0,raw:0,hitPct,roll:null};
  }
  let critPct=attacker.critPct||5;
  const delta=Math.max(0,levelDelta(attacker.level,target.level));
  /* 法术暴击简易：高等级略压 */
  critPct=Math.max(0,critPct-delta);
  const isCrit=rng()*100<critPct;
  let raw=opts.base|0;
  const mulA=(attacker.apDmgMul!=null?attacker.apDmgMul:1)*(attacker.dmgMul!=null?attacker.dmgMul:1);
  const reb=(_sim().rebalance&&_sim().rebalance.outgoingMul)||1;
  raw=Math.round(raw*mulA*reb);
  if(isCrit)raw=Math.round(raw*critMul);
  /* 法术默认无视护甲（初版多数直伤） */
  return{outcome:isCrit?"crit":"hit",damage:raw,mitigated:0,raw,hitPct,critPct};
}

/** 统一入口：school==='spell' 走法术表，否则近战表 */
function rollAttack(attacker,target,opts){
  opts=opts||{};
  if(opts.school==="spell"||opts.school==="holy"||opts.school==="fire"||
     opts.school==="frost"||opts.school==="nature"||opts.school==="shadow"){
    return rollSpellAttack(attacker,target,opts);
  }
  return rollMeleeAttack(attacker,target,opts);
}
