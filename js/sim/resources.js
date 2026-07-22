/* ============================================================
   炽心 · js/sim/resources.js
   plan-V3 C5：怒气换算 / 法力五秒规则 / 能量 tick / 连击点 / GCD
   纯函数 + 轻量状态机；表现层在 combat/main 调用
   依赖：SIM_CONTENT 或 BAL.sim
   导出：rageConstant rageFromDamage gcdDuration
         createResourceState tickResources applyManaSpend markCombat
         addComboPoints clearComboPoints getComboPoints spendComboPoints
   ============================================================ */
"use strict";

function _res(){
  if(typeof SIM_CONTENT!=="undefined"&&SIM_CONTENT.resources)return SIM_CONTENT.resources;
  if(typeof BAL!=="undefined"&&BAL.sim&&BAL.sim.resources)return BAL.sim.resources;
  return{};
}

function rageConstant(level,cfg){
  cfg=cfg||_res().rage||{};
  const L=Math.max(1,level|0);
  const a=cfg.a!=null?cfg.a:.0091;
  const b=cfg.b!=null?cfg.b:3.23;
  const c=cfg.c0!=null?cfg.c0:4.27;
  return a*L*L+b*L+c;
}

/** 造成 / 受到伤害换算怒气 */
function rageFromDamage(damage,level,kind,cfg){
  cfg=cfg||_res().rage||{};
  const c=rageConstant(level,cfg);
  if(c<=0)return 0;
  const coef=kind==="take"
    ?(cfg.takeCoef!=null?cfg.takeCoef:2.5)
    :(cfg.dealCoef!=null?cfg.dealCoef:7.5);
  return Math.max(0,(coef*Math.max(0,damage))/c);
}

function gcdDuration(resKind,cfg){
  cfg=cfg||_res().gcd||{};
  if(resKind==="energy"||resKind==="能量")
    return cfg.energy!=null?cfg.energy:1;
  return cfg.default!=null?cfg.default:1.5;
}

function createResourceState(){
  return{
    inCombat:false,
    combatT:0,
    manaFsr:0,
    energyAcc:0,
    combo:0,
    eatingMana:false,
    queuedSkill:-1
  };
}

/**
 * @param {object} p 玩家状态（读写 rage/rageMax）
 * @param {object} rs createResourceState()
 * @param {object} ctx {dt,clsKey,resKind,regen,spi,level,sitting}
 */
function tickResources(p,rs,ctx){
  if(!p||!rs||!ctx)return;
  const dt=ctx.dt||0;
  const Rcfg=_res();
  const timeout=Rcfg.combatTimeout!=null?Rcfg.combatTimeout:5;
  rs.combatT+=dt;
  if(rs.combatT>=timeout)rs.inCombat=false;

  const kind=ctx.resKind||"rage";

  if(kind==="怒气"||kind==="rage"){
    const rg=Rcfg.rage||{};
    if(!rs.inCombat&&rs.combatT>(rg.oocDelay!=null?rg.oocDelay:3)){
      const decay=rg.decayPerSec!=null?rg.decayPerSec:1.25;
      p.rage=Math.max(0,p.rage-decay*dt);
    }
    return;
  }

  if(kind==="法力"||kind==="mana"){
    rs.manaFsr=Math.max(0,rs.manaFsr-dt);
    const M=Rcfg.mana||{};
    let rate=0;
    if(rs.manaFsr<=0){
      const spi=ctx.spi|0;
      const per=M.spiritRegenPer!=null?M.spiritRegenPer:4;
      rate=spi/Math.max(1,per);
      if(ctx.regen)rate=Math.max(rate,ctx.regen);
    }else{
      rate=0;
    }
    if((ctx.sitting||rs.eatingMana)&&rs.manaFsr<=0){
      const mul=M.sittingMul!=null?M.sittingMul:2.2;
      rate*=mul;
    }
    p.rage=Math.min(p.rageMax,p.rage+rate*dt);
    return;
  }

  const E=Rcfg.energy||{};
  if(E.useTick!==false){
    rs.energyAcc+=dt;
    const every=E.tickEvery!=null?E.tickEvery:2;
    const gain=E.tickGain!=null?E.tickGain:20;
    while(rs.energyAcc>=every){
      rs.energyAcc-=every;
      p.rage=Math.min(p.rageMax,p.rage+gain);
    }
  }else if(ctx.regen){
    p.rage=Math.min(p.rageMax,p.rage+ctx.regen*dt);
  }
}

function markCombat(rs){
  if(!rs)return;
  rs.inCombat=true;
  rs.combatT=0;
}

function applyManaSpend(rs,cfg){
  cfg=cfg||_res().mana||{};
  if(!rs)return;
  rs.manaFsr=cfg.fiveSecRule!=null?cfg.fiveSecRule:5;
  markCombat(rs);
}

function addComboPoints(rs,n,cfg){
  cfg=cfg||_res().combo||{};
  if(!rs)return 0;
  const max=cfg.max!=null?cfg.max:5;
  rs.combo=Math.min(max,(rs.combo|0)+(n|0));
  return rs.combo;
}

function clearComboPoints(rs){
  if(rs)rs.combo=0;
}

function getComboPoints(rs){
  return rs?rs.combo|0:0;
}
/** 读取并清空连击点（终结技） */
function spendComboPoints(rs){
  const n=getComboPoints(rs);
  clearComboPoints(rs);
  return n;
}
