/* ============================================================
   炽心 · main.js
   主循环与启动：范围钳制 / 每帧更新 / 相机 / UI 刷新 / 职业选择 / FPS
   ------------------------------------------------------------
   [依赖] THREE · core.js（$ clamp rand R BAL camera renderer scene ARENA_R
          lavaUniforms embers EMBERS emberVel）
          items.js（updateDrops nearestDrop removeDropOf）
          world.js（player boss WORLD_R PORTAL_POS portalUni portalLabel worldFlames
          MOBS elder elderDist vendor vendorDist spiritHealer spiritDist enterRaid leaveRaid closeDialogue moveToward mobDamage setCorpse
          exitPortal EXIT_PORTAL_POS spawnExitPortal removeExitPortal）
          zones.js（getCurrentZone getActivePortals enterZone resolvePortalPos
            portalMinLevel portalLevelLocked）
          combat.js（S CLS SKILLS keys joy setClass bossAI bossTargetable distToBoss
          pickTarget firePlayerShot dmgBoss addDamage mobDamage playerHit
          setCurrentTarget log announce fct tickPlayerCast cancelPlayerCast）
          companions.js 运行时（tickCompanion companionAlive companionHit COMPANION）
          buffs.js 运行时（tickBuffs）
          anim.js 运行时（updateMobAnim updateBossWingAnim updateBossHammerAnim）
          creatures.js 运行时（族群工厂，由 world/raid 调用）
          weather.js 运行时（updateWeather）
          props.js 运行时（updateProps）
          sky.js 运行时（updateSky · render-only 昼夜/阴影跟随）
          rig.js 运行时（updateHumanoidAnim）
          items.js（updateDrops nearestDrop removeDropOf cancelConsume）
          vfx.js（VFX spawnBurst fireProjectile disposeVfxMesh tickVfx）
          raid.js 运行时（bossAI distToBoss bossTargetable DUNGEON tickGhostWorld）
          world.js 运行时（heli sun fireflies FIREFLIES ffPhases）
          save.js 运行时（启程 / 继续冒险）
          map.js 运行时（updateMinimap）
          debug.js 运行时（tickDebugHud · 在 script 链末尾加载）
   [导出] clampArena tick chosenClass toggleFps playerGroundY playerInWater resolveCamCollision getMoveIntent(via combat)
   ============================================================ */
"use strict";
/* ============================================================
   主循环
   ============================================================ */
function clampArena(pos){
  const z=typeof getCurrentZone==="function"?getCurrentZone():null;
  const lim=z&&typeof z.boundsR==="function"?z.boundsR()
    :(S.mode==="raid"?ARENA_R-2:WORLD_R);
  const d=Math.hypot(pos.x,pos.z);
  if(d>lim){const s=lim/d;pos.x*=s;pos.z*=s;}
  return pos;
}
/** 玩家脚下地面高度（有 heightAt 的区域用地形，否则 0） */
function playerGroundY(x,z){
  if(typeof heightAt==="function"&&S.mode==="world"
    &&typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="mulgore"){
    return heightAt(x,z);
  }
  return 0;
}
/** STEP 17：是否在可游泳水面（莫高雷湖 / 贫瘠绿洲） */
function playerInWater(){
  if(S.mode!=="world"||!player)return false;
  const px=player.position.x, pz=player.position.z;
  const th=(BAL.move&&BAL.move.swimBlend!=null)?BAL.move.swimBlend:.55;
  if(typeof TERRAIN!=="undefined"&&typeof TERRAIN.lakeBlend==="function"){
    if(TERRAIN.lakeBlend(px,pz).w>th)return true;
  }
  const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():S.zoneId;
  if(zid==="barrens"&&typeof BARRENS!=="undefined"&&BARRENS.deadOasis){
    const o=BARRENS.deadOasis;
    const r=(BAL.move&&BAL.move.oasisSwimR!=null)?BAL.move.oasisSwimR:14;
    if(Math.hypot(px-o.x,pz-o.z)<r)return true;
  }
  return false;
}
let _camRay=null,_camFrom=null,_camTo=null,_camDir=null,_camMeshes=null;
function camDesiredOffset(yaw,pitch,dist){
  const flat=Math.cos(pitch)*dist;
  return{
    x:-Math.sin(yaw)*flat,
    y:Math.sin(pitch)*dist,
    z:-Math.cos(yaw)*flat
  };
}
/** 仅收集可碰撞 Mesh（跳过 Sprite/粒子/标签，避免 Raycaster.camera 报错） */
function collectCamColliders(root, out){
  if(!root||!root.visible)return;
  if(root===player)return;
  if(root.isSprite||root.isPoints||root.isLine||root.isLineSegments)return;
  if(root.userData&&(root.userData.noCamCollide||root.userData.vfx||root.userData.isLabel))return;
  if(root.isMesh&&root.geometry){
    out.push(root);
    return; /* Mesh 子树一般无独立碰撞体 */
  }
  const ch=root.children;
  if(!ch||!ch.length)return;
  for(let i=0;i<ch.length;i++)collectCamColliders(ch[i],out);
}
/** 相机碰撞：锚点→理想机位 Raycaster，命中则压近 dist */
function resolveCamCollision(anchor,yaw,pitch,dist){
  const C=BAL.camera||{};
  if(C.collision===false)return dist;
  const minD=C.distMin||3;
  if(dist<=minD+.05)return dist;
  if(!_camRay){
    _camRay=new THREE.Raycaster();
    _camFrom=new THREE.Vector3();
    _camTo=new THREE.Vector3();
    _camDir=new THREE.Vector3();
    _camMeshes=[];
  }
  const off=camDesiredOffset(yaw,pitch,dist);
  _camFrom.copy(anchor);
  _camTo.set(anchor.x+off.x,anchor.y+off.y,anchor.z+off.z);
  _camDir.subVectors(_camTo,_camFrom);
  const maxD=_camDir.length();
  if(maxD<.05)return dist;
  _camDir.multiplyScalar(1/maxD);
  _camRay.set(_camFrom,_camDir);
  _camRay.far=maxD;
  if(typeof camera!=="undefined")_camRay.camera=camera; /* 防御：万一仍碰到 Sprite */
  _camMeshes.length=0;
  const roots=scene&&scene.children?scene.children:[];
  for(let i=0;i<roots.length;i++)collectCamColliders(roots[i],_camMeshes);
  const hits=_camMeshes.length?_camRay.intersectObjects(_camMeshes,false):[];
  const margin=C.collisionMargin!=null?C.collisionMargin:.45;
  if(hits.length){
    const d=hits[0].distance;
    if(d<margin)return minD;
    return Math.max(minD,d-margin);
  }
  /* 地形采样兜底（赤蹄草甸）：镜头点不得钻入 heightAt */
  if(typeof heightAt==="function"&&S.mode==="world"
    &&typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="mulgore"){
    for(let s=1;s<=5;s++){
      const t=s/5, td=dist*t;
      const o2=camDesiredOffset(yaw,pitch,td);
      const y=anchor.y+o2.y;
      const gy=heightAt(anchor.x+o2.x,anchor.z+o2.z);
      if(y<gy+margin)return Math.max(minD,td-margin);
    }
  }
  return dist;
}

/** V1-A5：区 → 脚步表面（草/石/木） */
function zoneFootSurface(zid){
  const id=zid||(typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore");
  if(id==="molten_core"||id==="onyxias_lair"||id==="wailing_caverns")return "stone";
  if(id==="durotar"||id==="ashen_canyon")return "stone";
  if(id==="mulgore"&&typeof player!=="undefined"&&BAL.sfx&&BAL.sfx.woodPts){
    for(const pt of BAL.sfx.woodPts){
      const r=pt[2]!=null?pt[2]:8;
      if(Math.hypot(player.position.x-pt[0],player.position.z-pt[1])<r)return "wood";
    }
  }
  return "grass";
}

const clock=new THREE.Clock();

/* ---------------- FPS 叠层（STEP 12） ---------------- */
const FPS={show:false,frames:0,acc:0,value:0,el:null};
function isMobilePointer(){
  return typeof isMobileClient==="function"?isMobileClient():matchMedia("(pointer:coarse)").matches;
}
function fpsTarget(){return isMobilePointer()?BAL.fps.mobileTarget:BAL.fps.desktopTarget;}
function applyFpsVisibility(){
  if(!FPS.el)FPS.el=$("#fps");
  if(!FPS.el)return;
  FPS.el.style.display=FPS.show?"block":"none";
  if(FPS.show){FPS.frames=0;FPS.acc=0;}
}
function toggleFps(force){
  FPS.show=force==null?!FPS.show:!!force;
  applyFpsVisibility();
  if(S.started)log(FPS.show?`FPS 显示开启（目标 ${fpsTarget()}+）`:"FPS 显示关闭","lg-sys");
}
function updateFps(dt){
  if(!FPS.show||!FPS.el)return;
  FPS.frames++; FPS.acc+=dt;
  if(FPS.acc<BAL.fps.updateInterval)return;
  FPS.value=Math.round(FPS.frames/FPS.acc);
  FPS.frames=0; FPS.acc=0;
  const target=fpsTarget();
  FPS.el.textContent=FPS.value+" FPS";
  FPS.el.classList.toggle("low",FPS.value<target*.75);
  FPS.el.title=`目标 ${target}+ · Ctrl+F 开关`;
}
(function initFps(){
  FPS.el=$("#fps");
  const q=new URLSearchParams(location.search);
  FPS.show=q.has("dev")||q.get("fps")==="1";
  applyFpsVisibility();
  addEventListener("keydown",e=>{
    if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=="f")return;
    e.preventDefault();
    toggleFps();
  });
})();

function tick(){
  requestAnimationFrame(tick);
  let dt=Math.min(clock.getDelta(),.05);
  /* C4：暴击轻微顿帧 */
  if(S._hitStopT>0){
    const hs=Math.min(S._hitStopT,dt);
    S._hitStopT-=hs;
    dt=Math.max(0,dt-hs*.85);
  }
  S.t+=dt;
  if(typeof lavaUniforms!=="undefined"&&lavaUniforms)lavaUniforms.uTime.value=S.t;
  if(typeof portalUni!=="undefined"&&portalUni)portalUni.uTime.value=S.t;
  if(typeof updateProps==="function")updateProps(S.t,dt);
  updateFps(dt);

  /* 出口传送门动画 */
  if(exitPortal){exitPortal.discUni.value=S.t;exitPortal.glowPts.rotation.y+=dt*.8;}

  if(typeof portalLabel!=="undefined"&&portalLabel){
    const pg=(typeof heightAt==="function"&&typeof PORTAL_POS!=="undefined")
      ?heightAt(PORTAL_POS.x,PORTAL_POS.z):0;
    portalLabel.position.y=pg+13.6+Math.sin(S.t*1.5)*.25;
  }
  if(typeof southPortalUni!=="undefined"&&southPortalUni)southPortalUni.uTime.value=S.t;
  if(typeof southPortalLabel!=="undefined"&&southPortalLabel){
    const bg=(typeof heightAt==="function"&&typeof PORTAL_BARRENS!=="undefined")
      ?heightAt(PORTAL_BARRENS.x,PORTAL_BARRENS.z):0;
    southPortalLabel.position.y=bg+12.2+Math.sin(S.t*1.4)*.2;
  }
  if(typeof barrensPortalUni!=="undefined"&&barrensPortalUni)barrensPortalUni.uTime.value=S.t;
  if(typeof durotarPortalUni!=="undefined"&&durotarPortalUni)durotarPortalUni.uTime.value=S.t;
  if(typeof durotarRagefirePortalUni!=="undefined"&&durotarRagefirePortalUni)durotarRagefirePortalUni.uTime.value=S.t;

  /* 火星上升 */
  const pp=embers.geometry.attributes.position.array;
  for(let i=0;i<EMBERS;i++){
    pp[i*3+1]+=emberVel[i]*dt;
    pp[i*3]+=Math.sin(S.t*1.3+i)*dt*.6;
    if(pp[i*3+1]>26){pp[i*3+1]=0;pp[i*3]=rand(-60,60);pp[i*3+2]=rand(-60,60);}
  }
  embers.geometry.attributes.position.needsUpdate=true;

  /* ---- 昼夜 / 天空 / 阴影跟随（plan-V2 · R4 · sky.js · render-only） ---- */
  if(typeof updateSky==="function")updateSky(S.t,dt);

  /* 天气层（V1-A4）：须在 dayNight/sky 写雾之后叠加；render-only */
  if(typeof updateWeather==="function")updateWeather(dt);

  /* Boss 火焰摇曳（仅卡尔戈等人形岩浆 Boss 有 core/bossLight） */
  if(boss.userData.core&&boss.userData.bossLight){
    boss.traverse(o=>{if(o.userData.flame){o.scale.y=1+Math.sin(S.t*7+o.position.x*3)*.18;
      o.rotation.y+=dt*2;}});
    boss.userData.core.rotation.y+=dt;
    boss.userData.core.scale.setScalar(1+Math.sin(S.t*4)*.12);
    boss.userData.bossLight.intensity=2+Math.sin(S.t*5)*.5;
  }

  if(S.started){
    if(S.portalLockT>0)S.portalLockT=Math.max(0,S.portalLockT-dt);
    /* ---- 传送门检测（数据驱动，STEP 17；等级锁提示） ---- */
    if(S.mode!=="transition"&&S.portalLockT<=0&&typeof getActivePortals==="function"){
      for(const p of getActivePortals()){
        const pos=resolvePortalPos(p);
        if(!pos)continue;
        const pd=Math.hypot(player.position.x-pos.x,player.position.z-pos.z);
        const hintR=typeof p.hintR==="function"?p.hintR():p.hintR;
        const locked=typeof portalLevelLocked==="function"&&portalLevelLocked(p);
        const needLv=typeof portalMinLevel==="function"?portalMinLevel(p):0;
        if(hintR&&pd<hintR){
          if(!S.portalHints)S.portalHints={};
          const hintKey=locked?p.id+"__locked":p.id;
          if(!S.portalHints[hintKey]){
            S.portalHints[hintKey]=true;
            S.portalHinted=true;
            if(locked){
              const msg=(typeof p.lockedAnnounce==="function"?p.lockedAnnounce():p.lockedAnnounce)
                ||`等级不足！需要 Lv.${needLv}`;
              announce(msg);
              const tip=(typeof p.lockedLog==="function"?p.lockedLog():p.lockedLog)
                ||`你的等级过低（当前 Lv.${S.p.level}），需要升到 Lv.${needLv} 才能通过此传送门。`;
              log(tip,"lg-sys");
            }else{
              if(p.announce)announce(p.announce);
              if(p.logHint)log(p.logHint,"lg-sys");
            }
          }
        }
        const enterR=typeof p.enterR==="function"?p.enterR():(p.enterR||BAL.zones.portalEnterR);
        if(pd<enterR&&p.autoEnter!==false){
          if(p.requireAlive&&!S.p.alive)continue;
          if(locked){
            /* 踩进传送门时再提醒一次（带冷却，避免刷屏） */
            if(!S.portalLockHints)S.portalLockHints={};
            const cd=BAL.zones.lockedHintCd!=null?BAL.zones.lockedHintCd:4;
            const last=S.portalLockHints[p.id]||0;
            if(S.t-last>=cd){
              S.portalLockHints[p.id]=S.t;
              const msg=(typeof p.lockedAnnounce==="function"?p.lockedAnnounce():p.lockedAnnounce)
                ||`等级不足！需要 Lv.${needLv}`;
              announce(msg);
              log(`传送门纹丝不动……（Lv.${S.p.level} / 需要 Lv.${needLv}）`,"lg-sys");
            }
            continue;
          }
          if(S.mode==="raid"&&(p.targetZone==="mulgore"||p.targetZone==="barrens"))leaveRaid();
          else enterZone(p.targetZone,p.targetGate);
        }
      }
    }

    /* ---- 赤蹄草甸：野怪 AI / NPC ---- */
    if(S.mode==="world"){
      const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
      for(const m of MOBS){
        if((m.zoneId||"mulgore")!==zid)continue;
        const st=m.stats;
        if(m.state==="dead"){
          /* 尸体停留（STEP 2 / G1）：倒地灰化；超时溶解，掉落可留至重生 */
          if(typeof updateMobAnim==="function")updateMobAnim(m,dt);
          if(m.corpseT>0){
            m.corpseT-=dt;
            if(m.corpseT<=0){
              if(typeof requestCorpseDissolve==="function")requestCorpseDissolve(m);
              else m.mesh.visible=false;
            }
          }
          m.respawnT-=dt;
          if(m.respawnT<=0){
            m.state="wander"; m.hp=m.hpMax; m.attackAnim=0;
            removeDropOf(m); setCorpse(m,false);
            m.mesh.position.set(m.home.x,0,m.home.z);
            m.mesh.visible=true; m.label.visible=true;
            spawnBurst(m.mesh.position.clone().setY(.8),0x8aff9a,12,1);
            if(typeof onRareRespawn==="function")onRareRespawn(m);
          }
          continue;
        }
        if(typeof tickAuras==="function"){
          tickAuras(m,dt,{
            onDot(ent,amount,aura){
              if(amount<=0||(ent.hp|0)<=0)return;
              if(typeof applyEntityHpDamage==="function")applyEntityHpDamage(ent,amount);
              else ent.hp=Math.max(0,(ent.hp|0)-amount);
              if(typeof fct==="function"&&ent.fctPos)fct(ent.fctPos(),`-${amount}`,"#c070ff",12);
              if(typeof log==="function")log(`【${aura.name}】对${ent.name}造成 ${amount} 点持续伤害。`,"lg-dmg");
              if(typeof updateNameplateHp==="function"&&ent.label)updateNameplateHp(ent.label,ent.hp,ent.hpMax);
              if((ent.hp|0)<=0&&ent.onDeath)ent.onDeath();
            },
            onExpire(ent,aura){
              if(aura&&aura.id==="corruption"&&typeof log==="function")
                log(`${ent.name}身上的【${aura.name}】消散了。`,"lg-sys");
            }
          });
        }else if(m.rootT>0)m.rootT-=dt;
        if(m.castCd>0)m.castCd-=dt;
        const dP=Math.hypot(player.position.x-m.mesh.position.x,player.position.z-m.mesh.position.z);
        const dH=Math.hypot(m.home.x-m.mesh.position.x,m.home.z-m.mesh.position.z);
        if(m.state==="wander"){
          /* C11：主动仇恨 = 等级差半径；aggroR:0 中立 / 灰怪半径 0 */
          const agR=typeof getMobAggroRadius==="function"?getMobAggroRadius(m)
            :(st.aggroR>0?st.aggroR*(typeof getPlayerAggroMul==="function"?getPlayerAggroMul():1):0);
          if(agR>0&&dP<agR&&S.p.alive)aggroMob(m);
          m.wanderT-=dt;
          if(m.wanderT<=0){
            m.wanderT=rand(2.5,5.5);
            const a=rand(0,6.28);
            m.dest={x:m.home.x+Math.cos(a)*rand(2,10),z:m.home.z+Math.sin(a)*rand(2,10)};
          }
          if(m.dest&&m.rootT<=0)moveToward(m,m.dest,st.wanderSpd,dt);
        }else if(m.state==="aggro"){
          if(dH>st.leashR||!S.p.alive){
            m.state="return"; m.casting=null;   /* 脱战：回巢快速回血（免疫伤害） */
          }else if(m.casting){
            /* 施法读条（鹰身女妖首领）：站定吟唱，读完掷出火球 */
            m.moving=false; m.casting.t+=dt;
            m.mesh.rotation.y=Math.atan2(player.position.x-m.mesh.position.x,player.position.z-m.mesh.position.z);
            if(m.casting.t>=st.cast.dur){
              m.casting=null; m.castCd=st.cast.cd;
              fireProjectile(player.position.clone(),m.mesh.position.clone().setY(2.6),st.cast);
              log(`${m.name}掷出${st.cast.name}！`,"lg-dmg");
            }
          }else if(st.cast&&dP<=st.cast.range&&dP>st.meleeR&&m.castCd<=0){
            m.casting={t:0};
            fct(m.mesh.position.clone().setY(m.labelY),`☄️ 吟唱 · ${st.cast.name}`,"#ff9a55",13);
          }else if(dP>st.meleeR){
            if(m.rootT<=0)moveToward(m,{x:player.position.x,z:player.position.z},st.chaseSpd,dt);
          }else{
            m.moving=false;
            m.atkT-=dt;
            if(m.atkT<=0){
              m.atkT=st.atkCd;
              m.attackAnim=1;
              /* STEP 27：打仇恨最高者 */
              const dmgRange=(m.stats&&m.stats.dmg)||st.dmg;
              if(typeof meleeHitFromThreat==="function")
                meleeHitFromThreat(m,m.mesh.position,st.meleeR,R(dmgRange),m.name);
              else playerHit(R(dmgRange),m.name);
            }
          }
        }else if(m.state==="return"){
          moveToward(m,m.home,st.chaseSpd,dt);
          m.hp=Math.min(m.hpMax,m.hp+m.hpMax*BAL.leash.regenPct*dt);
          if(dH<1.2){m.state="wander";m.hp=m.hpMax;m.dest=null;}
        }
        const bobAmp=(BAL.anim&&BAL.anim.bobAmp)!=null?BAL.anim.bobAmp:.22;
        const gy=(m.zoneId==="mulgore"||!m.zoneId)&&typeof heightAt==="function"
          ?heightAt(m.mesh.position.x,m.mesh.position.z):0;
        m.mesh.position.y=gy+(m.moving?Math.abs(Math.sin(S.t*9+m.home.x))*bobAmp:0);
        if(typeof updateMobAnim==="function")updateMobAnim(m,dt);
        m.label.position.set(m.mesh.position.x,gy+m.labelY,m.mesh.position.z);
        if(typeof updateNameplateHp==="function")updateNameplateHp(m.label,m.hp,m.hpMax);
        if(typeof updateNameplatePresentation==="function")
          updateNameplatePresentation(m.label,m.label.position,{threat:m.state==="aggro"});
        /* 精英光环脉动 */
        if(m.elite&&m.aura&&m.state!=="dead"){
          const pulse=BAL.elite.aura.pulse||.3;
          m.aura.ring.rotation.z+=dt*.7;
          const op=m.aura.baseOp*(1+Math.sin(S.t*3.2+m.home.x)*.25);
          m.aura.ring.material.opacity=op;
          m.aura.glow.material.opacity=op*.4;
          m.aura.light.intensity=1.2+Math.sin(S.t*4+m.home.z)*pulse;
        }
      }
      /* 长老 / 商人待机动画 & 任务标记浮动 */
      if(zid==="mulgore"){
        const eg=typeof heightAt==="function"?heightAt(elder.position.x,elder.position.z):0;
        const vg=typeof heightAt==="function"?heightAt(vendor.position.x,vendor.position.z):0;
        const hg=typeof heightAt==="function"?heightAt(hunter.position.x,hunter.position.z):0;
        const sg=typeof heightAt==="function"?heightAt(spiritHealer.position.x,spiritHealer.position.z):0;
        elder.rotation.y=Math.PI*.85+Math.sin(S.t*.8)*.08;
        elder.position.y=eg+Math.sin(S.t*1.6)*.04;
        vendor.rotation.y=Math.PI*1.15+Math.sin(S.t*.7+1)*.08;
        vendor.position.y=vg+Math.sin(S.t*1.5+2)*.04;
        if(typeof hunter!=="undefined"&&hunter){
          hunter.rotation.y=Math.PI*1.05+Math.sin(S.t*.75+1.5)*.08;
          hunter.position.y=hg+Math.sin(S.t*1.55+1)*.04;
        }
        spiritHealer.rotation.y=Math.PI+Math.sin(S.t*.6)*.06;
        spiritHealer.position.y=sg+Math.sin(S.t*1.4+1)*.05;
        /* 全图 NPC 任务标记弹跳（魔兽式） */
        if(typeof _mulgoreNpcMarkers!=="undefined"){
          for(const m of _mulgoreNpcMarkers){
            const base=m.baseY!=null?m.baseY:((typeof heightAt==="function"?heightAt(m.x,m.z):0)+((BAL.npc&&BAL.npc.markerY)||6.55));
            const y=typeof questMarkBobY==="function"?questMarkBobY(base,S.t,(m.x||0)*.07):base;
            if(m.excl)m.excl.position.y=y;
            if(m.exclGrey)m.exclGrey.position.y=y;
            if(m.q)m.q.position.y=y;
          }
        }else if(markerExcl){
          markerExcl.position.y=eg+((BAL.npc&&BAL.npc.markerY)||6.55)+Math.sin(S.t*2.65)*.42;
          if(markerQ)markerQ.position.y=markerExcl.position.y;
        }
        const nearR=BAL.economy.interactR;
        const nearCraft=typeof workbenchDist==="function"&&workbenchDist()<(BAL.professions.interactR||nearR);
        const nearGather=typeof nearestGatherNode==="function"&&!!nearestGatherNode(BAL.professions.interactR||nearR);
        const nearNpc=(S.p.alive||S.p.ghost)&&((typeof nearMulgoreNpc==="function"&&nearMulgoreNpc(nearR))
          ||nearCraft||nearGather||(S.p.ghost&&typeof nearPlayerCorpse==="function"&&nearPlayerCorpse()));
        const dlgOpen=$("#dlg").style.display==="block";
        const vendOpen=$("#vendorPanel")&&$("#vendorPanel").style.display==="block";
        $("#interactBtn").style.display=(nearNpc&&!dlgOpen&&!vendOpen)?"block":"none";
        const leaveR=Math.max(nearR+2,10);
        if(!(typeof nearMulgoreNpc==="function"&&nearMulgoreNpc(leaveR))&&!(nearCraft||nearGather))closeDialogue();
      }else if(zid==="barrens"&&typeof nearBarrensNpc==="function"){
        if(crossroadsSentinel){
          crossroadsSentinel.rotation.y=Math.PI+Math.sin(S.t*.7)*.08;
          crossroadsSentinel.position.y=Math.sin(S.t*1.5)*.04;
        }
        if(typeof _barrensNpcMarkers!=="undefined"){
          for(const m of _barrensNpcMarkers){
            const base=m.baseY!=null?m.baseY:((BAL.npc&&BAL.npc.markerY)||6.55);
            const y=typeof questMarkBobY==="function"?questMarkBobY(base,S.t,(m.x||0)*.07):base;
            if(m.excl)m.excl.position.y=y;
            if(m.exclGrey)m.exclGrey.position.y=y;
            if(m.q)m.q.position.y=y;
          }
        }else{
          if(barrensMarkerExcl)barrensMarkerExcl.position.y=((BAL.npc&&BAL.npc.markerY)||6.55)+Math.sin(S.t*2.65)*.42;
          if(barrensMarkerQ)barrensMarkerQ.position.y=barrensMarkerExcl?barrensMarkerExcl.position.y:((BAL.npc&&BAL.npc.markerY)||6.55);
        }
        const nearR=BAL.economy.interactR;
        const nearGather=typeof nearestGatherNode==="function"&&!!nearestGatherNode(BAL.professions.interactR||nearR);
        const nearNpc=(S.p.alive||S.p.ghost)&&(nearBarrensNpc(nearR)||nearGather
          ||(S.p.ghost&&typeof nearPlayerCorpse==="function"&&nearPlayerCorpse()));
        const dlgOpen=$("#dlg").style.display==="block";
        const vendOpen=$("#vendorPanel")&&$("#vendorPanel").style.display==="block";
        $("#interactBtn").style.display=(nearNpc&&!dlgOpen&&!vendOpen)?"block":"none";
        const leaveR=Math.max(nearR+2,10);
        if(!nearBarrensNpc(leaveR)&&!nearGather)closeDialogue();
      }else if(zid==="durotar"&&typeof ochreOutpostDist==="function"){
        if(ochreOutpost){
          ochreOutpost.rotation.y=Math.PI+Math.sin(S.t*.7)*.08;
          ochreOutpost.position.y=Math.sin(S.t*1.5)*.04;
        }
        {
          const base=(BAL.npc&&BAL.npc.markerY)||6.55;
          const y=typeof questMarkBobY==="function"?questMarkBobY(base,S.t,.2):base+Math.sin(S.t*2.65)*.42;
          if(durotarMarkerExcl)durotarMarkerExcl.position.y=y;
          if(durotarMarkerExclGrey)durotarMarkerExclGrey.position.y=y;
          if(durotarMarkerQ)durotarMarkerQ.position.y=y;
        }
        const nearR=BAL.economy.interactR;
        const nearGather=typeof nearestGatherNode==="function"&&!!nearestGatherNode(BAL.professions.interactR||nearR);
        const nearNpc=(S.p.alive||S.p.ghost)&&(ochreOutpostDist()<nearR||durotarSpiritDist()<nearR
          ||(typeof ochreVendorDist==="function"&&ochreVendorDist()<nearR)
          ||(typeof ochreGuardDist==="function"&&ochreGuardDist()<nearR)||nearGather
          ||(S.p.ghost&&typeof nearPlayerCorpse==="function"&&nearPlayerCorpse()));
        const dlgOpen=$("#dlg").style.display==="block";
        const vendOpen=$("#vendorPanel")&&$("#vendorPanel").style.display==="block";
        $("#interactBtn").style.display=(nearNpc&&!dlgOpen&&!vendOpen)?"block":"none";
        if(ochreOutpostDist()>8&&durotarSpiritDist()>8
          &&!(typeof ochreVendorDist==="function"&&ochreVendorDist()<=8)
          &&!(typeof ochreGuardDist==="function"&&ochreGuardDist()<=8)&&!nearGather)closeDialogue();
      }else if(zid==="ashen_canyon"&&typeof emberScoutDist==="function"){
        if(emberScout){
          emberScout.rotation.y=Math.PI+Math.sin(S.t*.7)*.08;
          emberScout.position.y=Math.sin(S.t*1.5)*.04;
        }
        {
          const base=(BAL.npc&&BAL.npc.markerY)||6.55;
          const y=typeof questMarkBobY==="function"?questMarkBobY(base,S.t,.2):base+Math.sin(S.t*2.65)*.42;
          if(ashenMarkerExcl)ashenMarkerExcl.position.y=y;
          if(ashenMarkerExclGrey)ashenMarkerExclGrey.position.y=y;
          if(ashenMarkerQ)ashenMarkerQ.position.y=y;
        }
        const nearR=BAL.economy.interactR;
        const nearGather=typeof nearestGatherNode==="function"&&!!nearestGatherNode(BAL.professions.interactR||nearR);
        const nearNpc=(S.p.alive||S.p.ghost)&&(emberScoutDist()<nearR||ashenSpiritDist()<nearR
          ||(typeof emberVendorDist==="function"&&emberVendorDist()<nearR)||nearGather
          ||(S.p.ghost&&typeof nearPlayerCorpse==="function"&&nearPlayerCorpse()));
        const dlgOpen=$("#dlg").style.display==="block";
        const vendOpen=$("#vendorPanel")&&$("#vendorPanel").style.display==="block";
        $("#interactBtn").style.display=(nearNpc&&!dlgOpen&&!vendOpen)?"block":"none";
        if(emberScoutDist()>8&&ashenSpiritDist()>8
          &&!(typeof emberVendorDist==="function"&&emberVendorDist()<=8)&&!nearGather)closeDialogue();
      }
    }
    /* ---- 掉落动画 & 拾取按钮（世界/副本通用，STEP 2） ---- */
    updateDrops(dt);
    const nearLoot=typeof nearbyDrops==="function"?nearbyDrops(BAL.loot.pickupR)
      :(nearestDrop(BAL.loot.pickupR)?[nearestDrop(BAL.loot.pickupR)]:[]);
    const ib=$("#interactBtn");
    if(nearLoot.length&&!S.p.ghost){
      ib.textContent=nearLoot.length>1?`✨ 拾取全部×${nearLoot.length}（F）`:"✨ 拾 取（F）";
      ib.style.display="block";
    }
    else if(!S.p.ghost&&S.mode==="raid"&&S.b.canLeave&&exitPortal&&player.position.distanceTo(EXIT_PORTAL_POS)<BAL.zones.exitPortalEnterR){
      ib.textContent="🚪 走进传送门";ib.style.display="block";
    }else{
      const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
      const R=BAL.economy.interactR;
      const nearS=zid==="barrens"&&typeof barrensSpiritDist==="function"
        ?barrensSpiritDist()<R
        :(zid==="durotar"&&typeof durotarSpiritDist==="function"
          ?durotarSpiritDist()<R
          :(zid==="ashen_canyon"&&typeof ashenSpiritDist==="function"
            ?ashenSpiritDist()<R
            :spiritDist()<R));
      const nearV=(zid==="mulgore"&&vendorDist()<R)
        ||(zid==="barrens"&&typeof barrensVendorDist==="function"&&barrensVendorDist()<R)
        ||(zid==="durotar"&&typeof ochreVendorDist==="function"&&ochreVendorDist()<R)
        ||(zid==="ashen_canyon"&&typeof emberVendorDist==="function"&&emberVendorDist()<R);
      const nearC=(zid==="barrens"&&typeof nearBarrensNpc==="function"&&nearBarrensNpc(R))
        ||(zid==="durotar"&&typeof ochreOutpostDist==="function"&&ochreOutpostDist()<R)
        ||(zid==="ashen_canyon"&&typeof emberScoutDist==="function"&&emberScoutDist()<R)
        ||(zid==="mulgore"&&typeof hunterDist==="function"&&hunterDist()<R)
        ||(zid==="durotar"&&typeof ochreGuardDist==="function"&&ochreGuardDist()<R)
        ||(zid==="mulgore"&&elderDist()<R);
      const nearCraft=zid==="mulgore"&&typeof workbenchDist==="function"&&workbenchDist()<(BAL.professions.interactR||4);
      const nearGather=typeof nearestGatherNode==="function"&&!!nearestGatherNode(BAL.professions.interactR||4);
      ib.textContent=nearGather?(nearestGatherNode(BAL.professions.interactR).kind==="ore"?"⛏ 开采（F）":"🌿 采集（F）")
        :nearCraft?"🔨 制作（F）"
        :nearS?"👻 灵魂医者（F）":nearV?"🛒 交易（F）":nearC?"💬 对 话（F）":"💬 对 话（F）";
      if(S.p.ghost){
        if(typeof nearPlayerCorpse==="function"&&nearPlayerCorpse()){
          ib.textContent="✦ 复活（F）"; ib.style.display="block";
        }else if(nearS){
          ib.textContent="👻 灵魂医者（F）"; ib.style.display="block";
        }else ib.style.display="none";
      }else if(S.mode!=="world"||!S.p.alive)ib.style.display="none";
      if($("#vendorPanel")&&$("#vendorPanel").style.display==="block")ib.style.display="none";
    }
    /* ---- 玩家移动（plan-V3 C1：意图层 · 朝向相对 · 跳跃） ---- */
    const Cam=BAL.camera||{};
    const Move=BAL.move||{};
    const intent=typeof getMoveIntent==="function"?getMoveIntent()
      :{forward:0,back:0,strafeL:0,strafeR:0,turnL:0,turnR:0,jump:false};
    let turn=0, strafe=0, forward=0;
    const canSteer=(S.p.alive||S.p.ghost)&&!S.p.knock&&!S.p.fear;
    if(canSteer){
      turn=(intent.turnL||0)-(intent.turnR||0);
      strafe=(intent.strafeR||0)-(intent.strafeL||0);
      forward=(intent.forward||0)-(intent.back||0);
      if(turn)S.p.face+=turn*(Cam.turnSpd||2.6)*dt;
      if(S.p.alive&&intent.jump&&S.p.grounded){
        S.p.vy=Move.jumpVel!=null?Move.jumpVel:9.2;
        S.p.grounded=false;
      }
      S.p._wantJump=false;
    }else{
      S.p._wantJump=false;
    }
    const ml=Math.hypot(strafe,forward);
    const face=S.p.face;
    const fSin=Math.sin(face), fCos=Math.cos(face);
    let mx=0,mz=0;
    if(ml>.1){
      const nx=strafe/ml, nz=forward/ml;
      mx=fSin*nz+fCos*nx;
      mz=fCos*nz-fSin*nx;
    }
    /* 魔兽式：松开拖拽后视角缓缓回到角色背后（站立也会回正） */
    if(S.cam&&!S.cam.lmb&&!S.cam.rmb&&!S.cam.touchLook&&Math.abs(S.cam.yawOff||0)>.008){
      const spd=forward>.15?(Cam.recenterSpd||6):(Cam.idleRecenterSpd||3.5);
      const k=1-Math.exp(-spd*dt);
      S.cam.yawOff+=(0-S.cam.yawOff)*k;
      if(Math.abs(S.cam.yawOff)<.008)S.cam.yawOff=0;
    }
    /* 虚弱计时（STEP 15） */
    let moveSpd=S.p.speed;
    if(S.p.sprintT>0){
      S.p.sprintT=Math.max(0,S.p.sprintT-dt);
      const sm=(typeof getSkillBal==="function"?getSkillBal("sprint").speedMul:null)
        ||(BAL.skills.sprint&&(BAL.skills.sprint.speedMul||(BAL.skills.sprint.ranks&&BAL.skills.sprint.ranks[0].speedMul)))
        ||1.55;
      moveSpd*=sm;
      if(S.p.sprintT<=0)log("疾步结束。","lg-sys");
    }
    if(S.p.weaknessT>0){
      S.p.weaknessT=Math.max(0,S.p.weaknessT-dt);
      moveSpd*=BAL.death.moveSpeedMul;
      if(S.p.weaknessT<=0)log("虚弱效果结束。","lg-sys");
    }
    if(S.p.ghost)moveSpd*=(BAL.death.ghostSpeedMul!=null?BAL.death.ghostSpeedMul:1.5);
    /* STEP 17：游泳减速（石牛湖 / 死水绿洲） */
    if(!S.p.ghost&&typeof playerInWater==="function"&&playerInWater())
      moveSpd*=(BAL.move&&BAL.move.swimMul!=null?BAL.move.swimMul:.55);
    /* 进食 / 饮水 / 包扎 / 采集：移动打断（STEP 13 / C10） */
    if(S.p.alive&&(S.p.eating||S.p.drinking||S.p.bandaging||S.p.gathering)&&ml>.12&&!S.p.knock&&!S.p.fear)cancelConsume();
    /* Track E：施法条移动打断 */
    if(S.p.alive&&S.p.casting&&ml>.12&&!S.p.knock&&!S.p.fear
      &&!(BAL.cast&&BAL.cast.moveInterrupt===false)
      &&typeof cancelPlayerCast==="function")cancelPlayerCast("move");
    if(S.p.alive&&S.p.eating){
      S.p.eating.t-=dt;
      S.p.hp=Math.min(S.p.hpMax,S.p.hp+S.p.eating.healPerSec*dt);
      if(S.p.eating.t<=0){
        log(`【${S.p.eating.name}】食用完毕。`,"lg-heal");
        S.p.eating=null;
        if(!S.p.drinking)S.p.sitting=false;
        VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
      }
    }
    if(S.p.alive&&S.p.drinking){
      S.p.drinking.t-=dt;
      S.p.rage=Math.min(S.p.rageMax,S.p.rage+S.p.drinking.manaPerSec*dt);
      if(S.p.drinking.t<=0){
        log(`【${S.p.drinking.name}】饮用完毕。`,"lg-heal");
        S.p.drinking=null;
        if(!S.p.eating)S.p.sitting=false;
      }
    }
    if(S.p.alive&&S.p.bandaging){
      S.p.bandaging.t-=dt;
      if(S.p.bandaging.t<=0){
        const h=S.p.bandaging.heal;
        S.p.hp=Math.min(S.p.hpMax,S.p.hp+h);
        fct(player.position.clone().setY(2.4),`+${h}`,"#7cff6a",15);
        log(`【${S.p.bandaging.name}】包扎完成，回复 ${h} 点生命。`,"lg-heal");
        S.p.bandaging=null;
        VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
      }
    }
    if(typeof tickGatherNodes==="function")tickGatherNodes(dt);
    if(typeof tickGhostWorld==="function")tickGhostWorld(dt);
    if(!S.p.alive&&!S.p.ghost){
      /* 死亡倒地：不处理位移 */
    }else if(S.p.knock){
      player.position.add(S.p.knock.dir.clone().multiplyScalar(dt*28));
      S.p.knock.t-=dt; if(S.p.knock.t<=0)S.p.knock=null;
      clampArena(player.position);
    }else if(S.p.fear){
      /* 恐惧：强制乱跑，忽略输入 */
      S.p.fear.t-=dt;
      player.position.x+=Math.sin(S.t*9+1.7)*moveSpd*.7*dt;
      player.position.z+=Math.cos(S.t*7.3)*.7*moveSpd*dt;
      clampArena(player.position);
      S.p.face=Math.atan2(Math.sin(S.t*9),Math.cos(S.t*7.3));
      S.p.walkPhase+=dt*14;
      if(S.p.fear.t<=0)S.p.fear=null;
    }else if(ml>.1){
      player.position.x+=mx*moveSpd*dt;
      player.position.z+=mz*moveSpd*dt;
      clampArena(player.position);
      S.p.walkPhase+=dt*11;
    }else{
      S.p.walkPhase*=1-dt*8;
    }
    if(S.p.alive||S.p.ghost)player.rotation.y=S.p.face;
    /* 贴地 + 跳跃 / 摔落（plan-V3 C1 / C10） */
    if(S.p.alive||S.p.ghost){
      const gY=playerGroundY(player.position.x,player.position.z);
      const eps=Move.groundEps!=null?Move.groundEps:.06;
      const grav=Move.gravity!=null?Move.gravity:26;
      if(S.p.ghost){
        player.position.y=gY;
        S.p.vy=0; S.p.grounded=true; S.p.fallPeakY=null;
      }else if(!S.p.grounded||S.p.vy>0){
        if(S.p.fallPeakY==null)S.p.fallPeakY=player.position.y;
        else S.p.fallPeakY=Math.max(S.p.fallPeakY,player.position.y);
        S.p.vy-=grav*dt;
        player.position.y+=S.p.vy*dt;
        if(player.position.y<=gY+eps){
          const drop=(S.p.fallPeakY!=null?S.p.fallPeakY:player.position.y)-gY;
          player.position.y=gY;
          S.p.vy=0;
          S.p.grounded=true;
          S.p.fallPeakY=null;
          const safe=Move.fallSafe!=null?Move.fallSafe:5;
          if(drop>safe){
            const excess=drop-safe;
            let fd=Math.round(excess*(Move.fallDmgPer!=null?Move.fallDmgPer:32));
            const cap=Math.round(S.p.hpMax*(Move.fallDmgMaxPct!=null?Move.fallDmgMaxPct:.65));
            fd=Math.min(fd,cap);
            if(fd>0){
              playerHit(fd,"摔落");
              log(`从高处摔下，受到 ${fd} 点摔落伤害。`,"lg-sys");
            }
          }
        }
      }else{
        /* 台地边缘：脚下高度突然变低时进入下落，走摔落结算 */
        if(player.position.y>gY+eps*3){
          S.p.grounded=false;
          if(S.p.fallPeakY==null)S.p.fallPeakY=player.position.y;
        }else{
          player.position.y=gY;
          S.p.vy=0;
          S.p.fallPeakY=null;
        }
      }
    }
    /* 人形 Anim 状态机（plan-V2 · R5） */
    if((S.p.alive||S.p.ghost)&&typeof updateHumanoidAnim==="function"){
      if(S.p.attackAnim>0)S.p.attackAnim=Math.max(0,S.p.attackAnim-dt*(BAL.anim.attackDecay||4));
      const style=(player.userData.anim&&player.userData.anim.style)
        ||(typeof CLASS_LOOK_META!=="undefined"&&CLS&&CLS.key&&CLASS_LOOK_META[CLS.key]&&CLASS_LOOK_META[CLS.key].animStyle)
        ||"melee1h";
      updateHumanoidAnim(player,dt,{
        moving:ml>.1||!!S.p.fear,
        speedMul:S.p.ghost?1.25:(S.p.sprintT>0?1.4:1),
        attackAnim:S.p.alive?(S.p.attackAnim||0):0,
        hitT:S.p.animHitT||0,
        alive:true,
        phase:S.p.walkPhase,
        style,
      });
      if(S.p.animHitT>0){
        const hitDur=(BAL.vfx&&BAL.vfx.hit&&BAL.vfx.hit.dur)||.12;
        S.p.animHitT=Math.max(0,S.p.animHitT-dt/hitDur);
      }
      /* V1-A5：脚步（walkPhase 过零） */
      const sFoot=Math.sin(S.p.walkPhase);
      if(ml>.1&&S.p._prevFootSin!=null&&S.p._prevFootSin<0&&sFoot>=0){
        if(typeof SFX!=="undefined"&&SFX.playFoot)SFX.playFoot(zoneFootSurface());
      }
      S.p._prevFootSin=sFoot;
    }else if(S.p.alive){
      /* 无 rig.js 回退 */
      const U=player.userData,sw=Math.sin(S.p.walkPhase)*.55;
      U.legR.rotation.x=sw; U.legL.rotation.x=-sw;
      U.cape.rotation.x=.12+Math.abs(sw)*.25+Math.sin(S.t*3)*.04;
      if(S.p.attackAnim>0){S.p.attackAnim-=dt*4;
        U.armR.rotation.x=-2.4*Math.sin(Math.min(1,S.p.attackAnim)*Math.PI);}
      else U.armR.rotation.x=Math.sin(S.p.walkPhase)*.3;
      U.armL.rotation.x=-Math.sin(S.p.walkPhase)*.3;
    }
    /* 熔渊之柄之柄火焰摇曳（STEP 4：仅装备橙锤时遍历） */
    if(S.eq.mainhand==="sulfuras_haft")
      player.traverse(o=>{if(o.userData.flame)o.scale.y=1+Math.sin(S.t*7+o.position.x*5)*.25;});

    /* ---- 自动普攻：贴身一律武器挥砍；远处仅远程职业射击（与技能 CD 无关） ---- */
    S.p.atkTimer-=dt;
    if(S.p.alive&&!S.p.ghost&&S.p.atkTimer<=0){
      let did=false;
      const autoR=(BAL.target&&BAL.target.meleeAutoR)||5.5;
      let focus=typeof isTargetAlive==="function"&&isTargetAlive(S.currentTarget)?S.currentTarget:null;
      /* 1) 贴身优先：当前目标过远则改找最近怪 */
      let meleeTgt=null;
      if(focus&&typeof targetDist==="function"&&targetDist(focus)<=autoR)meleeTgt=focus;
      if(!meleeTgt&&typeof pickTarget==="function")meleeTgt=pickTarget(autoR);
      if(meleeTgt){
        if(typeof setCurrentTarget==="function")setCurrentTarget(meleeTgt);
        S.p.attackAnim=1;
        const wr=typeof getPlayerWeaponRange==="function"?getPlayerWeaponRange():[CLS.autoMin,CLS.autoMax];
        const thr={school:"physical"};
        const dmg=rand(wr[0],wr[1]);
        if(meleeTgt.type==="mob")mobDamage(meleeTgt.m,dmg,undefined,thr);
        else if(meleeTgt.type==="boss")dmgBoss(dmg,undefined,thr);
        else if(meleeTgt.type==="add")addDamage(meleeTgt.a,dmg,thr);
        did=true;
        if(typeof SFX!=="undefined")SFX.play("swing");
      }else if(CLS.ranged){
        /* 2) 非贴身：远程职业继续射击 */
        const minR=CLS.minRange!=null?CLS.minRange:((BAL.sim&&BAL.sim.ranged&&BAL.sim.ranged.minRange)||0);
        let tgt=typeof resolveSkillTarget==="function"
          ?resolveSkillTarget(CLS.range,{silent:true})
          :pickTarget(CLS.range);
        if(tgt&&minR>0&&targetDist(tgt)<minR)tgt=null;
        if(tgt){
          S.p.attackAnim=1;
          const school=CLS.resKind==="mana"?"spell":"physical";
          firePlayerShot(tgt,rand(...(typeof getPlayerWeaponRange==="function"?getPlayerWeaponRange():[CLS.autoMin,CLS.autoMax])),null,1,{school});
          did=true;
        }
      }
      if(did&&CLS.hitGain)S.p.rage=Math.min(S.p.rageMax,S.p.rage+CLS.hitGain);
      if(did&&BAL.stealth&&BAL.stealth.breakOnAttack!==false&&typeof breakStealth==="function")breakStealth("attack");
      S.p.atkTimer=did?(typeof getPlayerAutoSpeed==="function"?getPlayerAutoSpeed():CLS.autoSpd):.25;
    }

    /* ---- 光环推进（STEP 16）+ 资源恢复 & 冷却 ---- */
    if(typeof tickAuras==="function"){
      tickAuras(S.p,dt,{
        onHot(ent,amount){
          if(amount<=0||!S.p.alive)return;
          S.p.hp=Math.min(S.p.hpMax,S.p.hp+amount);
          if(typeof fct==="function")fct(player.position.clone().setY(2.8),`+${amount}`,"#8aff9a",12,{kind:"heal"});
        },
        onExpire(ent,aura){
          if(!aura)return;
          if(aura.id==="power_word_shield"&&typeof clearShieldVisual==="function")clearShieldVisual();
          if((aura.id==="ice_block"||aura.id==="evasion"||aura.id==="divine_shield")&&typeof log==="function")
            log(`${aura.name}结束。`,"lg-sys");
        }
      });
    }else{
      S.p.invuln=Math.max(0,S.p.invuln-dt);
      if(S.p.absorbT>0){
        S.p.absorbT=Math.max(0,S.p.absorbT-dt);
        if(S.p.absorbT<=0&&S.p.absorb>0){
          S.p.absorb=0;
          if(typeof clearShieldVisual==="function")clearShieldVisual();
        }
      }
    }
    if(typeof PARTY!=="undefined"&&PARTY&&PARTY.length&&typeof tickAuras==="function"){
      for(const c of PARTY){
        if(!c||!c.alive)continue;
        tickAuras(c,dt,{
          onHot(ent,amount){
            if(amount<=0)return;
            ent.hp=Math.min(ent.hpMax,ent.hp+amount);
            if(ent.label&&typeof updateNameplateHp==="function")updateNameplateHp(ent.label,ent.hp,ent.hpMax);
          }
        });
      }
    }
    if(typeof tickTotems==="function")tickTotems(dt);
    if(typeof tickBuffs==="function")tickBuffs(dt);
    if(typeof tickPlayerCast==="function")tickPlayerCast(dt);
    if(typeof tickRestXp==="function")tickRestXp(dt);
    if(typeof tickResources==="function"&&S.res){
      const sitting=!!(S.p.eating||S.p.drinking||(keys&&(keys.x||keys["x"])));
      tickResources(S.p,S.res,{
        dt,
        resKind:typeof playerResKind==="function"?playerResKind():(CLS.resKind||"rage"),
        regen:CLS.regen||0,
        spi:(S.p.stats&&S.p.stats.spi)|0,
        level:S.p.level,
        sitting
      });
    }else if(CLS.regen)S.p.rage=Math.min(S.p.rageMax,S.p.rage+CLS.regen*dt);
    S.gcd=Math.max(0,S.gcd-dt);
    if(S.gcd<=0&&S.res&&S.res.queuedSkill>=0){
      const qi=S.res.queuedSkill; S.res.queuedSkill=-1;
      if(typeof useSkill==="function")useSkill(qi);
    }
    /* C7：按技能目录下标递减 CD；槽位显示 + 着色 */
    for(let i=0;i<S.cds.length;i++)S.cds[i]=Math.max(0,S.cds[i]-dt);
    document.querySelectorAll(".skill").forEach((el,slot)=>{
      const skillIdx=typeof getBarSkillIndex==="function"?getBarSkillIndex(slot):slot;
      const sk=typeof getBarSkill==="function"?getBarSkill(slot):SKILLS[slot];
      const cdLeft=skillIdx!=null?S.cds[skillIdx]:0;
      const cdMax=sk?(typeof getSkillCd==="function"?getSkillCd(skillIdx):sk.cd):1;
      el.classList.toggle("oncd",cdLeft>0);
      el.classList.toggle("gcd",S.gcd>0&&cdLeft<=0&&!!sk);
      el.classList.toggle("empty",!sk);
      const cdEl=el.querySelector(".cd");
      if(cdEl){
        if(cdLeft>0){
          cdEl.textContent=Math.ceil(cdLeft);
          const pct=cdMax>0?Math.min(1,cdLeft/cdMax):0;
          el.style.setProperty("--cd",String(Math.round(pct*100)));
        }else{
          cdEl.textContent="";
          el.style.setProperty("--cd","0");
        }
      }
      /* 资源不足 · 变暗；有目标且超出射程 · 红色 */
      let nores=false, oor=false;
      if(sk&&S.started&&S.p.alive){
        nores=sk.rage>0&&S.p.rage<sk.rage;
        if(sk.range!=null&&typeof isTargetAlive==="function"&&isTargetAlive(S.currentTarget)&&typeof targetDist==="function"){
          const d=targetDist(S.currentTarget);
          if(d>sk.range)oor=true;
          if(CLS.minRange&&d<CLS.minRange&&sk.range>=CLS.minRange)oor=true;
        }
      }
      el.classList.toggle("nores",!!nores&&!oor);
      el.classList.toggle("oor",!!oor);
    });

    /* ---- AI 队友（STEP 20） ---- */
    if(typeof tickCompanion==="function")tickCompanion(dt);
    /* ---- 任务到达/护送/交付轮询（V1-B2） ---- */
    if(typeof tickQuestWorld==="function")tickQuestWorld(dt);

    /* ---- Boss（boss1 / boss；bridge 仅熔火） ---- */
    if(S.mode==="raid"){
      const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
      if(D.tickBridge)D.tickBridge(dt);
      if(D.stage==="boss"||D.stage==="boss1")bossAI(dt);
    }
    /* Boss 挥锤三段（蓄力→挥出→收势，对齐 delayMs）；四足 Boss 无 armR 则跳过 */
    if(boss.userData.armR&&boss.userData.armL){
      const decay=(BAL.anim&&BAL.anim.bossHammerDecay)||1.6;
      if(S.b.swingT>0)S.b.swingT=Math.max(0,S.b.swingT-dt*decay);
      if(typeof updateBossHammerAnim==="function"){
        const r=updateBossHammerAnim(boss,S.b.swingT,dt,{
          shakeAmp:(BAL.anim&&BAL.anim.bossShakeAmp)||.28});
        if(r&&r.shake>0)S.camShake=Math.max(S.camShake||0,r.shake);
      }else if(S.b.swingT>0){
        boss.userData.armR.rotation.x=-2.1*Math.sin(Math.min(1,S.b.swingT)*Math.PI);
      }
    }
    /* 胸口熔核随缺血增亮（render-only） */
    if(boss.userData.core&&boss.userData.bossLight&&S.b.hpMax){
      const hurt=1-Math.max(0,Math.min(1,S.b.hp/S.b.hpMax));
      const cg=(BAL.anim&&BAL.anim.bossCoreGlow)||{min:1,max:2.8};
      const glow=cg.min+(cg.max-cg.min)*hurt;
      boss.userData.core.scale.setScalar(1+hurt*.35);
      boss.userData.bossLight.intensity=2.2+hurt*2.4;
      if(boss.userData.core.material)boss.userData.core.material.color.setRGB(1,.8+hurt*.2,.3+hurt*.2);
    }
    /* 升起/沉入岩浆涟漪 */
    if(boss.userData.ripple){
      const rip=boss.userData.ripple;
      const show=!!(S.b.rising||S.b.submerged);
      rip.visible=show;
      if(show){
        const pulse=1.0+.15*Math.sin(S.t*3.2);
        rip.scale.set(pulse,pulse,pulse);
        if(rip.material)rip.material.opacity=.2+.2*Math.abs(Math.sin(S.t*2.4));
      }
    }
    if(typeof updateBossWingAnim==="function")
      updateBossWingAnim(boss,dt,S.b.alive);
    /* Boss 缓慢面向玩家 */
    if(!S.b.rising&&!S.b.submerged&&S.b.alive&&boss.visible){
      const ta=Math.atan2(player.position.x-boss.position.x,player.position.z-boss.position.z);
      let da=ta-boss.rotation.y;
      while(da>Math.PI)da-=6.283; while(da<-Math.PI)da+=6.283;
      boss.rotation.y+=da*dt*1.5;
    }

    /* ---- 小怪 AI ---- */
    for(let i=S.adds.length-1;i>=0;i--){
      const a=S.adds[i];
      /* 尸体阶段：只计时 + 侧倒插值，到期移除 */
      if(a.corpseT>0){
        if(typeof updateMobAnim==="function")updateMobAnim(a,dt);
        a.corpseT-=dt;
        if(a.corpseT<=0){
          if(typeof requestCorpseDissolve==="function")requestCorpseDissolve(a);
          scene.remove(a.mesh);
          if(a.label){scene.remove(a.label);if(typeof disposeNameplate==="function")disposeNameplate(a.label);}
          S.adds.splice(i,1);
        }
        continue;
      }
      const st=a.stats||BAL.add;
      const dir=player.position.clone().sub(a.mesh.position);dir.y=0;
      const d=dir.length();
      a.moving=false;
      if(typeof tickAuras==="function"){
        tickAuras(a,dt,{
          onDot(ent,amount,aura){
            if(amount<=0||(ent.hp|0)<=0)return;
            if(typeof applyEntityHpDamage==="function")applyEntityHpDamage(ent,amount);
            else ent.hp=Math.max(0,(ent.hp|0)-amount);
            if(typeof fct==="function"&&ent.fctPos)fct(ent.fctPos(),`-${amount}`,"#c070ff",12);
            if((ent.hp|0)<=0&&ent.onDeath)ent.onDeath();
          }
        });
      }else if(a.rootT>0){a.rootT-=dt;}  /* 被冰霜新星定身 */
      else if(d>(st.stopR||BAL.add.stopR)){
        dir.normalize();a.mesh.position.add(dir.multiplyScalar(dt*(st.speed||BAL.add.speed)));
        a.moving=true;
      }
      a.mesh.rotation.y=Math.atan2(dir.x,dir.z);
      const bobAmp=(BAL.anim&&BAL.anim.bobAmp)!=null?BAL.anim.bobAmp:.22;
      a.mesh.position.y=Math.abs(Math.sin(S.t*6+a.mesh.position.x))*(bobAmp+.03);
      a.atkT-=dt;
      if(d<(st.meleeR||BAL.add.meleeR)&&a.atkT<=0&&S.p.alive){
        a.atkT=st.atkCd||BAL.add.atkCd;
        a.attackAnim=1;
        playerHit(R(st.dmg||BAL.add.dmg),a.name||"小怪");
      }
      if(typeof updateMobAnim==="function")updateMobAnim(a,dt);
      if(a.label){
        a.label.position.set(a.mesh.position.x,2.8,a.mesh.position.z);
        if(typeof updateNameplateHp==="function")updateNameplateHp(a.label,a.hp,a.hpMax);
        if(typeof updateNameplatePresentation==="function")
          updateNameplatePresentation(a.label,a.label.position,{threat:true});
      }
    }

    /* ---- 投射物 ---- */
    for(let i=S.projectiles.length-1;i>=0;i--){
      const pr=S.projectiles[i];
      const dir=pr.target.clone().sub(pr.mesh.position);
      const d=dir.length();
      if(d<1.2){
        VFX.spawn("melee_impact",{pos:pr.mesh.position,color:0xff6a1a,count:10,spread:2.0});
        if(player.position.distanceTo(pr.target)<pr.hitR)playerHit(R(pr.dmg),pr.label);
        else{log(`你成功躲开了${pr.label}！`,"lg-me");fct(player.position.clone().setY(3.4),"躲避！","#8ad0ff",16);}
        scene.remove(pr.mesh);disposeVfxMesh(pr.mesh);S.projectiles.splice(i,1);continue;
      }
      dir.normalize();pr.mesh.position.add(dir.multiplyScalar(pr.speed*dt));
      pr.mesh.rotation.y+=dt*8;
    }

    /* ---- 玩家投射物（火球 / 箭矢） ---- */
    for(let i=S.pShots.length-1;i>=0;i--){
      const sh=S.pShots[i];
      let tp=null;
      if(sh.tgt.type==="boss"){
        if(!S.b.alive){scene.remove(sh.mesh);disposeVfxMesh(sh.mesh);S.pShots.splice(i,1);continue;}
        tp=new THREE.Vector3(boss.position.x,(getBossCfg().fctY||7.5),boss.position.z);
      }else if(sh.tgt.type==="mob"){
        if(!mobTargetable(sh.tgt.m)){scene.remove(sh.mesh);disposeVfxMesh(sh.mesh);S.pShots.splice(i,1);continue;}
        tp=sh.tgt.m.mesh.position.clone().setY(1.1);
      }else{
        if(!S.adds.includes(sh.tgt.a)){scene.remove(sh.mesh);disposeVfxMesh(sh.mesh);S.pShots.splice(i,1);continue;}
        tp=sh.tgt.a.mesh.position.clone().setY(1.2);
      }
      const dir=tp.clone().sub(sh.mesh.position);
      if(dir.length()<2){
        spawnBurst(sh.mesh.position,sh.shotColor||CLS.shotColor,12,1);
        const thrOpts={};
        if(sh.sourceKey||sh.skillId){thrOpts.sourceKey=sh.sourceKey||"player";thrOpts.skillId=sh.skillId;}
        if(sh.school)thrOpts.school=sh.school;
        const thr=Object.keys(thrOpts).length?thrOpts:undefined;
        if(sh.tgt.type==="boss")dmgBoss(sh.dmg,sh.label,thr);
        else if(sh.tgt.type==="mob")mobDamage(sh.tgt.m,sh.dmg,sh.label,thr);
        else addDamage(sh.tgt.a,sh.dmg*rand(.92,1.08),thr);
        scene.remove(sh.mesh);disposeVfxMesh(sh.mesh);S.pShots.splice(i,1);continue;
      }
      dir.normalize();sh.mesh.position.add(dir.multiplyScalar(sh.speed*dt));
    }

    /* ---- 地面 AoE（填充动画由 tickVfx；此处推进计时并结算伤害） ---- */
    for(let i=S.telegraphs.length-1;i>=0;i--){
      const tg=S.telegraphs[i];tg.t+=dt;
      if(tg.kind!=="ground_warn"){
        const k=Math.min(1,tg.t/tg.delay);
        if(tg.disc)tg.disc.scale.setScalar(.2+k*.8);
        if(tg.ring&&tg.ring.material)tg.ring.material.opacity=.5+Math.sin(S.t*10)*.3;
      }
      if(tg.t>=tg.delay){
        VFX.spawn("melee_impact",{pos:new THREE.Vector3(tg.x,.4,tg.z),color:0xff4400,count:12,spread:tg.r*.7});
        if(Math.hypot(player.position.x-tg.x,player.position.z-tg.z)<tg.r)
          playerHit(R(tg.dmg||BAL.boss.eruption.dmg),tg.label||"熔岩喷发");
        scene.remove(tg.ring);scene.remove(tg.disc);
        disposeVfxMesh(tg.ring);disposeVfxMesh(tg.disc);
        S.telegraphs.splice(i,1);
      }
    }
  }

  /* ---- R7：拖尾 / 预警填充 / 池化爆发 / 法阵 ---- */
  if(typeof tickVfx==="function")tickVfx(dt);
  if(typeof tickHitFlash==="function"&&boss)tickHitFlash(boss,dt);

  /* ---- 相机跟随（plan-V3 C1：球坐标 · 碰撞压近 · 近距第一人称） ---- */
  {
    const C=BAL.camera||{};
    if(S.cam.dist==null)S.cam.dist=C.dist||16;
    if(S.cam.pitch==null)S.cam.pitch=C.pitch!=null?C.pitch:.32;
    if(S.cam.yawOff==null)S.cam.yawOff=0;
    S.cam.dist=clamp(S.cam.dist,C.distMin||3,C.distMax||25);
    S.cam.pitch=clamp(S.cam.pitch,C.pitchMin!=null?C.pitchMin:-1.4,C.pitchMax!=null?C.pitchMax:.6);
    const yaw=S.p.face+(S.cam.rmb||S.cam.touchLook?0:(S.cam.yawOff||0));
    let groundY=playerGroundY(player.position.x,player.position.z);
    if(S.mode==="world"&&typeof getCurrentZoneId==="function"&&getCurrentZoneId()==="mulgore"){
      if(S.cam._gy==null)S.cam._gy=groundY;
      S.cam._gy+=(groundY-S.cam._gy)*(1-Math.exp(-8*dt));
      groundY=S.cam._gy;
    }else S.cam._gy=null;
    const chestY=groundY+(C.lookChestY!=null?C.lookChestY:1.55);
    const anchor=new THREE.Vector3(player.position.x,chestY,player.position.z);
    const wantDist=S.cam.dist;
    const useDist=resolveCamCollision(anchor,yaw,S.cam.pitch,wantDist);
    S.cam.colDist=useDist;
    const fpDist=C.firstPersonDist!=null?C.firstPersonDist:3.35;
    const firstPerson=useDist<=fpDist;
    if(player)player.visible=!S.p.alive||!firstPerson;
    let camTarget;
    if(firstPerson){
      const eye=groundY+(C.eyeY!=null?C.eyeY:1.7);
      camTarget=new THREE.Vector3(player.position.x,eye,player.position.z);
    }else{
      const off=camDesiredOffset(yaw,S.cam.pitch,useDist);
      camTarget=new THREE.Vector3(anchor.x+off.x,anchor.y+off.y,anchor.z+off.z);
    }
    const followK=1-Math.exp(-(C.follow||14)*dt);
    camera.position.x+=(camTarget.x-camera.position.x)*followK;
    camera.position.y+=(camTarget.y-camera.position.y)*followK;
    camera.position.z+=(camTarget.z-camera.position.z)*followK;
    if(S.camShake>0){
      const sh=S.camShake;
      camera.position.x+=(Math.random()-.5)*sh;
      camera.position.y+=(Math.random()-.5)*sh*.6;
      camera.position.z+=(Math.random()-.5)*sh;
      S.camShake=Math.max(0,S.camShake-dt*((BAL.anim&&BAL.anim.bossShakeDecay)||6));
    }
    if(firstPerson){
      const look=12;
      const pit=S.cam.pitch;
      camera.lookAt(
        player.position.x+Math.sin(S.p.face)*Math.cos(pit)*look,
        (groundY+(C.eyeY!=null?C.eyeY:1.7))+Math.sin(pit)*look,
        player.position.z+Math.cos(S.p.face)*Math.cos(pit)*look
      );
    }else{
      camera.lookAt(anchor.x,anchor.y,anchor.z);
    }
  }

  /* ---- UI 刷新 ---- */
  if(typeof refreshBossHpTicks==="function")refreshBossHpTicks();
  if(typeof refreshTargetFrame==="function")refreshTargetFrame();
  if(S.mode==="raid"){
    const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
    if(D.stage==="corridor"||D.stage==="bridge"){
      $("#bossHp").style.transform="scaleX(1)";
      $("#bossHpTx").textContent=D.stage==="corridor"
        ?(D.id==="wailing_caverns"?"—— 清理走廊变异兽 ——":"—— 清理走廊熔岩犬 ——")
        :"—— 岩桥开启中 ——";
    }else{
      $("#bossHp").style.transform=`scaleX(${S.b.hpMax?S.b.hp/S.b.hpMax:0})`;
      $("#bossHpTx").textContent=S.b.submerged?"—— 潜入岩浆 ·先消灭"+T("mob.flame_spawn")+" ——":
        `${S.b.hp.toLocaleString()} / ${S.b.hpMax.toLocaleString()}  (${Math.ceil(S.b.hp/S.b.hpMax*100)}%)`;
    }
  }else{
    $("#bossHp").style.transform=`scaleX(${S.b.hpMax?S.b.hp/S.b.hpMax:0})`;
    $("#bossHpTx").textContent=S.b.submerged?"—— 潜入岩浆 ·先消灭"+T("mob.flame_spawn")+" ——":
      `${S.b.hp.toLocaleString()} / ${S.b.hpMax.toLocaleString()}  (${Math.ceil(S.b.hp/S.b.hpMax*100)}%)`;
  }
  $("#pHp").style.transform=`scaleX(${S.p.hp/S.p.hpMax})`;
  $("#pHpTx").textContent=`${Math.max(0,Math.round(S.p.hp))} / ${S.p.hpMax}`;
  $("#pRage").style.transform=`scaleX(${S.p.rage/S.p.rageMax})`;
  $("#pRageTx").textContent=`${(CLS&&CLS.resName)||"资源"} ${Math.round(S.p.rage)}`;
  $("#pXp").style.transform=`scaleX(${S.p.level>=BAL.levels.max?1:S.p.xp/S.p.xpMax})`;
  const restEl=$("#pXpRest");
  if(restEl){
    const rested=S.p.level>=BAL.levels.max?0:Math.min(1,(S.p.xp+(S.p.restXp|0))/Math.max(1,S.p.xpMax));
    restEl.style.transform=`scaleX(${rested})`;
  }
  const restN=S.p.restXp|0;
  $("#pXpTx").textContent=S.p.level>=BAL.levels.max?"满 级"
    :(restN>0?`经验 ${Math.floor(S.p.xp)} / ${S.p.xpMax} · 休 ${restN}`
      :`经验 ${Math.floor(S.p.xp)} / ${S.p.xpMax}`);
  if(typeof updateMinimap==="function")updateMinimap();

  renderer.render(scene,camera);
  if(typeof tickDebugHud==="function")tickDebugHud(dt);
}
tick();

/* ---------------- 职业选择（启程由 save.js 绑定） ---------------- */
let chosenClass="warrior";
document.querySelectorAll(".ccard").forEach(c=>{
  c.addEventListener("click",()=>{
    document.querySelectorAll(".ccard").forEach(x=>x.classList.remove("sel"));
    c.classList.add("sel");
    chosenClass=c.dataset.cls;
  });
});
