/* ============================================================
   熔火之心 · sfx.js
   程序化音效（STEP 6 + plan-v1 · V1-A5）：WebAudio 合成，零音频文件
   音色数据化 · 材质脚步 · 受击分层 · 分轨 · 节流 · ambience
   ------------------------------------------------------------
   [依赖] core.js（$ BAL）；AudioContext 由「启程」init()
   [导出] SFX.init play playFoot playHit playUI music ambience
          toggleMute list getSound setBusVol _SOUNDS
   ============================================================ */
"use strict";
const SFX=(()=>{
let ctx=null, master=null, sfxGain=null, musicGain=null, ambienceGain=null;
let muted=false, musicTimer=null, ambTimer=null, ambSrc=null;
const footLast={}, hitActive={};

/* ============================================================
   音色表 —— ≥45 键；调音只改这里
   src: noise|osc|arp|noiseBurst|dualOsc
   layers:[{...}] 同触发多声部
   ============================================================ */
const SOUNDS={
  /* —— 基础战斗 —— */
  swing       :{src:"noise", filter:"bandpass", ffreq:900,  q:1.1, attack:.005, decay:.16, vol:.5},
  swing_heavy :{src:"noise", filter:"bandpass", ffreq:650,  q:1.0, attack:.008, decay:.28, vol:.58,
                layers:[{src:"osc", wave:"sawtooth", freq:[180,70], attack:.01, decay:.2, vol:.18}]},
  arrow       :{src:"noise", filter:"highpass", ffreq:2400, attack:.004, decay:.12, vol:.35},
  arrow_multi :{src:"noise", filter:"highpass", ffreq:2200, attack:.004, decay:.18, vol:.32,
                layers:[{src:"noise", filter:"highpass", ffreq:2800, attack:.02, decay:.1, vol:.2}]},
  fireball    :{src:"osc", wave:"sawtooth", freq:[900,160], filter:"lowpass", ffreq:1600, attack:.01, decay:.34, vol:.35},
  hit         :{src:"noise", filter:"lowpass", ffreq:500, attack:.004, decay:.18, vol:.5},
  roar        :{src:"osc", wave:"square", freq:[110,48], distort:28, filter:"lowpass", ffreq:700, attack:.03, decay:1.1, vol:.6},
  growl       :{src:"osc", wave:"sawtooth", freq:[160,70], distort:14, filter:"lowpass", ffreq:900, attack:.02, decay:.5, vol:.4},
  pickup      :{src:"arp", wave:"sine", notes:[988,1319], noteDur:.09, vol:.35},
  levelup     :{src:"arp", wave:"triangle", notes:[523,659,784,1047,1319], noteDur:.11, vol:.4},
  heal        :{src:"arp", wave:"sine", notes:[659,784,988], noteDur:.1, vol:.4},
  holy        :{src:"osc", wave:"sine", freq:[880,1320], filter:"lowpass", ffreq:2400, attack:.01, decay:.28, vol:.38},

  /* —— 材质脚步 —— */
  foot_grass  :{src:"noise", filter:"bandpass", ffreq:420, q:.8, attack:.002, decay:.08, vol:.22},
  foot_dirt   :{src:"noise", filter:"lowpass",  ffreq:380, attack:.003, decay:.1,  vol:.24},
  foot_stone  :{src:"noise", filter:"bandpass", ffreq:900, q:1.4, attack:.002, decay:.07, vol:.28},
  foot_wood   :{src:"noise", filter:"bandpass", ffreq:650, q:1.2, attack:.003, decay:.09, vol:.26},
  foot_ash    :{src:"noise", filter:"lowpass",  ffreq:280, attack:.004, decay:.11, vol:.23},
  foot_grass_wet:{src:"noise", filter:"lowpass", ffreq:320, attack:.004, decay:.12, vol:.2},

  /* —— 受击分层 —— */
  hit_player  :{src:"noise", filter:"lowpass", ffreq:480, attack:.004, decay:.2, vol:.52},
  hit_shield  :{src:"noise", filter:"bandpass", ffreq:1400, q:2, attack:.002, decay:.12, vol:.4,
                layers:[{src:"osc", wave:"triangle", freq:[880,440], attack:.002, decay:.1, vol:.15}]},
  hit_flesh   :{src:"noise", filter:"lowpass", ffreq:420, attack:.004, decay:.16, vol:.48},
  hit_shell   :{src:"noise", filter:"bandpass", ffreq:1100, q:1.6, attack:.003, decay:.14, vol:.45},
  hit_scale   :{src:"noise", filter:"bandpass", ffreq:700, q:1.3, attack:.004, decay:.2, vol:.5,
                layers:[{src:"osc", wave:"square", freq:[90,50], attack:.01, decay:.15, vol:.12, distort:8}]},
  hit_element :{src:"noiseBurst", filter:"highpass", ffreq:600, attack:.003, decay:.22, vol:.42,
                layers:[{src:"osc", wave:"sawtooth", freq:[400,120], attack:.005, decay:.18, vol:.2}]},
  hit_crit    :{src:"arp", wave:"triangle", notes:[1175,1568], noteDur:.05, vol:.3},

  /* —— 施法反馈 —— */
  cast_start  :{src:"osc", wave:"sine", freq:[440,660], filter:"lowpass", ffreq:1800, attack:.04, decay:.25, vol:.22},
  cast_done   :{src:"osc", wave:"triangle", freq:[660,330], attack:.01, decay:.18, vol:.25},
  cast_interrupt:{src:"noise", filter:"highpass", ffreq:1800, attack:.002, decay:.1, vol:.35},
  block       :{src:"noise", filter:"bandpass", ffreq:1200, q:2, attack:.002, decay:.1, vol:.4},
  dodge       :{src:"noise", filter:"highpass", ffreq:2000, attack:.002, decay:.08, vol:.28},
  death_player:{src:"osc", wave:"sine", freq:[220,55], filter:"lowpass", ffreq:400, attack:.05, decay:.9, vol:.45},
  respawn     :{src:"arp", wave:"sine", notes:[523,659,784], noteDur:.12, vol:.38},

  /* —— 职业技能 —— */
  charge      :{src:"noise", filter:"bandpass", ffreq:500, q:.7, attack:.01, decay:.25, vol:.45,
                layers:[{src:"osc", wave:"sawtooth", freq:[200,80], attack:.02, decay:.2, vol:.2}]},
  whirlwind   :{alias:"swing_heavy"},
  frost_nova  :{src:"noise", filter:"highpass", ffreq:1200, attack:.01, decay:.35, vol:.4,
                layers:[{src:"osc", wave:"sine", freq:[1200,400], attack:.02, decay:.3, vol:.22}]},
  blink       :{src:"noiseBurst", filter:"highpass", ffreq:2500, attack:.002, decay:.12, vol:.35},
  ice_block   :{src:"osc", wave:"sine", freq:[900,300], filter:"lowpass", ffreq:2000, attack:.05, decay:.5, vol:.35},
  aimed       :{alias:"arrow"},
  multi_shot  :{alias:"arrow_multi"},
  roll        :{src:"noise", filter:"bandpass", ffreq:800, q:.9, attack:.005, decay:.15, vol:.32},
  flash_heal  :{src:"arp", wave:"sine", notes:[784,988], noteDur:.07, vol:.36},
  holy_shield :{alias:"holy"},
  potion      :{src:"noise", filter:"lowpass", ffreq:600, attack:.01, decay:.2, vol:.3,
                layers:[{src:"osc", wave:"sine", freq:[500,300], attack:.02, decay:.15, vol:.15}]},

  /* —— Boss / 环境 —— */
  breath_fire :{src:"noise", filter:"lowpass", ffreq:900, attack:.08, decay:.7, vol:.55,
                layers:[{src:"osc", wave:"sawtooth", freq:[160,60], distort:20, attack:.05, decay:.6, vol:.28}]},
  breath_poison:{src:"noise", filter:"bandpass", ffreq:500, q:.6, attack:.1, decay:.65, vol:.48,
                layers:[{src:"osc", wave:"triangle", freq:[180,90], attack:.08, decay:.5, vol:.18}]},
  lava_burst  :{src:"noiseBurst", filter:"lowpass", ffreq:700, attack:.02, decay:.4, vol:.5,
                layers:[{src:"osc", wave:"sawtooth", freq:[300,80], attack:.02, decay:.35, vol:.25}]},
  eruption    :{alias:"lava_burst"},
  wing_flap   :{src:"noise", filter:"lowpass", ffreq:350, attack:.02, decay:.28, vol:.3},
  portal      :{src:"osc", wave:"sine", freq:[200,600], filter:"lowpass", ffreq:1200, attack:.1, decay:.6, vol:.32},
  teleport    :{alias:"blink"},

  /* —— UI —— */
  ui_open     :{src:"osc", wave:"triangle", freq:[520,780], attack:.01, decay:.12, vol:.22},
  ui_close    :{src:"osc", wave:"triangle", freq:[780,400], attack:.01, decay:.1, vol:.18},
  quest_accept:{src:"arp", wave:"sine", notes:[659,784,988], noteDur:.08, vol:.32},
  quest_complete:{src:"arp", wave:"triangle", notes:[523,659,784,1047], noteDur:.1, vol:.36},
  vendor_buy  :{src:"arp", wave:"sine", notes:[880,1108], noteDur:.07, vol:.3},
  vendor_sell :{src:"arp", wave:"sine", notes:[698,523], noteDur:.07, vol:.28},
  deed        :{src:"arp", wave:"triangle", notes:[392,523,659,784,1047], noteDur:.1, vol:.38},
  loot_rare   :{src:"arp", wave:"sine", notes:[587,740,880], noteDur:.09, vol:.34},
  loot_epic   :{src:"arp", wave:"triangle", notes:[440,554,659,880], noteDur:.1, vol:.38},
};

const MOB_HIT={
  boar:"hit_flesh", wolf:"hit_flesh", bird:"hit_flesh", zebra:"hit_flesh",
  quilboar:"hit_shell", deviate:"hit_shell", harpy:"hit_flesh",
  centaur:"hit_flesh", centaurHerald:"hit_flesh",
  boarKing:"hit_flesh", ashmane:"hit_flesh",
  magmadar:"hit_scale", cobrahn:"hit_shell", verdan:"hit_shell",
  onyxia:"hit_scale", ragnaros:"hit_element", flame:"hit_element", add:"hit_element",
};

const MUSIC={
  world:{tempo:1100, wave:"triangle", vol:.13, noteDur:1.8, chance:.8,
         scale:[262,294,330,392,440,523,587,659]},
  barrens:{tempo:980, wave:"triangle", vol:.12, noteDur:1.5, chance:.75,
         scale:[294,330,370,440,494,587,659]},
  raid:{tempo:600, wave:"sawtooth", vol:.1, noteDur:.4, kick:true, scale:[65,73,82]},
  wailing:{tempo:1400, wave:"sine", vol:.1, noteDur:2.2, chance:.7,
         scale:[220,247,262,294,330,349]},
  onyxia:{tempo:720, wave:"sawtooth", vol:.09, noteDur:.55, kick:true, chance:.4,
         scale:[55,65,73,82,98]},
};

const AMBIENCE={
  rain:{interval:140, vol:.04, filter:"lowpass", ffreq:1800},
  wind:{interval:220, vol:.035, filter:"bandpass", ffreq:400, q:.5},
  cave_drip:{interval:900, vol:.05, filter:"highpass", ffreq:1200, drip:true},
  dust:{interval:180, vol:.03, filter:"lowpass", ffreq:500},
};

let noiseBuffer=null;
function sfxEnabled(){
  return !(typeof BAL!=="undefined"&&BAL.sfx&&BAL.sfx.enabled===false);
}
function noiseBuf(){
  if(noiseBuffer)return noiseBuffer;
  const len=ctx.sampleRate;
  noiseBuffer=ctx.createBuffer(1,len,ctx.sampleRate);
  const d=noiseBuffer.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  return noiseBuffer;
}
function distCurve(k){
  const n=256,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=(3+k)*x*20*(Math.PI/180)/(Math.PI+k*Math.abs(x));}
  return c;
}
function resolveSound(name){
  let p=SOUNDS[name];
  if(!p)return null;
  if(p.alias)return resolveSound(p.alias);
  return p;
}
function busFor(kind){
  if(kind==="music")return musicGain;
  if(kind==="ambience")return ambienceGain;
  return sfxGain||master;
}
function playParams(p,opts){
  if(!ctx||!p)return;
  opts=opts||{};
  const dest=busFor(opts.bus||"sfx");
  if(!dest)return;
  if(p.layers){
    playParams(Object.assign({},p,{layers:null}),opts);
    p.layers.forEach(L=>playParams(L,opts));
    return;
  }
  const t0=ctx.currentTime+(opts.delay||0);
  const volMul=(opts.vol!=null?opts.vol:1)*(typeof BAL!=="undefined"&&BAL.sfx&&opts.bus!=="music"?
    (opts.ui?(BAL.sfx.uiVol||1):(opts.foot?(BAL.sfx.footVol||1):1)):1);
  const baseVol=(p.vol||.3)*volMul*(muted&&opts.bus!=="ignore"?0:1);
  if(baseVol<=0.001)return;

  if(p.src==="arp"){
    (p.notes||[]).forEach((f,i)=>note(f,t0+i*(p.noteDur||.1),p.wave||"sine",baseVol,p.noteDur||.1,dest));
    return;
  }

  let src, dur=(p.attack||.01)+(p.decay||.2);
  if(p.src==="noise"||p.src==="noiseBurst"){
    src=ctx.createBufferSource(); src.buffer=noiseBuf();
    if(opts.rate)src.playbackRate.value=opts.rate;
  }else if(p.src==="dualOsc"){
    const o1=ctx.createOscillator(), o2=ctx.createOscillator();
    o1.type=p.wave||"sine"; o2.type=p.wave2||"triangle";
    const f=Array.isArray(p.freq)?p.freq:[p.freq||440,p.freq||220];
    o1.frequency.setValueAtTime(f[0],t0);
    o1.frequency.exponentialRampToValueAtTime(Math.max(30,f[1]),t0+dur);
    o2.frequency.setValueAtTime((p.freq2||f[0]*1.5),t0);
    const g=ctx.createGain();
    o1.connect(g); o2.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(baseVol,t0+(p.attack||.01));
    g.gain.exponentialRampToValueAtTime(.001,t0+dur);
    o1.start(t0); o2.start(t0); o1.stop(t0+dur+.05); o2.stop(t0+dur+.05);
    return;
  }else{
    src=ctx.createOscillator(); src.type=p.wave||"sine";
    const f=Array.isArray(p.freq)?p.freq:[p.freq||440,p.freq||440];
    let f0=f[0], f1=f[1];
    if(opts.detune){f0*=Math.pow(2,opts.detune/1200); f1*=Math.pow(2,opts.detune/1200);}
    src.frequency.setValueAtTime(f0,t0);
    src.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
  }
  let chain=src;
  if(p.distort){const ws=ctx.createWaveShaper(); ws.curve=distCurve(p.distort); chain.connect(ws); chain=ws;}
  if(p.filter){
    const fl=ctx.createBiquadFilter(); fl.type=p.filter; fl.frequency.value=p.ffreq||800;
    if(p.q)fl.Q.value=p.q; chain.connect(fl); chain=fl;
  }
  const g=ctx.createGain();
  chain.connect(g); g.connect(dest);
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(baseVol,t0+(p.attack||.01));
  g.gain.exponentialRampToValueAtTime(.001,t0+dur);
  src.start(t0); src.stop(t0+dur+.08);
}
function note(freq,t,wave,vol,dur,dest){
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=wave; o.frequency.value=freq;
  o.connect(g); g.connect(dest);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol,t+.03);
  g.gain.exponentialRampToValueAtTime(.001,t+dur*2.2);
  o.start(t); o.stop(t+dur*2.4);
}
function kick(){
  if(!ctx||!musicGain)return;
  const t0=ctx.currentTime;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type="sine";
  o.frequency.setValueAtTime(130,t0);
  o.frequency.exponentialRampToValueAtTime(40,t0+.25);
  o.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(.55,t0);
  g.gain.exponentialRampToValueAtTime(.001,t0+.3);
  o.start(t0); o.stop(t0+.35);
}

function play(name,opts){
  if(!ctx||!sfxEnabled())return;
  opts=opts||{};
  const p=resolveSound(name); if(!p)return;
  /* 轻随机防机械 */
  if(opts.rate==null&&(typeof BAL==="undefined"||!BAL.sfx||BAL.sfx.hitVariance!==false))
    opts={...opts, rate:0.94+Math.random()*0.12, detune:opts.detune!=null?opts.detune:(Math.random()*40-20)};
  /* hit 叠音上限 */
  if(name.indexOf("hit")===0){
    const n=hitActive[name]|0;
    const cap=(BAL.sfx&&BAL.sfx.hitCap)|3;
    if(n>=cap)return;
    hitActive[name]=n+1;
    setTimeout(()=>{hitActive[name]=Math.max(0,(hitActive[name]|0)-1);},180);
  }
  playParams(p,opts);
}

function playFoot(surface,opts){
  if(!ctx||!sfxEnabled())return;
  opts=opts||{};
  let surf=surface||"grass";
  /* 雨天湿泥 */
  if(typeof getWeatherType==="function"){
    const w=getWeatherType();
    if(w==="rain"&&(surf==="grass"||surf==="dirt"))surf="grass_wet";
  }
  const key="foot_"+surf;
  const minGap=(BAL.sfx&&BAL.sfx.footThrottleMs)!=null?BAL.sfx.footThrottleMs:90;
  const now=performance.now();
  if(footLast[key]&&now-footLast[key]<minGap)return;
  footLast[key]=now;
  const p=resolveSound(key)||resolveSound("foot_grass");
  playParams(p,Object.assign({bus:"sfx", foot:true, vol:opts.vol!=null?opts.vol:1, rate:0.92+Math.random()*0.16},opts));
}

function playHit(kind,opts){
  const map=(typeof BAL!=="undefined"&&BAL.sfx&&BAL.sfx.mobHit)||MOB_HIT;
  let key=kind;
  if(map[kind])key=map[kind];
  if(!resolveSound(key))key="hit";
  play(key,opts);
}

function playUI(action,opts){
  const key=action.indexOf("ui_")==0||action.indexOf("quest_")==0||action.indexOf("vendor_")==0||
    action==="deed"||action.indexOf("loot_")==0?action:"ui_"+action;
  play(key,Object.assign({ui:true},opts||{}));
}

function stopAmbience(){
  if(ambTimer){clearInterval(ambTimer);ambTimer=null;}
  if(ambSrc){try{ambSrc.stop();}catch(e){} ambSrc=null;}
}

function ambience(mode){
  stopAmbience();
  if(!ctx||!mode||!AMBIENCE[mode])return;
  if(typeof BAL!=="undefined"&&BAL.sfx&&BAL.sfx.ambience===false)return;
  if(!sfxEnabled())return;
  const A=AMBIENCE[mode];
  const volBase=(A.vol||.04)*((BAL.sfx&&BAL.sfx.ambienceVol)!=null?BAL.sfx.ambienceVol:1);
  ambTimer=setInterval(()=>{
    if(!ctx||muted)return;
    if(A.drip){
      playParams({src:"osc", wave:"sine", freq:[1400,400], attack:.002, decay:.12, vol:volBase*4,
        filter:"highpass", ffreq:1000},{bus:"ambience"});
      return;
    }
    playParams({src:"noise", filter:A.filter||"lowpass", ffreq:A.ffreq||800, q:A.q,
      attack:.02, decay:.18, vol:volBase*3},{bus:"ambience"});
  },A.interval||200);
}

return{
  init(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=1; master.connect(ctx.destination);
    sfxGain=ctx.createGain(); sfxGain.gain.value=1; sfxGain.connect(master);
    musicGain=ctx.createGain(); musicGain.gain.value=.5; musicGain.connect(master);
    ambienceGain=ctx.createGain(); ambienceGain.gain.value=1; ambienceGain.connect(master);
  },
  play, playFoot, playHit, playUI, ambience,
  list(){return Object.keys(SOUNDS);},
  getSound(name){return resolveSound(name);},
  music(mode){
    if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
    if(!ctx||!mode||!MUSIC[mode])return;
    const M=MUSIC[mode];
    let step=0;
    musicTimer=setInterval(()=>{
      if(muted)return;
      if(M.kick){
        kick();
        if(step%2===1&&Math.random()<(M.chance!=null?M.chance:.5))
          note(M.scale[(Math.random()*M.scale.length)|0],ctx.currentTime,M.wave,M.vol,M.noteDur,musicGain);
      }else if(Math.random()<M.chance){
        note(M.scale[(Math.random()*M.scale.length)|0],ctx.currentTime,M.wave,M.vol,M.noteDur,musicGain);
      }
      step++;
    },M.tempo);
  },
  toggleMute(){
    muted=!muted;
    if(master)master.gain.value=muted?0:1;
    return muted;
  },
  setBusVol(bus,v){
    const g=bus==="music"?musicGain:bus==="ambience"?ambienceGain:sfxGain;
    if(g)g.gain.value=Math.max(0,Math.min(1,v));
  },
  _SOUNDS:SOUNDS,
  _MOB_HIT:MOB_HIT,
  _MUSIC:MUSIC,
};
})();

if(typeof $==="function"&&$("#muteBtn")){
  $("#muteBtn").addEventListener("pointerdown",()=>{
    $("#muteBtn").textContent=SFX.toggleMute()?"🔇":"🔊";
  });
}

console.info("[sfx] V1-A5 就绪：",SFX.list().length,"音色 · 脚步/受击/分轨");
