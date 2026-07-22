/* ============================================================
   炽心 · props.js V3
   植被 / 水体 / 云 / 场景道具工厂 — 魔兽级密度
   ------------------------------------------------------------
   [依赖] THREE · core.js（BAL SeededRng WORLD_SEED hashZoneId）
          palette.js（PALETTE · MAT）· textures.js（Tex）
          terrain.js（heightAt · TERRAIN.slopeAt / roadWeight / lakeBlend / flowerSeed）
          assets.js（可选 ASSETS · GLB 树 InstancedMesh A 线）
   [导出] buildPine buildOak getTreeVariants buildRockGroup
          buildGrassField buildMirrorLake buildCloudField
          spawnMulgoreProps placeZoneTrees updateProps disposeProps
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

  /* —— A 线：GLB InstancedMesh 分桶树木 —— */
  const BUCKET_DEPTH=200;
  const _tmpColor=new THREE.Color();
  const _tmpWhite=new THREE.Color(0xffffff);
  const _dummy=new THREE.Object3D();

  function hashAt(a,b,k){
    const s=Math.sin(a*127.1+b*311.7+k*74.7)*43758.5453123;
    return s-Math.floor(s);
  }
  function softTint(x,z,hex,soften){
    _tmpColor.setHex(hex).lerp(_tmpWhite,soften);
    _tmpColor.offsetHSL(
      (hashAt(x,z,1)-.5)*.04,
      (hashAt(x,z,2)-.5)*.1,
      (hashAt(x,z,3)-.5)*.08
    );
    return _tmpColor;
  }
  function bucketKey(x,z){
    const col=x>=0?1:0;
    const band=Math.floor(z/BUCKET_DEPTH);
    return col+"_"+band;
  }

  /**
   * r128 InstancedMesh 视锥剔除只用「原点处几何包围球」，
   * 不含 instanceMatrix → 镜头转到某些角度整批树消失。
   * 分桶后 draw call 已有限，直接关闭 frustumCulled。
   */
  function fitInstanceBounds(mesh){
    if(mesh)mesh.frustumCulled=false;
  }

  function collectTreeSpots(ctx){
    const n=(BAL.props&&BAL.props.treeCount)||160;
    const camps=ctx.avoid||[];
    const worldR=ctx.worldR||320;
    const spots=[];
    let guard=0;
    while(spots.length<n&&guard++<n*14){
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
      const pineChance=P().pineChance!=null?P().pineChance:.48;
      const deadChance=P().deadChance!=null?P().deadChance:.05;
      const twistedChance=P().twistedChance!=null?P().twistedChance:.04;
      let kind="oak";
      const roll=prand();
      if(roll<deadChance)kind="dead";
      else if(roll<deadChance+twistedChance)kind="twisted";
      else if(roll<deadChance+twistedChance+pineChance*(1-deadChance-twistedChance))kind="pine";
      const gy=typeof heightAt==="function"?heightAt(x,z):0;
      spots.push({
        x,z,y:gy,
        kind,
        yaw:prand()*Math.PI*2,
        scale:psrand(.8,1.45),
        tilt:(prand()-.5)*.14,
      });
    }
    return spots;
  }

  function placeTreesGlb(scene,ctx){
    if(typeof ASSETS==="undefined"||!ASSETS.isReady())return false;
    const pineSets=ASSETS.getTreeParts("pine");
    const oakSets=ASSETS.getTreeParts("oak");
    const deadSets=ASSETS.getTreeParts("dead");
    const twistedSets=ASSETS.getTreeParts("twisted");
    const bushSets=ASSETS.getTreeParts("bush");
    const fernSets=ASSETS.getTreeParts("fern");
    const mushSets=ASSETS.getTreeParts("mushroom");
    if(!pineSets.length&&!oakSets.length&&!deadSets.length&&!twistedSets.length)return false;

    const spots=ctx.spots||collectTreeSpots(ctx);
    const baseScale=ctx.baseScale!=null?ctx.baseScale:(P().treeBaseScale!=null?P().treeBaseScale:5.2);
    const leafTint=ctx.leafTint!=null?ctx.leafTint:(P().treeLeafTint!=null?P().treeLeafTint:0xa7b886);
    const barkTint=ctx.barkTint!=null?ctx.barkTint:(P().treeBarkTint!=null?P().treeBarkTint:0xffffff);
    const leafSoft=P().treeLeafSoft!=null?P().treeLeafSoft:.62;
    const barkSoft=P().treeBarkSoft!=null?P().treeBarkSoft:.88;
    /* 显式 bush:true 或莫高雷默认路径才撒灌木/蕨 */
    const doBush=ctx.bush===true||(ctx.bush!==false&&!ctx.spots);
    const doFern=ctx.fern===true||(ctx.fern!==false&&!ctx.spots&&doBush);

    /* 按桶 × 物种 × 变体收集实例 */
    const buckets=new Map();
    function ensureBucket(key){
      let b=buckets.get(key);
      if(!b){b={pine:[],oak:[],dead:[],twisted:[],bush:[]};buckets.set(key,b);}
      return b;
    }
    for(let i=0;i<spots.length;i++){
      const s=spots[i];
      const b=ensureBucket(bucketKey(s.x,s.z));
      const k=s.kind||"oak";
      (b[k]||b.oak).push(s);
    }

    function emitSpecies(species,sets,list,tintLeaf,tintBark){
      if(!sets.length||!list.length)return;
      /* 每桶最多用 2 个变体 */
      const nVar=Math.min(sets.length,2);
      const groups=[];
      for(let v=0;v<nVar;v++)groups.push([]);
      for(let i=0;i<list.length;i++){
        groups[i%nVar].push(list[i]);
      }
      for(let v=0;v<nVar;v++){
        const items=groups[v];
        if(!items.length)continue;
        const parts=sets[v%sets.length];
        for(let p=0;p<parts.length;p++){
          const part=parts[p];
          const mesh=new THREE.InstancedMesh(part.geometry,part.material,items.length);
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.count=items.length;
          mesh.castShadow=!!part.isLeaf||species==="dead"||species==="twisted";
          mesh.receiveShadow=false;
          mesh.name="tree_"+species+"_"+v+"_"+p;
          mesh.userData.noCamCollide=true;
          const colors=new Float32Array(items.length*3);
          for(let i=0;i<items.length;i++){
            const s=items[i];
            const sc=s.scale*baseScale*(species==="dead"?.85:1);
            _dummy.position.set(s.x,s.y,s.z);
            _dummy.rotation.set(s.tilt,s.yaw,s.tilt*.4);
            _dummy.scale.setScalar(sc);
            _dummy.updateMatrix();
            mesh.setMatrixAt(i,_dummy.matrix);
            const col=softTint(s.x,s.z,part.isLeaf?tintLeaf:tintBark,part.isLeaf?leafSoft:barkSoft);
            colors[i*3]=col.r; colors[i*3+1]=col.g; colors[i*3+2]=col.b;
          }
          mesh.instanceMatrix.needsUpdate=true;
          if(typeof mesh.setColorAt==="function"){
            for(let i=0;i<items.length;i++){
              _tmpColor.setRGB(colors[i*3],colors[i*3+1],colors[i*3+2]);
              mesh.setColorAt(i,_tmpColor);
            }
            if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
          }
          if(part.material&&!part.material.userData._instColorOn){
            part.material.vertexColors=false;
            part.material.userData._instColorOn=true;
          }
          fitInstanceBounds(mesh);
          scene.add(mesh);
          track(mesh,false);
        }
      }
    }

    buckets.forEach(b=>{
      emitSpecies("pine",pineSets,b.pine,leafTint,barkTint);
      emitSpecies("oak",oakSets,b.oak,leafTint,barkTint);
      emitSpecies("dead",deadSets,b.dead,0x9a8a70,0xc8b8a0);
      emitSpecies("twisted",twistedSets,b.twisted,0x7e8b58,0xb8a894);
    });

    /* 地面装饰：灌木 / 蕨 / 蘑菇 */
    function scatterDress(sets,count,scaleMul,name,tint){
      if(!sets.length||count<=0)return;
      const camps=ctx.avoid||[];
      const cx=ctx.bushCx!=null?ctx.bushCx:0;
      const cz=ctx.bushCz!=null?ctx.bushCz:0;
      const rad=ctx.bushRadius!=null?ctx.bushRadius:(ctx.worldR||320);
      const minR=ctx.bushMinR!=null?ctx.bushMinR:14;
      const hFn=ctx.heightFn;
      const list=[];
      let g2=0;
      while(list.length<count&&g2++<count*12){
        const a=prand()*Math.PI*2;
        const r=minR+Math.sqrt(prand())*(rad-minR);
        const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
        let near=false;
        for(let i=0;i<camps.length;i++){
          if(Math.hypot(x-camps[i].x,z-camps[i].z)<(camps[i].r||36)){near=true;break;}
        }
        if(near)continue;
        if(!hFn&&typeof TERRAIN!=="undefined"&&TERRAIN.cfg&&TERRAIN.cfg.ready){
          if(TERRAIN.roadWeight(x,z)>.22)continue;
          if(TERRAIN.lakeBlend(x,z).w>.3)continue;
        }
        const gy=typeof hFn==="function"?hFn(x,z)
          :(typeof heightAt==="function"?heightAt(x,z):0);
        list.push({x,z,y:gy,yaw:prand()*Math.PI*2,scale:psrand(.65,1.4)});
      }
      if(!list.length)return;
      const byBucket=new Map();
      for(let i=0;i<list.length;i++){
        const k=bucketKey(list[i].x,list[i].z);
        if(!byBucket.has(k))byBucket.set(k,[]);
        byBucket.get(k).push(list[i]);
      }
      byBucket.forEach(items=>{
        const parts=sets[(hashAt(items[0].x,items[0].z,11)*sets.length)|0];
        for(let p=0;p<parts.length;p++){
          const part=parts[p];
          const mesh=new THREE.InstancedMesh(part.geometry,part.material,items.length);
          mesh.count=items.length;
          mesh.castShadow=!!part.isLeaf;
          mesh.receiveShadow=false;
          mesh.name=name+"_"+p;
          mesh.userData.noCamCollide=true;
          for(let i=0;i<items.length;i++){
            const s=items[i];
            _dummy.position.set(s.x,s.y,s.z);
            _dummy.rotation.set(0,s.yaw,0);
            _dummy.scale.setScalar(s.scale*baseScale*scaleMul);
            _dummy.updateMatrix();
            mesh.setMatrixAt(i,_dummy.matrix);
            if(typeof mesh.setColorAt==="function"){
              mesh.setColorAt(i,softTint(s.x,s.z,tint!=null?tint:leafTint,.5));
            }
          }
          mesh.instanceMatrix.needsUpdate=true;
          if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
          fitInstanceBounds(mesh);
          scene.add(mesh);
          track(mesh,false);
        }
      });
    }
    if(doBush){
      const bushN=ctx.bushCount!=null?ctx.bushCount:((P().bushCount!=null?P().bushCount:260)|0);
      scatterDress(bushSets,bushN,.32,"bush",leafTint);
    }
    if(doFern){
      const fernN=ctx.fernCount!=null?ctx.fernCount:((P().fernCount!=null?P().fernCount:140)|0);
      scatterDress(fernSets,fernN,.22,"fern",leafTint);
      const mushN=ctx.mushCount!=null?ctx.mushCount:Math.floor(fernN*.35);
      scatterDress(mushSets,mushN,.18,"mush",0xc8b898);
    }
    return true;
  }

  function placeTreesProcedural(scene,ctx){
    const vars=getTreeVariants();
    const spots=collectTreeSpots(ctx);
    for(let i=0;i<spots.length;i++){
      const s=spots[i];
      const pool=s.kind==="pine"?vars.pine:vars.oak;
      const src=pool[(prand()*pool.length)|0];
      const tree=src.clone(true);
      tree.position.set(s.x,s.y,s.z);
      tree.rotation.y=s.yaw;
      tree.rotation.x=s.tilt;
      tree.scale.setScalar(s.scale);
      scene.add(tree);
      track(tree,false);
    }
  }

  function placeTrees(scene,ctx){
    const C=ctx||{};
    /* 仅 GLB，不回退程序化 */
    if(typeof ASSETS==="undefined"){
      console.warn("[placeTrees] ASSETS 不可用");
      return;
    }
    if(ASSETS.isReady()){
      placeTreesGlb(scene,C);
      return;
    }
    ASSETS.whenReady(()=>{placeTreesGlb(scene,C);});
  }

  /**
   * 任意分区种树（平坦 zone 用 heightFn=()=>0）
   * cfg: count/radius/weights/bush/bushCount/fern/fernCount …
   */
  function placeZoneTrees(scene,cfg){
    const c=Object.assign({
      count:80, radius:90, cx:0, cz:0, minR:14,
      avoid:[{x:0,z:0,r:14}],
      baseScale:5.0,
      weights:{pine:.35,oak:.35,dead:.2,twisted:.1},
      heightFn:null,
      bush:true, bushCount:100,
      fern:false, fernCount:0, mushCount:0,
      clusters:3,
    },cfg||{});
    const run=()=>{
      if(typeof ASSETS==="undefined"||!ASSETS.isReady())return false;
      const rng=SeededRng(((c.seed!=null?c.seed:(WORLD_SEED^hashZoneId("zone_trees_"+c.cx+"_"+c.cz)))>>>0)||1);
      const rr=()=>rng();
      const rs=(a,b)=>a+rr()*(b-a);
      const spots=[];
      const w=c.weights||{};
      const wPine=w.pine||0,wOak=w.oak||0,wDead=w.dead||0,wTw=w.twisted||0;
      const wSum=wPine+wOak+wDead+wTw||1;
      function pickKind(){
        const roll=rr()*wSum;
        if(roll<wDead)return "dead";
        if(roll<wDead+wTw)return "twisted";
        if(roll<wDead+wTw+wPine)return "pine";
        return "oak";
      }
      function trySpot(x,z,scaleBias){
        const camps=c.avoid||[];
        for(let i=0;i<camps.length;i++){
          if(Math.hypot(x-camps[i].x,z-camps[i].z)<(camps[i].r||20))return;
        }
        const gy=typeof c.heightFn==="function"?c.heightFn(x,z)
          :(typeof heightAt==="function"?heightAt(x,z):0);
        spots.push({
          x,z,y:gy,kind:pickKind(),
          yaw:rr()*Math.PI*2,
          scale:rs(.75,1.4)*(scaleBias||1),
          tilt:(rr()-.5)*.16,
        });
      }
      /* 均匀铺一层 */
      let guard=0;
      while(spots.length<c.count&&guard++<c.count*18){
        const a=rr()*Math.PI*2;
        const r=c.minR+Math.sqrt(rr())*(c.radius-c.minR);
        trySpot(c.cx+Math.cos(a)*r,c.cz+Math.sin(a)*r,1);
      }
      /* 再加几处密林簇（地图特色密度） */
      const nCl=c.clusters|0;
      for(let k=0;k<nCl;k++){
        const a=rr()*Math.PI*2;
        const r=c.minR+rr()*(c.radius-c.minR)*.85;
        const ox=c.cx+Math.cos(a)*r, oz=c.cz+Math.sin(a)*r;
        const nIn=8+((rr()*14)|0);
        for(let j=0;j<nIn;j++){
          const ja=rr()*Math.PI*2, jr=rr()*12;
          trySpot(ox+Math.cos(ja)*jr,oz+Math.sin(ja)*jr,.9+rr()*.4);
        }
      }
      return placeTreesGlb(scene,{
        spots, baseScale:c.baseScale,
        bush:!!c.bush, bushCount:c.bushCount|0,
        fern:!!c.fern, fernCount:c.fernCount|0, mushCount:c.mushCount|0,
        bushCx:c.cx, bushCz:c.cz, bushRadius:c.radius, bushMinR:c.minR,
        avoid:c.avoid, heightFn:c.heightFn,
        leafTint:c.leafTint, barkTint:c.barkTint,
      });
    };
    if(typeof ASSETS!=="undefined"&&!ASSETS.isReady()){
      ASSETS.whenReady(()=>{run();});
      return true;
    }
    return run();
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

    /* 树木 · 灌木 · 蕨（莫高雷丰茂草原 · 全图散布） */
    placeTrees(scene,{
      worldR:C.worldR||320, avoid:avoid,
      bush:true, fern:true,
      bushCx:0, bushCz:0,
      bushRadius:C.worldR||320,
      bushMinR:16,
    });

    /* 岩石 */
    placeRockGroups(scene,{worldR:C.worldR||320,avoid:avoid});

    /* 云 */
    scene.add(buildCloudField({}));

    return state;
  }

  function updateProps(t,dt){
    if(state.disposed)return;
    if(typeof ASSETS!=="undefined"&&ASSETS.sharedTime)ASSETS.sharedTime.value=t;
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
    spawnMulgoreProps,placeZoneTrees,updateProps,disposeProps,attachCampfireEmbers,
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
const placeZoneTrees=(sc,ctx)=>PROPS.placeZoneTrees(sc,ctx);
const updateProps=(t,dt)=>PROPS.updateProps(t,dt);
const disposeProps=()=>PROPS.disposeProps();