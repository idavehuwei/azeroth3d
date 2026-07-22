/* ============================================================
   炽心 · panels.js
   HUD 面板（STEP 14）：角色(C) / 法术书(P) / 任务日志(L)
   纯 DOM 覆盖层，不碰 Three.js；数值读自 S.p / CLS / ITEMS / getSkillCd
   ------------------------------------------------------------
   [依赖] core.js（$ BAL）· combat.js（S CLS SKILLS formatCopperText）
          items.js（ITEMS QUALITY EQUIP_SLOTS EQUIP_SLOT_LABEL bagOpen bindItemTip
            equipItem unequipItem applyEquipStats beginItemDrag endItemDrag getItemDrag itemFitsEqSlot）· talents.js（getSkillCd talentOpen）
          world.js（QUEST updateQuest）· icons.js（Icons）
          quests.js 运行时（getQuestLogEntries abandonQuest canAbandonQuest getQuestDef questNpcLabel）
          map.js 运行时（worldMapOpen；关闭世界地图）
   [导出] toggleCharPanel toggleSpellPanel toggleQuestLog
          renderCharPanel renderSpellPanel renderQuestLog
          closeAllHudPanels closeTopHudPanel anyHudPanelOpen equipScore itemScore
   ============================================================ */
"use strict";

function panelOpen(id){return $(id).style.display==="block";}
function setPanel(id,on){$(id).style.display=on?"block":"none";}

function closeAllHudPanels(except){
  /* Escape / 少数强制互斥场景；平时各面板可并存 */
  if(except!=="char")setPanel("#charPanel",false);
  if(except!=="spell")setPanel("#spellPanel",false);
  if(except!=="quest")setPanel("#questLog",false);
  if(except!=="deeds")setPanel("#deedsPanel",false);
  if(except!=="finder")setPanel("#finderPanel",false);
  if(except!=="bag"&&typeof bagOpen==="function"&&bagOpen())$("#bag").style.display="none";
  if(except!=="talent"&&typeof talentOpen==="function"&&talentOpen())closeTalentPanel();
  if(except!=="map"&&typeof worldMapOpen==="function"&&worldMapOpen()){
    const ov=$("#worldMapOv"); if(ov)ov.classList.remove("show");
  }
  if(except!=="vendor"&&typeof closeVendorPanel==="function")closeVendorPanel();
  if(except!=="loot"&&typeof closeLootPanel==="function")closeLootPanel();
  if(except!=="dlg"&&typeof closeDialogue==="function")closeDialogue();
}
/** Track E：Esc 逐层关闭（LIFO），返回是否关掉了某层 */
function closeTopHudPanel(){
  if($("#dlg")&&$("#dlg").style.display==="block"){
    if(typeof closeDialogue==="function")closeDialogue();
    return true;
  }
  if(typeof lootPanelOpen==="function"&&lootPanelOpen()){closeLootPanel();return true;}
  if($("#vendorPanel")&&$("#vendorPanel").style.display==="block"){
    if(typeof closeVendorPanel==="function")closeVendorPanel();
    return true;
  }
  if(typeof worldMapOpen==="function"&&worldMapOpen()){closeWorldMap();return true;}
  if(panelOpen("#finderPanel")){setPanel("#finderPanel",false);return true;}
  if(panelOpen("#deedsPanel")){setPanel("#deedsPanel",false);return true;}
  if(panelOpen("#questLog")){setPanel("#questLog",false);return true;}
  if(panelOpen("#spellPanel")){setPanel("#spellPanel",false);return true;}
  if(panelOpen("#charPanel")){setPanel("#charPanel",false);return true;}
  if(typeof talentOpen==="function"&&talentOpen()){closeTalentPanel();return true;}
  if(typeof bagOpen==="function"&&bagOpen()){$("#bag").style.display="none";return true;}
  return false;
}
function anyHudPanelOpen(){
  if(panelOpen("#charPanel")||panelOpen("#spellPanel")||panelOpen("#questLog"))return true;
  if(panelOpen("#deedsPanel")||panelOpen("#finderPanel"))return true;
  if(typeof bagOpen==="function"&&bagOpen())return true;
  if(typeof talentOpen==="function"&&talentOpen())return true;
  if(typeof worldMapOpen==="function"&&worldMapOpen())return true;
  if($("#vendorPanel")&&$("#vendorPanel").style.display==="block")return true;
  if(typeof lootPanelOpen==="function"&&lootPanelOpen())return true;
  if($("#dlg")&&$("#dlg").style.display==="block")return true;
  return false;
}

function itemScore(it){
  if(!it)return 0;
  const G=BAL.gearScore;
  let s=G.quality[it.quality]|0;
  const st=it.stats||{};
  if(st.dmgMul)s+=(st.dmgMul-1)*G.dmgMul;
  if(st.hpMax)s+=st.hpMax*G.hpMax;
  if(st.str)s+=st.str*2; if(st.agi)s+=st.agi*2;
  if(st.sta)s+=st.sta*1.5; if(st.int)s+=st.int*1.5; if(st.spi)s+=st.spi;
  if(it.armor)s+=it.armor*.15;
  if(it.ilvl)s+=it.ilvl*3;
  return Math.round(s);
}
function equipScore(){
  let t=0;
  for(const slot of EQUIP_SLOTS){
    const id=S.eq[slot];
    if(id&&ITEMS[id])t+=itemScore(ITEMS[id]);
  }
  return t;
}

function scaledRange(arr){
  if(!arr||!arr.length)return null;
  const m=S.p.dmgMul||1;
  return [Math.round(arr[0]*m),Math.round(arr[1]*m)];
}
function spellStatLine(sk){
  const bal=sk.bal?(typeof getSkillBal==="function"?getSkillBal(sk.bal):(BAL.skills[sk.bal])):null;
  if(!bal&&!sk)return "";
  const bits=[];
  if(bal&&bal.dmg){
    const r=scaledRange(bal.dmg);
    bits.push(`伤害 ${r[0]}–${r[1]}`);
  }
  if(bal&&bal.heal)bits.push(`治疗 ${bal.heal[0]}–${bal.heal[1]}`);
  if(bal&&bal.healPerTick)bits.push(`每跳 ${bal.healPerTick[0]}–${bal.healPerTick[1]}`);
  if(bal&&bal.absorb){
    const a=Array.isArray(bal.absorb)?bal.absorb:[bal.absorb,bal.absorb];
    bits.push(`吸收 ${a[0]}–${a[1]}`);
  }
  if(bal&&bal.duration)bits.push(`持续 ${bal.duration}s`);
  if(bal&&bal.radius)bits.push(`半径 ${bal.radius}m`);
  if(bal&&bal.dist)bits.push(`位移 ${bal.dist}m`);
  if(bal&&bal.invuln)bits.push(`免疫 ${bal.invuln}s`);
  if(bal&&bal.rootT)bits.push(`定身 ${bal.rootT}s`);
  if(bal&&bal.rageGain)bits.push(`怒气 +${bal.rageGain}`);
  if(bal&&bal.speedMul)bits.push(`移速 ×${bal.speedMul}`);
  if(sk.range!=null)bits.push(`射程 ${sk.range}m`);
  else if(bal&&bal.reach)bits.push(`射程 ${bal.reach}m`);
  if(sk.cast!=null)bits.push(`施法 ${sk.cast}s`);
  return bits.join(" · ");
}

function spellTipHtml(sk,locked){
  const rk=sk.bal&&typeof skillRank==="function"?skillRank(sk.bal):1;
  const cd=sk.cd;
  const cost=sk.rage>0?`${CLS.resName} ${sk.rage}`:"无消耗";
  const stats=spellStatLine(sk);
  let h=`<div class="it-name" style="color:#ffd76a">${sk.name} <span style="opacity:.75;font-size:11px">Rank ${rk}</span></div>`;
  if(locked)h+=`<div class="it-meta">Lv.${sk.unlock|1} 解锁</div>`;
  else h+=`<div class="it-meta">CD ${cd}s · ${cost}</div>`;
  if(sk.desc)h+=`<div class="it-line">${sk.desc}</div>`;
  if(stats)h+=`<div class="it-line it-stat">${stats}</div>`;
  if(!locked)h+=`<div class="it-hint">拖到动作条绑定 · 右键槽位可清空</div>`;
  return h;
}

function showSpellTip(html,x,y){
  const tip=$("#itemTip"); if(!tip)return;
  tip.innerHTML=html;
  tip.style.display="block";
  tip.setAttribute("aria-hidden","false");
  const pad=14, tw=tip.offsetWidth||200, th=tip.offsetHeight||120;
  let left=x+pad, top=y+pad;
  if(left+tw>innerWidth-8)left=x-tw-pad;
  if(top+th>innerHeight-8)top=y-th-pad;
  tip.style.left=Math.max(8,left)+"px";
  tip.style.top=Math.max(8,top)+"px";
}
function hideSpellTip(){
  if(typeof hideItemTip==="function")hideItemTip();
  else{
    const tip=$("#itemTip"); if(!tip)return;
    tip.style.display="none";
    tip.setAttribute("aria-hidden","true");
  }
}

function renderSpellPanel(){
  if(!panelOpen("#spellPanel"))return;
  const body=$("#spellBody");
  body.innerHTML="";
  const tabs=document.createElement("div");
  tabs.className="spell-tabs";
  tabs.innerHTML=`<button type="button" class="spell-tab on" data-tab="known">已学会</button>`+
    `<button type="button" class="spell-tab" data-tab="all">全部</button>`;
  body.appendChild(tabs);
  const list=document.createElement("div");
  list.className="spell-list";
  body.appendChild(list);

  function paint(mode){
    list.innerHTML="";
    SKILLS.forEach((sk,i)=>{
      const known=typeof isSkillKnown==="function"?isSkillKnown(sk):true;
      if(mode==="known"&&!known)return;
      const cd=typeof getSkillCd==="function"?getSkillCd(i):sk.cd;
      const base=sk.cd;
      const cdTx=cd<base-0.01?`CD ${cd}s（基础 ${base}s）`:`CD ${cd}s`;
      const cost=sk.rage>0?`${CLS.resName} ${sk.rage}`:"无消耗";
      const rk=sk.bal&&typeof skillRank==="function"?skillRank(sk.bal):1;
      const card=document.createElement("div");
      card.className="spell-card"+(known?"":" locked");
      card.dataset.skillIdx=String(i);
      if(known)card.draggable=true;
      card.innerHTML=
        `<img class="ic" src="${Icons.get(sk.icon||"sword",typeof SKILL_ICON_BORDER!=="undefined"?SKILL_ICON_BORDER:"#e8b34a")}" alt="">`+
        `<div class="body">`+
          `<div class="nm">${sk.name} <span class="rank">Rank ${rk}</span>`+
            (known?"":` <span class="lock">Lv.${sk.unlock|1}</span>`)+`</div>`+
          `<div class="meta">${known?`${cdTx} · ${cost}`:`${sk.unlock|1} 级解锁`}</div>`+
          `<div class="desc">${sk.desc||""}${spellStatLine(sk)?`<br>${spellStatLine(sk)}`:""}</div>`+
        `</div>`;
      card.addEventListener("mouseenter",e=>showSpellTip(spellTipHtml(sk,!known),e.clientX,e.clientY));
      card.addEventListener("mousemove",e=>showSpellTip(spellTipHtml(sk,!known),e.clientX,e.clientY));
      card.addEventListener("mouseleave",hideSpellTip);
      if(known){
        card.addEventListener("dragstart",e=>{
          e.dataTransfer.setData("text/skill-idx",String(i));
          e.dataTransfer.effectAllowed="copy";
          card.classList.add("dragging");
        });
        card.addEventListener("dragend",()=>card.classList.remove("dragging"));
      }
      list.appendChild(card);
    });
  }
  paint("known");
  tabs.querySelectorAll(".spell-tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      tabs.querySelectorAll(".spell-tab").forEach(b=>b.classList.toggle("on",b===btn));
      paint(btn.dataset.tab);
    });
  });
}

/* C7：动作条接受法术书拖放 */
(function bindActionBarDrop(){
  function ready(){
    document.querySelectorAll("#skillBar .skill").forEach(el=>{
      el.addEventListener("dragover",e=>{e.preventDefault();el.classList.add("drop-ok");});
      el.addEventListener("dragleave",()=>el.classList.remove("drop-ok"));
      el.addEventListener("drop",e=>{
        e.preventDefault();
        el.classList.remove("drop-ok");
        const raw=e.dataTransfer.getData("text/skill-idx");
        if(raw==="")return;
        const slot=+el.dataset.sk;
        if(typeof bindSkillToBar==="function"){
          bindSkillToBar(slot,+raw);
          log(`已将【${SKILLS[+raw].name}】绑定到快捷键 ${slot+1}`,"lg-sys");
        }
      });
      /* 右键清空槽 */
      el.addEventListener("contextmenu",e=>{
        if(!S.started)return;
        e.preventDefault();
        const slot=+el.dataset.sk;
        if(typeof bindSkillToBar==="function")bindSkillToBar(slot,null);
      });
    });
  }
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",ready);
  else ready();
})();


function pdSlotHtml(slot){
  const label=EQUIP_SLOT_LABEL[slot]||slot;
  const id=S.eq[slot];
  const it=id?ITEMS[id]:null;
  if(!it){
    return `<div class="pd-slot empty" data-slot="${slot}">`+
      `<span class="pd-empty-ic" aria-hidden="true"></span>`+
      `<span class="pd-tag">${label}</span></div>`;
  }
  const q=QUALITY[it.quality];
  return `<div class="pd-slot filled" data-slot="${slot}" data-item="${it.id}" style="border-color:${q.color}">`+
    `<img src="${Icons.get(it.icon,q.color)}" style="border-color:${q.color}" alt="" draggable="false">`+
    `<span class="pd-tag">${label}</span></div>`;
}

function renderCharPanel(){
  if(!panelOpen("#charPanel"))return;
  const P=S.p, body=$("#charBody");
  if(!P.derived&&typeof refreshPlayerDerived==="function")refreshPlayerDerived();
  const der=P.derived||{};
  const st=P.stats||{};
  const wr=typeof getPlayerWeaponRange==="function"?getPlayerWeaponRange():[CLS.autoMin,CLS.autoMax];
  const autoLo=Math.round(wr[0]*(P.dmgMul||1)*(der.apDmgMul||1));
  const autoHi=Math.round(wr[1]*(P.dmgMul||1)*(der.apDmgMul||1));
  const gs=equipScore();
  const fx=P.talentFx||{};
  const fxBits=[];
  if(fx.frostSlow)fxBits.push(`冰霜减速 +${Math.round(fx.frostSlow*100)}%`);
  if(fx.poisonArrow)fxBits.push("毒箭标记");
  if(fx.pyroBurst)fxBits.push("炎爆强化");
  if(fx.healMul)fxBits.push(`治疗 +${Math.round(fx.healMul*100)}%`);
  if(fx.shieldMul)fxBits.push(`盾吸收 +${Math.round(fx.shieldMul*100)}%`);

  const row=(k,v)=>`<div class="ph-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const left=["head","neck","shoulder","back","chest","wrist","hands"];
  const right=["waist","legs","feet","finger","offhand","ranged"];
  const bottom=["mainhand"];
  const yaw=(_charDollYaw|0)%360;
  const clsIcon=CLS.key==="mage"?"✦":CLS.key==="archer"?"➶":CLS.key==="priest"?"✚":CLS.key==="shaman"?"⚡":CLS.key==="rogue"?"🗡":CLS.key==="warlock"?"💀":"⚔";

  body.innerHTML=
    `<div class="ph-layout">`+
      `<div class="ph-doll" aria-label="装备">`+
        `<div class="ph-doll-head">${CLS.title} · Lv.${P.level}</div>`+
        `<div class="ph-doll-grid">`+
          `<div class="ph-doll-col">${left.map(pdSlotHtml).join("")}</div>`+
          `<div class="ph-doll-mid" id="charDollPreview" title="拖动旋转预览">`+
            `<div class="ph-doll-sil" style="transform:rotateY(${yaw}deg)">${clsIcon}</div>`+
            `<div class="ph-doll-gs">装等 ${gs}</div>`+
            `<div class="ph-doll-drag">拖动旋转</div>`+
          `</div>`+
          `<div class="ph-doll-col">${right.map(pdSlotHtml).join("")}</div>`+
          `<div class="ph-doll-bot">${bottom.map(pdSlotHtml).join("")}</div>`+
        `</div>`+
      `</div>`+
      `<div class="ph-stats">`+
        `<div class="ph-sec">概览</div>`+
        row("职业",CLS.title)+
        row("等级",`Lv.${P.level}`)+
        row("经验",P.level>=BAL.levels.max?"满级":`${Math.floor(P.xp)} / ${P.xpMax}`)+
        row("金币",formatCopperText(P.gold|0))+
        row("装备评分",String(gs))+
        `<div class="ph-sec">基础属性</div>`+
        row("力量",String(st.str|0))+
        row("敏捷",String(st.agi|0))+
        row("耐力",String(st.sta|0))+
        row("智力",String(st.int|0))+
        row("精神",String(st.spi|0))+
        `<div class="ph-sec">战斗属性</div>`+
        row("生命",`${Math.ceil(P.hp)} / ${P.hpMax}`)+
        row(CLS.resName,`${Math.floor(P.rage)} / ${P.rageMax}`)+
        (P.absorb>0?row("吸收盾",`${Math.ceil(P.absorb)}（${P.absorbT.toFixed(1)}s）`):"")+
        row("攻击强度",String(der.ap|0))+
        row("暴击",`${(der.critPct||0).toFixed(1)}%`)+
        row("闪避",`${(der.dodgePct||0).toFixed(1)}%`)+
        row("护甲",String(der.armor|0))+
        row("伤害加成",`×${(P.dmgMul||1).toFixed(2)}`)+
        row("自动攻击",`${autoLo}–${autoHi}`)+
        row("攻击间隔",`${(typeof getPlayerAutoSpeed==="function"?getPlayerAutoSpeed():CLS.autoSpd).toFixed(2)}s`)+
        row("移速",String(P.speed))+
        row("射程",CLS.ranged?`${CLS.range}m`:"近战")+
        (fxBits.length?row("天赋效果",fxBits.join(" · ")):"")+
      `</div>`+
    `</div>`;

  body.querySelectorAll(".pd-slot").forEach(el=>{
    const slot=el.dataset.slot;
    const id=S.eq[slot];
    const it=id?ITEMS[id]:null;
    const label=EQUIP_SLOT_LABEL[slot]||slot;
    if(it&&typeof bindItemTip==="function")
      bindItemTip(el,it,"拖回背包卸下 · 点击卸下");
    else if(typeof bindTipHtml==="function")
      bindTipHtml(el,()=>`<div class="it-name" style="color:var(--gold-bright)">${label}</div><div class="it-meta">空装备槽</div><div class="it-hint">从背包拖入可装备的物品</div>`);
    if(it){
      el.draggable=true;
      el.addEventListener("dragstart",e=>{
        if(typeof hideItemTip==="function")hideItemTip();
        if(typeof beginItemDrag==="function")beginItemDrag({kind:"eq",slot,id:it.id});
        e.dataTransfer.setData("text/plain","eq:"+slot);
        e.dataTransfer.setData("text/eq-slot",slot);
        e.dataTransfer.setData("text/item-id",it.id);
        e.dataTransfer.effectAllowed="move";
        el.classList.add("dragging");
      });
      el.addEventListener("dragend",()=>{
        el.classList.remove("dragging");
        if(typeof endItemDrag==="function")endItemDrag();
      });
    }
    el.addEventListener("dragover",e=>{
      const d=typeof getItemDrag==="function"?getItemDrag():null;
      if(!d)return;
      e.preventDefault();
      e.dataTransfer.dropEffect="move";
      if(d.kind==="inv"){
        const bagIt=ITEMS[d.id];
        if(bagIt&&itemFitsEqSlot(bagIt,slot)){
          el.classList.add("drop-ok"); el.classList.remove("drop-bad");
        }else{
          el.classList.add("drop-bad"); el.classList.remove("drop-ok");
        }
      }else if(d.kind==="eq"&&d.slot!==slot){
        const ait=ITEMS[d.id];
        if(ait&&itemFitsEqSlot(ait,slot)){el.classList.add("drop-ok");el.classList.remove("drop-bad");}
        else{el.classList.add("drop-bad");el.classList.remove("drop-ok");}
      }
    });
    el.addEventListener("dragleave",()=>el.classList.remove("drop-ok","drop-bad"));
    el.addEventListener("drop",e=>{
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("drop-ok","drop-bad");
      const d=typeof getItemDrag==="function"?getItemDrag():null;
      if(typeof endItemDrag==="function")endItemDrag();
      if(!d)return;
      if(d.kind==="inv"){
        const idx=d.invIdx|0;
        const itemId=S.inv[idx];
        const bagIt=itemId&&ITEMS[itemId];
        if(!bagIt)return;
        if(!itemFitsEqSlot(bagIt,slot)){
          el.classList.add("drop-bad");
          log(`【${bagIt.name}】不能装备到${label}。`,"lg-sys");
          setTimeout(()=>el.classList.remove("drop-bad"),400);
          return;
        }
        equipItem(itemId,idx);
        return;
      }
      if(d.kind==="eq"&&d.slot!==slot){
        const a=S.eq[d.slot], b=S.eq[slot];
        if(!a)return;
        if(!itemFitsEqSlot(ITEMS[a],slot)){
          log(`无法交换到${label}。`,"lg-sys");
          return;
        }
        if(b&&!itemFitsEqSlot(ITEMS[b],d.slot)){
          log("无法交换装备。","lg-sys");
          return;
        }
        if(a)applyEquipStats(ITEMS[a],-1);
        if(b)applyEquipStats(ITEMS[b],-1);
        S.eq[d.slot]=b||null;
        S.eq[slot]=a;
        if(S.eq[d.slot])applyEquipStats(ITEMS[S.eq[d.slot]],+1);
        if(S.eq[slot])applyEquipStats(ITEMS[S.eq[slot]],+1);
        if(d.slot==="mainhand"||slot==="mainhand"){
          const mid=S.eq.mainhand;
          setWeapon(player,mid&&ITEMS[mid]?ITEMS[mid].model||player.userData.defaultWeapon:player.userData.defaultWeapon);
        }
        if(typeof renderBag==="function")renderBag();
        renderCharPanel();
        if(typeof saveGame==="function")saveGame(true);
      }
    });
    el.addEventListener("click",()=>{
      if(S.eq[slot]){
        if(typeof hideItemTip==="function")hideItemTip();
        unequipItem(slot);
      }
    });
  });
  wireCharDollRotate(body.querySelector("#charDollPreview"));
}

let _charDollYaw=15,_charDollDrag=null;
function wireCharDollRotate(el){
  if(!el)return;
  el.addEventListener("pointerdown",e=>{
    e.preventDefault();
    _charDollDrag={x:e.clientX,yaw:_charDollYaw,id:e.pointerId};
    try{el.setPointerCapture(e.pointerId);}catch(_){}
  });
  el.addEventListener("pointermove",e=>{
    if(!_charDollDrag||_charDollDrag.id!==e.pointerId)return;
    _charDollYaw=_charDollDrag.yaw+(e.clientX-_charDollDrag.x)*.6;
    const sil=el.querySelector(".ph-doll-sil");
    if(sil)sil.style.transform=`rotateY(${_charDollYaw}deg)`;
  });
  const end=e=>{
    if(_charDollDrag&&e.pointerId===_charDollDrag.id)_charDollDrag=null;
  };
  el.addEventListener("pointerup",end);
  el.addEventListener("pointercancel",end);
}

function questEntries(){
  if(typeof getQuestLogEntries==="function")return getQuestLogEntries();
  return [];
}

const QUEST_ZONE_NAME={mulgore:T("zone.mulgore"),barrens:T("zone.barrens"),durotar:T("zone.durotar"),
  molten_core:T("zone.molten_core"),wailing_caverns:T("zone.wailing"),ragefire_chasm:T("zone.ragefire"),
  onyxias_lair:T("zone.onyxia")};
let _questLogSel=null;

function questRewardLines(q){
  if(!q||!q.rewards)return [];
  const lines=[], r=q.rewards;
  const side=r.sideKey&&BAL.quest.side?BAL.quest.side[r.sideKey]:null;
  let xp=0;
  if(side&&side.xp!=null)xp=side.xp|0;
  else if(r.xp!=null)xp=r.xp|0;
  else if(r.xpKey&&BAL.levels.xp[r.xpKey]!=null)xp=BAL.levels.xp[r.xpKey]|0;
  if(xp)lines.push(`经验 +${xp}`);
  let copper=0;
  if(side&&side.copper!=null)copper=side.copper|0;
  else if(r.copper!=null)copper=r.copper|0;
  else if(r.copperKey==="boarCopper")copper=BAL.quest.rewardCopper|0;
  else if(r.copperKey==="barrensCopper")copper=(BAL.quest.barrens&&BAL.quest.barrens.rewardCopper)|0;
  else if(r.copperKey==="durotarCopper")copper=(BAL.quest.durotar&&BAL.quest.durotar.rewardCopper)|0;
  if(copper&&typeof formatCopperText==="function")lines.push(`金钱 ${formatCopperText(copper)}`);
  else if(copper)lines.push(`金钱 ${copper} 铜`);
  if(r.hpMaxKey==="boarHp"||r.hpMax)lines.push(`生命上限 +${r.hpMax||BAL.quest.rewardHp||0}`);
  if(r.dmgMulAddKey==="boarDmg"||r.dmgMulAdd){
    const add=r.dmgMulAdd!=null?+r.dmgMulAdd:(BAL.quest.rewardDmgMul||1)-1;
    if(add)lines.push(`伤害 +${Math.round(add*100)}%`);
  }
  if(Array.isArray(r.items)){
    for(const id of r.items){
      const it=ITEMS[id]; if(it)lines.push(`物品：${it.name}`);
    }
  }
  if(Array.isArray(r.choice)&&r.choice.length){
    const names=r.choice.map(ch=>{
      const id=typeof ch==="string"?ch:ch.id;
      return(ITEMS[id]&&ITEMS[id].name)||id;
    }).filter(Boolean);
    if(names.length)lines.push(`自选一件：${names.join(" / ")}`);
  }
  return lines;
}

function questChapterLabel(ch){
  return ch==="main"?"主线":ch==="side"?"支线":ch==="dungeon"?"副本":(ch||"任务");
}

function renderQuestDetail(e){
  const detail=$("#questLogDetail"); if(!detail)return;
  if(!e){
    detail.innerHTML=`<div class="ql-detail-empty">从左侧选择一项任务查看详情。</div>`;
    return;
  }
  const q=typeof getQuestDef==="function"?getQuestDef(e.id):null;
  const st=e.status||"active";
  const stLabel=st==="ready"?"目标完成 · 可交还":st==="done"?"已完成":"进行中";
  const giver=e.giver||(q&&q.giver);
  const turnIn=e.turnIn||(q&&q.turnIn);
  const giverNm=typeof questNpcLabel==="function"?questNpcLabel(giver):(giver||"—");
  const turnNm=typeof questNpcLabel==="function"?questNpcLabel(turnIn):(turnIn||"—");
  const rewards=questRewardLines(q);
  const abandonable=typeof canAbandonQuest==="function"?canAbandonQuest(e.id):(st==="active"||st==="ready");
  const objOk=st==="ready"||st==="done";
  let html=`<div class="ql-d-title">${e.title}</div>`;
  html+=`<div class="ql-d-sub">${questChapterLabel(e.chapter)} · ${QUEST_ZONE_NAME[e.zone]||e.zone||""}${q&&q.subtitle?" · "+q.subtitle:""}</div>`;
  html+=`<div class="ql-d-meta">状态：<b>${stLabel}</b><br>`;
  if(giver)html+=`接取：<b>${giverNm}</b><br>`;
  if(turnIn)html+=`交还：<b>${turnNm}</b>`;
  else if(q&&q.autoComplete)html+=`交还：<b>自动完成</b>`;
  html+=`</div>`;
  html+=`<div class="ql-d-sec">目标</div>`;
  html+=`<div class="ql-d-obj${objOk?" ok":""}">${objOk?"✔ ":""}${e.obj||"—"}</div>`;
  if(q&&q.acceptLog){
    html+=`<div class="ql-d-sec">描述</div>`;
    html+=`<div class="ql-d-desc">${q.acceptLog.replace(/^接受任务【[^】]+】：/,"")}</div>`;
  }
  if(rewards.length){
    html+=`<div class="ql-d-sec">奖励</div>`;
    html+=`<div class="ql-d-reward">${rewards.map(x=>`· ${x}`).join("<br>")}</div>`;
  }
  if(e.tip&&st!=="done")html+=`<div class="ql-d-tip">${e.tip}</div>`;
  html+=`<div class="ql-acts">`;
  if(st!=="done"&&typeof setQuestMapFocus==="function"){
    html+=`<button type="button" class="ql-map" data-qid="${e.id}">在地图上标记</button>`;
  }
  if(abandonable){
    html+=`<button type="button" class="ql-abandon" data-qid="${e.id}">放弃任务</button>`;
  }
  html+=`</div>`;
  detail.innerHTML=html;
  const mapBtn=detail.querySelector(".ql-map");
  if(mapBtn)mapBtn.addEventListener("click",()=>{
    setQuestMapFocus(mapBtn.dataset.qid);
  });
  const btn=detail.querySelector(".ql-abandon");
  if(btn)btn.addEventListener("click",()=>{
    const id=btn.dataset.qid;
    if(!id||typeof abandonQuest!=="function")return;
    const title=(getQuestDef(id)&&getQuestDef(id).title)||id;
    if(!confirm(`确定放弃「${title}」？\n放弃后可再次向任务人接取。`))return;
    _questLogSel=null;
    abandonQuest(id);
  });
}

function renderQuestLog(){
  if(!panelOpen("#questLog"))return;
  const listEl=$("#questLogList"), detailEl=$("#questLogDetail");
  if(!listEl||!detailEl)return;
  const list=questEntries();
  if(!list.length){
    listEl.innerHTML="";
    detailEl.innerHTML=`<div class="ql-detail-empty">尚未接受任务。<br><br>与营地的长老 · 岩蹄对话（F）开始旅程。<br>按 L 随时打开任务日志。</div>`;
    _questLogSel=null;
    return;
  }
  if(!_questLogSel||!list.some(e=>e.id===_questLogSel))_questLogSel=list[0].id;
  const active=list.filter(e=>e.status!=="done");
  const done=list.filter(e=>e.status==="done");
  let html="";
  const renderGroup=(title,arr)=>{
    if(!arr.length)return;
    html+=`<div class="ql-zone">${title}</div>`;
    let lastZone="";
    for(const e of arr){
      if(e.zone&&e.zone!==lastZone){
        lastZone=e.zone;
        html+=`<div class="ql-zone-sub">${QUEST_ZONE_NAME[e.zone]||e.zone}</div>`;
      }
      const ic=e.status==="done"?"✔":e.status==="ready"?"❓":"❗";
      const cls=["ql-row"];
      if(e.id===_questLogSel)cls.push("sel");
      if(e.status==="ready")cls.push("ready");
      if(e.status==="done")cls.push("done-row");
      html+=`<div class="${cls.join(" ")}" data-qid="${e.id}" role="button" tabindex="0">`+
        `<span class="ql-ic">${ic}</span><span class="ql-nm">${e.title}</span></div>`;
    }
  };
  renderGroup(`进行中（${active.length}）`,active);
  renderGroup(`已完成（${done.length}）`,done);
  listEl.innerHTML=html;
  listEl.querySelectorAll(".ql-row").forEach(row=>{
    row.addEventListener("click",()=>{
      _questLogSel=row.dataset.qid;
      renderQuestLog();
    });
  });
  const cur=list.find(e=>e.id===_questLogSel)||list[0];
  renderQuestDetail(cur);
}

function toggleCharPanel(){
  if(!S.started)return;
  const open=panelOpen("#charPanel");
  if(open){setPanel("#charPanel",false);return;}
  setPanel("#charPanel",true);
  /* 魔兽手感：开角色时顺带打开背包，左右对照换装 */
  if(typeof ensureBagOpen==="function")ensureBagOpen();
  renderCharPanel();
}
function toggleSpellPanel(){
  if(!S.started)return;
  const open=panelOpen("#spellPanel");
  if(open){setPanel("#spellPanel",false);return;}
  setPanel("#spellPanel",true);
  renderSpellPanel();
}
function toggleQuestLog(){
  if(!S.started)return;
  const open=panelOpen("#questLog");
  if(open){setPanel("#questLog",false);return;}
  setPanel("#questLog",true);
  renderQuestLog();
}

$("#charClose").addEventListener("click",toggleCharPanel);
$("#spellClose").addEventListener("click",toggleSpellPanel);
$("#questLogClose").addEventListener("click",toggleQuestLog);

console.info("[panels] STEP 14 就绪：C 角色 · P 法术书 · L 任务日志");
