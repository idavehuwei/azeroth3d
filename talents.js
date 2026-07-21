/* ============================================================
   熔火之心 · talents.js
   天赋（STEP 10a/10b）：三职业双枝三层小树 + 修饰器聚合 + N 键面板
   不改技能函数本体；CD/伤害/生命通过 recomputeTalentMods 注入
   ------------------------------------------------------------
   [依赖] core.js（BAL）· combat.js（S CLS SKILLS CLASSES）· icons.js
   [导出] TALENTS getTalentNode talentRank spendTalent resetTalents
          recomputeTalentMods getSkillCd syncTalentPointsFromLevel
          grantTalentPointOnLevel updateSkillBarStats
          talentPointsUnspent talentPointsTotal
          toggleTalentPanel renderTalentPanel
   ============================================================ */
"use strict";

/* ---- 树形拓扑（文案/依赖）；数值在 BAL.talents[classKey][nodeId] ---- */
const TALENTS={
  warrior:{
    branches:[
      {id:"arms",name:"武器",nodes:[
        {id:"giant_str",tier:1,name:"巨人之力",maxRank:3,icon:"sword",desc:"攻击伤害提高"},
        {id:"whirl_master",tier:2,name:"旋风掌握",maxRank:3,icon:"hammer",req:"giant_str",reqRank:1,desc:"旋风斩冷却缩短"},
        {id:"massacre",tier:3,name:"杀戮",maxRank:3,icon:"sword",req:"whirl_master",reqRank:1,desc:"攻击伤害提高"},
      ]},
      {id:"prot",name:"防护",nodes:[
        {id:"tough",tier:1,name:"坚韧",maxRank:3,icon:"armor",desc:"生命上限提高"},
        {id:"iron_will",tier:2,name:"钢铁意志",maxRank:3,icon:"armor",req:"tough",reqRank:1,desc:"生命上限提高"},
        {id:"bulwark",tier:3,name:"壁垒",maxRank:3,icon:"armor",req:"iron_will",reqRank:1,desc:"生命提高，技能冷却微减"},
      ]},
    ],
  },
  mage:{
    branches:[
      {id:"fire",name:"火焰",nodes:[
        {id:"pyro_chain",tier:1,name:"炎爆连击",maxRank:3,icon:"fireball",desc:"炎爆术冷却缩短"},
        {id:"ignite",tier:2,name:"点燃",maxRank:3,icon:"fireball",req:"pyro_chain",reqRank:1,desc:"攻击伤害提高"},
        {id:"combustion",tier:3,name:"燃烧",maxRank:3,icon:"fireball",req:"ignite",reqRank:1,desc:"伤害提高，炎爆冷却再减"},
      ]},
      {id:"frost",name:"冰霜",nodes:[
        {id:"frostbite",tier:1,name:"冰霜减速",maxRank:3,icon:"heal",desc:"冰霜效果增强（标记）"},
        {id:"ice_ward",tier:2,name:"冰霜护体",maxRank:3,icon:"heal",req:"frostbite",reqRank:1,desc:"生命提高，冰霜新星冷却缩短"},
        {id:"deep_freeze",tier:3,name:"深度冻结",maxRank:3,icon:"heal",req:"ice_ward",reqRank:1,desc:"减速增强，全局冷却微减"},
      ]},
    ],
  },
  archer:{
    branches:[
      {id:"marksmanship",name:"射击",nodes:[
        {id:"rapid",tier:1,name:"速射",maxRank:3,icon:"feather",desc:"瞄准射击冷却缩短"},
        {id:"focus",tier:2,name:"专注",maxRank:3,icon:"feather",req:"rapid",reqRank:1,desc:"攻击伤害提高"},
        {id:"sniper",tier:3,name:"狙击",maxRank:3,icon:"feather",req:"focus",reqRank:1,desc:"伤害提高，瞄准冷却再减"},
      ]},
      {id:"survival",name:"生存",nodes:[
        {id:"venom",tier:1,name:"毒箭",maxRank:3,icon:"tusk",desc:"箭矢附加毒性（标记）"},
        {id:"survival",tier:2,name:"求生",maxRank:3,icon:"hide",req:"venom",reqRank:1,desc:"生命上限提高"},
        {id:"trickle",tier:3,name:"散射专精",maxRank:3,icon:"feather",req:"survival",reqRank:1,desc:"生命提高，多重射击冷却缩短"},
      ]},
    ],
  },
};

/* 运行时态（挂在 S 上，便于存档 STEP 11） */
S.talents={points:0,spent:{},classKey:null,bonusPoints:0};
S.p._talentDmg=0;
S.p._talentHp=0;
S.p.talentCdMul=1;
S.p.talentSkillCd={};   /* skillIndex → 乘子积 */
S.p.talentFx={};

function talentClassKey(){
  for(const k in CLASSES)if(CLASSES[k]===CLS)return k;
  return S.talents.classKey||"warrior";
}

function getTalentNode(classKey,nodeId){
  const tree=TALENTS[classKey]; if(!tree)return null;
  for(const br of tree.branches){
    for(const n of br.nodes)if(n.id===nodeId)return n;
  }
  return null;
}

function talentRank(nodeId){return S.talents.spent[nodeId]|0;}

function talentPointsTotal(){
  const T=BAL.talents, lv=S.p.level;
  let n=0;
  if(lv>=T.firstPointLevel)n=(lv-T.firstPointLevel+1)*T.pointsPerLevel;
  n+=(S.talents.bonusPoints|0);   /* cheat / 测试用 */
  return n;
}

function talentPointsSpent(){
  let s=0; for(const id in S.talents.spent)s+=S.talents.spent[id]|0; return s;
}

function talentPointsUnspent(){return Math.max(0,talentPointsTotal()-talentPointsSpent());}

function syncTalentPointsFromLevel(){
  S.talents.points=talentPointsUnspent();
}

function canSpendTalent(nodeId){
  const ck=talentClassKey();
  const node=getTalentNode(ck,nodeId);
  if(!node)return {ok:false,reason:"未知天赋"};
  if(S.talents.classKey&&S.talents.classKey!==ck)return {ok:false,reason:"职业不匹配"};
  const rank=talentRank(nodeId);
  if(rank>=node.maxRank)return {ok:false,reason:"已满级"};
  if(talentPointsUnspent()<=0)return {ok:false,reason:"没有天赋点"};
  if(node.req){
    if(talentRank(node.req)<(node.reqRank||1))
      return {ok:false,reason:"需要前置天赋"};
  }
  return {ok:true};
}

/** 聚合已点天赋 → 写回 S.p 修饰（可反复调用，幂等） */
function recomputeTalentMods(){
  const ck=talentClassKey();
  /* 先撤掉旧贡献 */
  S.p.dmgMul-=S.p._talentDmg||0;
  S.p.hpMax-=S.p._talentHp||0;
  if(S.p.hp>S.p.hpMax)S.p.hp=S.p.hpMax;

  let dmg=0, hpMul=1, cdMul=1;
  const skillCd={};  /* i → 乘子积 */
  const fx={};
  const balRoot=BAL.talents[ck]||{};

  for(const id in S.talents.spent){
    const rank=S.talents.spent[id]|0; if(rank<=0)continue;
    const per=balRoot[id]; if(!per)continue;
    for(let r=0;r<rank;r++){
      if(per.dmgMul)dmg+=per.dmgMul;
      if(per.hpMaxMul)hpMul*=(1+per.hpMaxMul);
      if(per.cdMul)cdMul*=per.cdMul;
      if(per.skillCd){
        const i=per.skillCd.i, m=per.skillCd.mul;
        skillCd[i]=(skillCd[i]!=null?skillCd[i]:1)*m;
      }
      if(per.fx){
        for(const k in per.fx){
          const v=per.fx[k];
          fx[k]=typeof v==="number"?(fx[k]||0)+v:v;
        }
      }
    }
  }

  S.p._talentDmg=dmg;
  S.p._talentHp=Math.round(CLS.hp*(hpMul-1));
  S.p.dmgMul+=S.p._talentDmg;
  S.p.hpMax+=S.p._talentHp;
  S.p.hp=Math.min(S.p.hpMax,S.p.hp);
  S.p.talentCdMul=cdMul;
  S.p.talentSkillCd=skillCd;
  S.p.talentFx=fx;
  updateSkillBarStats();
}

function getSkillCd(i){
  const base=SKILLS[i]?SKILLS[i].cd:0;
  const sm=S.p.talentSkillCd&&S.p.talentSkillCd[i]!=null?S.p.talentSkillCd[i]:1;
  const gm=S.p.talentCdMul!=null?S.p.talentCdMul:1;
  return Math.max(0.5,+(base*sm*gm).toFixed(2));
}

function updateSkillBarStats(){
  if(!SKILLS||!SKILLS.length)return;
  document.querySelectorAll(".skill").forEach((el,i)=>{
    if(!SKILLS[i])return;
    const cd=getSkillCd(i);
    const base=SKILLS[i].cd;
    el.querySelector(".nm").textContent=SKILLS[i].name;
    el.title=cd<base-0.01
      ?`${SKILLS[i].name} · CD ${cd}s（天赋 ${base}s→${cd}s）`
      :`${SKILLS[i].name} · CD ${cd}s`;
  });
}

function spendTalent(nodeId){
  const ck=talentClassKey();
  const check=canSpendTalent(nodeId);
  if(!check.ok){log(check.reason,"lg-sys");return false;}
  S.talents.classKey=ck;
  S.talents.spent[nodeId]=(S.talents.spent[nodeId]|0)+1;
  syncTalentPointsFromLevel();
  recomputeTalentMods();
  const node=getTalentNode(ck,nodeId);
  log(`天赋【${node.name}】→ ${talentRank(nodeId)}/${node.maxRank}（剩余 ${talentPointsUnspent()} 点）`,"lg-heal");
  renderTalentPanel();
  return true;
}

function resetTalents(){
  S.talents.spent={};
  syncTalentPointsFromLevel();
  recomputeTalentMods();
  log(`天赋已重置。剩余 ${talentPointsUnspent()} 点可分配。`,"lg-sys");
  renderTalentPanel();
}

function grantTalentPointOnLevel(newLevel){
  const T=BAL.talents;
  if(newLevel<T.firstPointLevel)return;
  syncTalentPointsFromLevel();
  announce(`获得 1 点天赋！按 N 打开天赋（剩余 ${talentPointsUnspent()}）`);
  log(`升级获得 1 点天赋（剩余 ${talentPointsUnspent()} 点）。按 N 打开天赋面板。`,"lg-heal");
  renderTalentPanel();
}

/* ---------------- 天赋 UI（STEP 10b） ---------------- */
function talentOpen(){return $("#talent").style.display==="block";}
function closeTalentPanel(){$("#talent").style.display="none";}
function toggleTalentPanel(){
  if(!S.started)return;
  if(talentOpen()){closeTalentPanel();return;}
  if(typeof bagOpen==="function"&&bagOpen())$("#bag").style.display="none";
  $("#talent").style.display="block";
  renderTalentPanel();
}
function talentBorder(nodeId,node){
  const rank=talentRank(nodeId);
  if(rank>=node.maxRank)return "#ff9a55";
  if(canSpendTalent(nodeId).ok)return "#7dff9a";
  if(rank>0)return "#ffcf90";
  return "#555";
}
function renderTalentPanel(){
  if(!talentOpen())return;
  const ck=talentClassKey();
  const tree=TALENTS[ck];
  $("#talPoints").textContent=String(talentPointsUnspent());
  const root=$("#talentTree"); root.innerHTML="";
  if(!tree)return;
  for(const br of tree.branches){
    const col=document.createElement("div"); col.className="tal-branch";
    const h=document.createElement("h3"); h.textContent=br.name; col.appendChild(h);
    for(const node of br.nodes){
      const rank=talentRank(node.id);
      const check=canSpendTalent(node.id);
      const el=document.createElement("div");
      el.className="tal-node";
      if(rank>=node.maxRank)el.classList.add("maxed");
      else if(check.ok)el.classList.add("can");
      else if(rank===0)el.classList.add("locked");
      const border=talentBorder(node.id,node);
      const img=document.createElement("img");
      img.src=Icons.get(node.icon||"sword",border);
      img.style.borderColor=border;
      img.alt=node.name;
      const tn=document.createElement("div"); tn.className="tn";
      tn.innerHTML=`<div class="name">${node.name}</div><div class="desc">${node.desc}</div>`;
      const rk=document.createElement("div"); rk.className="rank";
      rk.textContent=`${rank}/${node.maxRank}`;
      el.appendChild(img); el.appendChild(tn); el.appendChild(rk);
      el.title=check.ok?`点击加点（${rank}/${node.maxRank}）`:check.reason;
      el.addEventListener("click",()=>spendTalent(node.id));
      col.appendChild(el);
    }
    root.appendChild(col);
  }
}
$("#talentClose").addEventListener("click",toggleTalentPanel);
$("#talentBtn").addEventListener("pointerdown",()=>toggleTalentPanel());
$("#talentReset").addEventListener("click",()=>{
  if(!S.started)return;
  resetTalents();
});

function initTalentsForClass(classKey){
  S.talents={points:0,spent:{},classKey:classKey||talentClassKey(),bonusPoints:0};
  S.p._talentDmg=0; S.p._talentHp=0;
  S.p.talentCdMul=1; S.p.talentSkillCd={}; S.p.talentFx={};
  syncTalentPointsFromLevel();
  recomputeTalentMods();
}

/* 临时验收 API（STEP 12 将并入 debug.js / ?dev） */
window.cheatTalent={
  give(n){
    S.talents.bonusPoints=(S.talents.bonusPoints|0)+(n|0);
    syncTalentPointsFromLevel();
    log(`[cheat] 天赋点剩余 ${talentPointsUnspent()}`,"lg-sys");
    return talentPointsUnspent();
  },
  spend:spendTalent,
  reset(){S.talents.bonusPoints=0;resetTalents();},
  dump(){
    return {
      class:talentClassKey(), level:S.p.level,
      unspent:talentPointsUnspent(), spent:{...S.talents.spent},
      dmgMul:S.p.dmgMul, hpMax:S.p.hpMax,
      cds:SKILLS.map((_,i)=>getSkillCd(i)), fx:{...S.p.talentFx},
    };
  },
  fillArms(){
    this.give(9);
    ["giant_str","giant_str","giant_str","whirl_master","whirl_master","whirl_master","massacre","massacre","massacre"]
      .forEach(id=>spendTalent(id));
    return this.dump();
  },
};

console.info("[talents] STEP 10a/10b 就绪：N 键面板 · cheatTalent.give(9) / .spend('giant_str') / .fillArms() / .dump()");

/* 战斗模块已 setClass，此处补初始化天赋态 */
initTalentsForClass(talentClassKey());
