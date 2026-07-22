/* ============================================================
   炽心 · js/sim/auras.js
   plan-v4 STEP 16：统一光环引擎（纯数据，零 DOM / 零渲染库）
   结构：{id, name, kind, type, remaining, tick, tickAcc, stacks, absorb, dmgMulAdd, …}
   类型：dot / hot / absorb / crowd(rooted) / invuln / stat
   依赖：SIM_CONTENT.auras（可选）
   导出：getAuraDef ensureAuras applyAura removeAura hasAura getAura
         tickAuras listAuras syncLegacyCrowdFlags clearAllAuras
   ============================================================ */
"use strict";

function _auraCfg(){
  if(typeof SIM_CONTENT!=="undefined"&&SIM_CONTENT.auras)return SIM_CONTENT.auras;
  if(typeof BAL!=="undefined"&&BAL.sim&&BAL.sim.auras)return BAL.sim.auras;
  return{};
}

function getAuraDef(id){
  const tab=_auraCfg();
  return tab&&tab[id]?tab[id]:null;
}

function ensureAuras(ent){
  if(!ent)return[];
  if(!ent.auras)ent.auras=[];
  return ent.auras;
}

function getAura(ent,id){
  const list=ensureAuras(ent);
  for(let i=0;i<list.length;i++){
    if(list[i]&&list[i].id===id)return list[i];
  }
  return null;
}

function hasAura(ent,id){
  const a=getAura(ent,id);
  return !!(a&&a.remaining>0);
}

function listAuras(ent){
  return ensureAuras(ent).filter(function(a){return a&&a.remaining>0;});
}

/**
 * 施加 / 刷新光环。
 * opts: {duration, stacks, absorb, dmgPerTick, healPerSec, dmgMulAdd, dmgTakenMul, maxStacks, silent, speedMul, refresh}
 * @returns {object|null} aura 实例
 */
function applyAura(ent,id,opts){
  opts=opts||{};
  if(!ent||!id)return null;
  const def=getAuraDef(id)||{};
  const list=ensureAuras(ent);
  let a=getAura(ent,id);
  const dur=opts.duration!=null?+opts.duration:(def.dur!=null?+def.dur:0);
  const maxSt=opts.maxStacks!=null?opts.maxStacks:(def.maxStacks!=null?def.maxStacks:1);
  const addStacks=opts.stacks!=null?Math.max(1,opts.stacks|0):1;

  if(!a){
    a={
      id:id,
      name:opts.name||def.name||id,
      kind:def.kind||"buff",
      type:def.type||"stat",
      icon:opts.icon||def.icon||null,
      remaining:Math.max(0,dur),
      durMax:Math.max(0,dur),
      tick:def.tick!=null?+def.tick:(opts.tick!=null?+opts.tick:0),
      tickAcc:0,
      stacks:Math.min(maxSt,addStacks),
      maxStacks:maxSt,
      absorb:0,
      dmgPerTick:opts.dmgPerTick!=null?+opts.dmgPerTick:(def.dmgPerTick!=null?+def.dmgPerTick:0),
      healPerSec:opts.healPerSec!=null?+opts.healPerSec:(def.healPerSec!=null?+def.healPerSec:0),
      dmgMulAdd:opts.dmgMulAdd!=null?+opts.dmgMulAdd:(def.dmgMulAdd!=null?+def.dmgMulAdd:0),
      dmgTakenMul:opts.dmgTakenMul!=null?+opts.dmgTakenMul:(def.dmgTakenMul!=null?+def.dmgTakenMul:null),
      speedMul:opts.speedMul!=null?+opts.speedMul:(def.speedMul!=null?+def.speedMul:null),
      flag:def.flag||null
    };
    list.push(a);
  }else{
    a.remaining=opts.refresh?Math.max(0,dur):Math.max(a.remaining,dur);
    a.durMax=Math.max(a.durMax,dur);
    a.stacks=Math.min(maxSt,(a.stacks|0)+addStacks);
    if(opts.dmgPerTick!=null)a.dmgPerTick=+opts.dmgPerTick;
    if(opts.healPerSec!=null)a.healPerSec=+opts.healPerSec;
    if(opts.dmgMulAdd!=null)a.dmgMulAdd=+opts.dmgMulAdd;
    if(opts.dmgTakenMul!=null)a.dmgTakenMul=+opts.dmgTakenMul;
    if(opts.speedMul!=null)a.speedMul=+opts.speedMul;
  }

  if(a.type==="absorb"||def.type==="absorb"){
    const abs=opts.absorb!=null?opts.absorb|0:a.absorb|0;
    a.absorb=Math.max(a.absorb|0,abs);
    ent.absorb=a.absorb;
    ent.absorbT=a.remaining;
  }
  if(a.type==="crowd"&&(a.flag==="rooted"||def.flag==="rooted")){
    ent.rootT=Math.max(ent.rootT|0,a.remaining);
  }
  if(a.type==="crowd"&&(a.flag==="slowed"||def.flag==="slowed")){
    ent.slowT=Math.max(ent.slowT|0,a.remaining);
    const sm=a.speedMul!=null?a.speedMul:(def.speedMul!=null?+def.speedMul:.5);
    ent.slowMul=sm;
  }
  if(a.type==="invuln"){
    ent.invuln=Math.max(ent.invuln|0,a.remaining);
  }
  if(a.type==="stat"&&a.dmgMulAdd&&!a._statApplied){
    if(ent.dmgMul!=null)ent.dmgMul+=a.dmgMulAdd;
    a._statApplied=true;
  }
  return a;
}

function removeAura(ent,id,reason){
  if(!ent||!ent.auras)return false;
  const list=ent.auras;
  let removed=false;
  for(let i=list.length-1;i>=0;i--){
    const a=list[i];
    if(!a||a.id!==id)continue;
    if(a.type==="stat"&&a._statApplied&&a.dmgMulAdd&&ent.dmgMul!=null){
      ent.dmgMul-=a.dmgMulAdd;
      a._statApplied=false;
    }
    if(a.type==="absorb"){
      if((ent.absorb|0)>0&&(a.absorb|0)>=(ent.absorb|0)){
        ent.absorb=0;ent.absorbT=0;
      }
    }
    list.splice(i,1);
    removed=true;
  }
  syncLegacyCrowdFlags(ent);
  return removed;
}

function clearAllAuras(ent){
  if(!ent||!ent.auras)return;
  const ids=ent.auras.map(function(a){return a&&a.id;}).filter(Boolean);
  for(let i=0;i<ids.length;i++)removeAura(ent,ids[i],"clear");
  ent.auras=[];
}

/** 将 rooted / slowed / invuln 光环剩余时间回写到 legacy 字段，供 AI / playerHit 兼容 */
function syncLegacyCrowdFlags(ent){
  if(!ent)return;
  const root=getAura(ent,"rooted");
  if(root&&root.remaining>0)ent.rootT=root.remaining;
  else if(ent.rootT!=null&&!root){/* 若仅有 legacy rootT 而无 aura，保留 */}
  const slow=getAura(ent,"concussed");
  if(slow&&slow.remaining>0){
    ent.slowT=slow.remaining;
    if(slow.speedMul!=null)ent.slowMul=slow.speedMul;
  }else if(!slow&&(ent.slowT|0)<=0){
    ent.slowMul=1;
  }
  const inv=getAura(ent,"ice_block")||getAura(ent,"evasion")||getAura(ent,"divine_shield");
  if(inv&&inv.remaining>0)ent.invuln=inv.remaining;
}

/**
 * 推进光环。
 * ctx: {
 *   onDot?(ent, amount, aura),
 *   onHot?(ent, amount, aura),
 *   onExpire?(ent, aura, reason),
 *   dt
 * }
 * @returns {{dots:..., hots:..., expired:...}}
 */
function tickAuras(ent,dt,ctx){
  ctx=ctx||{};
  dt=+dt||0;
  const out={dots:[],hots:[],expired:[]};
  if(!ent||!ent.auras||dt<=0)return out;
  const list=ent.auras;
  for(let i=list.length-1;i>=0;i--){
    const a=list[i];
    if(!a){list.splice(i,1);continue;}
    a.remaining=Math.max(0,(+a.remaining||0)-dt);

    if(a.type==="absorb"){
      ent.absorbT=a.remaining;
      if(a.absorb!=null)ent.absorb=a.absorb|0;
    }
    if(a.type==="crowd"&&a.flag==="rooted")ent.rootT=a.remaining;
    if(a.type==="crowd"&&a.flag==="slowed"){
      ent.slowT=a.remaining;
      if(a.speedMul!=null)ent.slowMul=a.speedMul;
    }
    if(a.type==="invuln")ent.invuln=Math.max(ent.invuln|0,a.remaining);

    if(a.tick>0&&(a.type==="dot"||a.type==="hot")){
      a.tickAcc=(+a.tickAcc||0)+dt;
      while(a.tickAcc>=a.tick&&a.remaining>=0){
        a.tickAcc-=a.tick;
        if(a.type==="dot"){
          const dmg=Math.max(0,Math.round((a.dmgPerTick||0)*(a.stacks||1)));
          out.dots.push({aura:a,amount:dmg});
          if(typeof ctx.onDot==="function")ctx.onDot(ent,dmg,a);
        }else if(a.type==="hot"){
          const heal=Math.max(0,Math.round((a.healPerSec||0)*a.tick*(a.stacks||1)));
          out.hots.push({aura:a,amount:heal});
          if(typeof ctx.onHot==="function")ctx.onHot(ent,heal,a);
        }
      }
    }

    /* HoT 也可按每秒连续（无 tick 间隔时） */
    if(a.type==="hot"&&!(a.tick>0)&&a.healPerSec>0&&a.remaining>0){
      const heal=Math.max(0,a.healPerSec*dt*(a.stacks||1));
      if(heal>0){
        out.hots.push({aura:a,amount:heal});
        if(typeof ctx.onHot==="function")ctx.onHot(ent,heal,a);
      }
    }

    if(a.remaining<=0){
      if(a.type==="stat"&&a._statApplied&&a.dmgMulAdd&&ent.dmgMul!=null){
        ent.dmgMul-=a.dmgMulAdd;
        a._statApplied=false;
      }
      if(a.type==="absorb"){
        ent.absorb=0;ent.absorbT=0;
      }
      out.expired.push(a);
      if(typeof ctx.onExpire==="function")ctx.onExpire(ent,a,"expire");
      list.splice(i,1);
    }
  }
  syncLegacyCrowdFlags(ent);
  return out;
}

/** 吸收盾被 hitEntity 消耗后，同步 aura.absorb；碎裂则移除 */
function syncAbsorbAuraFromEnt(ent){
  if(!ent)return;
  const a=getAura(ent,"power_word_shield");
  if(!a)return;
  a.absorb=ent.absorb|0;
  a.remaining=ent.absorbT>0?ent.absorbT:a.remaining;
  if((ent.absorb|0)<=0)removeAura(ent,"power_word_shield","spent");
}
