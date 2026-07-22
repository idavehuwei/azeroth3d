/* ============================================================
   炽心 · buffs.js
   Buff / Debuff 条（V1-C3）：注册表 + HUD 剩余时间
   玩法计时仍由既有字段驱动（absorbT / weaknessT / fear / whetstoneT / eating）
   本模块：applyBuff 写入字段 · tickBuffs 同步 HUD · 磨刀石倒计时迁入此处
   ------------------------------------------------------------
   [依赖] core.js（BAL $）· combat.js（S）· icons.js（Icons）
          运行时：clearShieldVisual · log
   [导出] BUFF_DEFS applyBuff removeBuff hasBuff tickBuffs
          renderBuffHud syncBuffsFromLegacy clearAllBuffs
   ============================================================ */
"use strict";

S.buffs={};

/** 静态定义：图标 / 种类 / 显示名（时长来自调用方或 BAL） */
const BUFF_DEFS={
  power_word_shield:{kind:"buff",  icon:"holy_shield", name:"真言术：盾"},
  weakness         :{kind:"debuff",icon:"weakness",    name:"虚弱"},
  fear             :{kind:"debuff",icon:"fear",        name:"恐惧"},
  whetstone        :{kind:"buff",  icon:"whetstone",   name:"磨刀石"},
  eating           :{kind:"buff",  icon:"bread",       name:"进食"},
  drinking         :{kind:"buff",  icon:"potion",      name:"饮水"},
};

function hasBuff(id){
  if(S.buffs&&S.buffs[id]&&S.buffs[id].t>0)return true;
  if(id==="power_word_shield")return S.p.absorb>0&&S.p.absorbT>0;
  if(id==="weakness")return S.p.weaknessT>0;
  if(id==="fear")return !!(S.p.fear&&S.p.fear.t>0);
  if(id==="whetstone")return S.p.whetstoneT>0;
  if(id==="eating")return !!(S.p.eating&&S.p.eating.t>0);
  if(id==="drinking")return !!(S.p.drinking&&S.p.drinking.t>0);
  return false;
}

/**
 * 施加持续效果：写入对应 S.p 字段，并刷新 HUD。
 * opts: {duration, absorb?, dmgMulAdd?, healPerSec?, name?, icon?}
 */
function applyBuff(id,opts){
  opts=opts||{};
  const def=BUFF_DEFS[id];
  if(!def)return false;
  const duration=opts.duration!=null?+opts.duration:0;
  switch(id){
    case"power_word_shield":
      S.p.absorb=opts.absorb|0;
      S.p.absorbT=duration;
      break;
    case"weakness":
      S.p.weaknessT=duration;
      break;
    case"fear":
      S.p.fear={t:duration};
      break;
    case"whetstone":{
      if(S.p.whetstoneT>0&&S.p.whetstoneAdd)S.p.dmgMul-=S.p.whetstoneAdd;
      const add=opts.dmgMulAdd!=null?+opts.dmgMulAdd:0;
      S.p.whetstoneAdd=add;
      S.p.dmgMul+=add;
      S.p.whetstoneT=duration;
      break;
    }
    case"eating":
      S.p.eating={
        t:duration,
        healPerSec:opts.healPerSec||0,
        name:opts.name||def.name,
      };
      break;
    case"drinking":
      S.p.drinking={
        t:duration,
        manaPerSec:opts.manaPerSec||0,
        name:opts.name||def.name,
      };
      break;
    default:return false;
  }
  syncBuffsFromLegacy();
  renderBuffHud();
  return true;
}

/**
 * 移除效果。silent 时跳过结束提示（换职/读档/死亡）。
 */
function removeBuff(id,reason,silent){
  const def=BUFF_DEFS[id];
  switch(id){
    case"power_word_shield":
      S.p.absorb=0;S.p.absorbT=0;
      if(typeof clearShieldVisual==="function")clearShieldVisual();
      break;
    case"weakness":
      if(S.p.weaknessT>0&&!silent)log("虚弱效果结束。","lg-sys");
      S.p.weaknessT=0;
      break;
    case"fear":
      S.p.fear=null;
      break;
    case"whetstone":
      if(S.p.whetstoneT>0&&S.p.whetstoneAdd){
        S.p.dmgMul-=S.p.whetstoneAdd;
        if(!silent)log("磨刀石效果结束。","lg-sys");
      }
      S.p.whetstoneAdd=0;S.p.whetstoneT=0;
      break;
    case"eating":
      if(S.p.eating&&!silent&&reason==="interrupt")log("进食被打断。","lg-sys");
      S.p.eating=null;
      break;
    case"drinking":
      if(S.p.drinking&&!silent&&reason==="interrupt")log("饮水被打断。","lg-sys");
      S.p.drinking=null;
      break;
    default:break;
  }
  if(S.buffs)delete S.buffs[id];
  renderBuffHud();
}

/** 从既有计时字段重建 S.buffs（显示源） */
function syncBuffsFromLegacy(){
  const next={};
  if(S.p.absorb>0&&S.p.absorbT>0){
    const d=BUFF_DEFS.power_word_shield;
    next.power_word_shield={id:"power_word_shield",kind:d.kind,icon:d.icon,name:d.name,
      t:S.p.absorbT,absorb:S.p.absorb};
  }
  if(S.p.weaknessT>0){
    const d=BUFF_DEFS.weakness;
    next.weakness={id:"weakness",kind:d.kind,icon:d.icon,name:d.name,t:S.p.weaknessT};
  }
  if(S.p.fear&&S.p.fear.t>0){
    const d=BUFF_DEFS.fear;
    next.fear={id:"fear",kind:d.kind,icon:d.icon,name:d.name,t:S.p.fear.t};
  }
  if(S.p.whetstoneT>0){
    const d=BUFF_DEFS.whetstone;
    next.whetstone={id:"whetstone",kind:d.kind,icon:d.icon,name:d.name,t:S.p.whetstoneT};
  }
  if(S.p.eating&&S.p.eating.t>0){
    const d=BUFF_DEFS.eating;
    next.eating={id:"eating",kind:d.kind,icon:d.icon,
      name:S.p.eating.name||d.name,t:S.p.eating.t};
  }
  if(S.p.drinking&&S.p.drinking.t>0){
    const d=BUFF_DEFS.drinking;
    next.drinking={id:"drinking",kind:d.kind,icon:d.icon,
      name:S.p.drinking.name||d.name,t:S.p.drinking.t};
  }
  S.buffs=next;
}

function clearAllBuffs(reason){
  removeBuff("power_word_shield",reason,true);
  removeBuff("weakness",reason,true);
  removeBuff("fear",reason,true);
  removeBuff("whetstone",reason,true);
  removeBuff("eating",reason,true);
  removeBuff("drinking",reason,true);
}

/** 磨刀石倒计时（自 professions 迁入）+ 同步 HUD */
function tickBuffs(dt){
  if(S.p.whetstoneT>0){
    S.p.whetstoneT=Math.max(0,S.p.whetstoneT-dt);
    if(S.p.whetstoneT<=0&&S.p.whetstoneAdd){
      S.p.dmgMul-=S.p.whetstoneAdd;
      S.p.whetstoneAdd=0;
      log("磨刀石效果结束。","lg-sys");
    }
  }
  syncBuffsFromLegacy();
  renderBuffHud();
}

function renderBuffHud(){
  const row=typeof $==="function"?$("#buffRow"):document.getElementById("buffRow");
  if(!row)return;
  const list=Object.values(S.buffs||{});
  list.sort((a,b)=>{
    const ka=a.kind==="debuff"?1:0,kb=b.kind==="debuff"?1:0;
    return ka-kb||String(a.id).localeCompare(String(b.id));
  });
  row.innerHTML="";
  for(const b of list){
    const el=document.createElement("div");
    el.className="buff-ic"+(b.kind==="debuff"?" debuff":" buff");
    const sec=Math.max(1,Math.ceil(b.t));
    el.title=(b.name||b.id)+" · "+sec+"s"+(b.absorb!=null?" · 吸收 "+Math.round(b.absorb):"");
    const img=document.createElement("img");
    img.alt=b.name||"";
    const border=b.kind==="debuff"?"#c04040":"#e8b34a";
    if(typeof Icons!=="undefined")img.src=Icons.get(b.icon||"sword",border);
    const tEl=document.createElement("span");
    tEl.className="buff-t";
    tEl.textContent=String(sec);
    el.appendChild(img);
    el.appendChild(tEl);
    if(b.absorb!=null&&b.absorb>0){
      const st=document.createElement("span");
      st.className="buff-st";
      st.textContent=String(Math.round(b.absorb));
      el.appendChild(st);
    }
    row.appendChild(el);
  }
}

console.info("[buffs] V1-C3 就绪：applyBuff / tickBuffs / #buffRow");
