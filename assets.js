/* ============================================================
   炽心 · assets.js
   CC0 GLB 资源加载 / 烘焙 / 克隆（plan-beautify · 三 · A 线）
   ------------------------------------------------------------
   [依赖] THREE · THREE.GLTFLoader（vendor/GLTFLoader.js）
          core.js（BAL · SeededRng · WORLD_SEED · hashZoneId）
   [导出] ASSETS
          ASSETS.ready / whenReady / isReady
          ASSETS.getTreeParts / getBuildingProto / cloneBuilding
          ASSETS.sharedTime / markCamGhost / updateCamGhosts
   ============================================================ */
"use strict";

const ASSETS=(function(){
  const BASE="models/";
  const MANIFEST={
    trees:{
      pine:["foliage/pine_1.glb","foliage/pine_2.glb","foliage/pine_3.glb","foliage/pine_4.glb","foliage/pine_5.glb"],
      oak:["foliage/oak_1.glb","foliage/oak_2.glb","foliage/oak_3.glb","foliage/oak_4.glb"],
      dead:["foliage/dead_1.glb","foliage/dead_2.glb","foliage/dead_3.glb"],
      twisted:["foliage/twisted_1.glb","foliage/twisted_2.glb","foliage/twisted_3.glb"],
      bush:["foliage/bush.glb","foliage/bush_flowers.glb"],
      fern:["foliage/fern.glb"],
      mushroom:["foliage/mushroom.glb"],
    },
    buildings:{
      house:["props/house_1.glb","props/house_2.glb","props/house_3.glb"],
      inn:["props/inn.glb"],
      blacksmith:["props/blacksmith.glb"],
      tent:["props/tent_small.glb","props/tent_open.glb"],
      tower:["props/bell_tower.glb"],
    },
  };

  const MAT_POLICY={
    Leaves_NormalTree:{leaf:true,wind:1},
    Leaves_Pine:{leaf:true,wind:1},
    Leaves_TwistedTree:{leaf:true,wind:1},
    Leaves:{leaf:true,wind:1.15},
    Flowers:{leaf:true,wind:1},
    Bark_NormalTree:{leaf:false,wind:0},
    Bark_TwistedTree:{leaf:false,wind:0},
    Bark_DeadTree:{leaf:false,wind:0},
    Bark:{leaf:false,wind:0},
    Mushrooms:{leaf:false,wind:0},
    Rocks:{leaf:false,wind:0},
    Fern:{leaf:true,wind:1.1},
  };
  const LEAF_ALPHA=.4;
  const WIND_STRENGTH=.07;
  const sharedTime={value:0};
  const materialCache=new Map();
  const gltfCache=new Map();
  const treePartsCache=new Map();
  const buildingProto=new Map();
  const camGhosts=[];
  let ready=false;
  let readyPromise=null;
  const readyCbs=[];

  function isReady(){return ready;}
  function whenReady(cb){
    if(ready){try{cb();}catch(e){console.warn(e);}return;}
    readyCbs.push(cb);
  }

  /* r128 无 getComponent：走 array / getX·Y·Z */
  function toFloatAttr(attr){
    const count=attr.count|0;
    const itemSize=attr.itemSize|0;
    const out=new Float32Array(count*itemSize);
    if(attr.isInterleavedBufferAttribute||typeof attr.getX==="function"){
      for(let i=0;i<count;i++){
        out[i*itemSize]=attr.getX(i);
        if(itemSize>1)out[i*itemSize+1]=attr.getY(i);
        if(itemSize>2)out[i*itemSize+2]=attr.getZ(i);
        if(itemSize>3)out[i*itemSize+3]=attr.getW(i);
      }
    }else if(attr.array){
      const src=attr.array;
      const n=Math.min(out.length,src.length);
      for(let i=0;i<n;i++)out[i]=src[i];
    }
    return new THREE.BufferAttribute(out,itemSize);
  }

  function bakeGeometry(mesh){
    const src=mesh.geometry;
    if(!src)return null;
    const out=new THREE.BufferGeometry();
    ["position","normal","uv","color"].forEach(name=>{
      const attr=src.getAttribute(name);
      if(attr)out.setAttribute(name,toFloatAttr(attr));
    });
    if(!out.getAttribute("position"))return null;
    if(src.index){
      const idx=src.index;
      if(idx.array)out.setIndex(new THREE.BufferAttribute(idx.array.slice(),1));
      else out.setIndex(idx.clone());
    }
    out.applyMatrix4(mesh.matrixWorld);
    return out;
  }

  function addWind(mat,strength){
    if(!strength)return;
    mat.onBeforeCompile=function(sh){
      sh.uniforms.uTime=sharedTime;
      sh.uniforms.uWindStrength={value:strength};
      sh.vertexShader=sh.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uTime;\nuniform float uWindStrength;"
        )
        .replace(
          "#include <begin_vertex>",
          [
            "#include <begin_vertex>",
            "#ifdef USE_INSTANCING",
            "  float windPhase=instanceMatrix[3][0]*0.15+instanceMatrix[3][2]*0.17;",
            "#else",
            "  float windPhase=0.0;",
            "#endif",
            "float windAmt=(sin(uTime*1.7+windPhase)+0.5*sin(uTime*3.1+windPhase*1.3))",
            "  *uWindStrength*smoothstep(0.0,1.0,transformed.y);",
            "transformed.x+=windAmt;",
            "transformed.z+=windAmt*0.6;",
          ].join("\n")
        );
    };
    mat.userData.wind=true;
  }

  function foliageMaterial(src){
    const key=(src&&src.name)||"mat";
    if(materialCache.has(key))return materialCache.get(key);
    const pol=MAT_POLICY[key]||{leaf:false,wind:0};
    /* 克隆 GLTF 自带材质，避免在 palette.js 外 new MeshStandardMaterial */
    const mat=src&&src.clone?src.clone():(typeof MAT!=="undefined"?MAT.get("grass.canopy"):null);
    if(!mat)return src;
    mat.name=key;
    mat.roughness=pol.leaf?.9:.95;
    mat.metalness=0;
    mat.alphaTest=pol.leaf?LEAF_ALPHA:0;
    mat.side=pol.leaf?THREE.DoubleSide:THREE.FrontSide;
    mat.transparent=false;
    mat.depthWrite=true;
    if(mat.map){
      mat.map.encoding=THREE.sRGBEncoding;
      mat.map.needsUpdate=true;
    }
    if(pol.wind>0)addWind(mat,WIND_STRENGTH*pol.wind);
    mat.userData.sharedMat=true;
    mat.userData.isLeaf=!!pol.leaf;
    materialCache.set(key,mat);
    return mat;
  }

  function extractTreeParts(url){
    if(treePartsCache.has(url))return treePartsCache.get(url);
    const gltf=gltfCache.get(url);
    if(!gltf)return null;
    gltf.scene.updateMatrixWorld(true);
    const parts=[];
    gltf.scene.traverse(obj=>{
      if(!obj.isMesh)return;
      try{
        const srcMat=Array.isArray(obj.material)?obj.material[0]:obj.material;
        const geo=bakeGeometry(obj);
        if(!geo)return;
        const mat=foliageMaterial(srcMat||{});
        const pol=MAT_POLICY[srcMat&&srcMat.name]||{leaf:false};
        parts.push({geometry:geo,material:mat,isLeaf:!!pol.leaf});
      }catch(e){
        console.warn("[ASSETS] bake mesh fail",url,e&&e.message||e);
      }
    });
    if(!parts.length){
      console.warn("[ASSETS] no parts",url);
      treePartsCache.set(url,[]);
      return [];
    }
    parts.sort((a,b)=>Number(a.isLeaf)-Number(b.isLeaf));
    /* 归一：底部落地，高度约 1（再由 baseScale 放大） */
    let minY=Infinity,maxY=-Infinity;
    for(let i=0;i<parts.length;i++){
      parts[i].geometry.computeBoundingBox();
      const bb=parts[i].geometry.boundingBox;
      if(!bb)continue;
      if(bb.min.y<minY)minY=bb.min.y;
      if(bb.max.y>maxY)maxY=bb.max.y;
    }
    if(!isFinite(minY)||!isFinite(maxY)){treePartsCache.set(url,parts);return parts;}
    const h=Math.max(.01,maxY-minY);
    const ground=new THREE.Matrix4().makeTranslation(0,-minY,0);
    const norm=new THREE.Matrix4().makeScale(1/h,1/h,1/h);
    const xform=new THREE.Matrix4().multiplyMatrices(norm,ground);
    for(let i=0;i<parts.length;i++){
      parts[i].geometry.applyMatrix4(xform);
      parts[i].geometry.computeBoundingBox();
      parts[i].geometry.computeBoundingSphere();
    }
    treePartsCache.set(url,parts);
    return parts;
  }

  function measureScene(root){
    const box=new THREE.Box3().setFromObject(root);
    const size=new THREE.Vector3();
    box.getSize(size);
    return {size,box,minY:box.min.y};
  }

  function prepareBuilding(url){
    if(buildingProto.has(url))return buildingProto.get(url);
    const gltf=gltfCache.get(url);
    if(!gltf)return null;
    const root=gltf.scene.clone(true);
    root.updateMatrixWorld(true);
    const m=measureScene(root);
    /* 把底移到 y=0 */
    root.position.y-=m.minY;
    root.updateMatrixWorld(true);
    const m2=measureScene(root);
    const proto={
      url,
      root,
      size:m2.size.clone(),
      height:m2.size.y,
    };
    buildingProto.set(url,proto);
    return proto;
  }

  function cloneBuilding(kind,cfg){
    const c=cfg||{};
    const list=MANIFEST.buildings[kind];
    if(!list||!list.length||!ready)return null;
    let idx=0;
    if(c.variant!=null)idx=((c.variant%list.length)+list.length)%list.length;
    else if(c.seed!=null)idx=(c.seed>>>0)%list.length;
    const url=list[idx];
    const proto=prepareBuilding(url);
    if(!proto)return null;
    const g=new THREE.Group();
    const mesh=proto.root.clone(true);
    const defaults={
      tent:{h:5.2,w:6.5,d:6.5},
      inn:{h:7.8,w:14,d:8.5},
      blacksmith:{h:6.6,w:9.5,d:8},
      tower:{h:11,w:5.5,d:5.5},
      house:{h:6.8,w:8.5,d:7.2},
    };
    const def=defaults[kind]||defaults.house;
    const targetH=c.targetH!=null?c.targetH:def.h;
    const targetW=c.targetW!=null?c.targetW:def.w;
    const targetD=c.targetD!=null?c.targetD:def.d;
    const sx=targetW/Math.max(.01,proto.size.x);
    const sy=targetH/Math.max(.01,proto.size.y);
    const sz=targetD/Math.max(.01,proto.size.z);
    const uni=c.uniformScale!=null?c.uniformScale:null;
    if(uni!=null)mesh.scale.setScalar(uni);
    else mesh.scale.set(sx,sy,sz);
    g.add(mesh);
    const sc=c.size!=null?c.size:1;
    g.scale.setScalar(sc);
    g.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;
      o.receiveShadow=true;
      if(o.material){
        const mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(m=>{
          if(!m)return;
          if(m.map){m.map.encoding=THREE.sRGBEncoding;m.needsUpdate=true;}
          /* 克隆材质以便 camera-ghost 单独改 depthWrite */
          if(!m.userData||!m.userData._ghostCloned){
            const cm=m.clone();
            cm.userData=Object.assign({},m.userData,{_ghostCloned:true,sharedMat:false});
            if(Array.isArray(o.material)){
              const arr=o.material.slice();
              const i=arr.indexOf(m);
              if(i>=0)arr[i]=cm;
              o.material=arr;
            }else o.material=cm;
          }
        });
      }
    });
    g.userData.building=kind;
    g.userData.glb=url;
    g.userData.cameraGhost=true;
    g.userData.noCamCollide=true; /* 穿墙：碰撞放行，由 updateCamGhosts 隐藏遮挡 */
    const fw=(targetW*sc)*.55, fd=(targetD*sc)*.55, topY=targetH*sc;
    markCamGhost(g,{hw:fw,hd:fd,topY:topY});
    return g;
  }

  function markCamGhost(group,foot){
    if(!group)return;
    const mats=[];
    group.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const list=Array.isArray(o.material)?o.material:[o.material];
      list.forEach(m=>{
        if(!m)return;
        mats.push({mat:m,depthWrite:m.depthWrite!==false,colorWrite:m.colorWrite!==false});
      });
    });
    const entry={
      group,
      mats,
      hidden:false,
      x:0,z:0,
      hw:foot&&foot.hw!=null?foot.hw:4,
      hd:foot&&foot.hd!=null?foot.hd:4,
      r:foot&&foot.r!=null?foot.r:null,
      topY:foot&&foot.topY!=null?foot.topY:8,
      rot:0,
    };
    group.userData._camGhost=entry;
    camGhosts.push(entry);
    return entry;
  }

  function syncGhostPose(entry){
    const g=entry.group;
    if(!g)return;
    const p=g.getWorldPosition(new THREE.Vector3());
    entry.x=p.x; entry.z=p.z;
    entry.rot=g.rotation.y;
    /* 若父级有旋转，用四元数取 yaw */
    if(g.parent){
      const e=new THREE.Euler().setFromQuaternion(g.getWorldQuaternion(new THREE.Quaternion()),"YXZ");
      entry.rot=e.y;
    }
  }

  function pointInFoot(h,x,z){
    const dx=x-h.x,dz=z-h.z;
    if(h.r!=null)return dx*dx+dz*dz<h.r*h.r;
    const c=Math.cos(h.rot),s=Math.sin(h.rot);
    const lx=dx*c-dz*s, lz=dx*s+dz*c;
    return Math.abs(lx)<h.hw&&Math.abs(lz)<h.hd;
  }

  function segmentHitsFoot(h,ax,az,bx,bz){
    /* 采样线段上若干点 */
    for(let i=0;i<=6;i++){
      const t=i/6;
      const x=ax+(bx-ax)*t, z=az+(bz-az)*t;
      if(pointInFoot(h,x,z))return true;
    }
    return pointInFoot(h,ax,az)||pointInFoot(h,bx,bz);
  }

  function setGhostHidden(h,hide){
    if(h.hidden===hide)return;
    h.hidden=hide;
    for(let i=0;i<h.mats.length;i++){
      const e=h.mats[i];
      if(hide){
        e.mat.colorWrite=false;
        e.mat.depthWrite=false;
      }else{
        e.mat.colorWrite=e.colorWrite;
        e.mat.depthWrite=e.depthWrite;
      }
      e.mat.needsUpdate=true;
    }
  }

  /** 相机穿墙：eye→cam 线段穿过建筑 footprint 且相机低于屋顶时隐藏 */
  function updateCamGhosts(eye,cam){
    if(!camGhosts.length||!eye||!cam)return;
    for(let i=0;i<camGhosts.length;i++){
      const h=camGhosts[i];
      if(!h.group||!h.group.parent)continue;
      syncGhostPose(h);
      const camAbove=cam.y>h.group.position.y+h.topY*.92;
      const hit=!camAbove&&segmentHitsFoot(h,eye.x,eye.z,cam.x,cam.z);
      setGhostHidden(h,hit);
    }
  }

  function getTreeParts(kind){
    const urls=MANIFEST.trees[kind]||[];
    const out=[];
    for(let i=0;i<urls.length;i++){
      const parts=extractTreeParts(urls[i]);
      if(parts&&parts.length)out.push(parts);
    }
    return out;
  }

  function loadOne(loader,url){
    return new Promise((resolve,reject)=>{
      loader.load(
        BASE+url,
        (gltf)=>{gltfCache.set(url,gltf);resolve(gltf);},
        undefined,
        (err)=>reject(err||new Error("load fail "+url))
      );
    });
  }

  function allUrls(){
    const u=[];
    Object.keys(MANIFEST.trees).forEach(k=>MANIFEST.trees[k].forEach(x=>u.push(x)));
    Object.keys(MANIFEST.buildings).forEach(k=>MANIFEST.buildings[k].forEach(x=>u.push(x)));
    return u;
  }

  function startLoad(){
    if(readyPromise)return readyPromise;
    readyPromise=new Promise((resolve)=>{
      if(typeof THREE==="undefined"||typeof THREE.GLTFLoader!=="function"){
        console.warn("[ASSETS] THREE.GLTFLoader 不可用，跳过 GLB");
        ready=false;
        resolve(false);
        return;
      }
      const loader=new THREE.GLTFLoader();
      const urls=allUrls();
      let left=urls.length, ok=0;
      if(!left){ready=true;resolve(true);return;}
      urls.forEach(url=>{
        loadOne(loader,url).then(()=>{ok++;}).catch(e=>{
          console.warn("[ASSETS] 加载失败",url,e&&e.message||e);
        }).finally(()=>{
          left--;
          if(left<=0){
            ready=ok>0;
            if(ready){
              try{
                Object.keys(MANIFEST.trees).forEach(k=>getTreeParts(k));
                Object.keys(MANIFEST.buildings).forEach(k=>{
                  (MANIFEST.buildings[k]||[]).forEach(u=>prepareBuilding(u));
                });
              }catch(e){
                console.warn("[ASSETS] 预烘焙失败",e&&e.message||e);
              }
            }
            for(let i=0;i<readyCbs.length;i++){
              try{readyCbs[i]();}catch(e){console.warn(e);}
            }
            readyCbs.length=0;
            resolve(ready);
          }
        });
      });
    });
    return readyPromise;
  }

  /* 脚本解析后立刻开始拉取 */
  if(typeof THREE!=="undefined"){
    if(document.readyState==="loading"){
      document.addEventListener("DOMContentLoaded",()=>startLoad());
    }else{
      /* 下一 macrotask，确保 GLTFLoader 脚本已执行 */
      setTimeout(()=>startLoad(),0);
    }
  }

  return{
    MANIFEST,
    sharedTime,
    ready:startLoad,
    isReady,whenReady,startLoad,
    getTreeParts,cloneBuilding,prepareBuilding,
    markCamGhost,updateCamGhosts,
    get camGhosts(){return camGhosts;},
  };
})();
