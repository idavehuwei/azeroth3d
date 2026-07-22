/* ============================================================
   炽心 · js/ui/frames.js
   单位框架 HUD（plan-V3 C2 / plan-v4 STEP 20）：
   目标框 · 目标的目标 · 玩家/目标 Icons 肖像
   依赖：core.js（$ BAL）、combat.js（S isTargetAlive targetDisplayInfo）、
         icons.js（Icons）、strings.js（T）
   导出：refreshTargetFrame hideTargetFrame refreshPlayerAvatar
         portraitIconForClass setUnitPortrait
   ============================================================ */
"use strict";

function portraitIconForClass(key){
  const m={
    warrior:"portrait_warrior", mage:"portrait_mage", archer:"portrait_archer",
    priest:"portrait_priest", shaman:"portrait_shaman", rogue:"portrait_rogue",
    warlock:"portrait_warlock", druid:"portrait_druid", paladin:"portrait_paladin"
  };
  return m[key]||"portrait_companion";
}
function setUnitPortrait(el,iconName,border){
  if(!el||typeof Icons==="undefined")return;
  el.src=Icons.get(iconName||"portrait_enemy",border||"#e8b34a");
}
function refreshPlayerAvatar(){
  const av=$("#playerAvatar");
  if(!av)return;
  const key=(typeof CLS!=="undefined"&&CLS&&CLS.key)||"warrior";
  setUnitPortrait(av,portraitIconForClass(key),"#a8d8ff");
}

function hideTargetFrame(){
  const fr=$("#targetFrame");
  if(fr)fr.classList.remove("show");
  const tot=$("#totFrame");
  if(tot)tot.classList.remove("show");
}

function refreshTargetFrame(){
  const fr=$("#targetFrame");
  if(!fr)return;
  if(!S.started||typeof isTargetAlive!=="function"||!isTargetAlive(S.currentTarget)){
    hideTargetFrame();
    return;
  }
  const info=typeof targetDisplayInfo==="function"?targetDisplayInfo(S.currentTarget):null;
  if(!info){hideTargetFrame();return;}

  fr.classList.add("show");
  fr.classList.toggle("elite",!!(info.elite||info.kind==="boss"));
  fr.classList.toggle("rare",!!info.rare);

  const nameEl=$("#targetName");
  const subEl=$("#targetSub");
  const hpEl=$("#targetHp");
  const hpTx=$("#targetHpTx");
  const av=$("#targetAvatar");
  if(nameEl)nameEl.textContent=(info.level!=null?`Lv.${info.level} `:"")+info.name;
  if(subEl)subEl.textContent=info.title||(info.rare?"稀有":info.elite?"精英":info.kind==="boss"?"首领":"敌对");
  const ratio=info.hpMax>0?Math.max(0,Math.min(1,info.hp/info.hpMax)):0;
  if(hpEl)hpEl.style.transform=`scaleX(${ratio})`;
  if(hpTx)hpTx.textContent=`${Math.ceil(info.hp).toLocaleString()} / ${Math.ceil(info.hpMax).toLocaleString()}`;
  if(av){
    let icon="portrait_enemy", border="#e07040";
    if(info.kind==="boss"){icon="portrait_boss";border="#ff6030";}
    else if(info.rare){icon="portrait_rare";border="#c0c8d8";}
    else if(info.elite){border="#ffd76a";}
    setUnitPortrait(av,icon,border);
  }

  const tot=$("#totFrame");
  if(!tot||!(BAL.target&&BAL.target.showTot)){if(tot)tot.classList.remove("show");return;}
  let totName=null, totRatio=0;
  if(info.kind==="mob"&&info.ent&&info.ent.state==="aggro"){
    totName="→ 你";
    totRatio=S.p&&S.p.hpMax?Math.max(0,Math.min(1,S.p.hp/S.p.hpMax)):0;
  }else if(info.kind==="boss"&&typeof getTopThreatActor==="function"&&typeof boss!=="undefined"&&boss){
    const top=getTopThreatActor(typeof BOSS_ENT!=="undefined"?BOSS_ENT:null,boss.position,(BAL.target&&BAL.target.totThreatR)||80);
    if(top&&top.kind==="player"){
      totName="→ 你";
      totRatio=S.p&&S.p.hpMax?Math.max(0,Math.min(1,S.p.hp/S.p.hpMax)):0;
    }else if(top&&top.kind==="companion"){
      totName="→ 同伴";
      const c=top.c||(typeof PARTY!=="undefined"&&PARTY[0]);
      totRatio=c&&c.hpMax?Math.max(0,Math.min(1,c.hp/c.hpMax)):0;
    }
  }
  if(totName){
    tot.classList.add("show");
    const tn=$("#totName");
    if(tn)tn.textContent=totName;
    const th=$("#totHp");
    if(th)th.style.transform=`scaleX(${totRatio})`;
  }else tot.classList.remove("show");
}
