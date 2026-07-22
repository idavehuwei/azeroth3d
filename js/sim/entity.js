/* ============================================================
   炽心 · js/sim/entity.js
   plan-V3 C3/C4 · plan-v4 STEP 14：纯结算（无飘字 / 无 DOM）
   依赖：formulas.js（rollAttack）· stats.js（deriveStats，可选）
   导出：settleDamage buildAttackerCtx buildTargetCtx
         applyAbsorbShield applyEntityHpDamage allocEntityId
   表现由 combat.hitEntity 注入；随机一律走注入的 rng
   ============================================================ */
"use strict";

/**
 * 纯数据实体 id（plan-v4 STEP 14）。表现层 mesh/label 通过同一 id 关联。
 * 放在 entity.js，供 world/raid 无 DOM 分配。
 */
let _simEntSeq=0;
function allocEntityId(prefix){
  _simEntSeq=(_simEntSeq+1)|0;
  return String(prefix||"ent")+"_"+_simEntSeq;
}

function buildAttackerCtx(p,clsKey,derived){
  p=p||{};
  derived=derived||{};
  return{
    level:p.level!=null?p.level:1,
    critPct:derived.critPct!=null?derived.critPct:5,
    dodgePct:derived.dodgePct!=null?derived.dodgePct:5,
    armor:derived.armor!=null?derived.armor:0,
    apDmgMul:derived.apDmgMul!=null?derived.apDmgMul:1,
    dmgMul:(p.debugMul!=null?p.debugMul:1)*(p.dmgMul!=null?p.dmgMul:1),
    cls:clsKey||"warrior"
  };
}

function buildTargetCtx(ent){
  ent=ent||{};
  const st=ent.statsBlock||ent.simStats||null;
  let level=ent.level!=null?ent.level:1;
  if(ent.type==="boss"&&ent.level==null)level=20;
  let armor=0,dodgePct=5;
  if(st){
    if(typeof deriveStats==="function"){
      const d=deriveStats(st,ent.cls||"warrior");
      armor=d.armor;dodgePct=d.dodgePct;
    }else{
      armor=(st.armor|0)+((st.agi|0)*2);
    }
  }else if(ent.armor!=null)armor=ent.armor|0;
  /* Boss / 精英默认更高护甲 */
  if(ent.elite)armor=Math.max(armor,200);
  if(ent.type==="boss"||ent.kind==="boss")armor=Math.max(armor,600);
  return{level,armor,dodgePct,critPct:5};
}

/**
 * 吸收盾先于生命（纯数据）。
 * @param {object} shieldOwner {absorb, absorbT?}
 * @param {number} amount
 * @returns {{amount:number, absorbed:number, shieldBroken:boolean}}
 */
function applyAbsorbShield(shieldOwner,amount){
  amount=amount|0;
  if(!shieldOwner||!(shieldOwner.absorb>0)||amount<=0)
    return{amount:amount,absorbed:0,shieldBroken:false};
  const absorbed=Math.min(shieldOwner.absorb|0,amount);
  shieldOwner.absorb=(shieldOwner.absorb|0)-absorbed;
  amount-=absorbed;
  const shieldBroken=shieldOwner.absorb<=0;
  if(shieldBroken){
    shieldOwner.absorb=0;
    if(shieldOwner.absorbT!=null)shieldOwner.absorbT=0;
  }
  return{amount:amount,absorbed:absorbed,shieldBroken:shieldBroken};
}

/**
 * 唯一纯扣血形态（plan-v4 基线 #1 / STEP 14）。
 * @returns {{hp:number, died:boolean, dealt:number}}
 */
function applyEntityHpDamage(ent,amount){
  amount=Math.max(0,amount|0);
  if(!ent||amount<=0)return{hp:ent?ent.hp|0:0,died:false,dealt:0};
  ent.hp=Math.max(0,(ent.hp|0)-amount);
  return{hp:ent.hp,died:ent.hp<=0,dealt:amount};
}

/**
 * @param {object} args {base,attacker,target,school,rng,god,godDmg,variance}
 * @returns rollAttack 结果；god 时跳过掷骰
 */
function settleDamage(args){
  args=args||{};
  if(args.god){
    const d=args.godDmg!=null?args.godDmg:5000;
    return{outcome:"hit",damage:d,mitigated:0,raw:d,god:true};
  }
  let base=args.base|0;
  if(args.variance&&args.variance.length===2){
    if(typeof args.rng!=="function")
      throw new Error("settleDamage: rng must be injected when variance is set");
    const a=args.variance[0],b=args.variance[1];
    const rng=args.rng;
    base=Math.round(base*(a+rng()*(b-a)));
  }
  if(typeof rollAttack!=="function"){
    return{outcome:"hit",damage:base,mitigated:0,raw:base};
  }
  if(typeof args.rng!=="function")
    throw new Error("settleDamage: rng must be injected");
  return rollAttack(args.attacker||{},args.target||{},{
    base,school:args.school||"physical",rng:args.rng
  });
}
