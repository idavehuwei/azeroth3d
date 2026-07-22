/* ============================================================
   炽心 · js/sim/xp.js
   plan-V3 C6：经验曲线 / 等级差修正 / 灰色线 / 休息池（纯函数）
   依赖：SIM_CONTENT.xp 或 BAL.sim.xp
   导出：getXpCurve xpToNext isGreyMob xpLevelMul baseMobXp
         scaledMobXp applyRestXp restPoolCap
   ============================================================ */
"use strict";

function _xpCfg(){
  if(typeof SIM_CONTENT!=="undefined"&&SIM_CONTENT.xp)return SIM_CONTENT.xp;
  if(typeof BAL!=="undefined"&&BAL.sim&&BAL.sim.xp)return BAL.sim.xp;
  return{};
}

function getXpCurve(){
  const c=_xpCfg().XP_CURVE;
  if(c&&c.length)return c;
  if(typeof BAL!=="undefined"&&BAL.levels&&BAL.levels.xpMax)return BAL.levels.xpMax;
  return[400,900,1400,2100,2800,3600,4500,5600,6900,8400,10000,12000,14400,17200,20400,24000,28000];
}

/** 从 level 升到 level+1 所需（level 从 1 起） */
function xpToNext(level){
  const curve=getXpCurve();
  const i=Math.max(0,(level|0)-1);
  return curve[i]!=null?curve[i]:curve[curve.length-1];
}

function maxXpLevel(){
  const cfg=_xpCfg();
  if(cfg.maxLevel)return cfg.maxLevel|0;
  return getXpCurve().length+1;
}

/** 灰色线：player - mob >= greyBelow → 零经验（验收：6 级打 1 级猪） */
function isGreyMob(playerLevel,mobLevel,cfg){
  cfg=cfg||_xpCfg();
  const pl=playerLevel|0, ml=mobLevel|0;
  const below=cfg.greyBelow!=null?cfg.greyBelow:5;
  return(pl-ml)>=below;
}

function xpLevelMul(playerLevel,mobLevel,cfg){
  cfg=cfg||_xpCfg();
  if(isGreyMob(playerLevel,mobLevel,cfg))return 0;
  const diff=(mobLevel|0)-(playerLevel|0);
  const tab=cfg.diffMul||{};
  const key=String(Math.max(-4,Math.min(3,diff)));
  if(tab[key]!=null)return tab[key];
  if(diff>3)return tab["3"]!=null?tab["3"]:1.4;
  if(diff<-4)return 0;
  return 1;
}

function baseMobXp(mobLevel,cfg){
  cfg=cfg||_xpCfg();
  const b=cfg.mobBase!=null?cfg.mobBase:45;
  const p=cfg.mobPerLevel!=null?cfg.mobPerLevel:5;
  return b+p*(mobLevel|0);
}

/**
 * @param {number} playerLevel
 * @param {number} mobLevel
 * @param {{elite?,worldBoss?,overrideBase?}} opts
 */
function scaledMobXp(playerLevel,mobLevel,opts){
  opts=opts||{};
  const cfg=_xpCfg();
  const mul=xpLevelMul(playerLevel,mobLevel,cfg);
  if(mul<=0)return 0;
  let xp=opts.overrideBase!=null?opts.overrideBase:baseMobXp(mobLevel,cfg);
  xp*=mul;
  if(opts.worldBoss)xp*=(cfg.worldBossMul!=null?cfg.worldBossMul:2.5);
  else if(opts.elite)xp*=(cfg.eliteMul!=null?cfg.eliteMul:2);
  return Math.max(0,Math.round(xp));
}

function restPoolCap(xpMax,cfg){
  cfg=(cfg||_xpCfg()).rest||{};
  const mul=cfg.maxMulOfBar!=null?cfg.maxMulOfBar:1.5;
  return Math.max(0,Math.round((xpMax||1)*mul));
}

/**
 * 把基础经验与休息池合成：最多双倍，消耗 rest
 * @returns {{total,base,bonus,restLeft}}
 */
function applyRestXp(baseAmount,restXp,xpMax){
  const base=Math.max(0,Math.round(baseAmount));
  let rest=Math.max(0,restXp|0);
  const bonus=Math.min(base,rest);
  rest-=bonus;
  const cap=restPoolCap(xpMax);
  if(rest>cap)rest=cap;
  return{total:base+bonus,base,bonus,restLeft:rest};
}

/** 离线小时 → 休息经验增量 */
function restFromOfflineHours(hours,xpMax,cfg){
  cfg=(cfg||_xpCfg()).rest||{};
  const capH=cfg.offlineCapHours!=null?cfg.offlineCapHours:48;
  const per=cfg.offlinePerHour!=null?cfg.offlinePerHour:.08;
  const h=Math.max(0,Math.min(capH,hours||0));
  return Math.round((xpMax||1)*per*h);
}
