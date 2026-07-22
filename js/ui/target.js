/* ============================================================
   炽心 · js/ui/target.js
   点击选取 + 右键交互（plan-V3 C2）
   依赖：THREE · core.js · combat.js（setCurrentTarget / resolve…）
          world.js（tryInteract / MOBS）· items.js（tryLoot）
   导出：pickTargetAtScreen tryTargetClick tryTargetContext
   ============================================================ */
"use strict";

let _pickRay=null,_pickNdc=null;
const _clickTrack={btn:-1,x:0,y:0,moved:0};

function _ensurePickRay(){
  if(!_pickRay){
    _pickRay=new THREE.Raycaster();
    _pickNdc=new THREE.Vector2();
  }
  if(typeof camera!=="undefined")_pickRay.camera=camera;
}

function _resolveObjectToTarget(obj){
  if(!obj)return null;
  /* 姓名板 / 模型上的 targetRef */
  let p=obj;
  while(p){
    if(p.userData&&p.userData.targetRef&&isTargetAlive(p.userData.targetRef))
      return p.userData.targetRef;
    p=p.parent;
  }
  /* 遍历匹配 mesh */
  if(S.mode==="world"&&typeof MOBS!=="undefined"){
    for(const m of MOBS){
      if(!mobTargetable(m)||!m.mesh)continue;
      let q=obj;
      while(q){
        if(q===m.mesh||q===m.label)return{type:"mob",m};
        q=q.parent;
      }
    }
  }
  if(S.mode==="raid"){
    if(typeof boss!=="undefined"&&boss){
      let q=obj;
      while(q){if(q===boss)return{type:"boss"};q=q.parent;}
    }
    if(S.adds){
      for(const a of S.adds){
        if(!addTargetable(a)||!a.mesh)continue;
        let q=obj;
        while(q){
          if(q===a.mesh||q===a.label)return{type:"add",a};
          q=q.parent;
        }
      }
    }
  }
  return null;
}

/** 屏幕坐标选取敌对目标 */
function pickTargetAtScreen(clientX,clientY){
  if(!S.started||typeof renderer==="undefined"||!renderer.domElement)return null;
  _ensurePickRay();
  const rect=renderer.domElement.getBoundingClientRect();
  _pickNdc.x=((clientX-rect.left)/rect.width)*2-1;
  _pickNdc.y=-((clientY-rect.top)/rect.height)*2+1;
  _pickRay.setFromCamera(_pickNdc,camera);
  const Tcfg=BAL.target||{};
  _pickRay.far=Tcfg.clickMaxDist||55;

  const candidates=[];
  function addMesh(mesh,tgt){
    if(!mesh)return;
    mesh.userData.targetRef=tgt;
    candidates.push(mesh);
    if(tgt.type==="mob"&&tgt.m&&tgt.m.label){
      tgt.m.label.userData.targetRef=tgt;
      candidates.push(tgt.m.label);
    }
    if(tgt.type==="add"&&tgt.a&&tgt.a.label){
      tgt.a.label.userData.targetRef=tgt;
      candidates.push(tgt.a.label);
    }
  }
  if(S.mode==="world"&&typeof MOBS!=="undefined"){
    const zid=typeof getCurrentZoneId==="function"?getCurrentZoneId():"mulgore";
    for(const m of MOBS){
      if(!mobTargetable(m))continue;
      if((m.zoneId||"mulgore")!==zid)continue;
      addMesh(m.mesh,{type:"mob",m});
    }
  }else{
    if(typeof bossTargetable==="function"&&bossTargetable()&&boss)addMesh(boss,{type:"boss"});
    for(const a of S.adds||[]){
      if(addTargetable(a))addMesh(a.mesh,{type:"add",a});
    }
  }
  if(!candidates.length)return null;
  const hits=_pickRay.intersectObjects(candidates,true);
  for(let i=0;i<hits.length;i++){
    const t=_resolveObjectToTarget(hits[i].object);
    if(t&&isTargetAlive(t))return t;
  }
  return null;
}

function tryTargetClick(clientX,clientY){
  const t=pickTargetAtScreen(clientX,clientY);
  if(t){setCurrentTarget(t);return true;}
  return false;
}

/** 右键短按：敌人攻击 / 否则走 tryInteract（NPC/拾取） */
function tryTargetContext(clientX,clientY){
  const t=pickTargetAtScreen(clientX,clientY);
  if(t&&isTargetAlive(t)){
    setCurrentTarget(t);
    /* 触发一次自动攻击节奏 */
    if(S.p)S.p.atkTimer=0;
    return true;
  }
  if(typeof tryInteract==="function"){tryInteract();return true;}
  return false;
}

/* 与相机拖动手势区分：pointerup 时位移小 → 点击 */
(function bindTargetPointer(){
  addEventListener("pointerdown",e=>{
    if(!S.started||e.pointerType==="touch")return;
    if(e.button!==0&&e.button!==2)return;
    const c=typeof renderer!=="undefined"&&renderer.domElement;
    if(!c||e.target!==c)return;
    _clickTrack.btn=e.button;
    _clickTrack.x=e.clientX;_clickTrack.y=e.clientY;_clickTrack.moved=0;
  });
  addEventListener("pointermove",e=>{
    if(_clickTrack.btn<0)return;
    _clickTrack.moved=Math.max(_clickTrack.moved,
      Math.hypot(e.clientX-_clickTrack.x,e.clientY-_clickTrack.y));
  });
  addEventListener("pointerup",e=>{
    if(_clickTrack.btn<0)return;
    const btn=_clickTrack.btn, moved=_clickTrack.moved;
    _clickTrack.btn=-1;
    if(e.pointerType==="touch")return;
    const c=typeof renderer!=="undefined"&&renderer.domElement;
    if(!c)return;
    const lim=(BAL.target&&BAL.target.clickDragPx)||6;
    if(moved>lim)return;
    if(btn===0)tryTargetClick(e.clientX,e.clientY);
    else if(btn===2)tryTargetContext(e.clientX,e.clientY);
  });
})();
