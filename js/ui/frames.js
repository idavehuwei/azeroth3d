/* ============================================================
   炽心 · js/ui/frames.js
   目标框 HUD（plan-V3 C2）：名字 / 等级 / 血条 / 精英·稀有边框 / 目标的目标
   依赖：core.js（$ BAL）、combat.js（S isTargetAlive targetDisplayInfo）、strings.js（T）
   导出：refreshTargetFrame hideTargetFrame
   ============================================================ */
"use strict";

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
    const ctx=av.getContext("2d");
    if(ctx){
      ctx.clearRect(0,0,av.width,av.height);
      ctx.fillStyle=info.kind==="boss"?"#4a1808":info.rare?"#3a3040":"#2a1810";
      ctx.fillRect(0,0,av.width,av.height);
      ctx.fillStyle=info.rare?"#e8e0ff":info.elite?"#ffd76a":"#e07040";
      ctx.beginPath();
      ctx.ellipse(av.width/2,av.height*.62,av.width*.28,av.height*.32,0,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(av.width/2,av.height*.32,av.width*.2,0,Math.PI*2);
      ctx.fill();
    }
  }

  const tot=$("#totFrame");
  if(!tot||!(BAL.target&&BAL.target.showTot)){if(tot)tot.classList.remove("show");return;}
  let totName=null;
  if(info.kind==="mob"&&info.ent&&info.ent.state==="aggro")totName="→ 你";
  else if(info.kind==="boss"&&typeof getTopThreatActor==="function"&&typeof boss!=="undefined"&&boss){
    const top=getTopThreatActor(typeof BOSS_ENT!=="undefined"?BOSS_ENT:null,boss.position,(BAL.target&&BAL.target.totThreatR)||80);
    if(top&&top.kind==="player")totName="→ 你";
    else if(top&&top.kind==="companion")totName="→ 同伴";
  }
  if(totName){
    tot.classList.add("show");
    const tn=$("#totName");
    if(tn)tn.textContent=totName;
  }else tot.classList.remove("show");
}
