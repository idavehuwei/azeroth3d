/* ============================================================
   炽心 · js/sim/stats.js
   plan-V3 C3：五属性派生（纯函数，零 DOM / 零渲染库）
   依赖：SIM_CONTENT（可选；缺省用内嵌默认）
   导出：emptyStats cloneStats hpFromStamina manaFromInt attackPower
         critFromAgi dodgeFromAgi armorFromAgi deriveStats mergeStats
   ============================================================ */
"use strict";

function _simStatsCfg(){
  if(typeof SIM_CONTENT!=="undefined"&&SIM_CONTENT.stats)return SIM_CONTENT.stats;
  if(typeof BAL!=="undefined"&&BAL.sim&&BAL.sim.stats)return BAL.sim.stats;
  return{
    staBase:20,staPer:1,staOverPer:10,
    intBase:20,intPer:1,intOverPer:15,
    armorFromAgi:2,baseCrit:5,baseDodge:5,
    apDiv:1400,apMulMax:.55,
    ap:{warrior:{strMul:2,agiMul:0,lvlMul:3,base:0,offset:20}},
    critAgiPer:{warrior:20},dodgeAgiPer:{warrior:20}
  };
}

function emptyStats(level){
  return{str:0,agi:0,sta:0,int:0,spi:0,armor:0,level:level!=null?level:1};
}

function cloneStats(s){
  s=s||emptyStats();
  return{
    str:s.str|0,agi:s.agi|0,sta:s.sta|0,int:s.int|0,spi:s.spi|0,
    armor:s.armor|0,level:s.level!=null?s.level:1
  };
}

function mergeStats(a,b){
  const o=cloneStats(a);
  if(!b)return o;
  o.str+=b.str|0;o.agi+=b.agi|0;o.sta+=b.sta|0;o.int+=b.int|0;o.spi+=b.spi|0;
  o.armor+=b.armor|0;
  if(b.level!=null)o.level=b.level;
  return o;
}

/** 前 staBase 点每点 +staPer，超出每点 +staOverPer */
function hpFromStamina(sta,cfg){
  cfg=cfg||_simStatsCfg();
  const s=Math.max(0,sta|0);
  const base=cfg.staBase!=null?cfg.staBase:20;
  const per=cfg.staPer!=null?cfg.staPer:1;
  const over=cfg.staOverPer!=null?cfg.staOverPer:10;
  if(s<=base)return s*per;
  return base*per+(s-base)*over;
}

function manaFromInt(intel,cfg){
  cfg=cfg||_simStatsCfg();
  const n=Math.max(0,intel|0);
  const base=cfg.intBase!=null?cfg.intBase:20;
  const per=cfg.intPer!=null?cfg.intPer:1;
  const over=cfg.intOverPer!=null?cfg.intOverPer:15;
  if(n<=base)return n*per;
  return base*per+(n-base)*over;
}

function attackPower(stats,cls,cfg){
  cfg=cfg||_simStatsCfg();
  stats=stats||emptyStats();
  const tab=(cfg.ap&&cfg.ap[cls])||cfg.ap&&cfg.ap.warrior||{strMul:2,agiMul:0,lvlMul:3,base:0,offset:20};
  const lv=stats.level!=null?stats.level:1;
  return Math.max(0,Math.round(
    (stats.str|0)*(tab.strMul||0)+
    (stats.agi|0)*(tab.agiMul||0)+
    lv*(tab.lvlMul||0)+
    (tab.base||0)-
    (tab.offset||0)
  ));
}

function critFromAgi(agi,cls,cfg){
  cfg=cfg||_simStatsCfg();
  const per=(cfg.critAgiPer&&cfg.critAgiPer[cls])||20;
  const base=cfg.baseCrit!=null?cfg.baseCrit:5;
  return base+(Math.max(0,agi|0)/Math.max(1,per));
}

function dodgeFromAgi(agi,cls,cfg){
  cfg=cfg||_simStatsCfg();
  const per=(cfg.dodgeAgiPer&&cfg.dodgeAgiPer[cls])||20;
  const base=cfg.baseDodge!=null?cfg.baseDodge:5;
  return base+(Math.max(0,agi|0)/Math.max(1,per));
}

function armorFromAgi(agi,cfg){
  cfg=cfg||_simStatsCfg();
  const mul=cfg.armorFromAgi!=null?cfg.armorFromAgi:2;
  return Math.max(0,(agi|0)*mul);
}

/**
 * 派生战斗数值
 * @returns {{ap,critPct,dodgePct,armor,hpBonus,manaBonus,apDmgMul}}
 */
function deriveStats(stats,cls,cfg){
  cfg=cfg||_simStatsCfg();
  stats=cloneStats(stats);
  const ap=attackPower(stats,cls,cfg);
  const critPct=critFromAgi(stats.agi,cls,cfg);
  const dodgePct=dodgeFromAgi(stats.agi,cls,cfg);
  const armor=(stats.armor|0)+armorFromAgi(stats.agi,cfg);
  const hpBonus=hpFromStamina(stats.sta,cfg);
  const manaBonus=manaFromInt(stats.int,cfg);
  const div=cfg.apDiv!=null?cfg.apDiv:1400;
  const cap=cfg.apMulMax!=null?cfg.apMulMax:.55;
  const apDmgMul=1+Math.min(cap,ap/Math.max(1,div));
  return{ap,critPct,dodgePct,armor,hpBonus,manaBonus,apDmgMul,stats};
}
