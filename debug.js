/* ============================================================
   熔火之心 · debug.js
   性能预算面板 + 作弊台（plan-V2 · R8）
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ BAL renderer isMobileClient effectiveWorldSeed
          WORLD_SEED_OVERRIDE getZoneSeed setZoneSeed）
          combat.js（S updateLevelUI）· main.js（toggleFps FPS）
          save.js 运行时（rebuildLevelStats）· sky.js（refreshSunShadows）
          terrain.js 运行时（heightAt）· world.js（player）
   [导出] toggleDebugHud tickDebugHud getPerfBudget cheat
   ------------------------------------------------------------
   ` 键开关面板；?dev 默认开启。预算超标行标红告警。
   ============================================================ */
"use strict";

const DBG={
  show:false,
  frames:0,
  acc:0,
  fps:0,
  el:null,
  lines:null,
  warn:null,
  last:null,
};

function getPerfBudget(){
  const P=BAL.perf||{};
  const mobile=typeof isMobileClient==="function"?isMobileClient():false;
  return Object.assign({fps:60,drawCalls:300,triangles:350000,textures:16},
    mobile?(P.mobile||{}):(P.desktop||{}));
}

function ensureDebugHud(){
  let el=$("#debugHud");
  if(el){
    DBG.el=el;
    DBG.lines=$("#dbgLines");
    DBG.warn=$("#dbgWarn");
    return el;
  }
  el=document.createElement("div");
  el.id="debugHud";
  el.innerHTML=[
    '<div class="dbg-head">PERF · <kbd>`</kbd> 开关</div>',
    '<pre id="dbgLines">—</pre>',
    '<div id="dbgWarn"></div>',
    '<div class="dbg-foot">cheat.tp / .level / .time / .seed</div>',
  ].join("");
  document.body.appendChild(el);
  DBG.el=el;
  DBG.lines=$("#dbgLines");
  DBG.warn=$("#dbgWarn");
  return el;
}

function applyDebugVisibility(){
  ensureDebugHud();
  if(DBG.el)DBG.el.style.display=DBG.show?"block":"none";
  if(DBG.show){DBG.frames=0;DBG.acc=0;}
}

function toggleDebugHud(force){
  DBG.show=force==null?!DBG.show:!!force;
  applyDebugVisibility();
  if(typeof S!=="undefined"&&S.started&&typeof log==="function"){
    log(DBG.show?"性能面板开启（` 键关闭）":"性能面板关闭","lg-sys");
  }
  return DBG.show;
}

function _fmt(n){
  if(n>=1e6)return(n/1e6).toFixed(2)+"M";
  if(n>=1e3)return(n/1e3).toFixed(1)+"k";
  return String(n|0);
}

function tickDebugHud(dt){
  if(!DBG.show)return;
  ensureDebugHud();
  DBG.frames++;
  DBG.acc+=dt;
  const iv=(BAL.perf&&BAL.perf.updateInterval)!=null?BAL.perf.updateInterval
    :((BAL.fps&&BAL.fps.updateInterval)||.5);
  if(DBG.acc<iv)return;
  DBG.fps=Math.round(DBG.frames/DBG.acc);
  DBG.frames=0;
  DBG.acc=0;

  const info=(typeof renderer!=="undefined"&&renderer&&renderer.info)?renderer.info:null;
  const calls=info&&info.render?info.render.calls|0:0;
  const tris=info&&info.render?info.render.triangles|0:0;
  const tex=info&&info.memory?info.memory.textures|0:0;
  const bud=getPerfBudget();
  const mobile=typeof isMobileClient==="function"?isMobileClient():false;
  const overs=[];
  if(DBG.fps<bud.fps)overs.push("FPS");
  if(calls>bud.drawCalls)overs.push("Draw");
  if(tris>bud.triangles)overs.push("Tris");
  if(tex>bud.textures)overs.push("Tex");

  const row=(label,val,limit,ok)=>{
    const mark=ok?"  ":"!!";
    return `${mark} ${label.padEnd(5)} ${val}  / ${limit}`;
  };
  const lines=[
    `${mobile?"移动":"桌面"}预算`,
    row("FPS",String(DBG.fps),">="+bud.fps,DBG.fps>=bud.fps),
    row("Draw",String(calls),"<="+bud.drawCalls,calls<=bud.drawCalls),
    row("Tris",_fmt(tris),"<="+_fmt(bud.triangles),tris<=bud.triangles),
    row("Tex",String(tex),"<="+bud.textures,tex<=bud.textures),
  ];
  if(DBG.lines)DBG.lines.textContent=lines.join("\n");
  if(DBG.el)DBG.el.classList.toggle("over",overs.length>0);
  if(DBG.warn){
    DBG.warn.textContent=overs.length?("超标："+overs.join(" · ")):"预算内";
    DBG.warn.className=overs.length?"bad":"ok";
  }
  DBG.last={fps:DBG.fps,calls,tris,tex,budget:bud,overs:overs.slice()};
}

/* ---------------- 作弊台 ---------------- */
function cheatTp(x,z){
  if(typeof player==="undefined"||!player)return null;
  if(x==null||z==null){
    console.info("[cheat.tp] 用法: cheat.tp(x,z)");
    return {x:player.position.x,z:player.position.z};
  }
  const y=typeof heightAt==="function"?heightAt(+x,+z):0;
  player.position.set(+x,y,+z);
  if(typeof clampArena==="function")clampArena(player.position);
  if(typeof announce==="function")announce(`传送 (${(+x).toFixed(0)}, ${( +z).toFixed(0)})`);
  return {x:player.position.x,y:player.position.y,z:player.position.z};
}

function cheatLevel(lv){
  if(typeof S==="undefined"||!S.p)return null;
  const max=(BAL.levels&&BAL.levels.max)||18;
  if(lv==null){console.info("[cheat.level] 用法: cheat.level(n)  当前",S.p.level);return S.p.level;}
  lv=Math.max(1,Math.min(max,lv|0));
  if(typeof rebuildLevelStats==="function")rebuildLevelStats(lv);
  else{
    S.p.level=lv;
    S.p.xp=0;
    S.p.xpMax=(BAL.levels.xpMax&&BAL.levels.xpMax[lv-1])||S.p.xpMax;
  }
  if(typeof syncTalentPointsFromLevel==="function")syncTalentPointsFromLevel();
  if(typeof recomputeTalentMods==="function")recomputeTalentMods();
  if(typeof updateLevelUI==="function")updateLevelUI();
  if(typeof updateSkillBarStats==="function")updateSkillBarStats();
  if(typeof announce==="function")announce(`等级 → Lv.${lv}`);
  return S.p.level;
}

function cheatTime(h){
  if(typeof S==="undefined")return null;
  const dur=(BAL.dayNight&&BAL.dayNight.duration)||600;
  if(h==null){
    const cycle=((S.t%dur)+dur)%dur/dur;
    const hour=cycle*24;
    console.info("[cheat.time] 用法: cheat.time(0-24)  当前约",hour.toFixed(1),"时");
    return hour;
  }
  h=((+h)%24+24)%24;
  const base=Math.floor(S.t/dur)*dur;
  S.t=base+(h/24)*dur;
  if(typeof announce==="function")announce(`昼夜 → ${h.toFixed(1)} 时`);
  return h;
}

function cheatSeed(n){
  if(n==null){
    console.info("[cheat.seed] 用法: cheat.seed(n)  当前",effectiveWorldSeed(),
      WORLD_SEED_OVERRIDE!=null?"(已覆盖)":"(默认)");
    return effectiveWorldSeed();
  }
  WORLD_SEED_OVERRIDE=(n>>>0);
  if(typeof getCurrentZoneId==="function")setZoneSeed(getCurrentZoneId());
  if(typeof announce==="function")announce(`种子 → ${WORLD_SEED_OVERRIDE}（新区重滚）`);
  console.info("[cheat.seed] 已设",WORLD_SEED_OVERRIDE,"· 已建场景不重排，进新区或刷新后生效");
  return WORLD_SEED_OVERRIDE;
}

window.cheat={
  tp:cheatTp,
  level:cheatLevel,
  time:cheatTime,
  seed:cheatSeed,
  dump(){
    return Object.assign({
      seed:effectiveWorldSeed(),
      level:typeof S!=="undefined"&&S.p?S.p.level:null,
      pos:typeof player!=="undefined"&&player
        ?{x:player.position.x,y:player.position.y,z:player.position.z}:null,
      zone:typeof getCurrentZoneId==="function"?getCurrentZoneId():null,
    },DBG.last||{});
  },
  hud:toggleDebugHud,
  get talent(){return window.cheatTalent;},
  get save(){return window.cheatSave;},
};

(function initDebug(){
  ensureDebugHud();
  const q=new URLSearchParams(location.search);
  if(q.has("dev")||q.get("debug")==="1")toggleDebugHud(true);
  addEventListener("keydown",e=>{
    if(e.defaultPrevented)return;
    if(e.key!=="`"&&e.code!=="Backquote")return;
    const t=e.target;
    if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable))return;
    e.preventDefault();
    toggleDebugHud();
  });
  console.info("[debug] R8 就绪：` 键面板 · cheat.tp(x,z) / .level(n) / .time(h) / .seed(n) / .dump()");
})();
