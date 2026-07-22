/* ============================================================
   炽心 · weather.js
   天气层（plan-v1 · V1-A4）：晴 / 雨 / 沙尘 / 洞雾 · 粒子 + 雾色叠加
   ------------------------------------------------------------
   铁律：render-only —— 禁止改伤害、仇恨、aggro、技能射程等逻辑数值。
   BAL.weather.enabled === false 时彻底关闭。
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL rand）
          运行时：scene · player · S · zones（enterZone 调 setWeather）
   [导出] setWeather updateWeather clearWeather getWeatherType disposeWeather
   ============================================================ */
"use strict";

const _wx={
  type:"clear",
  zoneId:null,
  points:null,
  vel:null,
  scene:null,
  _fogCol:null,
};

function weatherEnabled(){
  return !!(BAL.weather&&BAL.weather.enabled!==false);
}

function getWeatherType(){return _wx.type;}

function disposeWeatherMesh(pts){
  if(!pts)return;
  if(pts.geometry)pts.geometry.dispose();
  if(pts.material){
    if(Array.isArray(pts.material))pts.material.forEach(m=>m.dispose&&m.dispose());
    else if(pts.material.dispose)pts.material.dispose();
  }
}

function clearWeather(){
  if(_wx.points){
    if(_wx.points.parent)_wx.points.parent.remove(_wx.points);
    disposeWeatherMesh(_wx.points);
  }
  _wx.points=null; _wx.vel=null; _wx.scene=null;
}

function disposeWeather(){clearWeather();}

function weatherCfg(type){
  const W=BAL.weather; if(!W)return null;
  return W[type]||W.clear||null;
}

function buildWeatherPoints(cfg){
  const n=cfg.count|0;
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(n*3);
  const vel=new Float32Array(n);
  const spread=cfg.spread||28, h=cfg.height||16;
  const ox=(typeof player!=="undefined"&&player)?player.position.x:0;
  const oz=(typeof player!=="undefined"&&player)?player.position.z:0;
  for(let i=0;i<n;i++){
    pos[i*3]=ox+rand(-spread,spread);
    pos[i*3+1]=rand(0.2,h);
    pos[i*3+2]=oz+rand(-spread,spread);
    vel[i]=rand(cfg.fallMin!=null?cfg.fallMin:.5,cfg.fallMax!=null?cfg.fallMax:1.5);
  }
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({
    color:cfg.color!=null?cfg.color:0xffffff,
    size:cfg.size!=null?cfg.size:.2,
    transparent:true,
    opacity:cfg.opacity!=null?cfg.opacity:.5,
    depthWrite:false,
    blending:cfg.particle==="rain"?THREE.NormalBlending:THREE.AdditiveBlending,
  });
  const pts=new THREE.Points(geo,mat);
  pts.frustumCulled=false;
  pts.userData.weather=true;
  _wx.vel=vel;
  return pts;
}

/**
 * 按区域切换天气（enterZone / 启动时调用）
 * @param {string} zoneId
 */
function setWeather(zoneId){
  const W=BAL.weather;
  if(!W||!weatherEnabled()){
    clearWeather();
    _wx.type="clear";
    _wx.zoneId=zoneId||null;
    return;
  }
  const type=(W.zoneDefaults&&W.zoneDefaults[zoneId])||"clear";
  const scn=typeof scene!=="undefined"?scene:null;
  /* 同类型且已在当前场景：仅保证可见 */
  if(_wx.type===type&&_wx.points&&_wx.scene===scn){
    _wx.points.visible=true;
    _wx.zoneId=zoneId;
    return;
  }
  clearWeather();
  _wx.type=type;
  _wx.zoneId=zoneId||null;
  _wx.scene=scn;
  const cfg=weatherCfg(type);
  if(cfg&&cfg.particle&&scn){
    _wx.points=buildWeatherPoints(cfg);
    scn.add(_wx.points);
  }
}

/** 雾色叠加：在 dayNight 写完雾之后调用（不覆盖基线，只 lerp / 乘密度） */
function applyWeatherFog(scn){
  if(!scn||!scn.fog||!weatherEnabled())return;
  const cfg=weatherCfg(_wx.type);
  if(!cfg)return;
  const blend=cfg.fogBlend||0;
  if(blend>0&&cfg.fogTint!=null){
    if(!_wx._fogCol)_wx._fogCol=new THREE.Color();
    _wx._fogCol.setHex(cfg.fogTint);
    scn.fog.color.lerp(_wx._fogCol,blend);
  }
  if(cfg.fogDensityMul!=null&&cfg.fogDensityMul!==1)
    scn.fog.density*=cfg.fogDensityMul;
}

/**
 * 每帧：粒子运动 + 雾叠加（须在 dayNight 雾写入之后）
 */
function updateWeather(dt){
  const scn=typeof scene!=="undefined"?scene:null;
  if(!weatherEnabled()){
    if(_wx.points)_wx.points.visible=false;
    return;
  }
  applyWeatherFog(scn);

  if(!_wx.points||!_wx.vel)return;
  _wx.points.visible=true;
  const cfg=weatherCfg(_wx.type);
  if(!cfg||!cfg.particle)return;

  const pos=_wx.points.geometry.attributes.position.array;
  const n=_wx.vel.length;
  const ox=(typeof player!=="undefined"&&player)?player.position.x:0;
  const oz=(typeof player!=="undefined"&&player)?player.position.z:0;
  const spread=cfg.spread||28;
  const h=cfg.height||16;
  const drift=cfg.drift||0;
  const kind=cfg.particle;
  const t=(typeof S!=="undefined"&&S.t!=null)?S.t:0;

  for(let i=0;i<n;i++){
    const ix=i*3;
    if(kind==="rain"){
      pos[ix+1]-=_wx.vel[i]*dt;
      pos[ix]+=Math.sin(t*2+i)*.015;
      if(pos[ix+1]<0){
        pos[ix]=ox+rand(-spread,spread);
        pos[ix+1]=h+rand(0,5);
        pos[ix+2]=oz+rand(-spread,spread);
      }
    }else if(kind==="dust"||kind==="mist"){
      pos[ix]+=_wx.vel[i]*dt*drift;
      pos[ix+1]+=Math.sin(t*1.1+i*0.7)*dt*(_wx.vel[i]*.35);
      pos[ix+2]+=Math.cos(t*.9+i)*dt*(drift*.25);
      if(pos[ix]>ox+spread)pos[ix]=ox-spread;
      if(pos[ix]<ox-spread)pos[ix]=ox+spread;
      if(pos[ix+2]>oz+spread)pos[ix+2]=oz-spread;
      if(pos[ix+2]<oz-spread)pos[ix+2]=oz+spread;
      if(pos[ix+1]>h)pos[ix+1]=rand(0.3,h*.4);
      if(pos[ix+1]<0.15)pos[ix+1]=h*rand(.4,1);
    }
  }
  _wx.points.geometry.attributes.position.needsUpdate=true;
}

console.info("[weather] V1-A4 就绪：晴/雨/沙尘/雾 · BAL.weather.enabled 可关");
