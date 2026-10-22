/* CVS ürün görüntüleyici: saat yönünde döner, sürükleyerek her açıdan incelenir */
(function(){
  var box=document.getElementById('viewer3d'); if(!box) return;
  var cvs=box.querySelector('canvas'), fb=box.querySelector('.v-fallback');
  if(typeof THREE==='undefined'){box.classList.add('nogl');return}
  var renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:cvs,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){box.classList.add('nogl');return}
  var DPR=Math.min(window.devicePixelRatio||1,2.5);
  renderer.setPixelRatio(DPR);
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
  var scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(26,1,.05,50);
  function size(){var w=box.clientWidth,h=box.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();dirty=true}

  /* stüdyo yansıması */
  var pmrem=new THREE.PMREMGenerator(renderer), env=new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30,30,30),new THREE.MeshBasicMaterial({color:0x3a3d44,side:THREE.BackSide})));
  function soft(w,h,x,y,z,c,i){var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m)}
  soft(14,5,0,13,0,0xffffff,3.4);soft(7,10,13,3,5,0xffffff,3.2);soft(7,10,-13,2,-4,0xe4ebff,2.4);
  soft(18,3,0,-1,14,0xffffff,2.0);soft(5,5,-7,7,10,0xfff0e0,2.2);soft(6,6,8,6,-10,0xffffff,1.8);soft(4,8,-12,-4,6,0xffd9d9,1.4);
  scene.environment=pmrem.fromScene(env,.03).texture;
  scene.add(new THREE.HemisphereLight(0xffffff,0x0a0a0c,.4));
  var kl=new THREE.DirectionalLight(0xffffff,1.6);kl.position.set(4,7,6);scene.add(kl);
  var rl=new THREE.DirectionalLight(0xdfe8ff,1.2);rl.position.set(-5,3,-6);scene.add(rl);

  var ANISO=renderer.capabilities.getMaxAnisotropy();
  function tex(w,h,draw,srgb){var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');draw(g,w,h);var t=new THREE.CanvasTexture(c);t.anisotropy=ANISO;if(srgb)t.encoding=THREE.sRGBEncoding;return t}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function ringBand(rIn,rOut,y0,y1,mat,parent){
    var h=y1-y0,grp=new THREE.Group();
    var o=new THREE.Mesh(new THREE.CylinderGeometry(rOut,rOut,h,128,1,true),mat);o.position.y=y0+h/2;grp.add(o);
    var i=new THREE.Mesh(new THREE.CylinderGeometry(rIn,rIn,h,128,1,true),mat.clone());i.material.side=THREE.BackSide;i.position.y=y0+h/2;grp.add(i);
    var t=new THREE.Mesh(new THREE.RingGeometry(rIn,rOut,128),mat);t.rotation.x=-Math.PI/2;t.position.y=y1;grp.add(t);
    var b=new THREE.Mesh(new THREE.RingGeometry(rIn,rOut,128),mat);b.rotation.x=Math.PI/2;b.position.y=y0;grp.add(b);
    parent.add(grp);return grp;
  }

  /* malzemeler: fırçalanmış paslanmaz yüzey (yüksek çözünürlük) */
  var brushed=tex(2048,2048,function(g,w,h){g.fillStyle='#c9ced6';g.fillRect(0,0,w,h);for(var i=0;i<5200;i++){var l=150+Math.random()*95|0;g.strokeStyle='rgba('+l+','+l+','+(l+6)+','+(.04+Math.random()*.08)+')';g.lineWidth=Math.random()*1.6;var y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+(Math.random()-.5)*3);g.stroke()}},true);
  var steel=new THREE.MeshStandardMaterial({color:0xf3f5f8,map:brushed,metalness:.95,roughness:.22});
  var rubber=new THREE.MeshStandardMaterial({color:0x0a0a0c,roughness:.7,metalness:0,envMapIntensity:.25});

  /* ---- Ölçüler (fotoğraftaki siyah kapaklı model; bilezik çapı = 1 birim) ---- */
  var RB=.27,HB=.72,GAS=.05,NK=.035,BODY0=-(GAS+NK),CR=.493,CH=.27;
  var pivot=new THREE.Group(), spin=new THREE.Group(), dev=new THREE.Group();
  scene.add(pivot);pivot.add(spin);spin.add(dev);
  var MID=(CH+.18+(BODY0-HB))/2; dev.position.y=-MID;
  var alu=new THREE.MeshStandardMaterial({color:0xeef1f5,map:brushed,metalness:.92,roughness:.26});
  var aluDark=new THREE.MeshStandardMaterial({color:0x2a2d33,metalness:.55,roughness:.6,side:THREE.BackSide});

  /* gövde: 6 sıra, sıra başına 4 uzun yatay yuva (stadyum), sıralar yarım adım kaydırmalı */
  var sw=2048,sh=Math.round(2048*HB/(2*Math.PI*RB));
  var holes=tex(sw,sh,function(g,w,h){
    g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';
    var rows=6,per=4,top=h*.09,bot=h*.11,rowH=(h-top-bot)/rows,slotH=rowH*.5,arc=w/per,slotW=arc*.72;
    for(var y=0;y<rows;y++){var cy=top+y*rowH+rowH/2,off=(y%2)?arc/2:0;
      for(var x=0;x<per;x++){var cx=x*arc+arc/2+off;[cx,cx-w,cx+w].forEach(function(xx){rr(g,xx-slotW/2,cy-slotH/2,slotW,slotH,slotH/2);g.fill()})}}
  });
  var body=new THREE.Mesh(new THREE.CylinderGeometry(RB,RB,HB,192,1,true),new THREE.MeshStandardMaterial({color:0xeef1f5,map:brushed,alphaMap:holes,alphaTest:.5,metalness:.92,roughness:.26,side:THREE.DoubleSide}));
  body.position.y=BODY0-HB/2;dev.add(body);
  /* et kalınlığı: iç yüzey (koyu) + yuva kenarlarını belli eden ikinci kabuk */
  var bodyIn=new THREE.Mesh(new THREE.CylinderGeometry(RB-.018,RB-.018,HB,192,1,true),new THREE.MeshStandardMaterial({color:0x33373d,metalness:.6,roughness:.55,side:THREE.BackSide,alphaMap:holes,alphaTest:.5}));
  bodyIn.position.y=BODY0-HB/2;dev.add(bodyIn);
  var core=new THREE.Mesh(new THREE.CylinderGeometry(RB*.62,RB*.62,HB*.9,48),new THREE.MeshStandardMaterial({color:0x111318,roughness:.9,metalness:0}));
  core.position.y=BODY0-HB/2-.02;dev.add(core);
  /* taban: kapalı işlenmiş disk */
  var base=new THREE.Mesh(new THREE.CircleGeometry(RB,96),new THREE.MeshStandardMaterial({color:0xdfe3e8,map:brushed,metalness:.9,roughness:.32,side:THREE.DoubleSide}));
  base.rotation.x=Math.PI/2;base.position.y=BODY0-HB+.004;dev.add(base);
  var rim=new THREE.Mesh(new THREE.TorusGeometry(RB-.006,.008,10,128),alu);rim.rotation.x=Math.PI/2;rim.position.y=BODY0-HB+.004;dev.add(rim);

  /* boyun + conta (siyah kauçuk) + bilezik */
  ringBand(RB-.002,RB+.04,BODY0,-GAS,alu,dev);
  var sc=new THREE.Mesh(new THREE.CircleGeometry(.012,20),new THREE.MeshStandardMaterial({color:0x15161a,metalness:.4,roughness:.5}));sc.position.set(0,-GAS-NK/2,RB+.0405);dev.add(sc);
  ringBand(.33,.455,-GAS,.005,rubber,dev);
  /* bilezik: iki kademeli; alt kademe daha geniş, üst kademe hafif dar; üst kenar pah */
  ringBand(.40,CR,0,CH*.62,alu,dev);
  var gro=new THREE.Mesh(new THREE.TorusGeometry(CR-.004,.005,8,192),new THREE.MeshStandardMaterial({color:0x7d838c,metalness:.9,roughness:.4}));gro.rotation.x=Math.PI/2;gro.position.y=CH*.62;dev.add(gro);
  ringBand(.40,CR-.012,CH*.62,CH-.02,alu,dev);
  var cham=new THREE.Mesh(new THREE.CylinderGeometry(CR-.034,CR-.012,.02,192,1,true),alu);cham.position.y=CH-.01;dev.add(cham);
  var topR=new THREE.Mesh(new THREE.RingGeometry(.40,CR-.034,192),alu);topR.rotation.x=-Math.PI/2;topR.position.y=CH;dev.add(topR);
  /* iç delik: kademeli; ağızda kama yuvası, derinde koyu iç yüzey ve alt bilezik */
  var bore=new THREE.Mesh(new THREE.CylinderGeometry(.40,.40,CH+GAS+NK,128,1,true),new THREE.MeshStandardMaterial({color:0x9ea4ad,metalness:.85,roughness:.4,side:THREE.BackSide}));bore.position.y=(CH-(GAS+NK))/2;dev.add(bore);
  var ledge=new THREE.Mesh(new THREE.RingGeometry(RB-.01,.40,128),new THREE.MeshStandardMaterial({color:0x5a5f66,metalness:.7,roughness:.5}));ledge.rotation.x=-Math.PI/2;ledge.position.y=CH*.35;dev.add(ledge);
  var lowBore=new THREE.Mesh(new THREE.CylinderGeometry(RB-.01,RB-.01,CH*.35+GAS+NK,96,1,true),aluDark);lowBore.position.y=(CH*.35-(GAS+NK))/2;dev.add(lowBore);
  var key=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.03),new THREE.MeshStandardMaterial({color:0x5f656d,metalness:.8,roughness:.45}));key.position.set(0,CH-.03,-.405);dev.add(key);

  /* bilezik baskısı: metal üstüne doğrudan, şeffaf zemin, 4096 px */
  var printTex=tex(4096,300,function(g,w,h){
    g.clearRect(0,0,w,h);var seg=w/2,F="Arial, Helvetica, 'Liberation Sans', sans-serif";
    function W(sc){g.font='600 '+116*sc+'px '+F;var a=g.measureText('www.').width,c=g.measureText('yakitkoruma.com').width;g.font='900 '+176*sc+'px '+F;var b=g.measureText('CVS').width+6*sc;g.font='700 '+112*sc+'px '+F;return [a,b,c,g.measureText('0532 397 83 97').width,g.measureText('  ').width]}
    var sc=1,ws=W(1),tot=ws[0]+ws[1]+ws[2]+ws[3]+ws[4];if(tot>seg*.9){sc=seg*.9/tot;ws=W(sc);tot=ws[0]+ws[1]+ws[2]+ws[3]+ws[4]}
    for(var k=0;k<2;k++){
      var x=k*seg+(seg-tot)/2,y=h*.66;
      g.font='600 '+116*sc+'px '+F;g.fillStyle='#2b2e8c';g.fillText('www.',x,y);x+=ws[0];
      g.font='900 '+176*sc+'px '+F;g.fillStyle='#d7232f';g.fillText('CVS',x,y+12*sc);x+=ws[1];
      g.font='600 '+116*sc+'px '+F;g.fillStyle='#2b2e8c';g.fillText('yakitkoruma.com',x,y);x+=ws[2]+ws[4];
      g.font='700 '+112*sc+'px '+F;g.fillStyle='#c8102e';g.fillText('0532 397 83 97',x,y);
    }
  },true);
  var print=new THREE.Mesh(new THREE.CylinderGeometry(CR+.0015,CR+.0015,.13,192,1,true),new THREE.MeshStandardMaterial({map:printTex,transparent:true,roughness:.45,metalness:.1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  print.position.y=CH*.31;dev.add(print);

  /* kapaksız hali: klape yok (fotoğraftaki model açık ağızlı) */
  var flapG=new THREE.Group();dev.add(flapG);

  /* siyah beş loblu plastik kapak + menteşeli anahtar kapağı */
  var cap=new THREE.Group();cap.visible=false;dev.add(cap);
  var plastic=new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.78,metalness:0,envMapIntensity:.25});
  var plasticSoft=new THREE.MeshStandardMaterial({color:0x141416,roughness:.6,metalness:0,envMapIntensity:.3});
  var lobe=new THREE.Shape();(function(){var N=180;for(var i=0;i<=N;i++){var t=i/N*Math.PI*2,c=Math.cos(5*t),r=.41+.16*Math.pow(Math.max(0,c),.5)-.015*Math.pow(Math.max(0,-c),2);var x=Math.cos(t)*r,y=Math.sin(t)*r;i?lobe.lineTo(x,y):lobe.moveTo(x,y)}lobe.closePath()})();
  var capGeo=new THREE.ExtrudeGeometry(lobe,{depth:.24,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:6,curveSegments:24});capGeo.rotateX(-Math.PI/2);capGeo.translate(0,.05,0);
  cap.add(new THREE.Mesh(capGeo,plastic));
  /* lob araları: üstte beş oluk */
  for(var li=0;li<5;li++){var la=li/5*Math.PI*2+Math.PI/5;var grv=new THREE.Mesh(new THREE.BoxGeometry(.05,.03,.22),plasticSoft);grv.position.set(Math.cos(la)*.3,.335,Math.sin(la)*.3);grv.rotation.y=-la+Math.PI/2;cap.add(grv)}
  /* orta göbek + menteşeli anahtar kapağı */
  var hub=new THREE.Mesh(new THREE.CylinderGeometry(.2,.23,.06,64),plastic);hub.position.y=.35;cap.add(hub);
  for(var ri=0;ri<5;ri++){var ra=ri/5*Math.PI*2;var ridge=new THREE.Mesh(new THREE.BoxGeometry(.3,.025,.07),plastic);ridge.position.set(Math.cos(ra)*.34,.34,Math.sin(ra)*.34);ridge.rotation.y=-ra;cap.add(ridge)}
  var kc=new THREE.Shape();(function(){var w=.22,h=.16,r=.05,x=-w/2,y=-h/2;kc.moveTo(x+r,y);kc.lineTo(x+w-r,y);kc.quadraticCurveTo(x+w,y,x+w,y+r);kc.lineTo(x+w,y+h-r);kc.quadraticCurveTo(x+w,y+h,x+w-r,y+h);kc.lineTo(x+r,y+h);kc.quadraticCurveTo(x,y+h,x,y+h-r);kc.lineTo(x,y+r);kc.quadraticCurveTo(x,y,x+r,y)})();
  var kcGeo=new THREE.ExtrudeGeometry(kc,{depth:.035,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:3,curveSegments:12});kcGeo.rotateX(-Math.PI/2);
  var kcover=new THREE.Mesh(kcGeo,plasticSoft);kcover.position.set(.02,.37,0);kcover.rotation.y=.35;kcover.rotation.z=.06;cap.add(kcover);
  var hinge=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.17,16),plasticSoft);hinge.rotation.z=Math.PI/2;hinge.rotation.y=.35;hinge.position.set(-.09,.375,-.03);cap.add(hinge);
  var kg=new THREE.Group();cap.add(kg);  /* animasyon uyumluluğu için boş grup */
  var capBottom=new THREE.Mesh(new THREE.RingGeometry(.36,.50,96),plastic);capBottom.rotation.x=Math.PI/2;capBottom.position.y=.052;cap.add(capBottom);
  var capSkirt=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.06,96,1,true),new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.8,side:THREE.BackSide}));capSkirt.position.y=.08;cap.add(capSkirt);

  /* zemin gölgesi */
  var blob=tex(256,256,function(g,w,h){var gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(0,0,0,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)});
  var shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false,opacity:.55}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.86;scene.add(shadow);

  cam.position.set(0,.62,4.9);cam.lookAt(0,-.04,0);

  /* etkileşim */
  var yaw=-.6,pitch=.12,vy=0,vp=0,auto=true,dragging=false,lastX=0,lastY=0,idle=0,dirty=true,capK=0,capOn=false,last=0,visible=true,spinOn=true;
  var SPEED=-.55; // saat yönü (üstten bakınca)
  function down(e){dragging=true;auto=false;lastX=e.clientX;lastY=e.clientY;vy=vp=0;box.classList.add('grab');try{cvs.setPointerCapture(e.pointerId)}catch(_){}}
  function move(e){if(!dragging)return;var dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;vy=dx*.009;vp=dy*.007;yaw+=vy;pitch=Math.max(-1.2,Math.min(1.2,pitch+vp));dirty=true;box.classList.add('used')}
  function up(){if(!dragging)return;dragging=false;idle=0;box.classList.remove('grab')}
  cvs.addEventListener('pointerdown',down);cvs.addEventListener('pointermove',move);
  cvs.addEventListener('pointerup',up);cvs.addEventListener('pointercancel',up);cvs.addEventListener('lostpointercapture',up);
  var bCap=box.querySelector('[data-v="cap"]'),bSpin=box.querySelector('[data-v="spin"]'),bReset=box.querySelector('[data-v="reset"]');
  if(bCap)bCap.addEventListener('click',function(){capOn=!capOn;bCap.classList.toggle('on',capOn);bCap.textContent=capOn?'Deckel abnehmen':'Deckel aufsetzen';dirty=true});
  if(bSpin)bSpin.addEventListener('click',function(){spinOn=!spinOn;bSpin.classList.toggle('on',!spinOn);bSpin.textContent=spinOn?'Stopp':'Drehen';auto=spinOn;dirty=true});
  if(bReset)bReset.addEventListener('click',function(){yaw=-.6;pitch=.12;vy=vp=0;auto=spinOn;dirty=true});
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)requestAnimationFrame(loop)}).observe(box);
  if(window.ResizeObserver)new ResizeObserver(size).observe(box);else addEventListener('resize',size);
  size();

  function loop(now){
    if(!visible)return;
    var dt=Math.min(.05,last?(now-last)/1000:.016);last=now;
    if(!dragging){
      if(Math.abs(vy)>1e-4||Math.abs(vp)>1e-4){yaw+=vy;pitch=Math.max(-1.2,Math.min(1.2,pitch+vp));vy*=.92;vp*=.9;dirty=true}
      idle+=dt; if(!auto&&spinOn&&idle>2.2)auto=true;
      if(auto){yaw+=SPEED*dt;pitch+=(.12-pitch)*.02;dirty=true}
    }
    var tk=capOn?1:0;if(capK!==tk){capK=tk>capK?Math.min(1,capK+dt*2.2):Math.max(0,capK-dt*2.2);dirty=true}var ck=capK<.5?4*capK*capK*capK:1-Math.pow(-2*capK+2,3)/2;
    cap.visible=capK>.01;cap.position.y=CH-.05+(1-ck)*.6;cap.rotation.y=(1-ck)*1.2;
    flapG.visible=ck<.9;
    cam.position.set(0,.62+.12*ck,4.9+.6*ck);cam.lookAt(0,-.04+.12*ck,0);
    spin.rotation.y=yaw;pivot.rotation.x=pitch;
    shadow.material.opacity=.55*(1-Math.min(1,Math.abs(pitch)*.6));
    if(dirty){renderer.render(scene,cam);dirty=false;box.classList.add('ready')}
    requestAnimationFrame(loop);
  }
  box.__v={set:function(y,pt,c){yaw=y;pitch=pt;capOn=!!c;capK=c?1:0;auto=false;spinOn=false;dirty=true}};
  requestAnimationFrame(loop);
})();
