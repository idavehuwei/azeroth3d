/* ============================================================
   熔火之心 · models.js
   ------------------------------------------------------------
   [依赖] THREE · core.js（rand）
   [导出] buildPlayer buildMage buildArcher buildBoss buildElder
          buildBoar buildFlameSpawn
   ------------------------------------------------------------
   3D 模型库：玩家三职业 / Boss / 烈焰之子 / 野猪 / 长老（全部程序化几何体）
   ============================================================ */
"use strict";
/* ============================================================
   玩家模型：人类战士（程序化低模）
   ============================================================ */
function buildPlayer(){
  const g=new THREE.Group();
  const armor=new THREE.MeshStandardMaterial({color:0x4a6a8a,roughness:.45,metalness:.7});
  const armorDark=new THREE.MeshStandardMaterial({color:0x2c3e50,roughness:.5,metalness:.6});
  const skin=new THREE.MeshStandardMaterial({color:0xd8a37a,roughness:.8});
  const gold=new THREE.MeshStandardMaterial({color:0xd9a441,roughness:.3,metalness:.9});
  const cloth=new THREE.MeshStandardMaterial({color:0x7a1f1f,roughness:.9});

  const torso=new THREE.Mesh(new THREE.BoxGeometry(.95,1.1,.55),armor); torso.position.y=1.65; g.add(torso);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(1,.18,.6),gold); belt.position.y=1.12; g.add(belt);
  const pelvis=new THREE.Mesh(new THREE.BoxGeometry(.85,.35,.5),armorDark); pelvis.position.y=.92; g.add(pelvis);
  /* 头 + 头盔 */
  const head=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.48),skin); head.position.y=2.5; g.add(head);
  const helm=new THREE.Mesh(new THREE.CylinderGeometry(.34,.36,.34,8),armor); helm.position.y=2.72; g.add(helm);
  const plume=new THREE.Mesh(new THREE.ConeGeometry(.1,.5,6),cloth); plume.position.set(0,3.05,0); g.add(plume);
  /* 肩甲 */
  [-1,1].forEach(s=>{
    const p=new THREE.Mesh(new THREE.SphereGeometry(.32,8,6,0,6.28,0,1.7),armor);
    p.position.set(s*.62,2.18,0); g.add(p);
  });
  /* 手臂（挂点用于攻击动画） */
  const armR=new THREE.Group(); armR.position.set(.62,2.1,0);
  const uarmR=new THREE.Mesh(new THREE.BoxGeometry(.26,.85,.26),armorDark); uarmR.position.y=-.42; armR.add(uarmR);
  /* 长剑 */
  const sword=new THREE.Group(); sword.position.set(0,-.85,.1);
  const hilt=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.3,6),gold); sword.add(hilt);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(.3,.06,.1),gold); guard.position.y=.16; sword.add(guard);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.1,1.5,.03),
    new THREE.MeshStandardMaterial({color:0xcfd8e6,metalness:.95,roughness:.15,emissive:0x334455,emissiveIntensity:.2}));
  blade.position.y=.95; sword.add(blade);
  armR.add(sword); g.add(armR);
  const armL=new THREE.Group(); armL.position.set(-.62,2.1,0);
  const uarmL=new THREE.Mesh(new THREE.BoxGeometry(.26,.85,.26),armorDark); uarmL.position.y=-.42; armL.add(uarmL);
  /* 盾牌 */
  const shield=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.09,8),armor);
  shield.rotation.z=Math.PI/2; shield.rotation.y=Math.PI/2; shield.position.set(-.12,-.8,.15);
  const boss_=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),gold); boss_.position.set(-.18,-.8,.15);
  armL.add(shield); armL.add(boss_); g.add(armL);
  /* 腿 */
  const legR=new THREE.Group(); legR.position.set(.25,.9,0);
  const legMeshR=new THREE.Mesh(new THREE.BoxGeometry(.3,.9,.3),armorDark);
  legMeshR.position.set(0,-.45,0); legR.add(legMeshR);
  const legL=new THREE.Group(); legL.position.set(-.25,.9,0);
  const legMeshL=new THREE.Mesh(new THREE.BoxGeometry(.3,.9,.3),armorDark);
  legMeshL.position.set(0,-.45,0); legL.add(legMeshL);
  g.add(legR); g.add(legL);
  /* 披风 */
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.5),
    new THREE.MeshStandardMaterial({color:0x8a1f1f,roughness:.9,side:THREE.DoubleSide}));
  cape.position.set(0,1.6,-.32); cape.rotation.x=.12; g.add(cape);

  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,legR,legL,cape};
  return g;
}

/* ---------------- 法师模型：紫袍 + 尖顶帽 + 奥术法杖 ---------------- */
function buildMage(){
  const g=new THREE.Group();
  const robe=new THREE.MeshStandardMaterial({color:0x3b2d78,roughness:.85});
  const robeDark=new THREE.MeshStandardMaterial({color:0x241a4a,roughness:.9});
  const trim=new THREE.MeshStandardMaterial({color:0xd9a441,roughness:.3,metalness:.9});
  const skin=new THREE.MeshStandardMaterial({color:0xd8a37a,roughness:.8});
  const wood=new THREE.MeshStandardMaterial({color:0x5a3a1a,roughness:.9});
  const orb=new THREE.MeshBasicMaterial({color:0x66ccff});

  const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.5,1,1.6,8),robe); skirt.position.y=1; g.add(skirt);
  const chest=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,1,8),robeDark); chest.position.y=2.2; g.add(chest);
  const belt=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.12,8),trim); belt.position.y=1.75; g.add(belt);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.46,.46,.44),skin); head.position.y=2.95; g.add(head);
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(.62,.66,.08,10),robe); brim.position.y=3.2; g.add(brim);
  const hat=new THREE.Mesh(new THREE.ConeGeometry(.36,1,9),robe); hat.position.y=3.7; hat.rotation.z=.12; g.add(hat);
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(.09,0),trim); star.position.set(.12,4.16,0); g.add(star);
  [-1,1].forEach(s=>{const p=new THREE.Mesh(new THREE.SphereGeometry(.26,8,6),robeDark);
    p.position.set(s*.55,2.6,0); g.add(p);});
  /* 右臂持法杖 */
  const armR=new THREE.Group(); armR.position.set(.55,2.55,0);
  const sr=new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,.9,7),robe); sr.position.y=-.45; armR.add(sr);
  const staff=new THREE.Group(); staff.position.set(.05,-.9,.15);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,3,7),wood); pole.position.y=.6; staff.add(pole);
  const tip=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),orb); tip.position.y=2.2; staff.add(tip);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.32,.03,6,14),trim); halo.position.y=2.2; staff.add(halo);
  armR.add(staff); g.add(armR);
  /* 左臂持法典 */
  const armL=new THREE.Group(); armL.position.set(-.55,2.55,0);
  const sl=new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,.9,7),robe); sl.position.y=-.45; armL.add(sl);
  const book=new THREE.Mesh(new THREE.BoxGeometry(.34,.44,.12),
    new THREE.MeshStandardMaterial({color:0x7a1f1f,roughness:.8}));
  book.position.set(-.05,-.95,.12); armL.add(book); g.add(armL);
  /* 长袍遮腿：空组占位供行走动画调用 */
  const legR=new THREE.Group(),legL=new THREE.Group();
  legR.position.set(.2,.6,0); legL.position.set(-.2,.6,0); g.add(legR); g.add(legL);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(.95,1.9),
    new THREE.MeshStandardMaterial({color:0x241a4a,roughness:.9,side:THREE.DoubleSide}));
  cape.position.set(0,1.95,-.4); cape.rotation.x=.1; g.add(cape);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,legR,legL,cape};
  return g;
}

/* ---------------- 弓箭手模型：皮甲 + 兜帽 + 长弓箭袋 ---------------- */
function buildArcher(){
  const g=new THREE.Group();
  const leather=new THREE.MeshStandardMaterial({color:0x4a6a2a,roughness:.85});
  const leatherD=new THREE.MeshStandardMaterial({color:0x3a2a14,roughness:.9});
  const skin=new THREE.MeshStandardMaterial({color:0xe0b088,roughness:.8});
  const wood=new THREE.MeshStandardMaterial({color:0x6a4520,roughness:.85});
  const feather=new THREE.MeshStandardMaterial({color:0xd8d0b0,roughness:.9});

  const torso=new THREE.Mesh(new THREE.BoxGeometry(.8,1.05,.48),leather); torso.position.y=1.65; g.add(torso);
  const strap=new THREE.Mesh(new THREE.BoxGeometry(.16,1.1,.52),leatherD);
  strap.position.y=1.65; strap.rotation.z=.5; g.add(strap);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(.86,.14,.52),leatherD); belt.position.y=1.15; g.add(belt);
  const pelvis=new THREE.Mesh(new THREE.BoxGeometry(.74,.32,.44),leatherD); pelvis.position.y=.92; g.add(pelvis);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.46,.46,.44),skin); head.position.y=2.45; g.add(head);
  const hood=new THREE.Mesh(new THREE.ConeGeometry(.44,.75,8),leather);
  hood.position.y=2.72; hood.rotation.x=-.18; g.add(hood);
  /* 背后箭袋 + 箭矢 */
  const quiver=new THREE.Mesh(new THREE.CylinderGeometry(.17,.14,.95,7),leatherD);
  quiver.position.set(-.24,1.95,-.42); quiver.rotation.z=.35; g.add(quiver);
  for(let i=0;i<3;i++){
    const ar=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.55,4),wood);
    ar.position.set(-.36+i*.09,2.5,-.44); ar.rotation.z=.35; g.add(ar);
    const fe=new THREE.Mesh(new THREE.ConeGeometry(.06,.16,4),feather);
    fe.position.set(-.45+i*.09,2.76,-.44); g.add(fe);
  }
  /* 左臂持长弓 */
  const armL=new THREE.Group(); armL.position.set(-.55,2.1,0);
  const al=new THREE.Mesh(new THREE.BoxGeometry(.22,.8,.22),leather); al.position.y=-.4; armL.add(al);
  const bow=new THREE.Group(); bow.position.set(-.12,-.85,.18);
  const arc=new THREE.Mesh(new THREE.TorusGeometry(.85,.05,6,16,Math.PI),wood);
  arc.rotation.z=Math.PI/2; bow.add(arc);
  const string=new THREE.Mesh(new THREE.BoxGeometry(.02,1.7,.02),feather); bow.add(string);
  armL.add(bow); g.add(armL);
  /* 右臂搭箭 */
  const armR=new THREE.Group(); armR.position.set(.55,2.1,0);
  const arR=new THREE.Mesh(new THREE.BoxGeometry(.22,.8,.22),leather); arR.position.y=-.4; armR.add(arR);
  const nock=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.8,4),wood);
  nock.position.set(0,-.82,.2); nock.rotation.x=Math.PI/2; armR.add(nock); g.add(armR);
  /* 腿 */
  const legR=new THREE.Group(); legR.position.set(.25,.9,0);
  const lr=new THREE.Mesh(new THREE.BoxGeometry(.28,.9,.28),leatherD); lr.position.y=-.45; legR.add(lr);
  const legL=new THREE.Group(); legL.position.set(-.25,.9,0);
  const ll=new THREE.Mesh(new THREE.BoxGeometry(.28,.9,.28),leatherD); ll.position.y=-.45; legL.add(ll);
  g.add(legR); g.add(legL);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(.85,1.3),
    new THREE.MeshStandardMaterial({color:0x2d4a1a,roughness:.9,side:THREE.DoubleSide}));
  cape.position.set(0,1.7,-.3); cape.rotation.x=.12; g.add(cape);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,legR,legL,cape};
  return g;
}

/* ============================================================
   Boss 模型：炎魔领主（岩浆巨人，程序化原创低模）
   ============================================================ */
function buildBoss(){
  const g=new THREE.Group();
  const magma=new THREE.MeshStandardMaterial({color:0x33130a,roughness:.85,flatShading:true,
    emissive:0xff3b00,emissiveIntensity:.55});
  const rock=new THREE.MeshStandardMaterial({color:0x241009,roughness:1,flatShading:true,
    emissive:0x992200,emissiveIntensity:.18});
  const fireMat=new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.92});
  const coreMat=new THREE.MeshBasicMaterial({color:0xffd060});

  /* 熔岩基座（Boss 从岩浆中升起，无腿） */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4.2,6.5,3,10),rock);
  base.position.y=1.2; g.add(base);
  const lavaSkirt=new THREE.Mesh(new THREE.CylinderGeometry(5,7.4,1,12),magma);
  lavaSkirt.position.y=.2; g.add(lavaSkirt);

  /* 躯干：巨大岩浆胸膛 */
  const torso=new THREE.Mesh(new THREE.DodecahedronGeometry(4.4,0),magma);
  torso.scale.set(1.15,1.25,.95); torso.position.y=7.4; g.add(torso);
  /* 胸口熔核 */
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,0),coreMat);
  core.position.set(0,7.9,3.2); g.add(core);

  /* 肩部巨岩 */
  const shL=new THREE.Mesh(new THREE.DodecahedronGeometry(2.5,0),rock); shL.position.set(-5.6,10.6,0); g.add(shL);
  const shR=new THREE.Mesh(new THREE.DodecahedronGeometry(2.5,0),rock); shR.position.set(5.6,10.6,0); g.add(shR);
  /* 肩头火焰 */
  [[-5.6,12.6],[5.6,12.6]].forEach(([x,y])=>{
    const f=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.8,7),fireMat); f.position.set(x,y,0);
    f.userData.flame=true; g.add(f);
    const f2=new THREE.Mesh(new THREE.ConeGeometry(.7,1.8,6),coreMat); f2.position.set(x,y+.3,0);
    f2.userData.flame=true; g.add(f2);
  });

  /* 头颅 + 燃烧王冠 */
  const head=new THREE.Mesh(new THREE.DodecahedronGeometry(1.7,0),magma);
  head.scale.set(1,1.15,.9); head.position.y=12.6; g.add(head);
  for(let i=0;i<7;i++){
    const a=(i/7)*Math.PI*1.9-Math.PI*.95;
    const h=i===3?3.4:rand(1.6,2.5);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.42,h,5),fireMat);
    spike.position.set(Math.sin(a)*1.5,13.6+h*.35,Math.cos(a)*.5-.3);
    spike.rotation.z=-Math.sin(a)*.5; spike.userData.flame=true; g.add(spike);
  }
  /* 双眼 */
  [[-.6],[.6]].forEach(([x])=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.3,8,8),coreMat);
    eye.position.set(x,12.8,1.5); g.add(eye);
  });

  /* 左臂（张开的巨掌） */
  const armL=new THREE.Group(); armL.position.set(-5.6,10.2,0);
  const lArm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.5,5.5,7),magma);
  lArm.position.set(-1.2,-3,0); lArm.rotation.z=.4; armL.add(lArm);
  const lHand=new THREE.Mesh(new THREE.DodecahedronGeometry(1.6,0),rock);
  lHand.position.set(-2.5,-5.6,0); armL.add(lHand);
  for(let i=0;i<4;i++){
    const claw=new THREE.Mesh(new THREE.ConeGeometry(.35,1.6,5),rock);
    claw.position.set(-2.5+(i-1.5)*.7,-6.8,.4); claw.rotation.x=2.9; armL.add(claw);
  }
  g.add(armL);

  /* 右臂 + 烈焰巨锤 */
  const armR=new THREE.Group(); armR.position.set(5.6,10.2,0);
  const rArm=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.5,5.5,7),magma);
  rArm.position.set(1.2,-3,0); rArm.rotation.z=-.4; armR.add(rArm);
  const rHand=new THREE.Mesh(new THREE.DodecahedronGeometry(1.5,0),rock);
  rHand.position.set(2.5,-5.6,0); armR.add(rHand);
  const hammer=new THREE.Group(); hammer.position.set(2.5,-5.6,0);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,9,7),rock);
  handle.position.y=3.4; hammer.add(handle);
  const hHead=new THREE.Mesh(new THREE.BoxGeometry(4.6,2.6,2.6),magma);
  hHead.position.y=8.2; hammer.add(hHead);
  const hGlow=new THREE.Mesh(new THREE.BoxGeometry(4.9,.7,2.9),coreMat);
  hGlow.position.y=8.2; hammer.add(hGlow);
  [[-2.6,1],[2.6,1]].forEach(([x])=>{
    const sp=new THREE.Mesh(new THREE.ConeGeometry(.8,2,5),rock);
    sp.position.set(x,8.2,0); sp.rotation.z=x>0?-Math.PI/2:Math.PI/2; hammer.add(sp);
  });
  armR.add(hammer); g.add(armR);

  const bossLight=new THREE.PointLight(0xff6a20,2.2,60,1.8);
  bossLight.position.set(0,10,4); g.add(bossLight);

  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={armR,armL,core,bossLight};
  return g;
}

/* ---------------- 烈焰之子（小怪） ---------------- */
function buildFlameSpawn(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),
    new THREE.MeshStandardMaterial({color:0x3a1408,flatShading:true,emissive:0xff4400,emissiveIntensity:.7}));
  body.position.y=1; g.add(body);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.6,1.6,6),
    new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.9}));
  flame.position.y=2.1; flame.userData.flame=true; g.add(flame);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.16,6,6),new THREE.MeshBasicMaterial({color:0xffe080}));
  eye.position.set(0,1.15,.75); g.add(eye);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

/* ---------------- 草原野猪（莫高雷野怪） ---------------- */
function buildBoar(){
  const g=new THREE.Group();
  const fur=new THREE.MeshStandardMaterial({color:0x6a4a2e,roughness:1});
  const furD=new THREE.MeshStandardMaterial({color:0x45311e,roughness:1});
  const tuskM=new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.6});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.1,1,1.7),fur); body.position.y=1; g.add(body);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,1.5),furD); ridge.position.y=1.55; g.add(ridge);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.85,.8,.7),fur); head.position.set(0,1.05,1.15); g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(.45,.4,.35),furD); snout.position.set(0,.9,1.65); g.add(snout);
  [-1,1].forEach(s=>{
    const tk=new THREE.Mesh(new THREE.ConeGeometry(.09,.45,5),tuskM);
    tk.position.set(s*.28,.95,1.62); tk.rotation.x=-.6; g.add(tk);
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.16,.35,4),furD);
    ear.position.set(s*.34,1.6,1.05); g.add(ear);
    [[.42],[-.42]].forEach(([dz])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,.7,5),furD);
      leg.position.set(s*.4,.35,dz); g.add(leg);
    });
  });
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.05,.03,.5,4),furD);
  tail.position.set(0,1.35,-.95); tail.rotation.x=.7; g.add(tail);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

/* ---------------- 牛头人长老 NPC ---------------- */
function buildElder(){
  const g=new THREE.Group();
  const fur=new THREE.MeshStandardMaterial({color:0x6a4a30,roughness:1});
  const furD=new THREE.MeshStandardMaterial({color:0x4a3220,roughness:1});
  const cloth=new THREE.MeshStandardMaterial({color:0x8a4a2a,roughness:.9});
  const hornM=new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.6});
  const wood=new THREE.MeshStandardMaterial({color:0x6a4520,roughness:.9});
  const featherM=new THREE.MeshStandardMaterial({color:0xe8e4d0,roughness:.9});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.7,1.05),fur); torso.position.y=2.5; g.add(torso);
  const mantle=new THREE.Mesh(new THREE.BoxGeometry(1.8,.5,1.2),cloth); mantle.position.y=3.2; g.add(mantle);
  const loin=new THREE.Mesh(new THREE.BoxGeometry(1.25,1,.95),cloth); loin.position.y=1.3; g.add(loin);
  [-1,1].forEach(s=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.5,.9,.55),furD);
    leg.position.set(s*.4,.45,0); g.add(leg);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.45,1.5,.5),fur);
    arm.position.set(s*1.05,2.4,0); g.add(arm);
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.17,1,5),hornM);
    horn.position.set(s*.85,4.45,0); horn.rotation.z=s*-1.1; g.add(horn);
  });
  const head=new THREE.Mesh(new THREE.BoxGeometry(.85,.85,.85),fur); head.position.y=4.15; g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(.5,.45,.45),furD); snout.position.set(0,3.95,.55); g.add(snout);
  const beads=new THREE.Mesh(new THREE.TorusGeometry(.55,.08,6,12),wood);
  beads.position.y=3.35; beads.rotation.x=Math.PI/2.4; g.add(beads);
  /* 图腾法杖 */
  const staff=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,4.4,6),wood);
  staff.position.set(1.4,2.2,.3); g.add(staff);
  const topper=new THREE.Mesh(new THREE.TorusGeometry(.32,.07,6,10),wood);
  topper.position.set(1.4,4.5,.3); g.add(topper);
  for(let i=0;i<3;i++){
    const fe=new THREE.Mesh(new THREE.ConeGeometry(.07,.55,4),featherM);
    fe.position.set(1.4+(i-1)*.18,3.9,.42); fe.rotation.x=Math.PI; g.add(fe);
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}
