/* ============================================================
   熔火之心 · finder.js
   本地地下城查找器（STEP 29）：Shift+I · 选本 · 普通难度 · 一键组队传送
   ------------------------------------------------------------
   [依赖] core.js（BAL $）
          icons.js（Icons）
          combat.js（S announce log）
          companions.js（formParty）
          zones.js（enterZone getCurrentZoneId）
          panels.js 运行时（closeAllHudPanels setPanel panelOpen）
          save.js 运行时（saveGame）
   [导出] toggleDungeonFinderPanel renderDungeonFinderPanel finderOpen
          queueDungeonFinder getLfgEntry getLfgMinLevel
   ============================================================ */
"use strict";

function getLfgEntries(){
  return (BAL.lfg&&BAL.lfg.entries)||[];
}

function getLfgEntry(id){
  return getLfgEntries().find(e=>e.id===id)||null;
}

function getLfgMinLevel(id){
  const e=getLfgEntry(id);
  if(!e)return 0;
  if(e.minLevel!=null)return e.minLevel|0;
  return 0;
}

function finderOpen(){return typeof panelOpen==="function"&&panelOpen("#finderPanel");}

function renderDungeonFinderPanel(){
  if(!finderOpen())return;
  const body=$("#finderBody");
  if(!body)return;
  const diff=(BAL.lfg&&BAL.lfg.difficulty)||"normal";
  const diffLabel=diff==="normal"?"普通":diff;
  const lvl=S.p.level|0;
  let html=`<div class="ph-sec">难度 · ${diffLabel}</div>`;
  html+=`<div class="ph-row"><span class="k">当前等级</span><span class="v">Lv.${lvl}</span></div>`;
  html+=`<div class="ph-row"><span class="k">队列</span><span class="v">一键填充 AI 职责（坦克/治疗/输出）</span></div>`;
  html+=`<div class="ph-sec">可用副本</div>`;

  for(const e of getLfgEntries()){
    const need=e.minLevel|0;
    const locked=need>0&&lvl<need;
    const roles=BAL.party&&BAL.party.fill
      ?(BAL.party.fill[(S.talents&&S.talents.classKey)||"warrior"]||[])
      :[];
    const roleTxt=roles.map(r=>{
      const lab=(BAL.party.roleLabel&&BAL.party.roleLabel[r.role])||r.role;
      return lab;
    }).join(" · ")||"自动补齐";
    html+=`<div class="ql-item finder-item${locked?" locked":""}" data-dung="${e.id}">`+
      `<div class="ttl"><img class="finder-ic" src="${Icons.get(e.icon||"dungeon","#e8b34a")}" alt=""> ${e.name}</div>`+
      `<div class="obj">${e.blurb||""}</div>`+
      `<div class="st">${locked?`需要 Lv.${need}+ · 当前 Lv.${lvl}`:`建议 Lv.${need||1}+ · 职责：${roleTxt}`}</div>`+
      `<div class="finder-acts"></div>`+
    `</div>`;
  }
  body.innerHTML=html;

  body.querySelectorAll(".finder-item").forEach(el=>{
    const id=el.dataset.dung;
    const acts=el.querySelector(".finder-acts");
    if(!acts)return;
    const locked=el.classList.contains("locked");
    const b=document.createElement("button");
    b.type="button";
    b.className="dbtn deed-btn";
    b.textContent=locked?"等级不足":"组队并进入";
    b.disabled=locked;
    if(!locked)b.onclick=()=>queueDungeonFinder(id);
    acts.appendChild(b);
  });
}

function toggleDungeonFinderPanel(){
  if(!S.started)return;
  if(finderOpen()){setPanel("#finderPanel",false);return;}
  if(typeof closeAllHudPanels==="function")closeAllHudPanels("finder");
  setPanel("#finderPanel",true);
  renderDungeonFinderPanel();
}

/** 一键填充 AI 职责 + 传送至副本入口（不用 silent，保证走廊重置） */
function queueDungeonFinder(dungeonId){
  if(!S.started||!S.p.alive){
    announce("无法进入队列……");
    return false;
  }
  if(S.deathUi){
    announce("请先处理死亡状态。");
    return false;
  }
  const e=getLfgEntry(dungeonId);
  if(!e){announce("未知的地下城。");return false;}
  const need=getLfgMinLevel(dungeonId);
  if(need>0&&(S.p.level|0)<need){
    announce(`等级不足！需要 Lv.${need}`);
    log(`地下城查找器：${e.name} 需要 Lv.${need}+（当前 Lv.${S.p.level}）。`,"lg-sys");
    return false;
  }
  /* 一键填充 AI 职责队列 */
  if(typeof formParty==="function"){
    formParty({silent:true,noSave:true});
  }
  setPanel("#finderPanel",false);
  const gate=e.gate||"entrance";
  const opts={};
  if(typeof getCurrentZoneId==="function"&&getCurrentZoneId()===dungeonId)opts.force=true;
  announce(`队列就绪 · 正在进入 ${e.name}`);
  log(`地下城查找器（普通）：小队集结，传送至【${e.name}】入口。`,"lg-sys");
  if(typeof enterZone!=="function"){
    announce("传送失败。");
    return false;
  }
  enterZone(dungeonId,gate,opts);
  if(typeof saveGame==="function")saveGame(true);
  return true;
}

(function bindFinderUi(){
  const close=$("#finderClose");
  if(close)close.onclick=()=>setPanel("#finderPanel",false);
  const btn=$("#finderBtn");
  if(btn)btn.onclick=()=>toggleDungeonFinderPanel();
})();

console.info("[finder] STEP 29 就绪：Shift+I 地下城查找器");
