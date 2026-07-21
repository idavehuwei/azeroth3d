/* ============================================================
   熔火之心 · zones.js
   多场景注册表（STEP 17）：ZONES / enterZone / 分区 build-once
   ------------------------------------------------------------
   [依赖] core.js（BAL setZoneSeed）
          运行时：combat.js（S）· world.js（fadeTo player closeDialogue）
          raid.js（resetBoss DUNGEON removeExitPortal）· sfx.js（SFX）
          map.js（setMapZone）· save.js（saveGame）
   [导出] ZONES registerZone getZone getCurrentZone getCurrentZoneId
          ensureZoneBuilt ensureAllZonesBuilt enterZone getActivePortals
          resolvePortalPos
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

function resolveGate(zone,gateId){
  if(!zone||!zone.gates)return {x:0,z:0};
  const g=zone.gates[gateId]||zone.gates.default||zone.gates.camp||zone.gates.entrance;
  if(!g)return {x:0,z:0};
  return {x:g.x,z:g.z};
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
    }
    if(typeof closeDialogue==="function")closeDialogue();
    const ib=typeof $==="function"?$("#interactBtn"):null;
    if(ib)ib.style.display="none";

    if(from&&typeof from.onLeave==="function")from.onLeave(id,gateId,opts);

    if(typeof player!=="undefined"&&player){
      if(player.parent)player.parent.remove(player);
      if(to.scene)to.scene.add(player);
      const gate=resolveGate(to,gateId);
      player.position.set(gate.x,0,gate.z);
    }
    if(typeof scene!=="undefined")scene=to.scene;

    _currentZoneId=id;
    if(typeof S!=="undefined"){
      S.zoneId=id;
      S.mode=to.mode||"world";
    }

    if(to&&typeof to.onEnter==="function")to.onEnter(fromId,gateId,opts);

    if(typeof SFX!=="undefined"&&SFX.music&&to.music)SFX.music(to.music);
    if(typeof setMapZone==="function")setMapZone(id);

    if(typeof opts.afterEnter==="function")opts.afterEnter(fromId,id,gateId);

    if(from&&from.mode==="raid"&&to.mode==="world"&&!opts.skipSave){
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
      doSwitch();
      fadeTo(0);
    });
  }else{
    doSwitch();
  }
  return true;
}
