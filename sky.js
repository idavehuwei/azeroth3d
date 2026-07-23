/* ============================================================
   炽心 · sky.js
   天空穹顶 · Poly Haven HDRI · 光照分层 · 阴影跟随 · 昼夜循环
   ------------------------------------------------------------
   ★ 铁律（render-only）：本文件只改视觉——灯光颜色/强度、雾色、天空 shader、
     阴影相机、萤火虫透明度、岩浆光脉动。任何 AI / 伤害 / 刷新 / 掉落 / 仇恨
     逻辑都不得读取本模块的时间或昼夜因子。
   ------------------------------------------------------------
   [依赖] THREE · THREE.RGBELoader（vendor/RGBELoader.js）· core.js（BAL）
   [导出] createSkyDome configureSunShadow attachFillLight
          initZoneSky updateSky disposeSky refreshSunShadows SKY
   ============================================================ */
"use strict";

const SKY=(function(){
  const _domes=new Map(); /* scene.uuid → {mesh, uni} */
  const _fills=new Map();
  const _hdrCache=new Map();
  const _hdrLoading=new Map();
  const _tmpC=new THREE.Color();
  const _tmpC2=new THREE.Color();
  const _sunDir=new THREE.Vector3();

  /* 分区 → Poly Haven 生物群系 HDRI（对标 WoC sky.ts） */
  const ZONE_BIOME={
    mulgore:"vale", barrens:"peaks", durotar:"peaks",
    ashen_canyon:"marsh", blackrock:"marsh", orgrimmar:"vale",
  };
  const BIOME_HDRI={
    vale:"env/vale_day_1k.hdr",
    marsh:"env/marsh_overcast_1k.hdr",
    peaks:"env/peaks_dawn_1k.hdr",
  };
  const NIGHT_HDRI="env/night_1k.hdr";
  /* 测过的最亮 texel u（太阳方位）；与游戏太阳方位对齐 */
  const HDRI_SUN_U={vale:.595,marsh:.657,peaks:.631};
  const HDRI_TUNE={
    vale:{gain:.55,clamp:2.6},
    marsh:{gain:.55,clamp:2.2},
    peaks:{gain:.45,clamp:1.7},
  };

  function balSky(){return BAL.sky||{};}

  function loadHdr(url,cb){
    if(_hdrCache.has(url)){cb(_hdrCache.get(url));return;}
    if(_hdrLoading.has(url)){_hdrLoading.get(url).push(cb);return;}
    _hdrLoading.set(url,[cb]);
    if(typeof THREE.RGBELoader!=="function"){
      console.warn("[SKY] RGBELoader 不可用，保留程序化穹顶");
      _hdrLoading.delete(url);
      return;
    }
    const loader=new THREE.RGBELoader();
    loader.setDataType(THREE.FloatType);
    loader.load(url,function(tex){
      tex.mapping=THREE.EquirectangularReflectionMapping;
      tex.wrapS=THREE.RepeatWrapping;
      tex.wrapT=THREE.ClampToEdgeWrapping;
      tex.minFilter=THREE.LinearFilter;
      tex.magFilter=THREE.LinearFilter;
      tex.generateMipmaps=false;
      tex.needsUpdate=true;
      _hdrCache.set(url,tex);
      const cbs=_hdrLoading.get(url)||[];
      _hdrLoading.delete(url);
      for(let i=0;i<cbs.length;i++)try{cbs[i](tex);}catch(e){console.warn(e);}
    },undefined,function(err){
      console.warn("[SKY] HDR 加载失败",url,err);
      _hdrLoading.delete(url);
    });
  }

  function sunOffsetU(biome,sunDir){
    const sunU=Math.atan2(sunDir.z,sunDir.x)/(Math.PI*2)+.5;
    const hu=HDRI_SUN_U[biome]!=null?HDRI_SUN_U[biome]:.5;
    return hu-sunU;
  }

  function ensureZoneHdr(entry,zoneId){
    if(!entry||!entry.uni)return;
    const biome=ZONE_BIOME[zoneId]||"vale";
    if(entry._biome===biome&&entry.uni.uUseHdr.value>.5)return;
    entry._biome=biome;
    const dayUrl=BIOME_HDRI[biome]||BIOME_HDRI.vale;
    const tune=HDRI_TUNE[biome]||HDRI_TUNE.vale;
    entry.uni.uHdrGain.value=tune.gain;
    entry.uni.uHdrClamp.value=tune.clamp;
    loadHdr(dayUrl,function(tex){
      entry.uni.uEnvDay.value=tex;
      entry.uni.uUseHdr.value=1;
      /* IBL：金属/水面反射 */
      if(typeof renderer!=="undefined"&&renderer&&entry.scene&&!entry._iblDone){
        try{
          const pmrem=new THREE.PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          const rt=pmrem.fromEquirectangular(tex);
          entry.scene.environment=rt.texture;
          entry._iblDone=true;
          pmrem.dispose();
        }catch(e){/* 部分设备跳过 */}
      }
    });
    loadHdr(NIGHT_HDRI,function(tex){
      entry.uni.uEnvNight.value=tex;
    });
  }

  function createSkyDome(scene,opts){
    if(!scene)return null;
    if(_domes.has(scene.uuid))return _domes.get(scene.uuid);
    const S=Object.assign({},balSky(),opts||{});
    const uni={
      uTime:{value:0},
      uSunDir:{value:new THREE.Vector3(.3,.8,.2).normalize()},
      uZenith:{value:new THREE.Color(S.zenith!=null?S.zenith:0x3a6aaa)},
      uHorizon:{value:new THREE.Color(S.horizon!=null?S.horizon:0xa8d0e8)},
      uGround:{value:new THREE.Color(S.ground!=null?S.ground:0x6a8a50)},
      uNight:{value:0},
      uCloud:{value:S.cloudStrength!=null?S.cloudStrength:.22},
      uGlow:{value:S.sunGlow!=null?S.sunGlow:.55},
      uUseHdr:{value:0},
      uHdrGain:{value:.55},
      uHdrClamp:{value:2.6},
      uOff:{value:0},
      uEnvDay:{value:null},
      uEnvNight:{value:null},
    };
    const mat=new THREE.ShaderMaterial({
      uniforms:uni,
      side:THREE.BackSide,
      depthWrite:false,
      fog:false,
      vertexShader:[
        "varying vec3 vDir;",
        "void main(){",
        "  vDir=normalize(position);",
        "  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);",
        "}",
      ].join("\n"),
      fragmentShader:[
        "uniform float uTime;",
        "uniform vec3 uSunDir;",
        "uniform vec3 uZenith;",
        "uniform vec3 uHorizon;",
        "uniform vec3 uGround;",
        "uniform float uNight;",
        "uniform float uCloud;",
        "uniform float uGlow;",
        "uniform float uUseHdr;",
        "uniform float uHdrGain;",
        "uniform float uHdrClamp;",
        "uniform float uOff;",
        "uniform sampler2D uEnvDay;",
        "uniform sampler2D uEnvNight;",
        "varying vec3 vDir;",
        "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "float noise(vec2 p){",
        "  vec2 i=floor(p),f=fract(p);",
        "  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));",
        "  vec2 u=f*f*(3.-2.*f);",
        "  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;",
        "}",
        "float fbm(vec2 p){",
        "  float v=0.,a=.5;",
        "  for(int i=0;i<4;i++){v+=a*noise(p);p*=2.05;a*=.5;}",
        "  return v;",
        "}",
        "vec3 sampleHdr(sampler2D map, vec3 dir, float uOff){",
        "  vec2 uv=vec2(",
        "    atan(dir.z,dir.x)*0.15915494+0.5+uOff,",
        "    asin(clamp(dir.y,-1.0,1.0))*0.31830989+0.5);",
        "  return min(texture2D(map,uv).rgb*uHdrGain, vec3(uHdrClamp));",
        "}",
        "void main(){",
        "  vec3 d=normalize(vDir);",
        "  float h=d.y;",
        "  float t1=smoothstep(-.15,.15,h);",
        "  float t2=smoothstep(.05,.75,h);",
        "  vec3 col=mix(uGround,uHorizon,t1);",
        "  col=mix(col,uZenith,t2);",
        "  float sunDot=max(dot(d,normalize(uSunDir)),0.0);",
        "  float glow=pow(sunDot,48.0)*uGlow*(1.0-uNight*.85);",
        "  float halo=pow(sunDot,8.0)*uGlow*.35*(1.0-uNight*.7);",
        "  col+=vec3(1.0,.92,.75)*glow+vec3(1.0,.7,.4)*halo;",
        "  vec2 cu=d.xz/(max(d.y,.08)+.15);",
        "  float clouds=fbm(cu*2.2+vec2(uTime*.012,-uTime*.008));",
        "  clouds=smoothstep(.42,.78,clouds)*uCloud*(1.0-uNight*.75)*smoothstep(-.05,.35,h);",
        "  col=mix(col,vec3(.95,.97,1.0),clouds);",
        "  float stars=step(.992,hash(floor(d.xy*220.0)))*uNight*smoothstep(.1,.55,h);",
        "  col+=vec3(.85,.9,1.0)*stars;",
        "  if(uUseHdr>0.5){",
        "    vec3 dayC=sampleHdr(uEnvDay,d,uOff);",
        "    vec3 nightC=sampleHdr(uEnvNight,d,uOff);",
        "    vec3 hdr=mix(dayC,nightC,uNight);",
        "    col=mix(col,hdr,.9);",
        "    col+=vec3(1.0,.9,.65)*glow*.4;",
        "  }",
        "  gl_FragColor=vec4(col,1.0);",
        "}",
      ].join("\n"),
    });
    /* 占位 1×1，避免未绑定 sampler 报错 */
    const stub=new THREE.DataTexture(new Float32Array([.45,.55,.75,1]),1,1,THREE.RGBAFormat,THREE.FloatType);
    stub.needsUpdate=true;
    uni.uEnvDay.value=stub;
    uni.uEnvNight.value=stub;
    const geo=new THREE.SphereGeometry(S.radius||500,S.segsW||32,S.segsH||16);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.name="skyDome";
    mesh.frustumCulled=false;
    mesh.renderOrder=-100;
    scene.add(mesh);
    scene.background=null;
    const entry={mesh,uni,scene,_biome:null};
    _domes.set(scene.uuid,entry);
    if(S.zoneId)ensureZoneHdr(entry,S.zoneId);
    return entry;
  }

  function shadowMapSizeForDevice(S){
    const mobile=typeof isMobileClient==="function"?isMobileClient()
      :(typeof matchMedia==="function"&&matchMedia("(pointer:coarse)").matches);
    const desk=S.shadowMap||2048;
    const mob=S.shadowMapMobile!=null?S.shadowMapMobile:1024;
    return mobile?Math.min(desk,mob):desk;
  }

  function configureSunShadow(sun,opts){
    if(!sun||!sun.shadow)return sun;
    const S=Object.assign({},balSky(),opts||{});
    const half=S.shadowHalf!=null?S.shadowHalf:35;
    const map=opts&&opts.shadowMap!=null?opts.shadowMap:shadowMapSizeForDevice(S);
    sun.castShadow=true;
    if(sun.shadow.mapSize.x!==map||sun.shadow.mapSize.y!==map){
      sun.shadow.mapSize.set(map,map);
      if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
    }
    sun.shadow.camera.left=-half;
    sun.shadow.camera.right=half;
    sun.shadow.camera.top=half;
    sun.shadow.camera.bottom=-half;
    sun.shadow.camera.near=S.shadowNear!=null?S.shadowNear:.5;
    sun.shadow.camera.far=S.shadowFar!=null?S.shadowFar:220;
    sun.shadow.bias=S.shadowBias!=null?S.shadowBias:-0.0002;
    sun.shadow.normalBias=S.shadowNormalBias!=null?S.shadowNormalBias:.04;
    if(sun.target&&sun.parent&&!sun.target.parent)sun.parent.add(sun.target);
    return sun;
  }

  /** R8：画面预设 / 移动端切换后刷新各区太阳阴影贴图尺寸 */
  function refreshSunShadows(){
    const apply=sun=>{
      const L=typeof sun==="function"?sun():sun;
      if(L)configureSunShadow(L);
    };
    if(typeof ZONES!=="undefined"&&ZONES){
      Object.keys(ZONES).forEach(id=>{
        const z=ZONES[id];
        if(z&&z.lights&&z.lights.sun)apply(z.lights.sun);
      });
    }
    if(typeof sun!=="undefined")apply(sun);
  }

  function attachFillLight(scene,opts){
    if(!scene)return null;
    if(_fills.has(scene.uuid))return _fills.get(scene.uuid);
    const S=Object.assign({},balSky(),opts||{});
    const fill=new THREE.DirectionalLight(
      S.fillColor!=null?S.fillColor:0xffe8d0,
      S.fillIntensity!=null?S.fillIntensity:.18
    );
    const fp=S.fillPos||[-25,18,-30];
    fill.position.set(fp[0],fp[1],fp[2]);
    fill.name="skyFill";
    scene.add(fill);
    _fills.set(scene.uuid,fill);
    return fill;
  }

  /** 为开放区挂穹顶 + 紧阴影 + 补光 */
  function initZoneSky(scene,lights,opts){
    const O=opts||{};
    const dome=createSkyDome(scene,O);
    if(O.zoneId&&dome)ensureZoneHdr(dome,O.zoneId);
    if(lights&&lights.sun)configureSunShadow(lights.sun,O);
    const fill=attachFillLight(scene,O);
    if(lights)lights.fill=fill;
    if(typeof camera!=="undefined"&&camera&&balSky().cameraFar){
      camera.far=balSky().cameraFar;
      camera.updateProjectionMatrix();
    }
    return{dome,fill};
  }

  function cycleWeights(t){
    const dn=BAL.dayNight||{};
    const dur=dn.duration||600;
    const cycle=((t%dur)+dur)%dur/dur;
    const a=cycle*Math.PI*2;
    const dayFactor=(Math.cos(a)+1)*.5;
    const nightFactor=1-dayFactor;
    /* 日出/日落窗：sin 与日夜过渡重叠 */
    const dawn=Math.min(1,Math.max(0,Math.sin(a))*nightFactor*dayFactor*4);
    const dusk=Math.min(1,Math.max(0,-Math.sin(a))*nightFactor*dayFactor*4);
    return{cycle,a,dayFactor,nightFactor,dawn,dusk};
  }

  function samplePalette(w,pal){
    const dn=BAL.dayNight;
    const D=dn.day,N=dn.night,Dawn=dn.dawn||D,Dusk=dn.dusk||D;
    const daySky=pal&&pal.sky!=null?pal.sky:D.sky;
    const dayFog=pal&&pal.fog!=null?pal.fog:D.fog;
    const dayDens=pal&&pal.fogDensity!=null?pal.fogDensity:D.fogDensity;
    const dayHemiS=pal&&pal.hemiSky!=null?pal.hemiSky:D.hemiSky;
    const dayHemiG=pal&&pal.hemiGround!=null?pal.hemiGround:D.hemiGround;
    const dayHemiI=pal&&pal.hemiIntensity!=null?pal.hemiIntensity:D.hemiIntensity;
    const daySunC=pal&&pal.sunColor!=null?pal.sunColor:D.sunColor;
    const daySunI=pal&&pal.sunIntensity!=null?pal.sunIntensity:D.sunIntensity;

    const sky=_tmpC.set(daySky);
    sky.lerp(new THREE.Color(N.sky),w.nightFactor);
    if(w.dawn>.01)sky.lerp(new THREE.Color(Dawn.sky),w.dawn*.65);
    if(w.dusk>.01)sky.lerp(new THREE.Color(Dusk.sky),w.dusk*.65);

    const fog=_tmpC2.set(dayFog);
    fog.lerp(new THREE.Color(N.fog),w.nightFactor);
    if(w.dawn>.01)fog.lerp(new THREE.Color(Dawn.fog),w.dawn*.55);
    if(w.dusk>.01)fog.lerp(new THREE.Color(Dusk.fog),w.dusk*.55);

    const dens=dayDens+w.nightFactor*(N.fogDensity-dayDens);

    const sunCol=new THREE.Color(daySunC);
    sunCol.lerp(new THREE.Color(N.sunColor),w.nightFactor);
    if(w.dawn>.01)sunCol.lerp(new THREE.Color(Dawn.sunColor),w.dawn*.7);
    if(w.dusk>.01)sunCol.lerp(new THREE.Color(Dusk.sunColor),w.dusk*.7);

    const sunI=daySunI+w.nightFactor*(N.sunIntensity-daySunI)
      +(Dawn.sunIntensity!=null&&w.dawn? (Dawn.sunIntensity-daySunI)*w.dawn*.3:0);

    const hemiS=new THREE.Color(dayHemiS);
    hemiS.lerp(new THREE.Color(N.hemiSky),w.nightFactor);
    const hemiG=new THREE.Color(dayHemiG);
    hemiG.lerp(new THREE.Color(N.hemiGround),w.nightFactor);
    const hemiI=dayHemiI+w.nightFactor*(N.hemiIntensity-dayHemiI);

    return{sky:sky.clone(),fog:fog.clone(),dens,sunCol,sunI,hemiS,hemiG,hemiI};
  }

  function updateShadowFollow(sun,px,py,pz,dirx,diry,dirz){
    if(!sun)return;
    const S=balSky();
    const dist=S.sunDist!=null?S.sunDist:90;
    _sunDir.set(dirx,diry,dirz);
    if(_sunDir.lengthSq()<1e-6)_sunDir.set(.35,.85,.25);
    _sunDir.normalize();
    sun.position.set(px,py,pz).addScaledVector(_sunDir,dist);
    if(sun.target){
      sun.target.position.set(px,py,pz);
      sun.target.updateMatrixWorld();
      if(sun.parent&&!sun.target.parent)sun.parent.add(sun.target);
    }
    sun.shadow.camera.updateProjectionMatrix();
  }

  function updateDome(entry,w,palSample,sunDir){
    if(!entry||!entry.uni)return;
    const u=entry.uni;
    u.uTime.value=w.t;
    u.uNight.value=w.nightFactor;
    u.uSunDir.value.copy(sunDir);
    /* 天顶 / 地平线随昼夜 */
    const dn=BAL.dayNight;
    u.uZenith.value.set(palSample.hemiS.r,palSample.hemiS.g,palSample.hemiS.b);
    u.uHorizon.value.copy(palSample.sky);
    u.uGround.value.setHex((balSky().ground!=null?balSky().ground:0x6a8a50));
    u.uGround.value.lerp(new THREE.Color(dn.night.hemiGround),w.nightFactor*.8);
    /* HDRI 方位角：把图中太阳拧到游戏太阳方位 */
    if(u.uOff&&entry._biome){
      u.uOff.value=sunOffsetU(entry._biome,sunDir);
    }
  }

  function updateRaidPulse(t,dt){
    const R=balSky().raid||{};
    const scn=typeof sceneRaid!=="undefined"?sceneRaid:null;
    if(!scn)return;
    const cz=typeof getCurrentZone==="function"?getCurrentZone():null;
    const inRaid=cz&&(cz.mode==="raid"||(cz.id&&String(cz.id).indexOf("molten")>=0)
      ||cz.id==="ragefire_chasm"||cz.id==="wailing_caverns"||cz.id==="onyxias_lair");
    if(!inRaid&&!(typeof S!=="undefined"&&S.mode==="raid"))return;

    const ll=scn.userData&&scn.userData.lavaLight;
    if(ll){
      const base=R.lavaBase!=null?R.lavaBase:1.6;
      const amp=R.lavaPulseAmp!=null?R.lavaPulseAmp:.28;
      const freq=R.lavaPulseFreq!=null?R.lavaPulseFreq:.65;
      ll.intensity=base*(1+Math.sin(t*freq*Math.PI*2)*amp);
    }
    if(scn.fog&&scn.fog.isFogExp2){
      const base=scn.userData.raidFogBase!=null?scn.userData.raidFogBase:(R.fogBase!=null?R.fogBase:0.016);
      const amp=R.fogPulseAmp!=null?R.fogPulseAmp:0.0028;
      const freq=R.fogPulseFreq!=null?R.fogPulseFreq:.55;
      scn.fog.density=base+Math.sin(t*freq*Math.PI*2)*amp;
    }
  }

  function updateEmbersBoost(t,dt){
    const R=balSky().raid||{};
    const cz=typeof getCurrentZone==="function"?getCurrentZone():null;
    const inRaid=(typeof S!=="undefined"&&S.mode==="raid")||(cz&&cz.mode==="raid");
    if(!inRaid||typeof embers==="undefined")return;
    const up=R.emberUpDraft!=null?R.emberUpDraft:1.45;
    const side=R.emberSide!=null?R.emberSide:1.25;
    const pp=embers.geometry.attributes.position.array;
    const n=typeof EMBERS!=="undefined"?EMBERS:pp.length/3;
    for(let i=0;i<n;i++){
      /* 主循环已做上升；这里只叠加额外上升气流扰动（render-only） */
      pp[i*3+1]+=(typeof emberVel!=="undefined"?emberVel[i]:1)*(up-1)*dt*.35;
      pp[i*3]+=Math.sin(t*2.1+i*1.7)*dt*.25*side;
    }
  }

  function updateSky(t,dt){
    const w=cycleWeights(t);
    w.t=t;
    const cz=typeof getCurrentZone==="function"?getCurrentZone():null;

    /* 副本热浪（不依赖 dayNight） */
    updateRaidPulse(t,dt);
    updateEmbersBoost(t,dt);

    if(!cz||!cz.dayNight)return w;

    const dn=BAL.dayNight;
    const L=cz.lights||{};
    const resolveLight=v=>typeof v==="function"?v():v;
    const sunL=resolveLight(L.sun)||(cz.id==="mulgore"&&typeof sun!=="undefined"?sun:null);
    const hemiL=resolveLight(L.heli)||(cz.id==="mulgore"&&typeof heli!=="undefined"?heli:null);
    const fillL=resolveLight(L.fill)||_fills.get(cz.scene&&cz.scene.uuid);
    const scn=cz.scene;
    const pal=cz.id==="barrens"?BAL.barrens
      :(cz.id==="durotar"?BAL.durotar
        :(cz.id==="orgrimmar"?BAL.orgrimmar
          :(cz.id==="blackrock"?BAL.blackrock
            :(cz.id==="ashen_canyon"?BAL.ashenCanyon:null))));
    const sample=samplePalette(w,pal);

    /* 太阳方向（几何）：沿昼夜角 */
    const a=w.a;
    _sunDir.set(Math.cos(a),.35+Math.sin(a)*.75,.25).normalize();
    if(_sunDir.y<.05&&w.nightFactor<.85)_sunDir.y=.05;

    if(sunL&&sunL.color){
      sunL.color.copy(sample.sunCol);
      sunL.intensity=sample.sunI;
      const px=(typeof player!=="undefined"&&player)?player.position.x:0;
      const py=(typeof player!=="undefined"&&player)?player.position.y:0;
      const pz=(typeof player!=="undefined"&&player)?player.position.z:0;
      updateShadowFollow(sunL,px,py,pz,_sunDir.x,_sunDir.y,_sunDir.z);
    }
    if(hemiL&&hemiL.color){
      hemiL.color.copy(sample.hemiS);
      if(hemiL.groundColor)hemiL.groundColor.copy(sample.hemiG);
      hemiL.intensity=sample.hemiI;
    }
    if(fillL&&fillL.color){
      fillL.intensity=(balSky().fillIntensity||.18)*(1-w.nightFactor*.85);
      fillL.color.copy(sample.sunCol);
    }

    if(scn&&scn.fog){
      scn.fog.color.copy(sample.fog);
      scn.fog.density=sample.dens;
      /* 有穹顶则不写 Color 背景 */
      const dome=_domes.get(scn.uuid);
      if(dome){
        ensureZoneHdr(dome,cz.id);
        updateDome(dome,w,sample,_sunDir);
        /* 穹顶跟随玩家，避免远裁 */
        if(typeof player!=="undefined"&&player){
          dome.mesh.position.x=player.position.x;
          dome.mesh.position.z=player.position.z;
        }
      }else if(scn.background&&scn.background.isColor){
        scn.background.copy(sample.sky);
      }
    }

    const flames=L.flames||(cz.id==="mulgore"&&typeof worldFlames!=="undefined"?worldFlames:null);
    if(flames)flames.forEach((f,i)=>{
      if(!f||!f.fl)return;
      f.fl.scale.y=1+Math.sin(t*8+i*2)*.2;
      if(f.li)f.li.intensity=1.2+Math.sin(t*9+i)*.35+w.nightFactor*(dn.campfire?dn.campfire.nightBoost:2.6);
      if(f.layers)f.layers.forEach((ly,j)=>{
        if(!ly.mesh)return;
        ly.mesh.scale.y=1+Math.sin(t*ly.freq+ly.phase+i)*.22;
        ly.mesh.scale.x=1+Math.sin(t*(ly.freq*.7)+j)*.08;
      });
    });

    const flies=L.fireflies||(cz.id==="mulgore"&&typeof fireflies!=="undefined"?fireflies:null);
    if(flies){
      flies.material.opacity=w.nightFactor*.7;
      if(w.nightFactor>.1&&typeof ffPhases!=="undefined"){
        const fp=flies.geometry.attributes.position.array;
        const n=typeof FIREFLIES!=="undefined"?FIREFLIES:fp.length/3;
        for(let i=0;i<n;i++){
          fp[i*3+1]+=Math.sin(t*2+ffPhases[i])*dt*.6;
          fp[i*3]+=Math.sin(t*1.3+ffPhases[i]*3)*dt*.3;
          if(fp[i*3+1]>5)fp[i*3+1]=.5;
          if(fp[i*3+1]<.5)fp[i*3+1]=5;
        }
        flies.geometry.attributes.position.needsUpdate=true;
      }
    }

    return w;
  }

  function disposeSky(scene){
    if(!scene){
      _domes.forEach(e=>disposeDomeEntry(e));
      _domes.clear();
      _fills.forEach(f=>{if(f.parent)f.parent.remove(f);});
      _fills.clear();
      return;
    }
    const e=_domes.get(scene.uuid);
    if(e){disposeDomeEntry(e);_domes.delete(scene.uuid);}
    const f=_fills.get(scene.uuid);
    if(f){if(f.parent)f.parent.remove(f);_fills.delete(scene.uuid);}
  }
  function disposeDomeEntry(e){
    if(!e||!e.mesh)return;
    if(e.mesh.parent)e.mesh.parent.remove(e.mesh);
    if(e.mesh.geometry)e.mesh.geometry.dispose();
    if(e.mesh.material)e.mesh.material.dispose();
  }

  return{
    createSkyDome,configureSunShadow,attachFillLight,initZoneSky,updateSky,disposeSky,
    refreshSunShadows,
  };
})();

const createSkyDome=(s,o)=>SKY.createSkyDome(s,o);
const configureSunShadow=(sun,o)=>SKY.configureSunShadow(sun,o);
const attachFillLight=(s,o)=>SKY.attachFillLight(s,o);
const initZoneSky=(s,l,o)=>SKY.initZoneSky(s,l,o);
const updateSky=(t,dt)=>SKY.updateSky(t,dt);
const disposeSky=(s)=>SKY.disposeSky(s);
const refreshSunShadows=()=>SKY.refreshSunShadows();
