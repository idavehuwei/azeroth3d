/* ============================================================
   炽心 · props.js V3
   植被 / 水体 / 云 / 场景道具工厂 — 魔兽级密度
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL SeededRng WORLD_SEED hashZoneId）
          palette.js（PALETTE · MAT）· textures.js（Tex）
          terrain.js（heightAt · TERRAIN.slopeAt / roadWeight / lakeBlend / flowerSeed）
   [导出] buildPine buildOak getTreeVariants buildRockGroup
          buildGrassField buildMirrorLake buildCloudField
          spawnMulgoreProps updateProps disposeProps
          PROPS（内部状态：uniforms / clouds / lakes）
   ============================================================ */
"use strict";

const PROPS=(function(){
  const state={
    grassUni:null,
    flowerUni:null,
    lakeUnis:[],
    clouds:[],
    embers:[],
    roots:[],
    disposed:false,
  };
  const _rng=SeededRng((WORLD_SEED^hashZoneId("props_mulgore"))>>>0);
  function prand(){return _rng();}
  function psrand(a,b){return a+prand()*(b-a);}
  function P(){return BAL.props||{};}

  function isMobileProps(){
    try{return typeof matchMedia==="function"&&matchMedia("(pointer:coarse)").matches;}
    catch(e){return false;}
  }

  function isGrassSpot(x,z,maxSlope){
    if(typeof TERRAIN==="undefined"||!TERRAIN.cfg||!TERRAIN.cfg.ready)return true;
    if(TERRAIN.slopeAt(x,z)>maxSlope)return false;
    const bp=P();
    if(TERRAIN.roadWeight(x,z)>(bp.grassRoadMax!=null?bp.grassRoadMax:.15))return false;
    const lk=TERRAIN.lakeBlend(x,z);
    if(lk.w>(bp.grassLakeMax!=null?bp.grassLakeMax:.35))return false;
    return true;
  }

  function isFlowerSpot(x,z,maxSlope){
    if(typeof TERRAIN==="undefined"||!TERRAIN.cfg||!TERRAIN.cfg.ready)return false;
    if(TERRAIN.slopeAt(x,z)>maxSlope)return false;
    if(TERRAIN.roadWeight(x,z)>.1)return false;
    if(TERRAIN.lakeBlend(x,z).w>.2)return false;
    /* 只在平缓草地出花 */
    const h=TERRAIN.heightAt(x,z);
    if(h<-.2||h>2.5)return false;
    return true;
  }

  function track(obj,deep){
    if(obj)state.roots.push({obj,deep:!!deep});
    return obj;
  }
  function disposeObject3D(obj,deep){
    if(!obj)return;
    if(deep){
      obj.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        if(o.material){
          const mats=Array.isArray(o.material)?o.material:[o.material];
          mats.forEach(m=>{
            if(!m||(m.userData&&m.userData.sharedMat))return;
            m.dispose();
          });
        }
      });
    }
    if(obj.parent)obj.parent.remove(obj);
  }

  /* —— 十字草片几何（两片交叉 Plane 合并） —— */
  function makeGrassGeo(w,h){
    const hw=w*.5;
    const pos=new Float32Array([
      -hw,0,0,  hw,0,0,  hw,h,0,  -hw,0,0,  hw,h,0,  -hw,h,0,
      0,0,-hw,  0,0,hw,  0,h,hw,  0,0,-hw,  0,h,hw,  0,h,-hw,
    ]);
    const uv=new Float32Array([
      0,0,1,0,1,1, 0,0,1,1,0,1,
      0,0,1,0,1,1, 0,0,1,1,0,1,
    ]);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("uv",new THREE.BufferAttribute(uv,2));
    geo.computeVertexNormals();
    return geo;
  }

  /* —— 小花几何（十字花片） —— */
  function makeFlowerGeo(w,h){
    const hw=w*.5;
    const pos=new Float32Array([
      -hw,0,0,  hw,0,0,  hw,h,0,  -hw,0,0,  hw,h,0,  -hw,h,0,
      0,0,-hw,  0,0,hw,  0,h,hw,  0,0,-hw,  0,h,hw,  0,h,-hw,
    ]);
    const uv=new Float32Array([
      0,0,1,0,1,1, 0,0,1,1,0,1,
      0,0,1,0,1,1, 0,0,1,1,0,1,
    ]);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("uv",new THREE.BufferAttribute(uv,2));
    geo.computeVertexNormals();
    return geo;
  }

  function buildGrassField(cfg){
    const P=BAL.props||{};
    const c=Object.assign({
      count:isMobileProps()?(P.grassCountMobile||5000):(P.grassCount||15000),
      radius:P.grassRadius||80,
      fadeStart:P.grassFadeStart||55,
      fadeEnd:P.grassFadeEnd||75,
      maxSlope:P.grassMaxSlope||.35,
      cx:0,cz:0,
      w:P.grassW||.22, h:P.grassH||.55,
    },cfg||{});
    const geo=makeGrassGeo(c.w,c.h);
    const col=new THREE.Color((PALETTE.grass&&PALETTE.grass.base)||0x6f9e46);
    const colVar=new THREE.Color(0x88b85a);
    const uni={
      uTime:{value:0},
      uColor:{value:col},
      uColorVar:{value:colVar},
      uFadeStart:{value:c.fadeStart},
      uFadeEnd:{value:c.fadeEnd},
      uOrigin:{value:new THREE.Vector2(c.cx,c.cz)},
    };
    const mat=new THREE.ShaderMaterial({
      uniforms:uni,
      transparent:false,
      alphaTest:.35,
      side:THREE.DoubleSide,
      depthWrite:true,
      vertexShader:[
        "uniform float uTime;",
        "uniform float uFadeStart;",
        "uniform float uFadeEnd;",
        "uniform vec2 uOrigin;",
        "varying float vFade;",
        "varying vec2 vUv;",
        "varying float vColorMix;",
        "void main(){",
        "  vUv=uv;",
        "  float hW=clamp(position.y/max(0.01,float("+c.h.toFixed(3)+")),0.0,1.0);",
        "  vec3 transformed=position;",
        "  #ifdef USE_INSTANCING",
        "    vec4 wp=instanceMatrix*vec4(transformed,1.0);",
        "    transformed.x+=sin(uTime*1.6+wp.x*0.35)*0.25*hW;",
        "    transformed.z+=cos(uTime*1.35+wp.z*0.28)*0.12*hW;",
        "    float dx=instanceMatrix[3][0]-uOrigin.x;",
        "    float dz=instanceMatrix[3][2]-uOrigin.y;",
        "    float dist=sqrt(dx*dx+dz*dz);",
        "    vFade=1.0-smoothstep(uFadeStart,uFadeEnd,dist);",
        "    vec3 sc=vec3(vFade);",
        "    mat4 scaled=instanceMatrix;",
        "    scaled[0].xyz*=sc; scaled[1].xyz*=sc; scaled[2].xyz*=sc;",
        "    gl_Position=projectionMatrix*modelViewMatrix*scaled*vec4(transformed,1.0);",
        "    vColorMix=instanceMatrix[0].x*0.3+instanceMatrix[2].z*0.3;",
        "  #else",
        "    vFade=1.0;",
        "    vColorMix=0.5;",
        "    gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.0);",
        "  #endif",
        "}",
      ].join("\n"),
      fragmentShader:[
        "uniform vec3 uColor;",
        "uniform vec3 uColorVar;",
        "varying float vFade;",
        "varying float vColorMix;",
        "varying vec2 vUv;",
        "void main(){",
        "  float edge=smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x);",
        "  float tip=smoothstep(0.0,0.2,vUv.y);",
        "  float a=edge*tip;",
        "  if(a<0.35||vFade<0.02)discard;",
        "  vec3 base=mix(uColor,uColorVar,vColorMix-floor(vColorMix));",
        "  vec3 col=base*(0.5+0.5*vUv.y);",
        "  gl_FragColor=vec4(col,1.0);",
        "}",
      ].join("\n"),
    });
    const mesh=new THREE.InstancedMesh(geo,mat,c.count);
    mesh.frustumCulled=false;
    mesh.castShadow=false;
    mesh.receiveShadow=false;
    mesh.name="grassField";
    const dummy=new THREE.Object3D();
    let placed=0,guard=0;
    const maxTry=c.count*8;
    while(placed<c.count&&guard++<maxTry){
      const a=prand()*Math.PI*2;
      const r=Math.sqrt(prand())*c.radius;
      const x=c.cx+Math.cos(a)*r;
      const z=c.cz+Math.sin(a)*r;
      if(!isGrassSpot(x,z,c.maxSlope))continue;
      const gy=typeof heightAt==="function"?heightAt(x,z):0;
      const sc=psrand(.7,1.3);
      dummy.position.set(x,gy,z);
      dummy.rotation.set(0,prand()*Math.PI*2,psrand(-.08,.08));
      dummy.scale.set(sc,sc*psrand(.8,1.25),sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed++,dummy.matrix);
    }
    mesh.count=placed;
    mesh.instanceMatrix.needsUpdate=true;
    state.grassUni=uni;
    return track(mesh,true);
  }

  /* —— 花簇：彩色小花散布 —— */
  function buildFlowerField(cfg){
    const c=Object.assign({
      count:2000,
      radius:70,
      cx:0,cz:0,
    },cfg||{});
    const geo=makeFlowerGeo(.12,.2);
    const colors=[0xff4466,0xffaa44,0xff66cc,0xcc44ff,0x44aaff,0xff8844,0xffee44];
    const meshes=[];
    /* 每色一个 InstancedMesh */
    for(let ci=0;ci<colors.length;ci++){
      const mat=new THREE.MeshBasicMaterial({
        color:colors[ci],
        transparent:true,
        alphaTest:.3,
        side:THREE.DoubleSide,
        depthWrite:false,
      });
      const mesh=new THREE.InstancedMesh(geo,mat,Math.ceil(c.count/colors.length));
      mesh.frustumCulled=false;
      mesh.castShadow=false;
      mesh.receiveShadow=false;
      mesh.name="flower_"+ci;
      meshes.push(mesh);
    }
    const dummy=new THREE.Object3D();
    const perColor=Math.ceil(c.count/colors.length);
    const counts=new Array(colors.length).fill(0);
    let placed=0,guard=0;
    while(placed<c.count&&guard++<c.count*10){
      const a=prand()*Math.PI*2;
      const r=Math.sqrt(prand())*c.radius;
      const x=c.cx+Math.cos(a)*r;
      const z=c.cz+Math.sin(a)*r;
      if(!isFlowerSpot(x,z,.25))continue;
      if(typeof TERRAIN.flowerSeed==="function"){
        const fs=TERRAIN.flowerSeed(x,z);
        if(fs===0)continue;
      }
      const gy=typeof heightAt==="function"?heightAt(x,z):0;
      const ci=Math.floor(prand()*colors.length);
      const idx=counts[ci];
      if(idx>=perColor)continue;
      dummy.position.set(x,gy,z);
      dummy.rotation.set(0,prand()*Math.PI*2,psrand(-.15,.15));
      dummy.scale.setScalar(psrand(.8,1.3));
      dummy.updateMatrix();
      meshes[ci].setMatrixAt(idx,dummy.matrix);
      counts[ci]++; placed++;
    }
    for(let i=0;i<meshes.length;i++){
      meshes[i].count=counts[i];
      meshes[i].instanceMatrix.needsUpdate=true;
      track(meshes[i],true);
    }
    return meshes;
  }

  /* —— 松 / 橡 —— */
  function buildPine(seed){
    const rng=SeededRng((seed>>>0)||1);
    const rr=()=>rng();
    const rs=(a,b)=>a+rr()*(b-a);
    const g=new THREE.Group();
    const trunkM=MAT.get("wood.trunk");
    const leafM=MAT.get("grass.canopy",{color:(PALETTE.grass&&PALETTE.grass.dark)||0x4a7a2e});
    const th=rs(3.2,5.2);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.38,th,6),trunkM);
    trunk.position.y=th/2; g.add(trunk);
    const layers=4+((rr()*3)|0);
    let y=th*.45;
    for(let i=0;i<layers;i++){
      const t=i/(layers-1||1);
      const rad=rs(1.6,2.4)*(1-t*.55);
      const ch=rs(1.1,1.6);
      const cone=new THREE.Mesh(new THREE.ConeGeometry(rad,ch,7),leafM);
      cone.position.y=y+ch*.35;
      y+=ch*.55;
      g.add(cone);
    }
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    g.userData.prop="pine";
    return g;
  }

  function buildOak(seed){
    const rng=SeededRng((seed>>>0)||1);
    const rr=()=>rng();
    const rs=(a,b)=>a+rr()*(b-a);
    const g=new THREE.Group();
    const trunkM=MAT.get("wood.trunk");
    const leafM=MAT.get("grass.canopy");
    const th=rs(2.8,4.4);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28,.42,th,7),trunkM);
    trunk.position.y=th/2; g.add(trunk);
    const forks=2+((rr()*2)|0);
    for(let i=0;i<forks;i++){
      const len=rs(1.2,2.2);
      const br=new THREE.Mesh(new THREE.CylinderGeometry(.08,.16,len,5),trunkM);
      br.position.set(rs(-.2,.2),th*.55+rs(0,.4),rs(-.2,.2));
      br.rotation.set(rs(-.7,.7),rr()*Math.PI*2,rs(-.5,.5));
      g.add(br);
    }
    const crowns=3+((rr()*3)|0);
    for(let i=0;i<crowns;i++){
      const rad=rs(1.4,2.4);
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(rad,7,6),leafM);
      leaf.position.set(rs(-1.1,1.1),th+rs(.4,1.6),rs(-1.1,1.1));
      leaf.scale.y=rs(.65,.9);
      g.add(leaf);
    }
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    g.userData.prop="oak";
    return g;
  }

  let _pineVars=null,_oakVars=null;
  function getTreeVariants(){
    const nP=(BAL.props&&BAL.props.pineVariants)||6;
    const nO=(BAL.props&&BAL.props.oakVariants)||6;
    if(!_pineVars){
      _pineVars=[];
      for(let i=0;i<nP;i++)_pineVars.push(buildPine(0xA11E0000^(i*9973)));
    }
    if(!_oakVars){
      _oakVars=[];
      for(let i=0;i<nO;i++)_oakVars.push(buildOak(0x0A700000^(i*7919)));
    }
    return{pine:_pineVars,oak:_oakVars};
  }

  function placeTrees(scene,ctx){
    const vars=getTreeVariants();
    const n=(BAL.props&&BAL.props.treeCount)||80;
    const camps=ctx.avoid||[];
    const worldR=ctx.worldR||320;
    let placed=0,guard=0;
    while(placed<n&&guard++<n*12){
      const a=prand()*Math.PI*2;
      const r=psrand(18,worldR-12);
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      let near=false;
      for(let i=0;i<camps.length;i++){
        const C=camps[i];
        if(Math.hypot(x-C.x,z-C.z)<(C.r||45)){near=true;break;}
      }
      if(near)continue;
      if(typeof TERRAIN!=="undefined"&&TERRAIN.cfg&&TERRAIN.cfg.ready){
        const bp=P();
        if(TERRAIN.roadWeight(x,z)>(bp.treeRoadMax!=null?bp.treeRoadMax:.2))continue;
        if(TERRAIN.lakeBlend(x,z).w>(bp.treeLakeMax!=null?bp.treeLakeMax:.4))continue;
        if(TERRAIN.slopeAt(x,z)>(bp.treeSlopeMax!=null?bp.treeSlopeMax:.55))continue;
      }
      const pool=prand()<(P().pineChance!=null?P().pineChance:.55)?vars.pine:vars.oak;
      const src=pool[(prand()*pool.length)|0];
      const tree=src.clone(true);
      const gy=typeof heightAt==="function"?heightAt(x,z):0;
      const sc=psrand(.85,1.35);
      tree.position.set(x,gy,z);
      tree.rotation.y=prand()*Math.PI*2;
      tree.scale.setScalar(sc);
      scene.add(tree);
      track(tree,false);
      placed++;
    }
  }

  /* —— 岩石组 —— */
  function perturbRock(geo,amt,rng){
    const pos=geo.attributes.position;
    const rr=rng||prand;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const f=1+(rr()-.5)*2*amt;
      pos.setXYZ(i,x*f,y*f,z*f);
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();
    return geo;
  }

  function buildRockGroup(seed){
    const rng=SeededRng((seed>>>0)||1);
    const rr=()=>rng();
    const rs=(a,b)=>a+rr()*(b-a);
    const bp=P();
    const g=new THREE.Group();
    const mat=MAT.get("rock.boulder");
    const useN=!isMobileProps();
    /* 主岩 */
    const bigGeo=perturbRock(new THREE.DodecahedronGeometry(rs(1.5,2.8),0),.18,rr);
    const big=new THREE.Mesh(bigGeo,mat);
    big.position.y=rs(.5,1.2);
    big.rotation.set(rr()*Math.PI,rr()*Math.PI,rr()*Math.PI);
    g.add(big);
    /* 碎石 */
    const nSmall=bp.rocksPerGroup||[3,6];
    const n=nSmall[0]+((rr()*(nSmall[1]-nSmall[0]+1))|0);
    for(let i=0;i<n;i++){
      const s=rs(.35,1.0);
      const geo=perturbRock(new THREE.DodecahedronGeometry(s,0),.18,rr);
      const m=new THREE.Mesh(geo,mat);
      const a=rr()*Math.PI*2,d=rs(1.2,3.2);
      m.position.set(Math.cos(a)*d,s*.45,Math.sin(a)*d);
      m.rotation.set(rr(),rr(),rr());
      g.add(m);
    }
    if(!useN){
      g.traverse(o=>{
        if(o.isMesh&&o.material&&o.material.normalMap){
          o.material=o.material.clone();
          o.material.normalMap=null;
          o.material.needsUpdate=true;
        }
      });
    }
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    g.userData.prop="rockGroup";
    return g;
  }

  function placeRockGroups(scene,ctx){
    const n=(BAL.props&&BAL.props.rockGroups)||20;
    const camps=ctx.avoid||[];
    const worldR=ctx.worldR||320;
    let placed=0,guard=0;
    while(placed<n&&guard++<n*10){
      const a=prand()*Math.PI*2;
      const r=psrand(22,worldR-14);
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      let near=false;
      for(let i=0;i<camps.length;i++){
        const C=camps[i];
        if(Math.hypot(x-C.x,z-C.z)<(C.r||40)){near=true;break;}
      }
      if(near)continue;
      if(typeof TERRAIN!=="undefined"&&TERRAIN.cfg&&TERRAIN.cfg.ready){
        const bp=P();
        if(TERRAIN.roadWeight(x,z)>(bp.rockRoadMax!=null?bp.rockRoadMax:.25))continue;
        if(TERRAIN.lakeBlend(x,z).w>(bp.rockLakeMax!=null?bp.rockLakeMax:.5))continue;
      }
      const grp=buildRockGroup(0xC0C00000^(placed*13331)^(Math.floor(x*10)&0xffff));
      const gy=typeof heightAt==="function"?heightAt(x,z):0;
      grp.position.set(x,gy,z);
      grp.rotation.y=prand()*Math.PI*2;
      grp.scale.setScalar(psrand(.85,1.3));
      scene.add(grp);
      track(grp,true);
      placed++;
    }
  }

  /* —— 镜湖 —— */
  function buildMirrorLake(lake){
    const L=lake||{};
    const r=L.inner!=null?L.inner:(L.r||16);
    const outer=L.outer!=null?L.outer:r*1.6;
    const geo=new THREE.CircleGeometry(outer*.92,48);
    const sky=(PALETTE.sky&&PALETTE.sky.horizon)||0xa8c8e8;
    const water=(PALETTE.water&&PALETTE.water.base)||0x3a7a9a;
    const uni={
      uTime:{value:0},
      uSky:{value:new THREE.Color(sky)},
      uWater:{value:new THREE.Color(water)},
      uFresnel:{value:(BAL.props&&BAL.props.lakeFresnel)||.55},
      uInner:{value:r},
      uOuter:{value:outer*.92},
    };
    const mat=new THREE.ShaderMaterial({
      uniforms:uni,
      transparent:true,
      depthWrite:false,
      side:THREE.DoubleSide,
      vertexShader:[
        "varying vec3 vWorld;",
        "varying vec3 vView;",
        "varying vec2 vLocal;",
        "void main(){",
        "  vec4 wp=modelMatrix*vec4(position,1.0);",
        "  vWorld=wp.xyz;",
        "  vLocal=position.xy;",
        "  vView=cameraPosition-wp.xyz;",
        "  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);",
        "}",
      ].join("\n"),
      fragmentShader:[
        "uniform float uTime;",
        "uniform vec3 uSky;",
        "uniform vec3 uWater;",
        "uniform float uFresnel;",
        "uniform float uInner;",
        "uniform float uOuter;",
        "varying vec3 vWorld;",
        "varying vec3 vView;",
        "varying vec2 vLocal;",
        "void main(){",
        "  float dist=length(vLocal);",
        "  float shore=smoothstep(uOuter,uInner*0.85,dist);",
        "  vec2 uv1=vWorld.xz*0.08+vec2(uTime*0.03,-uTime*0.02);",
        "  vec2 uv2=vWorld.xz*0.11+vec2(-uTime*0.025,uTime*0.018);",
        "  float n1=sin(uv1.x*12.0+uv1.y*9.0)*0.5+0.5;",
        "  float n2=sin(uv2.x*15.0-uv2.y*11.0)*0.5+0.5;",
        "  float ripple=(n1*0.6+n2*0.4);",
        "  vec3 N=normalize(vec3((n1-0.5)*0.35,(n2-0.5)*0.35,1.0));",
        "  vec3 V=normalize(vView);",
        "  float fre=pow(1.0-max(dot(N,V),0.0),3.0);",
        "  vec3 col=mix(uWater,uSky,fre*uFresnel+ripple*0.12);",
        "  float alpha=mix(0.25,0.78,shore)*(0.85+ripple*0.15);",
        "  if(dist>uOuter)discard;",
        "  gl_FragColor=vec4(col,alpha);",
        "}",
      ].join("\n"),
    });
    const mesh=new THREE.Mesh(geo,mat);
    mesh.rotation.x=-Math.PI/2;
    const x=L.x||0,z=L.z||0;
    const gy=typeof heightAt==="function"?heightAt(x,z):0;
    mesh.position.set(x,gy+.06,z);
    mesh.name="mirrorLake";
    mesh.renderOrder=1;
    state.lakeUnis.push(uni);
    return track(mesh,true);
  }

  /* —— 云 —— */
  function buildCloudField(cfg){
    const bp=P();
    const sw=bp.cloudSizeW||[28,55], sh=bp.cloudSizeH||[10,18];
    const c=Object.assign({
      count:bp.clouds||15,
      y:bp.cloudY||70,
      spread:bp.cloudSpread||300,
    },cfg||{});
    const group=new THREE.Group();
    group.name="cloudField";
    const mat=new THREE.MeshBasicMaterial({
      color:0xf2f6fa,transparent:true,opacity:.42,
      depthWrite:false,side:THREE.DoubleSide,
    });
    for(let i=0;i<c.count;i++){
      const w=psrand(sw[0],sw[1]),h=psrand(sh[0],sh[1]);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h,1,1),mat.clone());
      m.position.set(psrand(-c.spread,c.spread),c.y+psrand(-4,6),psrand(-c.spread,c.spread));
      m.rotation.x=-.35+psrand(-.1,.1);
      m.rotation.y=psrand(-.4,.4);
      m.userData.cloud={
        baseY:m.position.y,
        spd:psrand(1.2,3.2)*(prand()<.5?-1:1),
        phase:prand()*Math.PI*2,
        breath:psrand(.015,.04),
      };
      group.add(m);
      state.clouds.push(m);
    }
    return track(group,true);
  }

  function spawnMulgoreProps(scene,ctx){
    const C=ctx||{};
    const avoid=C.avoid||[];
    const camp=C.camp||{x:0,z:0};

    /* 镜湖 */
    const lakes=(typeof TERRAIN!=="undefined"&&TERRAIN.cfg&&TERRAIN.cfg.lakes)||C.lakes||[];
    for(let i=0;i<lakes.length;i++)scene.add(buildMirrorLake(lakes[i]));

    /* 草地 */
    scene.add(buildGrassField({
      cx:camp.x,cz:camp.z,
      radius:(BAL.props&&BAL.props.grassRadius)||80,
    }));

    /* 花簇 */
    const flowers=buildFlowerField({
      cx:camp.x,cz:camp.z,
      count:2500,
      radius:70,
    });
    for(let i=0;i<flowers.length;i++)scene.add(flowers[i]);

    /* 树木 */
    placeTrees(scene,{worldR:C.worldR||320,avoid:avoid});

    /* 岩石 */
    placeRockGroups(scene,{worldR:C.worldR||320,avoid:avoid});

    /* 云 */
    scene.add(buildCloudField({}));

    return state;
  }

  function updateProps(t,dt){
    if(state.disposed)return;
    if(state.grassUni)state.grassUni.uTime.value=t;
    for(let i=0;i<state.lakeUnis.length;i++)state.lakeUnis[i].uTime.value=t;
    const d=dt||0.016;
    for(let i=0;i<state.clouds.length;i++){
      const m=state.clouds[i],u=m.userData.cloud;
      if(!u)continue;
      m.position.x+=u.spd*d;
      if(m.position.x>320)m.position.x=-320;
      if(m.position.x<-320)m.position.x=320;
      const b=1+Math.sin(t*0.6+u.phase)*u.breath;
      m.scale.set(b,b,1);
      m.position.y=u.baseY+Math.sin(t*0.4+u.phase)*.6;
    }
    for(let i=0;i<state.embers.length;i++){
      const e=state.embers[i];
      if(!e||!e.positions)continue;
      const arr=e.positions;
      for(let k=0;k<e.n;k++){
        arr[k*3+1]+=e.spd[k]*d;
        arr[k*3]+=Math.sin(t*3+e.ph[k])*d*.15;
        if(arr[k*3+1]>e.maxY){
          arr[k*3+1]=e.minY;
          arr[k*3]=e.ox[k]+(Math.random()-.5)*.4;
          arr[k*3+2]=e.oz[k]+(Math.random()-.5)*.4;
        }
      }
      e.attr.needsUpdate=true;
    }
  }

  function disposeProps(){
    state.disposed=true;
    for(let i=0;i<state.roots.length;i++){
      const e=state.roots[i];
      disposeObject3D(e.obj,e.deep);
    }
    state.roots.length=0;
    state.grassUni=null;
    state.lakeUnis.length=0;
    state.clouds.length=0;
    state.embers.length=0;
  }

  function attachCampfireEmbers(group,ox,oz){
    const n=(P().embers!=null?P().embers:18)|0;
    const pos=new Float32Array(n*3);
    const spd=new Float32Array(n),ph=new Float32Array(n);
    const bx=[],bz=[];
    for(let i=0;i<n;i++){
      bx[i]=(Math.random()-.5)*.5; bz[i]=(Math.random()-.5)*.5;
      pos[i*3]=bx[i]; pos[i*3+1]=.4+Math.random()*1.2; pos[i*3+2]=bz[i];
      spd[i]=1.2+Math.random()*2.2; ph[i]=Math.random()*6.28;
    }
    const geo=new THREE.BufferGeometry();
    const attr=new THREE.BufferAttribute(pos,3);
    geo.setAttribute("position",attr);
    const pts=new THREE.Points(geo,new THREE.PointsMaterial({
      color:0xffa040,size:.18,transparent:true,opacity:.85,depthWrite:false,
    }));
    group.add(pts);
    state.embers.push({
      positions:pos,attr,n,spd,ph,ox:bx,oz:bz,minY:.3,maxY:2.8,
    });
    return pts;
  }

  return{
    buildPine,buildOak,getTreeVariants,buildRockGroup,
    buildGrassField,buildMirrorLake,buildCloudField,
    spawnMulgoreProps,updateProps,disposeProps,attachCampfireEmbers,
    get state(){return state;},
  };
})();

const buildPine=(s)=>PROPS.buildPine(s);
const buildOak=(s)=>PROPS.buildOak(s);
const getTreeVariants=()=>PROPS.getTreeVariants();
const buildRockGroup=(s)=>PROPS.buildRockGroup(s);
const buildGrassField=(c)=>PROPS.buildGrassField(c);
const buildMirrorLake=(l)=>PROPS.buildMirrorLake(l);
const buildCloudField=(c)=>PROPS.buildCloudField(c);
const spawnMulgoreProps=(sc,ctx)=>PROPS.spawnMulgoreProps(sc,ctx);
const updateProps=(t,dt)=>PROPS.updateProps(t,dt);
const disposeProps=()=>PROPS.disposeProps();