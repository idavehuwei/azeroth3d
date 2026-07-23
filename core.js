/* ============================================================
   炽心 · core.js
   基础设施：工具函数 / 可播种随机器 / 渲染器 / 相机
            炽心场景环境（岩浆、平台、岩柱、火星粒子）/ makeLabel
   ------------------------------------------------------------
   [依赖] THREE（全局，CDN 引入）· js/sim/balance.js（BALANCE BAL）
   [导出] $ clamp rand R srand worldRng WORLD_SEED
          hashZoneId getZoneSeed setZoneSeed effectiveWorldSeed isMobileClient
          sceneRaid scene camera renderer lavaUniforms ARENA_R embers
          EMBERS emberVel makeLabel makeNameplate updateNameplateHp updateNameplatePresentation disposeNameplate
          GFX_PRESETS getGraphicsSettings applyGraphicsSettings loadGraphicsSettings saveGraphicsSettings
   ============================================================ */
/* ============================================================
   炽心 · 最终 Boss 战斗模拟
   全部 3D 模型使用 Three.js 几何体程序化搭建（原创低多边形风格）
   ============================================================ */
"use strict";
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);      /* 玩法随机（伤害浮动、掉落等） */
const R=a=>rand(a[0],a[1]);                    /* 从 [min,max] 区间取随机值 */

/* BALANCE / BAL 见 js/sim/balance.js（plan-v4 STEP 14） */

/* ============================================================
   可播种随机器（STEP 0，参考 WoC 确定性 Rng）
   世界摆放专用：种子固定 ⇒ 树木/岩石/台地位置永远一样
   玩法随机（伤害浮动、游荡目标等）仍走 rand()，两路分流
   ============================================================ */
const WORLD_SEED=20260721;
let WORLD_SEED_OVERRIDE=null; /* cheat.seed(n) 覆盖；已建区不重滚 */
function effectiveWorldSeed(){
  return WORLD_SEED_OVERRIDE!=null?(WORLD_SEED_OVERRIDE>>>0):WORLD_SEED;
}
function SeededRng(seed){let a=seed>>>0;return function(){
  a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* 分区种子：WORLD_SEED ^ hash(zoneId)，各区确定性且互不干扰（STEP 17） */
function hashZoneId(id){
  let h=2166136261>>>0;
  const s=String(id);
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
  return h>>>0;
}
function getZoneSeed(id){return(effectiveWorldSeed()^hashZoneId(id))>>>0;}
let _zoneRng=SeededRng(getZoneSeed("mulgore"));
function setZoneSeed(id){_zoneRng=SeededRng(getZoneSeed(id));}
function worldRng(){return _zoneRng();}       /* 兼容旧调用点；实际走当前分区 RNG */
const srand=(a,b)=>a+_zoneRng()*(b-a);         /* 摆放类随机：静态布景专用 */
function isMobileClient(){
  return typeof matchMedia==="function"&&matchMedia("(pointer:coarse)").matches;
}

/* ---------------- makeLabel：Canvas 悬浮文字（按字宽自适应，避免裁切） ---------------- */
function makeLabel(text,w,color="#ffd9a0",glow="rgba(255,90,0,.95)"){
  const NP=(typeof BAL!=="undefined"&&BAL.nameplate)||{};
  const maxCanvas=NP.labelCanvasMax!=null?NP.labelCanvasMax:1024;
  const minCanvas=NP.labelCanvasMin!=null?NP.labelCanvasMin:192;
  let fontSize=NP.fontSize!=null?NP.fontSize:44;
  const minFont=NP.minFontSize!=null?NP.minFontSize:24;
  const family="'Noto Sans SC','Microsoft YaHei',sans-serif";
  const str=String(text==null?"":text);
  const cv=document.createElement("canvas");
  const cx=cv.getContext("2d");
  cx.font=`bold ${fontSize}px ${family}`;
  let tw=cx.measureText(str).width;
  while(tw+40>maxCanvas&&fontSize>minFont){
    fontSize-=2;
    cx.font=`bold ${fontSize}px ${family}`;
    tw=cx.measureText(str).width;
  }
  const cw=Math.min(maxCanvas,Math.max(minCanvas,Math.ceil(tw+44)));
  const ch=Math.max(48,Math.ceil(fontSize*1.65));
  cv.width=cw; cv.height=ch;
  cx.font=`bold ${fontSize}px ${family}`;
  cx.textAlign="center"; cx.textBaseline="middle";
  cx.shadowColor=glow; cx.shadowBlur=Math.max(8,Math.round(fontSize*.28));
  cx.fillStyle=color;
  cx.fillText(str,cw/2,ch/2+.5);
  const tex=new THREE.CanvasTexture(cv);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  const aspect=cw/Math.max(1,ch);
  /* 长名加宽世界宽度，短名保持传入 w；高度按画布比例，不再裁切 */
  const baseAspect=NP.labelAspect!=null?NP.labelAspect:4;
  const worldW=w*Math.max(1,aspect/baseAspect);
  sp.scale.set(worldW,worldW/aspect,1);
  return sp;
}

/**
 * 魔兽式任务标记：金色 !（可接）/ ?（可交）/ 灰色 !（等级不够）
 * kind: "offer" | "turnin" | "low"
 */
function makeQuestMark(kind){
  const N=BAL.npc||{};
  const w=N.questMarkW!=null?+N.questMarkW:5.6;
  const aspect=N.questMarkAspect!=null?+N.questMarkAspect:1.15;
  const cv=document.createElement("canvas");
  cv.width=256; cv.height=320;
  const cx=cv.getContext("2d");
  const ch=kind==="turnin"?"?":"!";
  const fill=kind==="low"?"#b0b0b0":"#ffcc00";
  const glow=kind==="low"?"rgba(60,60,60,.85)":"rgba(255,170,0,1)";
  cx.clearRect(0,0,256,320);
  cx.textAlign="center";
  cx.textBaseline="middle";
  cx.font="900 210px Georgia,'Arial Black',Impact,sans-serif";
  cx.lineJoin="round";
  cx.lineCap="round";
  /* 外发光 */
  cx.shadowColor=glow;
  cx.shadowBlur=kind==="low"?18:36;
  /* 粗黑描边（魔兽剪影感） */
  cx.strokeStyle=kind==="low"?"#2a2a2a":"#1a1200";
  cx.lineWidth=28;
  cx.strokeText(ch,128,175);
  cx.shadowBlur=0;
  /* 主体填充 */
  cx.fillStyle=fill;
  cx.fillText(ch,128,175);
  /* 高光一点，更像经典黄标 */
  if(kind!=="low"){
    cx.fillStyle="rgba(255,255,210,.55)";
    cx.font="900 210px Georgia,'Arial Black',Impact,sans-serif";
    cx.save();
    cx.beginPath();
    cx.rect(40,40,100,140);
    cx.clip();
    cx.fillText(ch,128,175);
    cx.restore();
  }
  const tex=new THREE.CanvasTexture(cv);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:tex, transparent:true, depthWrite:false, sizeAttenuation:true
  }));
  sp.scale.set(w,w*aspect,1);
  sp.userData.questMark=kind||"offer";
  sp.center.set(.5,.15); /* 锚点靠下，像钉在头顶上方 */
  return sp;
}

/** 任务标记弹跳高度（世界 Y） */
function questMarkBobY(baseY,t,phase){
  const N=BAL.npc||{};
  const amp=N.questMarkBob!=null?+N.questMarkBob:.42;
  return baseY+Math.sin((t||0)*2.65+(phase||0))*amp;
}

/** 纯色精灵（姓名板血条） */
function makeBarSprite(hex,w,h){
  const cv=document.createElement("canvas");cv.width=64;cv.height=16;
  const cx=cv.getContext("2d");
  cx.fillStyle=hex;cx.fillRect(0,0,64,16);
  const barTex=new THREE.CanvasTexture(cv);
  barTex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:barTex,
    transparent:true,depthWrite:false}));
  sp.scale.set(w,h,1);
  return sp;
}

/**
 * 头顶姓名板：等级 + 名字 + 血条
 * @returns {THREE.Group} 兼容旧 label 的 position/visible
 */
function makeNameplate(name,level,opts){
  opts=opts||{};
  const NP=BAL.nameplate||{};
  const friendly=!!opts.friendly;
  const elite=!!opts.elite;
  const color=opts.color||(friendly?"#a8e8c0":"#ffd9a0");
  const glow=opts.glow||(friendly?(NP.friendGlow||"rgba(40,120,50,.9)"):(NP.enemyGlow||"rgba(180,40,20,.9)"));
  const barW=opts.barW!=null?opts.barW:(NP.barW||1.9);
  const barH=opts.barH!=null?opts.barH:(NP.barH||.16);
  const g=new THREE.Group();
  const title=(level!=null&&level!==""?`Lv.${level}  `:"")+name;
  let lw=opts.w!=null?opts.w:(NP.labelW||4.2);
  if(NP.labelWMul!=null)lw*=NP.labelWMul;
  if(NP.labelWMax!=null)lw=Math.min(lw,NP.labelWMax);
  const lab=makeLabel(title,lw,color,glow);
  lab.position.y=.28;
  g.add(lab);
  /* R7：精英金色描边 */
  if(elite){
    const border=makeBarSprite(NP.eliteBorder||"#ffd76a",barW+.12,barH+.1);
    border.position.y=-.12;
    border.position.z=-0.01;
    g.add(border);
    g.userData.border=border;
  }
  const bg=makeBarSprite(NP.bg||"#1a1208",barW,barH);
  bg.position.y=-.12;
  g.add(bg);
  const fill=makeBarSprite(friendly?(NP.friend||"#3a9a48"):(NP.enemy||"#d84828"),barW,barH);
  fill.center.set(0,.5);
  fill.position.set(-barW/2,-.12,0.01);
  g.add(fill);
  g.userData={lab,bg,fill,barW,barH,friendly,elite,level,name,baseOp:1};
  return g;
}
function updateNameplateHp(root,hp,hpMax){
  if(!root||!root.userData||!root.userData.fill)return;
  const ratio=hpMax>0?Math.max(0,Math.min(1,hp/hpMax)):0;
  const barW=root.userData.barW||1.9;
  root.userData.fill.scale.x=Math.max(0.001,barW*ratio);
}
/**
 * R7：姓名板距离缩放 / 远距淡出 / 超远隐藏（O(1)，无 raycast）
 * 遮挡 raycast 已撤下——全场景 traverse + 每板一次 intersect 会拖垮帧率。
 */
function updateNameplatePresentation(root,worldPos,opts){
  if(!root||!worldPos||!camera)return;
  opts=opts||{};
  const NP=BAL.nameplate||{};
  const dx=worldPos.x-camera.position.x;
  const dy=worldPos.y-camera.position.y;
  const dz=worldPos.z-camera.position.z;
  const distSq=dx*dx+dy*dy+dz*dz;
  const showAll=!!(typeof S!=="undefined"&&S.nameplatesShowAll);
  const far=showAll?(NP.farShowAll!=null?NP.farShowAll:120):(NP.far!=null?NP.far:42);
  const farSq=far*far;
  if(distSq>farSq){
    if(root.visible)root.visible=false;
    return;
  }
  if(!root.visible)root.visible=true;

  const near=NP.near!=null?NP.near:10;
  const dist=Math.sqrt(distSq);
  const t=dist<=near?0:Math.min(1,(dist-near)/Math.max(.01,far-near));
  const sMax=NP.maxScale!=null?NP.maxScale:1.1;
  const sMin=NP.minScale!=null?NP.minScale:.55;
  const s=sMax*(1-t)+sMin*t;
  if(root.userData._npScale!==s){
    root.userData._npScale=s;
    root.scale.setScalar(s);
  }

  const farFade=NP.farFade!=null?NP.farFade:.3;
  const fade=1-t*(1-farFade);
  if(root.userData._npFade!==fade){
    root.userData._npFade=fade;
    root.traverse(o=>{
      if(o.material&&o.material.opacity!=null){
        const base=o.userData&&o.userData.baseOp!=null?o.userData.baseOp:(root.userData.baseOp||1);
        o.material.transparent=true;
        o.material.opacity=base*fade;
      }
    });
  }

  /* C2：仇恨中姓名板偏红 */
  const threat=!!opts.threat;
  if(root.userData._npThreat!==threat){
    root.userData._npThreat=threat;
    const lab=root.userData.lab;
    if(lab&&lab.material&&lab.material.color){
      if(threat)lab.material.color.setHex(NP.threatTint!=null?NP.threatTint:0xff6060);
      else lab.material.color.setHex(0xffffff);
    }
  }
}
function disposeNameplate(root){
  if(!root)return;
  root.traverse(o=>{
    if(o.material){
      if(o.material.map)o.material.map.dispose();
      o.material.dispose();
    }
  });
  if(root.parent)root.parent.remove(root);
}

/* ---------------- 场景基础（双场景：赤蹄草甸 / 炽心） ---------------- */
const sceneRaid=new THREE.Scene();
sceneRaid.fog=new THREE.FogExp2(0x1a0602,0.016);
let scene=sceneRaid;   /* 当前渲染场景 */
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,620);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
/* r165 色彩管理：sRGB 输出 + ACES（替代旧 outputEncoding / 非物理灯光） */
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=(BAL.sky&&BAL.sky.toneMappingExposure!=null)?BAL.sky.toneMappingExposure:1.35;
$("#game").appendChild(renderer.domElement);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);});

/* ---------------- 副本场景由 raid.js 的 buildRaidScene() 搭建 ---------------- */
const lavaUniforms={uTime:{value:0}};  /* Shader uniform，供 raid.js 与 main.js 共用 */

/* ---------------- 火星粒子（副本场景共用，每帧动画） ---------------- */
const ARENA_R=26;
const EMBERS=260;
const emberGeo=new THREE.BufferGeometry();
const emberPos=new Float32Array(EMBERS*3), emberVel=new Float32Array(EMBERS);
for(let i=0;i<EMBERS;i++){
  emberPos[i*3]=rand(-60,60);emberPos[i*3+1]=rand(0,26);emberPos[i*3+2]=rand(-60,60);
  emberVel[i]=rand(.8,2.6);
}
emberGeo.setAttribute("position",new THREE.BufferAttribute(emberPos,3));
const embers=new THREE.Points(emberGeo,new THREE.PointsMaterial({color:0xffa040,size:.32,
  transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
/* 火星粒子在 buildRaidScene 中加到 sceneRaid */

/* ============================================================
   画面 / 特效偏好（登录页齿轮）
   与角色存档分离；改预设只动 BAL.vfx 性能字段，不改颜色语义
   ============================================================ */
const GFX_PRESETS={
  low:{
    label:"流畅", hint:"少粒子 · 无拖尾 · 阴影 1024 · 无假 Bloom",
    useLights:false, trails:false, hitFlash:true, dissolve:false, fakeBloom:false,
    pool:{capacity:4, maxCount:12},
    impactLife:.55, impactSize:.35, trailLen:0, segs:5,
    counts:{melee_impact:4, roar_aura:8, heal_cross:6, loot_spark:6},
    shadowMap:1024, pixelRatioCap:1.25,
  },
  balanced:{
    label:"均衡", hint:"默认推荐 · 性能与观感兼顾",
    useLights:false, trails:true, hitFlash:true, dissolve:true, fakeBloom:false,
    pool:{capacity:8, maxCount:24},
    impactLife:.75, impactSize:.4, trailLen:5, segs:6,
    counts:{melee_impact:8, roar_aura:18, heal_cross:10, loot_spark:12},
    shadowMap:2048, pixelRatioCap:2,
  },
  high:{
    label:"华丽", hint:"更多粒子 · 拖尾 · 假 Bloom 外壳",
    useLights:false, trails:true, hitFlash:true, dissolve:true, fakeBloom:true,
    pool:{capacity:14, maxCount:40},
    impactLife:1.0, impactSize:.45, trailLen:8, segs:8,
    counts:{melee_impact:14, roar_aura:28, heal_cross:14, loot_spark:18},
    shadowMap:2048, pixelRatioCap:2,
  },
};

let _gfxState=null;

function getGraphicsSettings(){
  if(_gfxState)return Object.assign({},_gfxState);
  const p=BAL.graphics&&BAL.graphics.defaultPreset||"balanced";
  const pre=GFX_PRESETS[p]||GFX_PRESETS.balanced;
  return {
    preset:p,
    useLights:!!pre.useLights,
    trails:!!pre.trails,
    hitFlash:!!pre.hitFlash,
    dissolve:!!pre.dissolve,
    fakeBloom:!!pre.fakeBloom,
  };
}

function applyGraphicsSettings(cfg,opts){
  opts=opts||{};
  const presetId=(cfg&&cfg.preset&&GFX_PRESETS[cfg.preset])?cfg.preset:(BAL.graphics.defaultPreset||"balanced");
  const pre=GFX_PRESETS[presetId];
  const state={
    preset:presetId,
    useLights:cfg&&cfg.useLights!=null?!!cfg.useLights:!!pre.useLights,
    trails:cfg&&cfg.trails!=null?!!cfg.trails:!!pre.trails,
    hitFlash:cfg&&cfg.hitFlash!=null?!!cfg.hitFlash:!!pre.hitFlash,
    dissolve:cfg&&cfg.dissolve!=null?!!cfg.dissolve:!!pre.dissolve,
    fakeBloom:cfg&&cfg.fakeBloom!=null?!!cfg.fakeBloom:!!pre.fakeBloom,
  };
  _gfxState=state;
  const V=BAL.vfx;
  if(!V)return state;
  V.useLights=state.useLights;
  V.trails=state.trails;
  V.hitFlash=state.hitFlash;
  V.dissolve=state.dissolve;
  V.fakeBloom=state.fakeBloom;
  V.pool={capacity:pre.pool.capacity, maxCount:pre.pool.maxCount};
  if(!V.impact)V.impact={};
  V.impact.life=pre.impactLife;
  V.impact.size=pre.impactSize;
  const tLen=state.trails?pre.trailLen:0;
  if(V.lava_bolt){V.lava_bolt.trailLen=tLen; V.lava_bolt.segs=pre.segs;}
  if(V.venom_bolt){V.venom_bolt.trailLen=tLen; V.venom_bolt.segs=pre.segs;}
  const keys=["melee_impact","roar_aura","heal_cross","loot_spark"];
  for(let i=0;i<keys.length;i++){
    const k=keys[i];
    if(V[k]&&pre.counts[k]!=null)V[k].count=pre.counts[k];
  }
  /* R8：阴影档 + 像素比（移动端阴影仍封顶 shadowMapMobile） */
  if(BAL.sky&&pre.shadowMap)BAL.sky.shadowMap=pre.shadowMap;
  if(typeof renderer!=="undefined"&&renderer&&pre.pixelRatioCap){
    renderer.setPixelRatio(Math.min(devicePixelRatio,pre.pixelRatioCap));
  }
  if(typeof refreshSunShadows==="function")refreshSunShadows();
  if(opts.rebuild&&typeof rebuildVfxPool==="function")rebuildVfxPool();
  return state;
}

function loadGraphicsSettings(){
  let cfg=null;
  try{
    const key=BAL.graphics&&BAL.graphics.key;
    if(key){
      const raw=localStorage.getItem(key);
      if(raw)cfg=JSON.parse(raw);
    }
  }catch(e){cfg=null;}
  if(!cfg||typeof cfg!=="object")cfg={preset:BAL.graphics.defaultPreset||"balanced"};
  if(!GFX_PRESETS[cfg.preset])cfg.preset=BAL.graphics.defaultPreset||"balanced";
  return applyGraphicsSettings(cfg);
}

function saveGraphicsSettings(cfg){
  const state=applyGraphicsSettings(cfg||getGraphicsSettings(),{rebuild:true});
  try{
    const key=BAL.graphics&&BAL.graphics.key;
    if(key)localStorage.setItem(key,JSON.stringify(state));
  }catch(e){}
  return state;
}

loadGraphicsSettings();
