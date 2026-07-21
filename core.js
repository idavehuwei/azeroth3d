/* ============================================================
   熔火之心 · core.js
   基础设施：工具函数 / 数值总表 BALANCE / 可播种随机器 / 渲染器 / 相机
            熔火之心场景环境（岩浆、平台、岩柱、火星粒子）/ makeLabel
   ------------------------------------------------------------
   [依赖] THREE（全局，CDN 引入）
   [导出] $ clamp rand R srand worldRng BALANCE BAL WORLD_SEED
          sceneRaid scene camera renderer lavaUniforms ARENA_R embers
          EMBERS emberVel makeLabel
   ============================================================ */
/* ============================================================
   熔火之心 · 最终 Boss 战斗模拟
   全部 3D 模型使用 Three.js 几何体程序化搭建（原创低多边形风格）
   ============================================================ */
"use strict";
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);      /* 玩法随机（伤害浮动、掉落等） */
const R=a=>rand(a[0],a[1]);                    /* 从 [min,max] 区间取随机值 */

/* ============================================================
   数值总表 BALANCE —— 改平衡只改这里，不碰逻辑代码（STEP 0）
   ============================================================ */
const BALANCE={
  /* 受击伤害浮动乘数区间 [min,max] */
  variance:{boss:[.9,1.12], mob:[.92,1.08], player:[.92,1.08]},
  /* 玩家技能（伤害/治疗为 [min,max]，距离/半径单位：米） */
  skills:{
    heroicStrike:{dmg:[520,680], addDmg:[500,650], reach:4.8, addReach:4.5, bossReach:10},
    whirlwind   :{dmg:[700,900], bossDmg:[760,940], radius:9, bossRadius:11},
    charge      :{rageGain:25, minDist:5, stopDist:6},
    potion      :{heal:[1600,2000]},
    pyroblast   :{dmg:[880,1080]},
    frostNova   :{dmg:[400,520], bossDmg:[420,540], radius:10, bossRadius:12, rootT:3},
    blink       :{dist:12},
    iceBlock    :{invuln:3},
    aimedShot   :{dmg:[820,1000]},
    multiShot   :{dmg:[430,540]},
    roll        :{dist:9, invuln:.7},
  },
  /* 野怪族群数值表（STEP 5）：加新怪 = 加一条；aggroR:0 = 中立被动（只反击） */
  mobs:{
    boar    :{hp:650, dmg:[55,85],  atkCd:2.2, meleeR:2.4, aggroR:7,  leashR:34, wanderSpd:3,  chaseSpd:5.5, respawnT:25,  xp:80},
    wolf    :{hp:520, dmg:[45,70],  atkCd:1.8, meleeR:2.3, aggroR:9,  leashR:38, wanderSpd:3.5,chaseSpd:6.5, respawnT:30,  xp:90,  socialR:18},
    bird    :{hp:480, dmg:[40,60],  atkCd:1.6, meleeR:2.2, aggroR:0,  leashR:30, wanderSpd:4.5,chaseSpd:8,   respawnT:25,  xp:70},
    harpy   :{hp:4200,dmg:[90,130], atkCd:2.4, meleeR:3.2, aggroR:12, leashR:44, wanderSpd:2.5,chaseSpd:5,   respawnT:60,  xp:450,
              cast:{name:"女妖之火",dmg:[220,300],dur:1.5,cd:6,range:20,speed:16,hitR:3}},
    boarKing:{hp:3200,dmg:[110,160],atkCd:2.4, meleeR:3.2, aggroR:8,  leashR:40, wanderSpd:2.2,chaseSpd:5,   respawnT:120, xp:500},
  },
  /* 脱战回巢（STEP 5 规范化）：回巢途中每秒回复最大生命的百分比，且免疫伤害 */
  leash:{regenPct:.5},
  /* 烈焰之子 */
  add:{hp:1400, dmg:[130,190], atkCd:2, speed:4.6, meleeR:3, stopR:2.6},
  /* 炎魔领主 · 拉戈斯 */
  boss:{hp:120000, phase2At:.5, submergeT:25, addCount:4,
    melee   :{dmg:[300,420], p2Mul:1.25, cd:[3,4.2], range:12, hitRange:13, delayMs:450},
    fireball:{dmg:[520,680], cast:1.8, cd:[8,11], hitR:4, speed:22},
    eruption:{dmg:[600,780], cast:1.5, cd:[9,12], count:3, p2Count:5, delay:2.2},
    wrath   :{dmg:[380,520], cast:2.2, cd:[16,20], range:16},
  },
  /* 任务 · 狂躁的野猪 / 讨伐拉戈斯 */
  quest:{boarKills:3, rewardHp:600, rewardDmgMul:1.15},
  /* 掉落与尸体拾取（STEP 2）：品质权重 70/25/5 · 尸体停留秒数 · 拾取距离 */
  loot:{weights:{common:70,uncommon:25,rare:5}, corpseT:8, pickupR:3.5,
        eliteWeights:{uncommon:72,rare:28}},   /* 精英必掉优秀以上（STEP 5） */
  /* 背包（STEP 4）：格数 */
  bag:{size:16},
  /* 上帝模式（首页勾选）：玩家每次攻击的固定伤害 */
  god:{dmg:9999999},
  /* 昼夜循环（STEP 7）：10 分钟一昼夜，render-only，不碰任何数值 */
  dayNight:{duration:600,  /* 10 分钟一昼夜（秒） */
    day:{sky:0x8fc0e8, fog:0xa8c8e0, fogDensity:0.0062, sunColor:0xfff2d8, sunIntensity:1.05,
         sunAlt:65, sunAz:0, hemiSky:0xcfe8ff, hemiGround:0x5a7a3a, hemiIntensity:0.95},
    night:{sky:0x08081a, fog:0x0a0a1a, fogDensity:0.025, sunColor:0x1a1a3a, sunIntensity:0.15,
           sunAlt:-20, sunAz:0, hemiSky:0x1a1a3a, hemiGround:0x0a0a1a, hemiIntensity:0.25},
    campfire:{base:1.4, nightBoost:2.6},  /* 白天 1.4，夜晚 1.4+2.6=4.0 */
  },
  /* 经验与等级（STEP 3）：经验来源 / 升级曲线 / 每级成长 */
  levels:{max:10, xp:{quest:300, boss:2000},   /* 野怪经验在 mobs 表逐条配置（STEP 5） */
    xpMax:[200,300,450,650,900,1200,1600,2100,2700],  /* 第 n 级升下一级所需经验 */
    perLevel:{dmgMul:.05, hpMax:.08}},                 /* 每级：基础伤害 +5% · 生命上限 +8% */
};
const BAL=BALANCE;

/* ============================================================
   可播种随机器（STEP 0，参考 WoC 确定性 Rng）
   世界摆放专用：种子固定 ⇒ 树木/岩石/台地位置永远一样
   玩法随机（伤害浮动、游荡目标等）仍走 rand()，两路分流
   ============================================================ */
const WORLD_SEED=20260721;
function SeededRng(seed){let a=seed>>>0;return function(){
  a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const worldRng=SeededRng(WORLD_SEED);
const srand=(a,b)=>a+worldRng()*(b-a);         /* 摆放类随机：静态布景专用 */

/* ---------------- makeLabel：Canvas 悬浮文字（掉落系统以品质色调用，默认参数保持旧观感） ---------------- */
function makeLabel(text,w,color="#ffd9a0",glow="rgba(255,90,0,.95)"){
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const cx=cv.getContext("2d");
  cx.font="bold 78px 'Noto Sans SC','Microsoft YaHei',sans-serif";
  cx.textAlign="center";cx.textBaseline="middle";
  cx.shadowColor=glow;cx.shadowBlur=26;
  cx.fillStyle=color;cx.fillText(text,256,64);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),
    transparent:true,depthWrite:false}));
  sp.scale.set(w,w/4,1); return sp;
}

/* ---------------- 场景基础（双场景：莫高雷 / 熔火之心） ---------------- */
const sceneRaid=new THREE.Scene();
sceneRaid.fog=new THREE.FogExp2(0x1a0602,0.016);
let scene=sceneRaid;   /* 当前渲染场景；以下副本内容全部装入 sceneRaid */
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,400);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("#game").appendChild(renderer.domElement);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);});

/* 光照：熔岩环境 */
scene.add(new THREE.AmbientLight(0x662211,0.9));
const lavaLight=new THREE.PointLight(0xff5a1a,1.6,140,1.6); lavaLight.position.set(0,6,-26); scene.add(lavaLight);
const topLight=new THREE.DirectionalLight(0xffb070,0.55);
topLight.position.set(18,40,20); topLight.castShadow=true;
topLight.shadow.mapSize.set(2048,2048);
topLight.shadow.camera.left=-50;topLight.shadow.camera.right=50;
topLight.shadow.camera.top=50;topLight.shadow.camera.bottom=-50;
scene.add(topLight);

/* ---------------- 岩浆湖（Shader 动态熔岩） ---------------- */
const lavaUniforms={uTime:{value:0}};
const lavaMat=new THREE.ShaderMaterial({
  uniforms:lavaUniforms,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    varying vec2 vUv;uniform float uTime;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
    void main(){
      vec2 p=vUv*14.;
      float f=fbm(p+vec2(uTime*.12,uTime*.05)+fbm(p*.6-uTime*.07)*2.2);
      vec3 dark=vec3(.12,.02,.0), mid=vec3(.85,.22,.02), hot=vec3(1.,.85,.35);
      vec3 c=mix(dark,mid,smoothstep(.28,.62,f));
      c=mix(c,hot,smoothstep(.68,.9,f));
      gl_FragColor=vec4(c,1.);
    }`
});
const lava=new THREE.Mesh(new THREE.PlaneGeometry(320,320,1,1),lavaMat);
lava.rotation.x=-Math.PI/2; lava.position.y=-0.9; scene.add(lava);

/* ---------------- 黑曜石战斗平台 ---------------- */
const ARENA_R=26;
const platMat=new THREE.MeshStandardMaterial({color:0x1c1412,roughness:.92,metalness:.15});
const platform=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R,ARENA_R+2.5,2.2,48),platMat);
platform.position.y=-1.1; platform.receiveShadow=true; scene.add(platform);
/* 平台边缘符文环 */
const runeRing=new THREE.Mesh(new THREE.RingGeometry(ARENA_R-1.4,ARENA_R-0.6,64),
  new THREE.MeshBasicMaterial({color:0xff6a1a,transparent:true,opacity:.35,side:THREE.DoubleSide}));
runeRing.rotation.x=-Math.PI/2; runeRing.position.y=0.03; scene.add(runeRing);

/* 环形岩柱群 */
const rockMat=new THREE.MeshStandardMaterial({color:0x2b1a12,roughness:1,flatShading:true});
const glowRockMat=new THREE.MeshStandardMaterial({color:0x3a1408,roughness:.9,flatShading:true,
  emissive:0xff3b00,emissiveIntensity:.25});
for(let i=0;i<14;i++){
  const a=i/14*Math.PI*2+srand(-.1,.1), r=ARENA_R+srand(6,14);
  const h=srand(6,17);
  const rock=new THREE.Mesh(new THREE.CylinderGeometry(srand(.6,1.6),srand(2.2,3.6),h,6),
    worldRng()<.4?glowRockMat:rockMat);
  rock.position.set(Math.cos(a)*r,h/2-1.5,Math.sin(a)*r);
  rock.rotation.set(srand(-.12,.12),srand(0,6),srand(-.12,.12));
  rock.castShadow=true; scene.add(rock);
}
/* 平台上散落碎石 */
for(let i=0;i<10;i++){
  const a=srand(0,6.28),r=srand(8,ARENA_R-3);
  const s=srand(.4,1.1);
  const st=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockMat);
  st.position.set(Math.cos(a)*r,s*.4,Math.sin(a)*r);
  st.castShadow=true;st.receiveShadow=true;scene.add(st);
}

/* ---------------- 火星粒子 ---------------- */
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
scene.add(embers);
