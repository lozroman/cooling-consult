/* Equipment geometry adapted from the supplied model; exterior view only. */
window.CCEquipmentFactories = window.CCEquipmentFactories || {};
window.CCEquipmentFactories.tower = function(THREE) {
'use strict';
const TAU = Math.PI * 2;
const lerp=THREE.MathUtils.lerp, clamp=THREE.MathUtils.clamp;
const v = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const root = new THREE.Group();
let waterSurface, waterMaterial, rotor, door, platform, cabinet;
const movable=[], panels=[], nozzlePositions=[], rotorBodies=[];
const groups={}, geoms={}, mats={};
let seed=792642;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const matrix=new THREE.Matrix4(), dummy=new THREE.Object3D();
function material(name,color,metalness=.3,roughness=.48,extra={}){const m=new THREE.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:.65,...extra});m.color.convertSRGBToLinear();if(m.emissive)m.emissive.convertSRGBToLinear();return mats[name]=m;}
function initMaterials(){
 material('paint',0xb0b9b7,.32,.47);material('paintEdge',0x889797,.43,.4);material('paintLight',0xc2cac8,.35,.43);
 material('steel',0x7c8d91,.72,.29);material('zinc',0xb6c4c5,.65,.33);material('darkSteel',0x455b60,.6,.38);
 material('motor',0x556d70,.48,.41);material('motorDark',0x354e53,.55,.42);material('blade',0xb5c6b3,.12,.4,{side:THREE.DoubleSide});
 material('hdpe',0x273a3e,.07,.51);material('hdpeEdge',0x4c666b,.1,.46);material('nozzle',0x344c50,.05,.44);
 material('black',0x27383b,.13,.57);material('gasket',0x18282c,.03,.7);material('orange',0xe39743,.15,.44);
 material('red',0xc5554c,.23,.35);material('blue',0x4d97b3,.25,.4);material('green',0x43a083,.1,.37,{emissive:0x154e39,emissiveIntensity:.15});
 material('white',0xe7edeb,.12,.55);material('deck',0x819493,.6,.42);material('floor',0xe8edeb,.02,.91);material('concrete',0xc6ceca,.02,.96);
 material('wire',0x394a4d,.25,.47);material('water',0x55b4cb,.14,.19,{transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide});
}
function group(id,parent=root,exp=[0,0,0]){const g=new THREE.Group();g.name=id;parent.add(g);g.userData.owner=id;groups[id]=g;movable.push({g,base:g.position.clone(),exp:v(...exp)});return g;}
function sub(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
function add(g,geo,mat,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,size,pos,mat=mats.paint,rot=[0,0,0]){return add(g,geoms.box||(geoms.box=new THREE.BoxGeometry(1,1,1)),mat,pos,rot,size);}
function cylinder(g,r,h,pos,mat=mats.steel,axis='y',r2=r,segs=24,open=false){const key=[r,r2,h,segs,open].join('_');const geo=geoms[key]||(geoms[key]=new THREE.CylinderGeometry(r,r2,h,segs,1,open));return add(g,geo,mat,pos,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0]);}
function beam(g,a,b,width,depth,mat=mats.darkSteel){const pa=v(...a),pb=v(...b),mid=pa.clone().add(pb).multiplyScalar(.5),m=box(g,[width,pa.distanceTo(pb),depth],mid.toArray(),mat);m.quaternion.setFromUnitVectors(v(0,1,0),pb.sub(pa).normalize());return m;}
function rod(g,a,b,r,mat=mats.steel,segs=8){const pa=v(...a),pb=v(...b),len=pa.distanceTo(pb),m=cylinder(g,r,len,pa.clone().add(pb).multiplyScalar(.5).toArray(),mat,'y',r,segs);m.quaternion.setFromUnitVectors(v(0,1,0),pb.sub(pa).normalize());return m;}
function tube(g,ro,ri,len,pos,mat=mats.paintEdge,axis='z',segs=48){const s=new THREE.Shape();s.absarc(0,0,ro,0,TAU,false);const h=new THREE.Path();h.absarc(0,0,ri,0,TAU,true);s.holes.push(h);const geo=new THREE.ExtrudeGeometry(s,{depth:len,bevelEnabled:false,curveSegments:segs/4});geo.translate(0,0,-len/2);const m=add(g,geo,mat,pos);if(axis==='x')m.rotation.y=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;return m;}
function torus(g,r,t,pos,mat=mats.steel,rot=[0,0,0],segs=64){const key=`tor${r}_${t}_${segs}`,geo=geoms[key]||(geoms[key]=new THREE.TorusGeometry(r,t,6,segs));return add(g,geo,mat,pos,rot);}
function bolt(g,pos,axis='z',r=.008){cylinder(g,r,.008,pos,mats.zinc,axis,r,6);const q=pos.slice();q[axis==='x'?0:axis==='y'?1:2]+=.005;cylinder(g,r*1.35,.0018,q,mats.steel,axis,r*1.35,12);}
function angle(g,a,b,s=.045,t=.003,mat=mats.paintEdge){const pa=v(...a),pb=v(...b),length=pa.distanceTo(pb),gg=sub(g,'angle');gg.position.copy(pa.clone().add(pb).multiplyScalar(.5));gg.quaternion.setFromUnitVectors(v(0,1,0),pb.sub(pa).normalize());box(gg,[s,length,t],[s/2,0,0],mat);box(gg,[t,length,s],[0,0,s/2],mat);return gg;}
function channel(g,a,b,h=.1,breadth=.046,t=.005,mat=mats.deck){const pa=v(...a),pb=v(...b),length=pa.distanceTo(pb),gg=sub(g,'channel');gg.position.copy(pa.clone().add(pb).multiplyScalar(.5));gg.quaternion.setFromUnitVectors(v(0,1,0),pb.sub(pa).normalize());box(gg,[t,length,h],[0,0,0],mat);box(gg,[breadth,length,t],[breadth/2-t/2,0,h/2-t/2],mat);box(gg,[breadth,length,t],[breadth/2-t/2,0,-h/2+t/2],mat);return gg;}
function plate(g,lines,w,h,pos,rot=[0,0,0],background='#e4e9e5',color='#3f6167'){
 const c=document.createElement('canvas');c.width=1024;c.height=Math.max(192,Math.round(1024*h/w));const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=color+'55';ctx.lineWidth=4;ctx.strokeRect(12,12,c.width-24,c.height-24);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
 lines.forEach((line,i)=>{ctx.font=`${i===0?'600':'400'} ${Math.min(150,c.height/(lines.length+1)*(i===0?.83:.54))}px Segoe UI, Arial`;ctx.fillText(line,512,(i+1)*c.height/(lines.length+1),960)});
 const tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=4;const mat=new THREE.MeshStandardMaterial({map:tx,roughness:.55,metalness:.1});const m=add(g,new THREE.PlaneGeometry(w,h),mat,pos,rot);m.castShadow=false;return m;
}
function mergeRaw(geos){let count=0;const all=geos.map(g=>{const n=g.index?g.toNonIndexed():g;count+=n.attributes.position.count;return n});const ps=new Float32Array(count*3),ns=new Float32Array(count*3),uvs=new Float32Array(count*2);let o=0;all.forEach(g=>{if(!g.attributes.normal)g.computeVertexNormals();const n=g.attributes.position.count;ps.set(g.attributes.position.array,o*3);ns.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uvs.set(g.attributes.uv.array,o*2);o+=n});const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.BufferAttribute(ps,3));r.setAttribute('normal',new THREE.BufferAttribute(ns,3));r.setAttribute('uv',new THREE.BufferAttribute(uvs,2));r.computeBoundingSphere();return r;}
function optimize(g){for(const ch of [...g.children])if(ch.isGroup)optimize(ch);const bins=new Map();g.children.filter(o=>o.isMesh&&!o.isInstancedMesh&&!o.userData.dynamic&&!Array.isArray(o.material)).forEach(o=>{if(o.material.map)return;const k=o.material.uuid;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(o)});for(const arr of bins.values()){if(arr.length<2)continue;const gs=arr.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix)});const m=new THREE.Mesh(mergeRaw(gs),arr[0].material);m.castShadow=arr.some(o=>o.castShadow);m.receiveShadow=true;g.add(m);for(const o of arr)g.remove(o);for(const gg of gs)gg.dispose();}}
function panelShape(w,h,hole,thickness=.003){const s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();if(hole){const p=new THREE.Path();p.absarc(hole[0],hole[1],hole[2],0,TAU,true);s.holes.push(p)}const geo=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,curveSegments:64});geo.translate(0,0,-thickness/2);return geo;}
function newPanel(name,w,h,pos,rot,exp,cut,hole=null){const p=sub(groups.body,name);p.position.set(...pos);p.rotation.set(...rot);add(p,panelShape(w,h,hole),mats.paint);const t=.016;box(p,[w,t,.016],[0,h/2,0],mats.paintEdge);box(p,[w,t,.016],[0,-h/2,0],mats.paintEdge);box(p,[t,h,.016],[-w/2,0,0],mats.paintEdge);box(p,[t,h,.016],[w/2,0,0],mats.paintEdge);for(const xx of [-1,1])for(const yy of [-1,1]){box(p,[.035,.022,.014],[xx*(w/2-.055),yy*(h/2-.038),.013],mats.steel);bolt(p,[xx*(w/2-.055),yy*(h/2-.038),.025],'z',.007)}
 if(!hole&&h>.6){const positions=new Float32Array([-w/2+.025,-h/2+.025,.0018,w/2-.025,h/2-.025,.0018,-w/2+.025,h/2-.025,.0018,w/2-.025,-h/2+.025,.0018]);const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(positions,3));p.add(new THREE.LineSegments(gg,new THREE.LineBasicMaterial({color:0x92a2a1,transparent:true,opacity:.32})));}
 panels.push({g:p,base:p.position.clone(),exp:v(...exp),cut,opacity:1});return p;}
function makeBody(){
 const g=group('body');
 for(const x of [-.718,.718])for(const z of [-1.278,1.278]){const a=angle(g,[x,.035,z],[x,3.345,z],.04,.003,mats.paintEdge);a.rotation.y=(x>0?Math.PI:0)+(z<0?Math.PI/2:0)}
 for(const y of [.055,.55,1.82,2.73,3.34]){for(const x of [-.719,.719])angle(g,[x,y,-1.278],[x,y,1.278],.034,.003,mats.paintEdge);for(const z of [-1.278,1.278])angle(g,[-.719,y,z],[.719,y,z],.034,.003,mats.paintEdge)}
 // Front fan panel includes a real circular opening; no disc closes the intake.
 newPanel('frontFan',1.48,1.30,[0,1.2,1.298],[0,0,0],[0,0,.1],false,[0,-.06,.528]);
 newPanel('frontUpper',1.48,1.48,[0,2.60,1.298],[0,0,0],[0,.05,1.0],true);
 newPanel('frontBasin',1.48,.49,[0,.285,1.298],[0,0,0],[0,0,.35],false);
 for(const sign of [-1,1]){newPanel(sign>0?'rightLower':'leftLower',2.6,1.28,[sign*.739,1.19,0],[0,sign*Math.PI/2,0],[sign*1.1,0,0],sign>0);newPanel(sign>0?'rightUpper':'leftUpper',2.6,1.48,[sign*.739,2.6,0],[0,sign*Math.PI/2,0],[sign*1.1,.04,0],sign>0);newPanel(sign>0?'rightBasin':'leftBasin',2.6,.49,[sign*.739,.285,0],[0,sign*Math.PI/2,0],[sign*.65,0,0],sign>0)}
 const back=sub(g,'rear');back.position.set(0,1.69,-1.299);back.rotation.y=Math.PI;
 const s=new THREE.Shape();s.moveTo(-.74,-1.65);s.lineTo(.74,-1.65);s.lineTo(.74,1.65);s.lineTo(-.74,1.65);s.closePath();for(const [cy,r] of [[3.04-1.69,.0665],[.25-1.69,.0795]]){const hole=new THREE.Path();hole.absarc(0,cy,r,0,TAU,true);s.holes.push(hole)}const geo=new THREE.ExtrudeGeometry(s,{depth:.003,bevelEnabled:false,curveSegments:36});add(back,geo,mats.paint);panels.push({g:back,base:back.position.clone(),exp:v(0,0,-.75),cut:false});
 for(const y of [.55,1.85,3.34])box(back,[1.48,.018,.018],[0,y-1.69,0],mats.paintEdge);
 // Upper perimeter is open. Lifting eyes sit at the upper corners.
 for(const x of [-.70,.70])for(const z of [-1.24,1.24]){const gg=sub(g,'liftingEye');gg.position.set(x,3.345,z);const sh=new THREE.Shape();sh.moveTo(-.045,0);sh.lineTo(.045,0);sh.lineTo(.034,.038);sh.quadraticCurveTo(0,.056,-.034,.038);sh.closePath();const hp=new THREE.Path();hp.absarc(0,.029,.013,0,TAU,true);sh.holes.push(hp);add(gg,new THREE.ExtrudeGeometry(sh,{depth:.007,bevelEnabled:false,curveSegments:12}),mats.steel);box(gg,[.12,.006,.07],[0,0,0],mats.paintEdge)}
 const front=panels.find(p=>p.g.name==='frontUpper').g;
 // Factory warning decals are small surface labels, without invented handles.
 for(const x of [-.56,.56])plate(front,['!','ВРАЩАЮЩИЕСЯ ЧАСТИ'],.11,.11,[x,-.54,.006],[0,0,0],'#eadfba','#77683d');
 // Feet, support channels and anchor plates.
 for(const z of [-1.10,1.10]){channel(g,[-.72,.043,z],[.72,.043,z],.075,.045,.004,mats.paintEdge);for(const x of [-.62,.62]){box(g,[.16,.015,.16],[x,.014,z],mats.paintEdge);for(const dx of [-.045,.045])bolt(g,[x+dx,.027,z],'y',.009)}}
 return g;
}
function makeFan(){
 const guard=group('guard',root,[0,0,1.10]);
 tube(guard,.528,.510,.25,[0,1.14,1.175],mats.paintEdge);tube(guard,.558,.51,.012,[0,1.14,1.311],mats.zinc);
 torus(guard,.522,.005,[0,1.14,1.345],mats.zinc);torus(guard,.526,.004,[0,1.14,1.373],mats.steel);
 for(let i=0;i<24;i++){const a=i*TAU/24;bolt(guard,[.543*Math.cos(a),1.14+.543*Math.sin(a),1.323],'z',.006)}
 // A shallow domed protective mesh, not an opaque fan cover.
 const wg=sub(guard,'wireGuard');for(let i=-12;i<=12;i++){const q=i*.04,extent=Math.sqrt(Math.max(0,.51*.51-q*q));const dome=.039*(1-q*q/(.51*.51));rod(wg,[-extent,1.14+q,1.365+dome],[extent,1.14+q,1.365+dome],.0012,mats.steel,4);rod(wg,[q,1.14-extent,1.365+dome],[q,1.14+extent,1.365+dome],.0012,mats.steel,4)}
 for(let i=0;i<6;i++){const a=i*TAU/6;rod(wg,[.19*Math.cos(a),1.14+.19*Math.sin(a),1.402],[.521*Math.cos(a),1.14+.521*Math.sin(a),1.365],.0021,mats.zinc,6)}
 rotor=group('rotor',root,[0,0,.65]);const spinning=sub(rotor,'rotatingWheel');spinning.position.set(0,1.14,1.265);rotorBodies.push(spinning);
 cylinder(spinning,.125,.087,[0,0,-.015],mats.steel,'z',.125,48);cylinder(spinning,.110,.014,[0,0,.034],mats.zinc,'z',.11,48);cylinder(spinning,.039,.032,[0,0,.054],mats.steel,'z',.039,32);cylinder(spinning,.018,.006,[0,0,.074],mats.darkSteel,'z',.018,24);
 for(let i=0;i<12;i++){
  const a=i*TAU/12,bg=sub(spinning,'adjustableBlade');bg.rotation.z=a;
  cylinder(bg,.019,.068,[.142,0,-.006],mats.zinc,'x',.019,12);box(bg,[.057,.049,.031],[.124,0,-.007],mats.steel);
  for(const y of [-.016,.016])bolt(bg,[.124,y,.013],'z',.006);
  const ps=[],uv=[],ix=[],nr=16,nc=10;
  for(let j=0;j<=nr;j++){const t=j/nr,r=.154+.342*t,chord=.052+.027*Math.sin(t*Math.PI*.7),pitch=.39-.23*t,sweep=.014*t*t;for(let k=0;k<=nc;k++){const u=k/nc-.5,camber=.012*Math.sin((u+.5)*Math.PI)*(1-.4*t);ps.push(r,sweep+u*chord*Math.cos(pitch),u*chord*Math.sin(pitch)+camber);uv.push(k/nc,t)}}
  for(let j=0;j<nr;j++)for(let k=0;k<nc;k++){const a=j*(nc+1)+k,b=a+nc+1;ix.push(a,b,a+1,a+1,b,b+1)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();add(bg,geo,mats.blade);
 }
 for(let i=0;i<12;i++){const a=i*TAU/12;bolt(spinning,[.092*Math.cos(a),.092*Math.sin(a),.046],'z',.006)}
 const motor=group('motor',root,[0,0,.22]);
 cylinder(motor,.106,.35,[0,1.14,.975],mats.motor,'z',.106,48);cylinder(motor,.123,.026,[0,1.14,1.158],mats.steel,'z',.123,48);cylinder(motor,.021,.1,[0,1.14,1.211],mats.steel,'z',.021,24);
 for(let i=0;i<24;i++){const a=i*TAU/24;const fin=box(motor,[.009,.029,.285],[.115*Math.cos(a),1.14+.115*Math.sin(a),.973],mats.motor);fin.rotation.z=a-Math.PI/2}
 cylinder(motor,.117,.05,[0,1.14,.775],mats.motorDark,'z',.117,48);for(let i=0;i<16;i++){const a=i*TAU/16;box(motor,[.005,.028,.026],[.104*Math.cos(a),1.14+.104*Math.sin(a),.748],mats.paintEdge,[0,0,a-Math.PI/2])}
 box(motor,[.12,.085,.115],[.035,1.292,.94],mats.motorDark);box(motor,[.132,.012,.128],[.035,1.34,.94],mats.motor);for(const x of [-.013,.083])for(const z of [.89,.99])bolt(motor,[x,1.351,z],'y',.004);
 for(const x of [-.09,.09]){box(motor,[.051,.038,.26],[x,1.014,.97],mats.motor);for(const z of [.88,1.06])bolt(motor,[x,1.04,z],'y',.008)}
 // Rectangular channels carry the motor. They are connected to the casing.
 for(const z of [.865,1.065]){channel(motor,[-.68,.968,z],[.68,.968,z],.075,.045,.004,mats.darkSteel);for(const x of [-.69,.69]){box(motor,[.065,.13,.10],[x,.963,z],mats.paintEdge);bolt(motor,[x,.99,z+.055],'z',.007)}}
 for(const x of [-.66,.66])beam(motor,[x,.59,.58],[x,.95,1.07],.03,.04,mats.darkSteel);
 plate(motor,['5,5 kW · IP55'],.13,.046,[.109,1.15,.95],[0,Math.PI/2,0]);
 return {guard,rotor,motor};
}
function latticeTubeGeometry(){
 const temp=new THREE.Group(),len=1.34,rad=.037,na=22,nc=10;
 for(let j=0;j<na;j++)for(let k=0;k<nc;k++)for(const dir of [-1,1]){const a=k*TAU/nc+(j%2)*Math.PI/nc,b=a+dir*Math.PI/nc;rod(temp,[-len/2+j*len/na,rad*Math.cos(a),rad*Math.sin(a)],[-len/2+(j+1)*len/na,rad*Math.cos(b),rad*Math.sin(b)],.0011,mats.hdpe,3)}
 for(const x of [-len/2,len/2])torus(temp,rad,.0017,[x,0,0],mats.hdpe,[0,Math.PI/2,0],24);
 const geometries=[];temp.updateMatrixWorld(true);temp.traverse(o=>{if(o.isMesh)geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld))});const geo=mergeRaw(geometries);for(const g of geometries)g.dispose();return geo;
}
function makeFill(){
 const g=group('fill',root,[0,.42,0]),tubeGeo=latticeTubeGeometry(),count=9*24,ins=new THREE.InstancedMesh(tubeGeo,mats.hdpe,count);ins.name='HDPE_lattice_tubes';ins.castShadow=true;ins.receiveShadow=true;ins.userData.owner='fill';
 let n=0;for(let row=0;row<9;row++)for(let col=0;col<24;col++){const z=-1.18+col*.1026+((row%2)*.008),y=1.79+row*.108;dummy.position.set(0,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();ins.setMatrixAt(n++,dummy.matrix)}ins.instanceMatrix.needsUpdate=true;g.add(ins);
 // Removable packets sit on open angle supports; air can pass between them.
 for(const x of [-.685,.685]){angle(g,[x,1.73,-1.25],[x,1.73,1.25],.045,.004,mats.steel);angle(g,[x,2.70,-1.25],[x,2.70,1.25],.035,.003,mats.steel)}
 for(const z of [-1.24,-.4,.4,1.24]){angle(g,[-.68,1.73,z],[.68,1.73,z],.035,.003,mats.steel);for(const x of [-.68,.68]){box(g,[.025,.99,.015],[x,2.21,z],mats.steel);bolt(g,[x,1.75,z+.012],'z',.006);bolt(g,[x,2.69,z+.012],'z',.006)}}
 return g;
}
function makeDistribution(){
 const g=group('distribution',root,[0,.97,0]);
 // The rear nozzle Ø133 continues directly into the longitudinal header.
 tube(g,.0665,.0605,2.64,[0,3.04,-.18],mats.paintEdge,'z',48);cylinder(g,.0665,.005,[0,3.04,1.143],mats.paintEdge,'z',.0665,48);
 tube(g,.071,.065,.038,[0,3.04,-1.425],mats.red);tube(g,.075,.0665,.012,[0,3.04,-1.31],mats.zinc);
 for(const z of [-.84,0,.84]){cylinder(g,.025,.90,[0,3.014,z],mats.steel,'x',.025,24);for(const x of [-.42,.42]){
   cylinder(g,.015,.064,[x,2.97,z],mats.hdpe,'y',.015,20);cylinder(g,.023,.027,[x,2.938,z],mats.nozzle,'y',.023,12);cylinder(g,.024,.022,[x,2.914,z],mats.nozzle,'y',.016,24);torus(g,.015,.003,[x,2.902,z],mats.black,[Math.PI/2,0,0],24);
   cylinder(g,.007,.027,[x+.023,2.932,z],mats.nozzle,'x',.007,12);nozzlePositions.push(v(x,2.90,z));
  }
  // Saddle brackets and studs tie the collector to upper rails.
  for(const x of [-.66,.66]){angle(g,[x,2.94,z-.05],[x,3.1,z-.05],.03,.003,mats.steel);rod(g,[x,3.025,z],[x>0?.45:-.45,3.025,z],.006,mats.steel)}
 }
 for(const z of [-1.06,1.06]){torus(g,.072,.004,[0,3.04,z],mats.steel);for(const x of [-.08,.08])rod(g,[x,3.04,z],[x,3.16,z],.003,mats.steel,6);beam(g,[-.12,3.16,z],[.12,3.16,z],.016,.025,mats.steel)}
 plate(g,['ВХОД Ø133','НАГРЕТАЯ ВОДА'],.17,.075,[.10,3.04,-1.48],[0,Math.PI,0],'#eadbd4','#a15342');
 return g;
}
function makeEliminator(){
 const g=group('eliminator',root,[0,1.56,0]);
 const ps=[],uv=[],idx=[],ny=14;
 for(let j=0;j<=ny;j++){const t=j/ny,x=.017*Math.sin(t*TAU),y=3.18+.15*t;for(const z of [-1.245,1.245]){ps.push(x,y,z);uv.push(t,(z+1.245)/2.49)}}
 for(let j=0;j<ny;j++){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();const mat=mats.hdpe.clone();mat.side=THREE.DoubleSide;
 const blades=new THREE.InstancedMesh(geo,mat,39);for(let k=0;k<39;k++){dummy.position.set(-.665+k*.035,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();blades.setMatrixAt(k,dummy.matrix)}blades.castShadow=true;blades.receiveShadow=true;blades.instanceMatrix.needsUpdate=true;g.add(blades);
 for(const z of [-1.25,-.42,.42,1.25]){box(g,[1.41,.015,.021],[0,3.175,z],mats.hdpeEdge);box(g,[1.41,.012,.015],[0,3.333,z],mats.hdpeEdge);for(const x of [-.685,.685])box(g,[.024,.15,.025],[x,3.25,z],mats.hdpeEdge)}
 for(const x of [-.70,.70])angle(g,[x,3.165,-1.25],[x,3.165,1.25],.035,.003,mats.steel);
 return g;
}
function makeBasin(){
 const g=group('basin');
 const z0=-1.274,z1=1.274,y0=.082,y1=.49,geo=new THREE.BufferGeometry();const ps=[-.708,y0,z0,.708,y0,z0,.708,y1,z1,-.708,y1,z1];geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();const floor=add(g,geo,mats.paintEdge);floor.material=mats.paintEdge.clone();floor.material.side=THREE.DoubleSide;
 for(const x of [-.713,.713]){const shape=new THREE.Shape();shape.moveTo(z0,.05);shape.lineTo(z1,.05);shape.lineTo(z1,y1);shape.lineTo(z0,y0);shape.closePath();const gg=new THREE.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:false});gg.rotateY(-Math.PI/2);add(g,gg,mats.paintEdge,[x,0,0]);}
 tube(g,.0795,.0735,.30,[0,.25,-1.44],mats.paintEdge);tube(g,.084,.078,.035,[0,.25,-1.55],mats.blue);tube(g,.089,.0795,.012,[0,.25,-1.309],mats.zinc);
 // Horizontal free surface meets the sloped bottom; no water floats above the fan.
 const level=.325,endz=z0+(level-y0)/(y1-y0)*(z1-z0);waterSurface=add(g,new THREE.PlaneGeometry(1.395,endz-z0),mats.water,[0,level,(endz+z0)/2],[-Math.PI/2,0,0]);waterSurface.userData.dynamic=true;waterSurface.castShadow=false;waterMaterial=mats.water;
 const waterShape=new THREE.Shape();waterShape.moveTo(z0,y0+.004);waterShape.lineTo(endz,level);waterShape.lineTo(z0,level);waterShape.closePath();const wgeo=new THREE.ExtrudeGeometry(waterShape,{depth:1.397,bevelEnabled:false});wgeo.rotateY(-Math.PI/2);wgeo.translate(.6985,0,0);const wm=add(g,wgeo,mats.water);wm.castShadow=false;
 for(let i=0;i<7;i++){const r=.047+i*.045;const o=add(g,new THREE.RingGeometry(r,r+.0015,64),new THREE.MeshBasicMaterial({color:0xb9e4e8,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}),[0,level+.002,-.8],[-Math.PI/2,0,0]);o.userData.dynamic=true;g.userData.ripples=(g.userData.ripples||[]).concat(o)}
 // Sensor pocket in the outlet; exact model and cabling are illustrative.
 cylinder(g,.0065,.105,[.015,.363,-1.44],mats.zinc,'y',.0065,12);cylinder(g,.014,.025,[.015,.425,-1.44],mats.steel,'y',.014,6);box(g,[.045,.042,.04],[.015,.457,-1.44],mats.motor);
 return g;
}
function deck(g,w,d,cx,y,cz){
 const sx=.075,sz=.042,shape=new THREE.Shape();shape.moveTo(-sx/2,0);shape.lineTo(0,sz/2);shape.lineTo(sx/2,0);shape.lineTo(0,-sz/2);shape.closePath();const hp=new THREE.Path();hp.moveTo(-sx/2+.005,0);hp.lineTo(0,-sz/2+.0035);hp.lineTo(sx/2-.005,0);hp.lineTo(0,sz/2-.0035);hp.closePath();shape.holes.push(hp);
 const key='deckcell';const geo=geoms[key]||(geoms[key]=new THREE.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:false}));const coords=[];for(let row=0;row<Math.floor(d/(sz*.5));row++)for(let col=0;col<Math.floor(w/sx);col++){const x=-w/2+sx/2+col*sx+(row%2)*sx/2,z=-d/2+sz/2+row*sz/2;if(x+sx/2<w/2+.001&&z+sz/2<d/2+.001)coords.push([cx+x,y,cz+z])}
 const mesh=new THREE.InstancedMesh(geo,mats.deck,coords.length);coords.forEach((p,i)=>{dummy.position.set(...p);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 for(const x of [cx-w/2,cx+w/2])channel(g,[x,y-.047,cz-d/2],[x,y-.047,cz+d/2],.1,.046,.005,mats.deck);for(const z of [cz-d/2,cz+d/2])channel(g,[cx-w/2,y-.047,z],[cx+w/2,y-.047,z],.1,.046,.005,mats.deck);
 for(let z=cz-d/2+.4;z<cz+d/2-.1;z+=.4)angle(g,[cx-w/2,y-.025,z],[cx+w/2,y-.025,z],.05,.005,mats.darkSteel);
}
function railing(g,a,b){const pa=v(...a),pb=v(...b),length=pa.distanceTo(pb),n=Math.ceil(length/.9);for(let i=0;i<=n;i++){const p=pa.clone().lerp(pb,i/n);box(g,[.034,1.1,.034],[p.x,p.y+.55,p.z],mats.deck);box(g,[.09,.008,.09],[p.x,p.y+.012,p.z],mats.steel);for(const dx of [-.025,.025])bolt(g,[p.x+dx,p.y+.02,p.z],'y',.005)}for(const h of [.5,1.08])rod(g,[pa.x,pa.y+h,pa.z],[pb.x,pb.y+h,pb.z],.017,mats.deck,12);const gg=beam(g,[pa.x,pa.y+.07,pa.z],[pb.x,pb.y+.07,pb.z],.12,.003,mats.deck);gg.rotateY(Math.PI/2);}
function makePlatform(){
 const g=platform=group('platform');
 deck(g,.8,2.6,-1.18,2.15,0);deck(g,2.16,.8,-.50,2.15,-1.70);
 const posts=[[-1.58,-1.22],[-1.58,1.22],[-.80,1.22],[-1.58,-2.05],[.54,-2.05],[.54,-1.37]];
 posts.forEach(([x,z])=>{box(g,[.10,2.04,.10],[x,1.045,z],mats.deck);box(g,[.24,.014,.24],[x,.029,z],mats.steel);box(g,[.34,.052,.34],[x,-.003,z],mats.concrete);for(const dx of [-.077,.077])for(const dz of [-.077,.077]){cylinder(g,.0065,.035,[x+dx,.045,z+dz],mats.zinc,'y',.0065,8);bolt(g,[x+dx,.066,z+dz],'y',.011)}
  for(const dx of [-.034,.034])bolt(g,[x+dx,2.095,z+.057],'z',.009);
 });
 for(const [a,b] of [[[-1.58,.22,-1.22],[-1.58,1.99,1.22]],[[-1.58,.22,1.22],[-1.58,1.99,-1.22]],[[-1.48,.22,-2.05],[.49,1.99,-2.05]],[[.49,.22,-2.05],[-1.48,1.99,-2.05]]])angle(g,a,b,.05,.005,mats.deck);
 railing(g,[-1.58,2.15,1.3],[-1.58,2.15,-2.10]);railing(g,[-1.58,2.15,1.30],[-.78,2.15,1.30]);railing(g,[-.77,2.15,-2.10],[.58,2.15,-2.10]);railing(g,[.58,2.15,-2.10],[.58,2.15,-1.30]);
 // The rear stair keeps the fan intake completely clear.
 const topZ=-2.10,bottomZ=-3.47,topY=2.15,bottomY=.07,stairX=-1.17;
 for(const x of [stairX-.335,stairX+.335]){channel(g,[x,bottomY,bottomZ],[x,topY,topZ],.1,.046,.005,mats.deck);box(g,[.20,.012,.22],[x,.025,bottomZ],mats.steel);for(const dz of [-.067,.067])bolt(g,[x,.04,bottomZ+dz],'y',.009)}
 for(let i=1;i<=10;i++){const t=i/10,y=bottomY+t*(topY-bottomY),z=bottomZ+t*(topZ-bottomZ)-.08;deck(g,.60,.175,stairX,y,z);for(const x of [stairX-.29,stairX+.29]){box(g,[.006,.07,.15],[x,y-.034,z],mats.steel);bolt(g,[x+(x<stairX?-.006:.006),y-.03,z],'x',.006)}}
 for(const x of [stairX-.35,stairX+.35]){for(const t of [0,.5,1]){const y=lerp(bottomY,topY,t),z=lerp(bottomZ,topZ,t);box(g,[.032,1.08,.032],[x,y+.54,z],mats.deck)}for(const h of [.50,1.08])rod(g,[x,bottomY+h,bottomZ],[x,topY+h,topZ],.017,mats.deck,12)}
 return g;
}
function cable(g,points,r=.009,mat=mats.wire){const curve=new THREE.CatmullRomCurve3(points.map(a=>v(...a)));return add(g,new THREE.TubeGeometry(curve,Math.max(18,points.length*7),r,6,false),mat);}
function makeCabinet(){
 const g=cabinet=group('cabinet'),cx=1.61,cy=1.25,cz=-1.15;
 // Sheet metal enclosure, open on the front behind a hinged door.
 box(g,[.6,.8,.022],[cx,cy,cz-.15],mats.paint);for(const x of [-.29,.29])box(g,[.02,.8,.30],[cx+x,cy,cz],mats.paint);for(const y of [-.39,.39])box(g,[.60,.02,.30],[cx,cy+y,cz],mats.paint);
 box(g,[.55,.74,.012],[cx,cy,cz-.125],mats.zinc);for(const x of [cx-.23,cx+.23]){box(g,[.04,.84,.04],[x,.45,cz],mats.darkSteel);box(g,[.20,.012,.20],[x,.025,cz],mats.steel);for(const dz of [-.06,.06])bolt(g,[x,.039,cz+dz],'y',.008)}
 const hinge=sub(g,'doorHinge');hinge.position.set(cx-.30,cy,cz+.16);door=hinge;const leaf=sub(hinge,'doorLeaf');
 box(leaf,[.61,.81,.023],[.303,0,0],mats.paintLight);box(leaf,[.563,.755,.010],[.303,0,-.016],mats.gasket);box(leaf,[.544,.736,.010],[.303,0,-.023],mats.paint);
 for(const y of [-.275,.275]){cylinder(leaf,.012,.083,[.002,y,.002],mats.steel,'y',.012,16);cylinder(leaf,.006,.093,[.002,y,.002],mats.zinc,'y',.006,12)}
 box(leaf,[.096,.163,.012],[.24,.18,.020],mats.black);plate(leaf,['30.0 °C','ЧАСТОТНОЕ УПРАВЛЕНИЕ'],.077,.073,[.24,.214,.027],[0,0,0],'#294c50','#b7d8bd');for(let i=0;i<6;i++)box(leaf,[.013,.013,.002],[.218+(i%3)*.022,.148-Math.floor(i/3)*.022,.028],i===0?mats.green:mats.paintEdge);
 for(const [x,mat] of [[.16,mats.green],[.24,mats.red]]){cylinder(leaf,.018,.018,[x,-.025,.028],mats.black,'z',.018,24);cylinder(leaf,.013,.005,[x,-.025,.04],mat,'z',.013,24)}
 cylinder(leaf,.018,.015,[.39,-.025,.03],mats.black,'z',.018,24);box(leaf,[.009,.039,.012],[.39,-.025,.044],mats.black,[0,0,-.45]);cylinder(leaf,.014,.01,[.54,.14,.027],mats.steel,'z',.014,24);box(leaf,[.012,.038,.006],[.54,.14,.036],mats.darkSteel,[0,0,.15]);
 for(const z of [cz-.08,cz+.08])for(let i=0;i<10;i++)box(g,[.005,.007,.046],[cx+.302,cy+.17-i*.022,z],mats.darkSteel);
 // Backplate: DIN rails, breaker, terminals, frequency drive and wiring ducts.
 for(const yy of [cy+.23,cy-.25])box(g,[.47,.027,.016],[cx,yy,cz-.085],mats.steel);
 for(let i=0;i<3;i++){box(g,[.035,.082,.057],[cx-.18+i*.038,cy+.23,cz-.05],mats.white);box(g,[.023,.019,.014],[cx-.18+i*.038,cy+.235,cz-.013],mats.black)}
 box(g,[.154,.265,.085],[cx+.09,cy+.04,cz-.051],mats.motorDark);box(g,[.145,.12,.010],[cx+.09,cy+.10,cz-.001],mats.black);plate(g,['VFD','30.0'],.083,.066,[cx+.09,cy+.12,cz+.006],[0,0,0],'#264c4f','#bde3c7');
 for(let i=0;i<11;i++)box(g,[.145,.006,.022],[cx+.09,cy-.01-i*.012,cz-.004],mats.paintEdge);
 for(let i=0;i<12;i++){box(g,[.027,.041,.029],[cx-.195+i*.033,cy-.25,cz-.057],i<2?mats.orange:mats.white);bolt(g,[cx-.195+i*.033,cy-.25,cz-.04],'z',.0035)}
 for(const x of [cx-.252,cx+.25]){box(g,[.035,.60,.042],[x,cy,cz-.075],mats.white);for(let i=0;i<22;i++)box(g,[.037,.006,.044],[x,cy-.275+i*.025,cz-.073],mats.paintEdge)}
 const cableMats=[mats.blue,mats.red,mats.black,mats.green];for(let i=0;i<8;i++){const x=cx-.19+i*.052;cable(g,[[x,cy-.23,cz-.037],[x,cy-.19,cz-.037],[cx+.20,cy-.16+i*.004,cz-.035],[cx+.20,cy+.17,cz-.035]],.0023,cableMats[i%4])}
 for(const x of [cx-.17,cx,cx+.17])cylinder(g,.013,.025,[x,cy-.406,cz],mats.black,'y',.013,12);
 cable(g,[[cx,cy-.41,cz],[cx,.40,cz],[.85,.11,-1.0],[.71,.12,.60],[.70,.66,.88],[.22,.94,.94],[.095,1.31,.94]],.009,mats.wire);
 cable(g,[[cx-.17,cy-.41,cz],[cx-.17,.21,cz],[.45,.12,-1.44],[.04,.26,-1.44],[.015,.47,-1.44]],.004,mats.black);
 return g;
}
function makeFoundation(){
 const g=new THREE.Group();g.name='foundation';root.add(g);box(g,[2.02,.055,3.0],[0,-.044,-.02],mats.concrete);for(const x of [-.62,.62])for(const z of [-1.10,1.10]){box(g,[.28,.014,.28],[x,-.009,z],mats.darkSteel);for(const dx of [-.087,.087])for(const dz of [-.087,.087])bolt(g,[x+dx,.006,z+dz],'y',.008)}
 for(const x of [-.9,.9])for(let z=-1.35;z<1.4;z+=.55){const line=box(g,[.001,.0005,.11],[x,-.015,z],mats.paintEdge);line.castShadow=false;line.receiveShadow=false}
 optimize(g);return g;
}
initMaterials();
makeBody(); makeFan(); makeFill(); makeDistribution(); makeEliminator();
makeBasin(); makePlatform(); makeCabinet(); makeFoundation();
// All casing panels remain present and opaque. No cutaway or opacity control.
for (const panel of panels) {
  panel.g.visible=true;
  panel.g.traverse(o=>{
    if(o.isMesh) {o.material.opacity=1; o.material.transparent=false; o.material.depthWrite=true;}
  });
}
for (const id of Object.keys(groups)) optimize(groups[id]);
root.name='cooling-tower';
return root;
};
