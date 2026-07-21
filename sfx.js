/* ============================================================
   熔火之心 · sfx.js
   程序化音效与音乐（STEP 6 + plan-v1 · V1-A5）：WebAudio 合成，零音频文件
   「音色数据化」：调音只改 SOUNDS / MUSIC；脚步/受击分层可关
   ------------------------------------------------------------
   [依赖] core.js（$ · BAL）；AudioContext 由「启程」init()
   [导出] SFX.init play playFoot playHit music toggleMute list
   ============================================================ */
"use strict";
const SFX=(()=>{
let ctx=null, master=null, musicGain=null, muted=false, musicTimer=null;
const footLast={};

/* ============================================================
   音色参数表 —— 调音只改这里
   src:'noise' | 'osc' | 'arp'
   ============================================================ */
const SOUNDS={
  swing  :{src:"noise", filter:"bandpass", ffreq:900,  q:1.1, attack:.005, decay:.16, vol:.5},
  arrow  :{src:"noise", filter:"highpass", ffreq:2400,        attack:.004, decay:.12, vol:.35},
  fireball:{src:"osc", wave:"sawtooth", freq:[900,160], filter:"lowpass", ffreq:1600,
            attack:.01, decay:.34, vol:.35},
  hit    :{src:"noise", filter:"lowpass", ffreq:500,          attack:.004, decay:.18, vol:.5},
  roar   :{src:"osc", wave:"square",   freq:[110,48], distort:28, filter:"lowpass", ffreq:700,
           attack:.03, decay:1.1, vol:.6},
  growl  :{src:"osc", wave:"sawtooth", freq:[160,70], distort:14, filter:"lowpass", ffreq:900,
           attack:.02, decay:.5,  vol:.4},
  pickup :{src:"arp", wave:"sine",     notes:[988,1319],          noteDur:.09, vol:.35},
  levelup:{src:"arp", wave:"triangle", notes:[523,659,784,1047,1319], noteDur:.11, vol:.4},
  heal   :{src:"arp", wave:"sine",     notes:[659,784,988],       noteDur:.1,  vol:.4},
  holy   :{src:"osc", wave:"sine",     freq:[880,1320], filter:"lowpass", ffreq:2400,
           attack:.01, decay:.28, vol:.38},

  /* V1-A5 · 材质脚步（草/石/木） */
  foot_grass:{src:"noise", filter:"bandpass", ffreq:420, q:.8, attack:.002, decay:.08, vol:.22},
  foot_stone:{src:"noise", filter:"bandpass", ffreq:900, q:1.4, attack:.002, decay:.07, vol:.28},
  foot_wood :{src:"noise", filter:"bandpass", ffreq:650, q:1.2, attack:.003, decay:.09, vol:.26},

  /* V1-A5 · 受击分层（肉体 / 甲壳） */
  hit_flesh :{src:"noise", filter:"lowpass",  ffreq:420, attack:.004, decay:.16, vol:.48},
  hit_shell :{src:"noise", filter:"bandpass", ffreq:1100, q:1.6, attack:.003, decay:.14, vol:.45},

  /* V1-A5 · 龙息 / 毒液 */
  breath_fire  :{src:"noise", filter:"lowpass",  ffreq:900, attack:.08, decay:.7, vol:.55},
  breath_poison:{src:"noise", filter:"bandpass", ffreq:500, q:.6, attack:.1, decay:.65, vol:.48},
};

/* 族群 → 受击音色（加新怪 = 加一行） */
const MOB_HIT={
  boar:"hit_flesh", wolf:"hit_flesh", bird:"hit_flesh", zebra:"hit_flesh",
  harpy:"hit_flesh", centaur:"hit_flesh", centaurHerald:"hit_flesh",
  boarKing:"hit_flesh", ashmane:"hit_flesh",
  quilboar:"hit_shell", deviate:"hit_shell",
  magmadar:"hit_flesh", cobrahn:"hit_shell", verdan:"hit_shell",
  onyxia:"hit_flesh", ragnaros:"hit_flesh", flame:"hit_flesh", add:"hit_flesh",
};

const MUSIC={
  world:{tempo:1100, wave:"triangle", vol:.13, noteDur:1.8, chance:.8,
         scale:[262,294,330,392,440,523,587,659]},
  barrens:{tempo:980, wave:"triangle", vol:.12, noteDur:1.5, chance:.75,
         scale:[294,330,370,440,494,587,659]},
  raid :{tempo:600,  wave:"sawtooth", vol:.1,  noteDur:.4, kick:true,
         scale:[65,73,82]},
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
function playParams(p,volMul){
  if(!p)return;
  const t0=ctx.currentTime;
  const vol=(p.vol||.3)*(volMul!=null?volMul:1)*(muted?0:1);
  if(vol<=0.001)return;
  if(p.src==="arp"){
    p.notes.forEach((f,i)=>note(f,t0+i*p.noteDur,p.wave,vol,p.noteDur,master));
    return;
  }
  let src;
  if(p.src==="noise"){src=ctx.createBufferSource();src.buffer=noiseBuf();}
  else{
    src=ctx.createOscillator();src.type=p.wave;
    const f=Array.isArray(p.freq)?p.freq:[p.freq,p.freq];
    src.frequency.setValueAtTime(f[0],t0);
    src.frequency.exponentialRampToValueAtTime(Math.max(30,f[1]),t0+p.attack+p.decay);
  }
  let chain=src;
  if(p.distort){const ws=ctx.createWaveShaper();ws.curve=distCurve(p.distort);chain.connect(ws);chain=ws;}
  if(p.filter){const fl=ctx.createBiquadFilter();fl.type=p.filter;fl.frequency.value=p.ffreq;
    if(p.q)fl.Q.value=p.q;chain.connect(fl);chain=fl;}
  const g=ctx.createGain();
  chain.connect(g); g.connect(master);
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol,t0+p.attack);
  g.gain.exponentialRampToValueAtTime(.001,t0+p.attack+p.decay);
  src.start(t0); src.stop(t0+p.attack+p.decay+.1);
}
function note(freq,t,wave,vol,dur,dest){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=wave; o.frequency.value=freq;
  o.connect(g); g.connect(dest);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol,t+.03);
  g.gain.exponentialRampToValueAtTime(.001,t+dur*2.2);
  o.start(t); o.stop(t+dur*2.4);
}
function kick(){
  const t0=ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type="sine";
  o.frequency.setValueAtTime(130,t0);
  o.frequency.exponentialRampToValueAtTime(40,t0+.25);
  o.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(.6,t0);
  g.gain.exponentialRampToValueAtTime(.001,t0+.3);
  o.start(t0); o.stop(t0+.35);
}

function play(name){
  if(!ctx||!sfxEnabled())return;
  const p=SOUNDS[name]; if(p)playParams(p);
}

function playFoot(surface){
  if(!ctx||!sfxEnabled())return;
  let surf=surface||"grass";
  if(surf!=="grass"&&surf!=="stone"&&surf!=="wood")surf="grass";
  const key="foot_"+surf;
  const minGap=(BAL.sfx&&BAL.sfx.footThrottleMs)!=null?BAL.sfx.footThrottleMs:100;
  const now=performance.now();
  if(footLast[key]&&now-footLast[key]<minGap)return;
  footLast[key]=now;
  const mul=(BAL.sfx&&BAL.sfx.footVol)!=null?BAL.sfx.footVol:1;
  playParams(SOUNDS[key]||SOUNDS.foot_grass,mul);
}

function playHit(kind){
  if(!ctx||!sfxEnabled())return;
  const map=(BAL.sfx&&BAL.sfx.mobHit)||MOB_HIT;
  let key=kind;
  if(map[kind])key=map[kind];
  if(!SOUNDS[key])key="hit";
  play(key);
}

return{
  init(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=1; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=.5; musicGain.connect(master);
  },
  play, playFoot, playHit,
  list(){return Object.keys(SOUNDS);},
  music(mode){
    if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
    if(!ctx||!mode||!MUSIC[mode])return;
    const M=MUSIC[mode];
    let step=0;
    musicTimer=setInterval(()=>{
      if(muted)return;
      if(M.kick){
        kick();
        if(step%2===1&&Math.random()<.5)
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
  _SOUNDS:SOUNDS,
  _MOB_HIT:MOB_HIT,
};
})();

if(typeof $==="function"&&$("#muteBtn")){
  $("#muteBtn").addEventListener("pointerdown",()=>{
    $("#muteBtn").textContent=SFX.toggleMute()?"🔇":"🔊";
  });
}

console.info("[sfx] V1-A5：",SFX.list().length,"音色 · 脚步/受击/龙息");
