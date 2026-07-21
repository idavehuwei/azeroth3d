/* ============================================================
   熔火之心 · panels.js
   HUD 面板（STEP 14）：角色(C) / 法术书(P) / 任务日志(L)
   纯 DOM 覆盖层，不碰 Three.js；数值读自 S.p / CLS / ITEMS / getSkillCd
   ------------------------------------------------------------
   [依赖] core.js（$ BAL）· combat.js（S CLS SKILLS formatCopperText）
          items.js（ITEMS QUALITY bagOpen）· talents.js（getSkillCd talentOpen）
          world.js（QUEST updateQuest）· icons.js（Icons）
          map.js 运行时（worldMapOpen；关闭世界地图）
   [导出] toggleCharPanel toggleSpellPanel toggleQuestLog
          renderCharPanel renderSpellPanel renderQuestLog
          closeAllHudPanels equipScore itemScore
   ============================================================ */
"use strict";

function panelOpen(id){return $(id).style.display==="block";}
function setPanel(id,on){$(id).style.display=on?"block":"none";}

function closeAllHudPanels(except){
  if(except!=="char")setPanel("#charPanel",false);
  if(except!=="spell")setPanel("#spellPanel",false);
  if(except!=="quest")setPanel("#questLog",false);
  if(except!=="bag"&&typeof bagOpen==="function"&&bagOpen())$("#bag").style.display="none";
  if(except!=="talent"&&typeof talentOpen==="function"&&talentOpen())closeTalentPanel();
  if(except!=="map"&&typeof worldMapOpen==="function"&&worldMapOpen()){
    const ov=$("#worldMapOv"); if(ov)ov.classList.remove("show");
  }
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
  for(const slot of ["weapon","armor"]){
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

function renderCharPanel(){
  if(!panelOpen("#charPanel"))return;
  const P=S.p, body=$("#charBody");
  const autoLo=Math.round(CLS.autoMin*(P.dmgMul||1));
  const autoHi=Math.round(CLS.autoMax*(P.dmgMul||1));
  const gs=equipScore();
  const w=S.eq.weapon?ITEMS[S.eq.weapon]:null;
  const a=S.eq.armor?ITEMS[S.eq.armor]:null;
  const fx=P.talentFx||{};
  const fxBits=[];
  if(fx.frostSlow)fxBits.push(`冰霜减速 +${Math.round(fx.frostSlow*100)}%`);
  if(fx.poisonArrow)fxBits.push("毒箭标记");
  if(fx.pyroBurst)fxBits.push("炎爆强化");
  if(fx.healMul)fxBits.push(`治疗 +${Math.round(fx.healMul*100)}%`);
  if(fx.shieldMul)fxBits.push(`盾吸收 +${Math.round(fx.shieldMul*100)}%`);

  const row=(k,v)=>`<div class="ph-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const eqSlot=(label,it)=>{
    if(!it)return `<div class="slot empty">${label}：空</div>`;
    const q=QUALITY[it.quality];
    return `<div class="slot"><img src="${Icons.get(it.icon,q.color)}" style="border-color:${q.color}" alt="">`+
      `<div><div>${it.name}</div><div class="empty">${q.name} · 评分 ${itemScore(it)}</div></div></div>`;
  };

  body.innerHTML=
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
    `<div class="ph-sec">装备</div>`+
    `<div class="ph-eq">${eqSlot("武器",w)}${eqSlot("护甲",a)}</div>`;
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
      `<div class="ic">${sk.icon}</div>`+
      `<div class="body">`+
        `<div class="nm">${i+1}. ${sk.name}</div>`+
        `<div class="meta">${cdTx} · ${cost}</div>`+
        `<div class="desc">${sk.desc||""}${spellStatLine(sk)?`<br>${spellStatLine(sk)}`:""}</div>`+
      `</div>`;
    body.appendChild(card);
  });
}

function questEntries(){
  const entries=[];
  if(QUEST.state===1){
    const n=Math.min(QUEST.kills,BAL.quest.boarKills);
    entries.push({
      title:"狂躁的野猪",
      obj:`猎杀草原野猪 ${n}/${BAL.quest.boarKills}`,
      done:n>=BAL.quest.boarKills,
      tip:n>=BAL.quest.boarKills?"回到营地找长老 · 岩蹄领取奖励":"在营地附近猎杀草原野猪",
    });
  }else if(QUEST.state===2){
    entries.push({
      title:"讨伐拉戈斯",
      obj:"进入北方传送门，击败炎魔领主拉戈斯",
      done:false,
      tip:"沿土路北行，踏入熔火之心",
    });
  }else if(QUEST.state>=3){
    entries.push({
      title:"讨伐拉戈斯",
      obj:"已击败炎魔领主拉戈斯",
      done:true,
      tip:"任务完成",
    });
  }
  if(typeof BARRENS_QUEST!=="undefined"&&BARRENS_QUEST.state>=1){
    const need=BAL.quest.barrens.quilboarKills;
    if(BARRENS_QUEST.state===1){
      const n=Math.min(BARRENS_QUEST.kills,need);
      entries.push({
        title:"十字路口的麻烦",
        obj:`清剿野猪人斥候 ${n}/${need}`,
        done:n>=need,
        tip:n>=need?"回十字路口找哨兵 · 碎牙领取奖励":"在贫瘠之地西边野猪人前哨清剿",
      });
    }else{
      entries.push({
        title:"十字路口的麻烦",
        obj:"已肃清野猪人前哨",
        done:true,
        tip:"南方哀嚎洞穴即将开放",
      });
    }
  }
  return entries;
}

function renderQuestLog(){
  if(!panelOpen("#questLog"))return;
  const body=$("#questLogBody");
  const list=questEntries();
  if(!list.length){
    body.innerHTML=`<div class="ql-empty">尚未接受任务。<br>与营地的长老 · 岩蹄对话（F）开始旅程。</div>`;
    return;
  }
  body.innerHTML=list.map(e=>
    `<div class="ql-item${e.done?" done":""}">`+
      `<div class="ttl">${e.done?"✔ ":""}${e.title}</div>`+
      `<div class="obj">${e.obj}</div>`+
      `<div class="st">${e.tip}</div>`+
    `</div>`
  ).join("");
}

function toggleCharPanel(){
  if(!S.started)return;
  const open=panelOpen("#charPanel");
  if(open){setPanel("#charPanel",false);return;}
  closeAllHudPanels("char");
  setPanel("#charPanel",true);
  renderCharPanel();
}
function toggleSpellPanel(){
  if(!S.started)return;
  const open=panelOpen("#spellPanel");
  if(open){setPanel("#spellPanel",false);return;}
  closeAllHudPanels("spell");
  setPanel("#spellPanel",true);
  renderSpellPanel();
}
function toggleQuestLog(){
  if(!S.started)return;
  const open=panelOpen("#questLog");
  if(open){setPanel("#questLog",false);return;}
  closeAllHudPanels("quest");
  setPanel("#questLog",true);
  renderQuestLog();
}

$("#charClose").addEventListener("click",toggleCharPanel);
$("#spellClose").addEventListener("click",toggleSpellPanel);
$("#questLogClose").addEventListener("click",toggleQuestLog);

console.info("[panels] STEP 14 就绪：C 角色 · P 法术书 · L 任务日志");
