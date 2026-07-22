/* ============================================================
   炽心 · zones.js
   多场景注册表（STEP 17）：ZONES / enterZone / 分区 build-once
   ------------------------------------------------------------
   [依赖] core.js（BAL setZoneSeed）
          运行时：combat.js（S）· world.js（fadeTo player closeDialogue）
          companions.js（transferCompanionZone）
          raid.js（resetBoss DUNGEON removeExitPortal）· sfx.js（SFX）
          map.js（setMapZone）· save.js（saveGame）
          weather.js 运行时（setWeather）
          quests.js 运行时（onQuestZoneEnter）
          deeds.js 运行时（onDeedZoneEnter）
   [导出] ZONES registerZone getZone getCurrentZone getCurrentZoneId
          ensureZoneBuilt ensureAllZonesBuilt enterZone getActivePortals
          resolvePortalPos portalMinLevel portalLevelLocked
          showZoneSplash
   ============================================================ */
"use strict";

const ZONES={};
let _currentZoneId="mulgore";

function registerZone(def){
  if(!def||!def.id)return;
  const z=Object.assign({
    portals:[],
    gates:{},
    levelRange:[1,10],
    dayNight:false,
    _built:false,
  },def);
  if(!Array.isArray(z.portals))z.portals=[];
  if(!z.gates||typeof z.gates!=="object")z.gates={};
  ZONES[z.id]=z;
  return z;
}

function getZone(id){return ZONES[id]||null;}
function getCurrentZoneId(){return _currentZoneId;}
function getCurrentZone(){return ZONES[_currentZoneId]||null;}

function ensureZoneBuilt(id){
  const z=ZONES[id];
  if(!z)return null;
  if(z._built)return z;
  setZoneSeed(id);
  if(typeof z.build==="function")z.build(z.scene);
  z._built=true;
  return z;
}

function ensureAllZonesBuilt(){
  for(const id in ZONES)ensureZoneBuilt(id);
}

function resolvePortalPos(p){
  if(!p)return null;
  const pos=typeof p.pos==="function"?p.pos():p.pos;
  if(!pos)return null;
  return {x:pos.x, z:pos.z};
}

function getActivePortals(){
  const z=getCurrentZone();
  if(!z||!z.portals)return [];
  return z.portals.filter(p=>!p.visible||p.visible());
}

/** 传送门所需最低等级（0 = 无等级门槛） */
function portalMinLevel(p){
  if(!p||p.minLevel==null)return 0;
  return typeof p.minLevel==="function"?p.minLevel()|0:p.minLevel|0;
}

/** 当前玩家是否因等级被锁在门外 */
function portalLevelLocked(p){
  const need=portalMinLevel(p);
  return need>0&&typeof S!=="undefined"&&S.p&&S.p.level<need;
}

function resolveGate(zone,gateId){
  if(!zone||!zone.gates)return {x:0,z:0};
  const g=zone.gates[gateId]||zone.gates.default||zone.gates.camp||zone.gates.entrance;
  if(!g)return {x:0,z:0};
  return {x:g.x,z:g.z};
}

let _zoneSplashT=null;
/** C13：换区后区域名淡入（skipFade / silent 时跳过） */
function showZoneSplash(zoneOrId){
  const el=typeof $==="function"?$("#zoneSplash"):null;
  if(!el)return;
  const z=typeof zoneOrId==="string"?(ZONES[zoneOrId]||null):zoneOrId;
  const id=(z&&z.id)||(typeof zoneOrId==="string"?zoneOrId:"mulgore");
  const nameEl=$("#zoneSplashName"), subEl=$("#zoneSplashSub");
  const name=(z&&z.name)||(typeof T==="function"?T("zone."+id):id);
  let sub="";
  if(typeof T==="function"){
    const key="ui.zone_sub_"+id;
    const t=T(key);
    if(t&&t!==key)sub=t;
    else if((z&&z.mode)==="raid")sub=T("ui.zone_sub_raid");
  }
  if(nameEl)nameEl.textContent=name;
  if(subEl){subEl.textContent=sub;subEl.style.display=sub?"block":"none";}
  el.classList.add("show");
  el.setAttribute("aria-hidden","false");
  if(_zoneSplashT)clearTimeout(_zoneSplashT);
  const hold=(BAL.zoneSplash&&BAL.zoneSplash.durationMs!=null)
    ?BAL.zoneSplash.durationMs
    :((BAL.map&&BAL.map.splashMs)||2800);
  const fade=(BAL.zoneSplash&&BAL.zoneSplash.fadeMs!=null)?BAL.zoneSplash.fadeMs:700;
  _zoneSplashT=setTimeout(()=>{
    el.classList.remove("show");
    el.setAttribute("aria-hidden","true");
    _zoneSplashT=null;
  },hold+fade*.15);
}

/**
 * 统一换区：淡出 → 切 scene / player / mode / music / map → 淡入
 * @param {string} id 目标 zone id
 * @param {string} [gateId] 落点 gate 名
 * @param {object} [opts]
 * @param {boolean} [opts.skipFade] 跳过淡入淡出（读档）
 * @param {boolean} [opts.force] 允许同区重入
 * @param {function} [opts.afterEnter] 切入完成后回调
 * @param {boolean} [opts.skipSave] 离本时不自动存档
 * @param {boolean} [opts.silent] 不打进本系统日志（由调用方自管文案）
 */
function enterZone(id,gateId,opts){
  opts=opts||{};
  const to=ZONES[id];
  if(!to)return false;
  if(typeof S!=="undefined"&&S.mode==="transition"&&!opts.force&&!opts.skipFade)return false;
  if(id===_currentZoneId&&!opts.force&&!opts.skipFade)return false;

  ensureZoneBuilt(id);
  const from=getCurrentZone();
  const fromId=_currentZoneId;

  const doSwitch=()=>{
    if(typeof S!=="undefined"){
      if(S.pShots){
        S.pShots.forEach(s=>s.mesh.parent&&s.mesh.parent.remove(s.mesh));
        S.pShots.length=0;
      }
      if(S.p)S.p.knock=null;
      if(typeof clearAllTotems==="function")clearAllTotems();
      if(typeof breakStealth==="function")breakStealth("zone",true);
    }
    if(typeof closeDialogue==="function")closeDialogue();
    const ib=typeof $==="function"?$("#interactBtn"):null;
    if(ib)ib.style.display="none";

    if(from&&typeof from.onLeave==="function")from.onLeave(id,gateId,opts);

    if(typeof player!=="undefined"&&player){
      if(player.parent)player.parent.remove(player);
      if(to.scene)to.scene.add(player);
      const gate=resolveGate(to,gateId);
      const gy=(id==="mulgore"&&typeof heightAt==="function")?heightAt(gate.x,gate.z):0;
      player.position.set(gate.x,gy,gate.z);
      /* 换区后立刻对齐相机，避免仍停在旧区坐标看一片黑 */
      if(typeof camera!=="undefined"){
        if((to.mode||"world")==="raid"){
          camera.position.set(gate.x*.7,13,gate.z*.7+22);
        }else{
          camera.position.set(gate.x,12+gy,gate.z+17);
        }
      }
      if(typeof transferCompanionZone==="function")transferCompanionZone(to.scene,gate);
    }
    if(typeof scene!=="undefined")scene=to.scene;

    _currentZoneId=id;
    if(typeof S!=="undefined"){
      S.zoneId=id;
      S.mode=to.mode||"world";
      /* V1-B4：副本难度仅查找器传入；世界门进本默认普通；离开副本复位 */
      if((to.mode||"world")==="raid"){
        S.difficulty=(opts&&opts.difficulty==="heroic")?"heroic":"normal";
      }else{
        S.difficulty="normal";
      }
      /* 防传送门乒乓：落点靠近回程门时短暂锁定 */
      S.portalLockT=Math.max(S.portalLockT||0,1.6);
    }

    if(to&&typeof to.onEnter==="function")to.onEnter(fromId,gateId,opts);

    if(typeof SFX!=="undefined"&&SFX.music&&to.music)SFX.music(to.music);
    if(typeof setMapZone==="function")setMapZone(id);
    if(typeof setWeather==="function")setWeather(id);

    if(typeof opts.afterEnter==="function")opts.afterEnter(fromId,id,gateId);
    if(typeof onQuestZoneEnter==="function"&&!(opts&&opts.silent))onQuestZoneEnter(id);
    if(typeof onDeedZoneEnter==="function"&&!(opts&&opts.silent))onDeedZoneEnter(id);
    if(!(opts&&(opts.silent||opts.skipFade))&&fromId!==id)showZoneSplash(to);

    if(from&&to&&from.id!==to.id&&!opts.skipSave){
      if(typeof saveGame==="function")saveGame(true);
    }
  };

  if(opts.skipFade){
    doSwitch();
    return true;
  }

  if(typeof S!=="undefined")S.mode="transition";
  if(typeof fadeTo==="function"){
    fadeTo(1,()=>{
      try{doSwitch();}
      catch(err){console.error("enterZone",id,err); if(typeof S!=="undefined")S.mode=(to&&to.mode)||"world";}
      fadeTo(0);
    });
  }else{
    doSwitch();
  }
  return true;
}
