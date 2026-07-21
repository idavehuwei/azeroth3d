/* ============================================================
   熔火之心 · main.js
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
          setCurrentTarget log announce fct）
          companions.js 运行时（tickCompanion companionAlive companionHit COMPANION）
          items.js（updateDrops nearestDrop removeDropOf cancelConsume）
          vfx.js（VFX spawnBurst fireProjectile disposeVfxMesh）
          raid.js 运行时（bossAI distToBoss bossTargetable DUNGEON）
          world.js 运行时（heli sun fireflies FIREFLIES ffPhases）
          save.js 运行时（启程 / 继续冒险）
          map.js 运行时（updateMinimap）
   [导出] clampArena tick chosenClass toggleFps
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
const clock=new THREE.Clock();

/* ---------------- FPS 叠层（STEP 12） ---------------- */
const FPS={show:false,frames:0,acc:0,value:0,el:null};
function isMobilePointer(){return matchMedia("(pointer:coarse)").matches;}
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
  const dt=Math.min(clock.getDelta(),.05);
  S.t+=dt; lavaUniforms.uTime.value=S.t; portalUni.uTime.value=S.t;
  updateFps(dt);

  /* 出口传送门动画 */
  if(exitPortal){exitPortal.discUni.value=S.t;exitPortal.glowPts.rotation.y+=dt*.8;}

  portalLabel.position.y=13.6+Math.sin(S.t*1.5)*.25;
  if(typeof southPortalUni!=="undefined"&&southPortalUni)southPortalUni.uTime.value=S.t;
  if(typeof southPortalLabel!=="undefined"&&southPortalLabel)southPortalLabel.position.y=12.2+Math.sin(S.t*1.4)*.2;
  if(typeof barrensPortalUni!=="undefined"&&barrensPortalUni)barrensPortalUni.uTime.value=S.t;

  /* 火星上升 */
  const pp=embers.geometry.attributes.position.array;
  for(let i=0;i<EMBERS;i++){
    pp[i*3+1]+=emberVel[i]*dt;
    pp[i*3]+=Math.sin(S.t*1.3+i)*dt*.6;
    if(pp[i*3+1]>26){pp[i*3+1]=0;pp[i*3]=rand(-60,60);pp[i*3+2]=rand(-60,60);}
  }
  embers.geometry.attributes.position.needsUpdate=true;

  /* ---- 昼夜循环（STEP 7）：按当前 zone 灯光（STEP 18 多区） ---- */
  const cz=typeof getCurrentZone==="function"?getCurrentZone():null;
  if(cz&&cz.dayNight){
    const dn=BAL.dayNight, cycle=(S.t%dn.duration)/dn.duration, a=cycle*Math.PI*2;
    const dayFactor=(Math.cos(a)+1)/2;
    const nightFactor=1-dayFactor;
    const L=cz.lights||{};
    const sunL=L.sun||(cz.id==="mulgore"?sun:null);
    const hemiL=L.heli||(cz.id==="mulgore"?heli:null);
    const scn=cz.scene;
    if(sunL){
      sunL.position.x=Math.cos(a)*60;
      sunL.position.y=Math.sin(a)*50+25;
      sunL.position.z=30;
      const D=dn.day,N=dn.night;
      sunL.color.lerpColors(new THREE.Color(D.sunColor),new THREE.Color(N.sunColor),nightFactor);
      sunL.intensity=D.sunIntensity+nightFactor*(N.sunIntensity-D.sunIntensity);
    }
    if(scn&&scn.background&&scn.fog){
      const D=dn.day,N=dn.night;
      const skyCol=new THREE.Color();
      /* 贫瘠之地基底偏黄，再与昼夜插值 */
      const daySky=cz.id==="barrens"?BAL.barrens.sky:D.sky;
      const dayFog=cz.id==="barrens"?BAL.barrens.fog:D.fog;
      const dayDens=cz.id==="barrens"?BAL.barrens.fogDensity:D.fogDensity;
      scn.background=skyCol.lerpColors(new THREE.Color(daySky),new THREE.Color(N.sky),nightFactor);
      scn.fog.color.copy(skyCol);
      scn.fog.density=dayDens+nightFactor*(N.fogDensity-dayDens);
      if(hemiL){
        hemiL.color.lerpColors(new THREE.Color(cz.id==="barrens"?BAL.barrens.hemiSky:D.hemiSky),new THREE.Color(N.hemiSky),nightFactor);
        hemiL.groundColor.lerpColors(new THREE.Color(cz.id==="barrens"?BAL.barrens.hemiGround:D.hemiGround),new THREE.Color(N.hemiGround),nightFactor);
        hemiL.intensity=(cz.id==="barrens"?BAL.barrens.hemiIntensity:D.hemiIntensity)+nightFactor*(N.hemiIntensity-(cz.id==="barrens"?BAL.barrens.hemiIntensity:D.hemiIntensity));
      }
    }
    const flames=L.flames||(cz.id==="mulgore"?worldFlames:null);
    if(flames)flames.forEach((f,i)=>{
      f.fl.scale.y=1+Math.sin(S.t*8+i*2)*.2;
      f.li.intensity=1.2+Math.sin(S.t*9+i)*.35+nightFactor*dn.campfire.nightBoost;
    });
    if(cz.id==="mulgore"&&fireflies){
      fireflies.material.opacity=nightFactor*.7;
      if(nightFactor>.1){
        const fp=fireflies.geometry.attributes.position.array;
        for(let i=0;i<FIREFLIES;i++){
          fp[i*3+1]+=Math.sin(S.t*2+ffPhases[i])*dt*.6;
          fp[i*3]+=Math.sin(S.t*1.3+ffPhases[i]*3)*dt*.3;
          if(fp[i*3+1]>5)fp[i*3+1]=.5;
          if(fp[i*3+1]<.5)fp[i*3+1]=5;
        }
        fireflies.geometry.attributes.position.needsUpdate=true;
      }
    }
  }

  /* Boss 火焰摇曳（仅拉戈斯等人形岩浆 Boss 有 core/bossLight） */
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

    /* ---- 莫高雷：野怪 AI / NPC ---- */
    if(S.mode==="world"){
      const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
      for(const m of MOBS){
        if((m.zoneId||"mulgore")!==zid)continue;
        const st=m.stats;
        if(m.state==="dead"){
          /* 尸体停留（STEP 2）：倒地灰化 8 秒后消失，掉落留至重生 */
          if(m.corpseT>0){m.corpseT-=dt;if(m.corpseT<=0)m.mesh.visible=false;}
          m.respawnT-=dt;
          if(m.respawnT<=0){
            m.state="wander"; m.hp=m.hpMax;
            removeDropOf(m); setCorpse(m,false);
            m.mesh.position.set(m.home.x,0,m.home.z);
            m.mesh.visible=true; m.label.visible=true;
            spawnBurst(m.mesh.position.clone().setY(.8),0x8aff9a,12,1);
          }
          continue;
        }
        if(m.rootT>0)m.rootT-=dt;
        if(m.castCd>0)m.castCd-=dt;
        const dP=Math.hypot(player.position.x-m.mesh.position.x,player.position.z-m.mesh.position.z);
        const dH=Math.hypot(m.home.x-m.mesh.position.x,m.home.z-m.mesh.position.z);
        if(m.state==="wander"){
          /* 主动仇恨：被动怪（陆行鸟 aggroR:0）永不主动 */
          if(st.aggroR>0&&dP<st.aggroR&&S.p.alive)aggroMob(m);
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
              const hitCmp=typeof companionAlive==="function"&&companionAlive()
                &&Math.hypot(COMPANION.mesh.position.x-m.mesh.position.x,COMPANION.mesh.position.z-m.mesh.position.z)<st.meleeR
                &&rand()<BAL.companion.mobHitChance;
              if(hitCmp)companionHit(R(st.dmg),m.name);
              else playerHit(R(st.dmg),m.name);
            }
          }
        }else if(m.state==="return"){
          moveToward(m,m.home,st.chaseSpd,dt);
          m.hp=Math.min(m.hpMax,m.hp+m.hpMax*BAL.leash.regenPct*dt);
          if(dH<1.2){m.state="wander";m.hp=m.hpMax;m.dest=null;}
        }
        m.mesh.position.y=m.moving?Math.abs(Math.sin(S.t*9+m.home.x))*.22:0;
        m.label.position.set(m.mesh.position.x,m.labelY,m.mesh.position.z);
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
        elder.rotation.y=Math.PI*.85+Math.sin(S.t*.8)*.08;
        elder.position.y=Math.sin(S.t*1.6)*.04;
        vendor.rotation.y=Math.PI*1.15+Math.sin(S.t*.7+1)*.08;
        vendor.position.y=Math.sin(S.t*1.5+2)*.04;
        spiritHealer.rotation.y=Math.PI+Math.sin(S.t*.6)*.06;
        spiritHealer.position.y=Math.sin(S.t*1.4+1)*.05;
        markerExcl.position.y=6.8+Math.sin(S.t*2.4)*.3;
        markerQ.position.y=markerExcl.position.y;
        const nearR=BAL.economy.interactR;
        const nearNpc=S.p.alive&&(elderDist()<nearR||vendorDist()<nearR||spiritDist()<nearR);
        $("#interactBtn").style.display=(nearNpc&&$("#dlg").style.display!=="block")?"block":"none";
        if(elderDist()>8&&vendorDist()>8&&spiritDist()>8)closeDialogue();
      }else if(zid==="barrens"&&typeof crossroadsDist==="function"){
        if(crossroadsSentinel){
          crossroadsSentinel.rotation.y=Math.PI+Math.sin(S.t*.7)*.08;
          crossroadsSentinel.position.y=Math.sin(S.t*1.5)*.04;
        }
        if(barrensMarkerExcl)barrensMarkerExcl.position.y=6.8+Math.sin(S.t*2.4)*.3;
        if(barrensMarkerQ)barrensMarkerQ.position.y=barrensMarkerExcl?barrensMarkerExcl.position.y:6.8;
        const nearR=BAL.economy.interactR;
        const nearNpc=S.p.alive&&(crossroadsDist()<nearR||barrensSpiritDist()<nearR);
        $("#interactBtn").style.display=(nearNpc&&$("#dlg").style.display!=="block")?"block":"none";
        if(crossroadsDist()>8&&barrensSpiritDist()>8)closeDialogue();
      }
    }
    /* ---- 掉落动画 & 拾取按钮（世界/副本通用，STEP 2） ---- */
    updateDrops(dt);
    const nd=nearestDrop(BAL.loot.pickupR), ib=$("#interactBtn");
    if(nd){ib.textContent="✨ 拾 取（F）";ib.style.display="block";}
    else if(S.mode==="raid"&&S.b.canLeave&&exitPortal&&player.position.distanceTo(EXIT_PORTAL_POS)<BAL.zones.exitPortalEnterR){
      ib.textContent="🚪 走进传送门";ib.style.display="block";
    }else{
      const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
      const nearS=zid==="barrens"&&typeof barrensSpiritDist==="function"
        ?barrensSpiritDist()<BAL.economy.interactR
        :spiritDist()<BAL.economy.interactR;
      const nearV=zid==="barrens"?false:vendorDist()<BAL.economy.interactR;
      const nearC=zid==="barrens"&&typeof crossroadsDist==="function"&&crossroadsDist()<BAL.economy.interactR;
      ib.textContent=nearS?"👻 灵魂医者（F）":nearC?"🗼 对话（F）":nearV?"🛒 交易（F）":"💬 对 话（F）";
      if(S.mode!=="world"||!S.p.alive)ib.style.display="none";
    }
    /* ---- 玩家移动 ---- */
    let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
    let mz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    mx+=joy.x; mz+=joy.y;
    const ml=Math.hypot(mx,mz);
    /* 虚弱计时（STEP 15） */
    let moveSpd=S.p.speed;
    if(S.p.weaknessT>0){
      S.p.weaknessT=Math.max(0,S.p.weaknessT-dt);
      moveSpd*=BAL.death.moveSpeedMul;
      if(S.p.weaknessT<=0)log("虚弱效果结束。","lg-sys");
    }
    /* 进食 / 包扎：移动打断（STEP 13） */
    if(S.p.alive&&(S.p.eating||S.p.bandaging)&&ml>.12&&!S.p.knock&&!S.p.fear)cancelConsume();
    if(S.p.alive&&S.p.eating){
      S.p.eating.t-=dt;
      S.p.hp=Math.min(S.p.hpMax,S.p.hp+S.p.eating.healPerSec*dt);
      if(S.p.eating.t<=0){
        log(`【${S.p.eating.name}】食用完毕。`,"lg-heal");
        S.p.eating=null;
        VFX.spawn("heal_cross",{pos:player.position.clone().setY(1.4)});
      }
    }else if(S.p.alive&&S.p.bandaging){
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
    if(!S.p.alive){
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
      mx/=Math.max(1,ml);mz/=Math.max(1,ml);
      player.position.x+=mx*moveSpd*dt;
      player.position.z+=mz*moveSpd*dt;
      clampArena(player.position);
      S.p.face=Math.atan2(mx,mz);
      S.p.walkPhase+=dt*11;
    }else{
      /* 站立时面向 Boss */
      if(bossTargetable())S.p.face=Math.atan2(boss.position.x-player.position.x,boss.position.z-player.position.z);
      S.p.walkPhase*=1-dt*8;
    }
    if(S.p.alive)player.rotation.y=S.p.face;
    /* 走路摆腿 & 披风 */
    const U=player.userData,sw=Math.sin(S.p.walkPhase)*.55;
    U.legR.rotation.x=sw; U.legL.rotation.x=-sw;
    U.cape.rotation.x=.12+Math.abs(sw)*.25+Math.sin(S.t*3)*.04;
    /* 攻击挥剑动画 */
    if(S.p.attackAnim>0){S.p.attackAnim-=dt*4;
      U.armR.rotation.x=-2.4*Math.sin(Math.min(1,S.p.attackAnim)*Math.PI);}
    else U.armR.rotation.x=Math.sin(S.p.walkPhase)*.3;
    U.armL.rotation.x=-Math.sin(S.p.walkPhase)*.3;
    /* 萨弗拉斯之柄火焰摇曳（STEP 4：仅装备橙锤时遍历） */
    if(S.eq.weapon==="sulfuras_haft")
      player.traverse(o=>{if(o.userData.flame)o.scale.y=1+Math.sin(S.t*7+o.position.x*5)*.25;});

    /* ---- 自动普攻（战士近战 / 法师火球 / 弓箭手射箭） ---- */
    S.p.atkTimer-=dt;
    if(S.p.alive&&S.p.atkTimer<=0){
      let did=false;
      if(CLS.ranged){
        const tgt=pickTarget(CLS.range);
        if(tgt){S.p.attackAnim=1;firePlayerShot(tgt,rand(CLS.autoMin,CLS.autoMax),null);did=true;}
      }else{
        if(S.mode==="world"){
          for(const m of MOBS){
            if(mobTargetable(m)&&player.position.distanceTo(m.mesh.position)<4.5){
              S.p.attackAnim=1;setCurrentTarget({type:"mob",m});mobDamage(m,rand(CLS.autoMin,CLS.autoMax));did=true;break;
            }
          }
        }else if(bossTargetable()&&distToBoss()<=10){
          S.p.attackAnim=1;setCurrentTarget({type:"boss"});dmgBoss(rand(CLS.autoMin,CLS.autoMax));did=true;
        }else{
          for(const a of S.adds){
            if(player.position.distanceTo(a.mesh.position)<4.5){
              S.p.attackAnim=1;setCurrentTarget({type:"add",a});addDamage(a,rand(CLS.autoMin,CLS.autoMax));did=true;break;
            }
          }
        }
      }
      if(did&&!CLS.ranged)SFX.play("swing");   /* 近战普攻音效（远程在 firePlayerShot 里） */
      if(did&&CLS.hitGain)S.p.rage=Math.min(S.p.rageMax,S.p.rage+CLS.hitGain);
      S.p.atkTimer=did?CLS.autoSpd:.3;
    }

    /* ---- 资源恢复 & 冷却 ---- */
    S.p.invuln=Math.max(0,S.p.invuln-dt);
    /* STEP 19：真言术：盾持续时间 */
    if(S.p.absorbT>0){
      S.p.absorbT=Math.max(0,S.p.absorbT-dt);
      if(S.p.absorbT<=0&&S.p.absorb>0){
        S.p.absorb=0;
        if(typeof clearShieldVisual==="function")clearShieldVisual();
      }
    }
    if(CLS.regen)S.p.rage=Math.min(S.p.rageMax,S.p.rage+CLS.regen*dt);
    S.gcd=Math.max(0,S.gcd-dt);
    document.querySelectorAll(".skill").forEach((el,i)=>{
      S.cds[i]=Math.max(0,S.cds[i]-dt);
      el.classList.toggle("oncd",S.cds[i]>0);
      el.classList.toggle("gcd",S.gcd>0&&S.cds[i]<=0);
      if(S.cds[i]>0)el.querySelector(".cd").textContent=Math.ceil(S.cds[i]);
    });

    /* ---- AI 队友（STEP 20） ---- */
    if(typeof tickCompanion==="function")tickCompanion(dt);

    /* ---- Boss（boss1 / boss；bridge 仅熔火） ---- */
    if(S.mode==="raid"){
      const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
      if(D.tickBridge)D.tickBridge(dt);
      if(D.stage==="boss"||D.stage==="boss1")bossAI(dt);
    }
    /* Boss 挥锤动画（人形有 armR；四足跳过） */
    if(boss.userData.armR&&boss.userData.armL){
      if(S.b.swingT>0){S.b.swingT-=dt*1.6;
        boss.userData.armR.rotation.x=-2.1*Math.sin(Math.min(1,S.b.swingT)*Math.PI);}
      else boss.userData.armR.rotation.x=Math.sin(S.t*1.2)*.12;
      boss.userData.armL.rotation.x=Math.sin(S.t*1.2+1)*.15;
    }
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
      /* 尸体阶段：只计时，到期移除 */
      if(a.corpseT>0){
        a.corpseT-=dt;
        if(a.corpseT<=0){scene.remove(a.mesh);S.adds.splice(i,1);}
        continue;
      }
      const st=a.stats||BAL.add;
      const dir=player.position.clone().sub(a.mesh.position);dir.y=0;
      const d=dir.length();
      if(a.rootT>0){a.rootT-=dt;}  /* 被冰霜新星定身 */
      else if(d>(st.stopR||BAL.add.stopR)){dir.normalize();a.mesh.position.add(dir.multiplyScalar(dt*(st.speed||BAL.add.speed)));}
      a.mesh.rotation.y=Math.atan2(dir.x,dir.z);
      a.mesh.position.y=Math.abs(Math.sin(S.t*6+a.mesh.position.x))*.25;
      a.atkT-=dt;
      if(d<(st.meleeR||BAL.add.meleeR)&&a.atkT<=0&&S.p.alive){
        a.atkT=st.atkCd||BAL.add.atkCd;
        playerHit(R(st.dmg||BAL.add.dmg),a.name||"小怪");
      }
    }

    /* ---- 投射物 ---- */
    for(let i=S.projectiles.length-1;i>=0;i--){
      const pr=S.projectiles[i];
      const dir=pr.target.clone().sub(pr.mesh.position);
      const d=dir.length();
      if(d<1.2){
        VFX.spawn("melee_impact",{pos:pr.mesh.position,color:0xff6a1a,count:30,spread:2.5});
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
        if(sh.tgt.type==="boss")dmgBoss(sh.dmg,sh.label);
        else if(sh.tgt.type==="mob")mobDamage(sh.tgt.m,sh.dmg,sh.label);
        else addDamage(sh.tgt.a,sh.dmg*rand(.92,1.08));
        scene.remove(sh.mesh);disposeVfxMesh(sh.mesh);S.pShots.splice(i,1);continue;
      }
      dir.normalize();sh.mesh.position.add(dir.multiplyScalar(sh.speed*dt));
    }

    /* ---- 地面 AoE ---- */
    for(let i=S.telegraphs.length-1;i>=0;i--){
      const tg=S.telegraphs[i];tg.t+=dt;
      const k=Math.min(1,tg.t/tg.delay);
      tg.disc.scale.setScalar(.2+k*.8);
      tg.ring.material.opacity=.5+Math.sin(S.t*10)*.3;
      if(tg.t>=tg.delay){
        VFX.spawn("melee_impact",{pos:new THREE.Vector3(tg.x,.4,tg.z),color:0xff4400,count:40,spread:tg.r*.8});
        if(Math.hypot(player.position.x-tg.x,player.position.z-tg.z)<tg.r)
          playerHit(R(tg.dmg||BAL.boss.eruption.dmg),tg.label||"熔岩喷发");
        scene.remove(tg.ring);scene.remove(tg.disc);
        disposeVfxMesh(tg.ring);disposeVfxMesh(tg.disc);
        S.telegraphs.splice(i,1);
      }
    }
  }

  /* ---- 粒子爆发衰减 ---- */
  for(let i=S.bursts.length-1;i>=0;i--){
    const b=S.bursts[i];b.life+=dt;
    const lifeMax=(BAL.vfx.impact&&BAL.vfx.impact.life)||1.1;
    const arr=b.pts.geometry.attributes.position.array;
    for(let j=0;j<b.vel.length;j++){
      arr[j*3]+=b.vel[j].x*dt;arr[j*3+1]+=b.vel[j].y*dt;arr[j*3+2]+=b.vel[j].z*dt;
      b.vel[j].y-=dt*6;
    }
    b.pts.geometry.attributes.position.needsUpdate=true;
    b.pts.material.opacity=1-b.life/lifeMax;
    if(b.life>lifeMax){
      scene.remove(b.pts);
      disposeVfxMesh(b.pts);
      S.bursts.splice(i,1);
    }
  }

  /* ---- 相机跟随 ---- */
  if(S.mode==="raid"){
    const camTarget=new THREE.Vector3(
      player.position.x*.7+boss.position.x*.15,13,
      player.position.z*.7+boss.position.z*.15+22);
    camera.position.lerp(camTarget,dt*3);
    camera.lookAt(player.position.x*.6,3.5,player.position.z*.6-6);
  }else{
    const camTarget=new THREE.Vector3(player.position.x,12,player.position.z+17);
    camera.position.lerp(camTarget,dt*3);
    camera.lookAt(player.position.x,2.5,player.position.z-4);
  }

  /* ---- UI 刷新 ---- */
  if(S.mode==="raid"){
    const D=typeof getDungeon==="function"?getDungeon():DUNGEON;
    if(D.stage==="corridor"||D.stage==="bridge"){
      $("#bossHp").style.transform="scaleX(1)";
      $("#bossHpTx").textContent=D.stage==="corridor"
        ?(D.id==="wailing_caverns"?"—— 清理走廊变异兽 ——":"—— 清理走廊熔岩犬 ——")
        :"—— 岩桥开启中 ——";
    }else{
      $("#bossHp").style.transform=`scaleX(${S.b.hpMax?S.b.hp/S.b.hpMax:0})`;
      $("#bossHpTx").textContent=S.b.submerged?"—— 潜入岩浆 ·先消灭烈焰之子 ——":
        `${S.b.hp.toLocaleString()} / ${S.b.hpMax.toLocaleString()}  (${Math.ceil(S.b.hp/S.b.hpMax*100)}%)`;
    }
  }else{
    $("#bossHp").style.transform=`scaleX(${S.b.hpMax?S.b.hp/S.b.hpMax:0})`;
    $("#bossHpTx").textContent=S.b.submerged?"—— 潜入岩浆 ·先消灭烈焰之子 ——":
      `${S.b.hp.toLocaleString()} / ${S.b.hpMax.toLocaleString()}  (${Math.ceil(S.b.hp/S.b.hpMax*100)}%)`;
  }
  $("#pHp").style.transform=`scaleX(${S.p.hp/S.p.hpMax})`;
  $("#pHpTx").textContent=`${Math.max(0,Math.round(S.p.hp))} / ${S.p.hpMax}`;
  $("#pRage").style.transform=`scaleX(${S.p.rage/S.p.rageMax})`;
  $("#pRageTx").textContent=`${CLS.resName} ${Math.round(S.p.rage)}`;
  $("#pXp").style.transform=`scaleX(${S.p.level>=BAL.levels.max?1:S.p.xp/S.p.xpMax})`;
  $("#pXpTx").textContent=S.p.level>=BAL.levels.max?"满 级":`经验 ${Math.floor(S.p.xp)} / ${S.p.xpMax}`;
  if(typeof updateMinimap==="function")updateMinimap();

  renderer.render(scene,camera);
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
