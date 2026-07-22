/* ============================================================
   炽心 · js/sim/entity.js
   plan-V3 C3/C4：纯结算（无飘字）；表现由 combat.hitEntity 注入
   依赖：formulas.js（rollAttack）· stats.js（deriveStats，可选）
   导出：settleDamage buildAttackerCtx buildTargetCtx
   ============================================================ */
"use strict";

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
    const a=args.variance[0],b=args.variance[1];
    const rng=typeof args.rng==="function"?args.rng:Math.random;
    base=Math.round(base*(a+rng()*(b-a)));
  }
  if(typeof rollAttack!=="function"){
    return{outcome:"hit",damage:base,mitigated:0,raw:base};
  }
  return rollAttack(args.attacker||{},args.target||{},{
    base,school:args.school||"physical",rng:args.rng
  });
}
