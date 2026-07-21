/* ============================================================
   熔火之心 · panels.js
   HUD 面板（STEP 14）：角色(C) / 法术书(P) / 任务日志(L)
   纯 DOM 覆盖层，不碰 Three.js；数值读自 S.p / CLS / ITEMS / getSkillCd
   ------------------------------------------------------------
   [依赖] core.js（$ BAL）· combat.js（S CLS SKILLS formatCopperText）
          items.js（ITEMS QUALITY EQUIP_SLOTS EQUIP_SLOT_LABEL bagOpen bindItemTip）· talents.js（getSkillCd talentOpen）
          world.js（QUEST updateQuest）· icons.js（Icons）
          quests.js 运行时（getQuestLogEntries abandonQuest canAbandonQuest getQuestDef questNpcLabel）
          map.js 运行时（worldMapOpen；关闭世界地图）
   [导出] toggleCharPanel toggleSpellPanel toggleQuestLog
          renderCharPanel renderSpellPanel renderQuestLog
          closeAllHudPanels equipScore itemScore
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
}

function itemScore(it){
  if(!it)return 0;
  const G=BAL.gearScore;
  let s=G.quality[it.quality]|0;
  const st=it.stats||{};
  if(st.dmgMul)s+=(st.dmgMul-1)*G.dmgMul;
  if(st.hpMax)s+=st.hpMax*G.hpMax;
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
  const bal=sk.bal&&BAL.skills[sk.bal];
  if(!bal)return "";
  const bits=[];
  if(bal.dmg){
    const r=scaledRange(bal.dmg);
    bits.push(`伤害 ${r[0]}–${r[1]}`);
  }
  if(bal.heal)bits.push(`治疗 ${bal.heal[0]}–${bal.heal[1]}`);
  if(bal.absorb){
    const a=Array.isArray(bal.absorb)?bal.absorb:[bal.absorb,bal.absorb];
    bits.push(`吸收 ${a[0]}–${a[1]}`);
  }
  if(bal.duration)bits.push(`持续 ${bal.duration}s`);
  if(bal.radius)bits.push(`半径 ${bal.radius}m`);
  if(bal.dist)bits.push(`位移 ${bal.dist}m`);
  if(bal.invuln)bits.push(`免疫 ${bal.invuln}s`);
  if(bal.rootT)bits.push(`定身 ${bal.rootT}s`);
  if(bal.rageGain)bits.push(`怒气 +${bal.rageGain}`);
  return bits.join(" · ");
}

function pdSlotHtml(slot){
  const label=EQUIP_SLOT_LABEL[slot]||slot;
  const id=S.eq[slot];
  const it=id?ITEMS[id]:null;
  if(!it){
    return `<div class="pd-slot empty" data-slot="${slot}" title="${label}">`+
      `<span class="pd-tag">${label}</span></div>`;
  }
  const q=QUALITY[it.quality];
  return `<div class="pd-slot filled" data-slot="${slot}" data-item="${it.id}" title="${it.name}">`+
    `<img src="${Icons.get(it.icon,q.color)}" style="border-color:${q.color}" alt="">`+
    `<span class="pd-tag">${label}</span></div>`;
}

function renderCharPanel(){
  if(!panelOpen("#charPanel"))return;
  const P=S.p, body=$("#charBody");
  const autoLo=Math.round(CLS.autoMin*(P.dmgMul||1));
  const autoHi=Math.round(CLS.autoMax*(P.dmgMul||1));
  const gs=equipScore();
  const fx=P.talentFx||{};
  const fxBits=[];
  if(fx.frostSlow)fxBits.push(`冰霜减速 +${Math.round(fx.frostSlow*100)}%`);
  if(fx.poisonArrow)fxBits.push("毒箭标记");
  if(fx.pyroBurst)fxBits.push("炎爆强化");
  if(fx.healMul)fxBits.push(`治疗 +${Math.round(fx.healMul*100)}%`);
  if(fx.shieldMul)fxBits.push(`盾吸收 +${Math.round(fx.shieldMul*100)}%`);

  const row=(k,v)=>`<div class="ph-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const left=["head","neck","shoulder","back","chest"];
  const right=["hands","legs","feet","finger"];
  const bottom=["mainhand"];

  body.innerHTML=
    `<div class="ph-layout">`+
      `<div class="ph-doll" aria-label="装备">`+
        `<div class="ph-doll-col">${left.map(pdSlotHtml).join("")}</div>`+
        `<div class="ph-doll-mid"><div class="ph-doll-sil">⚔</div><div class="ph-doll-lv">Lv.${P.level}</div></div>`+
        `<div class="ph-doll-col">${right.map(pdSlotHtml).join("")}</div>`+
        `<div class="ph-doll-bot">${bottom.map(pdSlotHtml).join("")}</div>`+
      `</div>`+
      `<div class="ph-stats">`+
        `<div class="ph-sec">概览</div>`+
        row("职业",CLS.title)+
        row("等级",`Lv.${P.level}`)+
        row("经验",P.level>=BAL.levels.max?"满级":`${Math.floor(P.xp)} / ${P.xpMax}`)+
        row("金币",formatCopperText(P.gold|0))+
        row("装备评分",String(gs))+
        `<div class="ph-sec">战斗属性</div>`+
        row("生命",`${Math.ceil(P.hp)} / ${P.hpMax}`)+
        row(CLS.resName,`${Math.floor(P.rage)} / ${P.rageMax}`)+
        (P.absorb>0?row("吸收盾",`${Math.ceil(P.absorb)}（${P.absorbT.toFixed(1)}s）`):"")+
        row("伤害加成",`×${(P.dmgMul||1).toFixed(2)}`)+
        row("自动攻击",`${autoLo}–${autoHi}`)+
        row("攻击间隔",`${CLS.autoSpd}s`)+
        row("移速",String(P.speed))+
        row("射程",CLS.ranged?`${CLS.range}m`:"近战")+
        (fxBits.length?row("天赋效果",fxBits.join(" · ")):"")+
      `</div>`+
    `</div>`;

  body.querySelectorAll(".pd-slot").forEach(el=>{
    const slot=el.dataset.slot;
    const id=S.eq[slot];
    const it=id?ITEMS[id]:null;
    if(it&&typeof bindItemTip==="function")
      bindItemTip(el,it,"点击卸下");
    el.addEventListener("click",()=>{
      if(S.eq[slot]){hideItemTip();unequipItem(slot);}
    });
  });
}

function renderSpellPanel(){
  if(!panelOpen("#spellPanel"))return;
  const body=$("#spellBody");
  body.innerHTML="";
  SKILLS.forEach((sk,i)=>{
    const cd=typeof getSkillCd==="function"?getSkillCd(i):sk.cd;
    const base=sk.cd;
    const cdTx=cd<base-0.01?`CD ${cd}s（基础 ${base}s）`:`CD ${cd}s`;
    const cost=sk.rage>0?`${CLS.resName} ${sk.rage}`:"无消耗";
    const card=document.createElement("div");
    card.className="spell-card";
    card.innerHTML=
      `<img class="ic" src="${Icons.get(sk.icon||"sword",typeof SKILL_ICON_BORDER!=="undefined"?SKILL_ICON_BORDER:"#e8b34a")}" alt="">`+
      `<div class="body">`+
        `<div class="nm">${i+1}. ${sk.name}</div>`+
        `<div class="meta">${cdTx} · ${cost}</div>`+
        `<div class="desc">${sk.desc||""}${spellStatLine(sk)?`<br>${spellStatLine(sk)}`:""}</div>`+
      `</div>`;
    body.appendChild(card);
  });
}

function questEntries(){
  if(typeof getQuestLogEntries==="function")return getQuestLogEntries();
  return [];
}

const QUEST_ZONE_NAME={mulgore:"莫高雷",barrens:"贫瘠之地",durotar:"赭岩谷",
  molten_core:"熔火之心",wailing_caverns:"哀嚎洞穴",onyxias_lair:"奥妮克希亚巢穴"};
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
  if(abandonable){
    html+=`<div class="ql-acts"><button type="button" class="ql-abandon" data-qid="${e.id}">放弃任务</button></div>`;
  }
  detail.innerHTML=html;
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
  let html="", lastZone="";
  for(const e of list){
    if(e.zone&&e.zone!==lastZone){
      lastZone=e.zone;
      html+=`<div class="ql-zone">${QUEST_ZONE_NAME[e.zone]||e.zone}</div>`;
    }
    const ic=e.status==="done"?"✔":e.status==="ready"?"❓":"❗";
    const cls=["ql-row"];
    if(e.id===_questLogSel)cls.push("sel");
    if(e.status==="ready")cls.push("ready");
    if(e.status==="done")cls.push("done-row");
    html+=`<div class="${cls.join(" ")}" data-qid="${e.id}" role="button" tabindex="0">`+
      `<span class="ql-ic">${ic}</span><span class="ql-nm">${e.title}</span></div>`;
  }
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
