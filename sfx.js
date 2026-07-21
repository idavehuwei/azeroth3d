/* ============================================================
   熔火之心 · sfx.js
   程序化音效与音乐（STEP 6，参考 WoC 全运行时 WebAudio 合成，零音频文件）
   「音色数据化」：每条音效 = 一组合成参数（SOUNDS 表），
   由通用合成函数播放——调音只改参数表，不改代码；族群共用吼叫参数。
   ------------------------------------------------------------
   [依赖] core.js（$，用于静音按钮）；AudioContext 由「启程」按钮回调 init()
          创建（浏览器自动播放策略：开局无声）
   [导出] SFX.init() SFX.play(name) SFX.music(mode) SFX.toggleMute()
   ============================================================ */
"use strict";
const SFX=(()=>{
let ctx=null, master=null, musicGain=null, muted=false, musicTimer=null;

/* ============================================================
   音色参数表 —— 调音只改这里
   src:'noise'(白噪) | 'osc'(振荡器) | 'arp'(琶音)
   freq:[起,止] 扫频 · filter/ffreq/q 滤波 · distort 失真量 · attack/decay 包络
   ============================================================ */
const SOUNDS={
  swing  :{src:'noise', filter:'bandpass', ffreq:900,  q:1.1, attack:.005, decay:.16, vol:.5 },   /* 挥剑：噪声+带通 */
  arrow  :{src:'noise', filter:'highpass', ffreq:2400,        attack:.004, decay:.12, vol:.35},   /* 放箭：高频短噪 */
  fireball:{src:'osc', wave:'sawtooth', freq:[900,160], filter:'lowpass', ffreq:1600,
            attack:.01, decay:.34, vol:.35},                                                      /* 火球：锯齿扫频 */
  hit    :{src:'noise', filter:'lowpass', ffreq:500,          attack:.004, decay:.18, vol:.5 },   /* 受击闷响 */
  roar   :{src:'osc', wave:'square',   freq:[110,48], distort:28, filter:'lowpass', ffreq:700,
           attack:.03, decay:1.1, vol:.6 },                                                       /* Boss 低吼：方波+失真 */
  growl  :{src:'osc', wave:'sawtooth', freq:[160,70], distort:14, filter:'lowpass', ffreq:900,
           attack:.02, decay:.5,  vol:.4 },                                                       /* 野怪吼叫：族群共用 */
  pickup :{src:'arp', wave:'sine',     notes:[988,1319],          noteDur:.09, vol:.35},          /* 拾取叮声 */
  levelup:{src:'arp', wave:'triangle', notes:[523,659,784,1047,1319], noteDur:.11, vol:.4 },      /* 升级琶音 */
};

/* ============================================================
   音乐参数表 —— 草原：五声音阶平静循环 / 副本：低音鼓点
   ============================================================ */
const MUSIC={
  world:{tempo:1100, wave:'triangle', vol:.13, noteDur:1.8, chance:.8,
         scale:[262,294,330,392,440,523,587,659]},        /* C 五声音阶两个八度 */
  barrens:{tempo:980, wave:'triangle', vol:.12, noteDur:1.5, chance:.75,
         scale:[294,330,370,440,494,587,659]},            /* STEP 18：偏干燥、略快的五声 */
  raid :{tempo:600,  wave:'sawtooth', vol:.1,  noteDur:.4, kick:true,
         scale:[65,73,82]},                                /* 低音鼓点 + 偶发低音 */
};

/* ---------------- 通用合成 ---------------- */
let noiseBuffer=null;
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
function playParams(p){
  const t0=ctx.currentTime;
  if(p.src==='arp'){
    p.notes.forEach((f,i)=>note(f,t0+i*p.noteDur,p.wave,p.vol,p.noteDur,master));
    return;
  }
  let src;
  if(p.src==='noise'){src=ctx.createBufferSource();src.buffer=noiseBuf();}
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
  g.gain.linearRampToValueAtTime(p.vol,t0+p.attack);
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
/* 合成底鼓：正弦 130→40Hz 快速下扫 */
function kick(){
  const t0=ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(130,t0);
  o.frequency.exponentialRampToValueAtTime(40,t0+.25);
  o.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(.6,t0);
  g.gain.exponentialRampToValueAtTime(.001,t0+.3);
  o.start(t0); o.stop(t0+.35);
}

/* ---------------- 出口 API ---------------- */
return{
  /* 「启程」按钮回调里调用（自动播放策略：此前完全无声） */
  init(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=1; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=.5; musicGain.connect(master);
  },
  play(name){
    if(!ctx)return;
    const p=SOUNDS[name]; if(p)playParams(p);
  },
  /* mode:'world'|'raid'|null（停止） */
  music(mode){
    if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
    if(!ctx||!mode||!MUSIC[mode])return;
    const M=MUSIC[mode];
    let step=0;
    musicTimer=setInterval(()=>{
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
};
})();
/* 静音开关按钮 */
$("#muteBtn").addEventListener("pointerdown",()=>{
  $("#muteBtn").textContent=SFX.toggleMute()?"🔇":"🔊";
});
