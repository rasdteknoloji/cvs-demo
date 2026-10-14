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

  var RB=.30,HB=.86,GAS=.06,NK=.07,BODY0=-(GAS+NK),CR=.493,CH=.42;
  var pivot=new THREE.Group(), spin=new THREE.Group(), dev=new THREE.Group();
  scene.add(pivot);pivot.add(spin);spin.add(dev);
  var MID=(CH+(BODY0-HB))/2; dev.position.y=-MID;

  /* gövde: şaşırtmalı yuvarlak delikler + altta dikey yarıklar (fotoğraftaki model) */
  var sw=2048,sh=Math.round(2048*HB/(2*Math.PI*RB));
  var holes=tex(sw,sh,function(g,w,h){
    g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';
    var cols=12,rows=6,top=h*.05,bot=h*.24,rowH=(h-top-bot)/rows,colW=w/cols,r=Math.min(colW*.27,rowH*.36);
    for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){var cx=x*colW+colW/2+(y%2?colW/2:0),cy=top+y*rowH+rowH/2;[cx,cx-w].forEach(function(xx){g.beginPath();g.arc(xx,cy,r,0,7);g.fill()})}
    var sy=h-bot+h*.05,sl=bot-h*.11,swd=colW*.34;
    for(var x2=0;x2<cols;x2++){var sx=x2*colW+colW/2-swd/2+colW/4;[sx,sx-w].forEach(function(xx){rr(g,xx,sy,swd,sl,swd/2);g.fill()})}
  });
  var body=new THREE.Mesh(new THREE.CylinderGeometry(RB,RB,HB,160,1,true),new THREE.MeshStandardMaterial({color:0xf0f2f5,map:brushed,alphaMap:holes,alphaTest:.5,metalness:.94,roughness:.24,side:THREE.DoubleSide}));
  body.position.y=BODY0-HB/2;dev.add(body);
  var bodyIn=new THREE.Mesh(new THREE.CylinderGeometry(RB-.01,RB-.01,HB,160,1,true),new THREE.MeshStandardMaterial({color:0x2c3036,metalness:.6,roughness:.55,side:THREE.BackSide,alphaMap:holes,alphaTest:.5}));
  bodyIn.position.y=BODY0-HB/2;dev.add(bodyIn);
  var core=new THREE.Mesh(new THREE.CylinderGeometry(RB*.55,RB*.55,HB*.92,48),new THREE.MeshStandardMaterial({color:0x0e0f12,roughness:.9,metalness:0}));
  core.position.y=BODY0-HB/2;dev.add(core);
  var baseHoles=tex(1024,1024,function(g,w,h){g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';var R=w/2;
    for(var k=0;k<12;k++){var a=k/12*Math.PI*2;g.beginPath();g.arc(R+Math.cos(a)*R*.66,R+Math.sin(a)*R*.66,R*.085,0,7);g.fill()}
    for(var k2=0;k2<7;k2++){var a2=k2/7*Math.PI*2;g.beginPath();g.arc(R+Math.cos(a2)*R*.33,R+Math.sin(a2)*R*.33,R*.075,0,7);g.fill()}
    g.beginPath();g.arc(R,R,R*.07,0,7);g.fill()});
  var base=new THREE.Mesh(new THREE.CircleGeometry(RB,96),new THREE.MeshStandardMaterial({color:0xe2e6eb,map:brushed,alphaMap:baseHoles,alphaTest:.5,metalness:.95,roughness:.28,side:THREE.DoubleSide}));
  base.rotation.x=Math.PI/2;base.position.y=BODY0-HB+.01;dev.add(base);
  var rim=new THREE.Mesh(new THREE.TorusGeometry(RB,.014,12,128),steel);rim.rotation.x=Math.PI/2;rim.position.y=BODY0-HB;dev.add(rim);

  /* boyun + conta + bilezik */
  ringBand(.30,.352,BODY0,-GAS,steel,dev);
  for(var i=0;i<3;i++){var a=i/3*Math.PI*2+.4;var sc=new THREE.Mesh(new THREE.CircleGeometry(.013,20),new THREE.MeshStandardMaterial({color:0x15161a,metalness:.4,roughness:.5}));sc.position.set(Math.cos(a)*.3535,-GAS-NK/2,Math.sin(a)*.3535);sc.lookAt(Math.cos(a)*2,-GAS-NK/2,Math.sin(a)*2);dev.add(sc)}
  ringBand(.33,.462,-GAS,0,rubber,dev);
  ringBand(.40,CR,0,CH-.02,steel,dev);
  var cham=new THREE.Mesh(new THREE.CylinderGeometry(CR-.022,CR,.02,160,1,true),steel);cham.position.y=CH-.01;dev.add(cham);
  var topR=new THREE.Mesh(new THREE.RingGeometry(.40,CR-.022,160),steel);topR.rotation.x=-Math.PI/2;topR.position.y=CH;dev.add(topR);
  [0,Math.PI].forEach(function(a){var n=new THREE.Mesh(new THREE.BoxGeometry(.11,.05,.035),new THREE.MeshStandardMaterial({color:0x1c1d20}));n.position.set(Math.cos(a)*.405,CH-.03,Math.sin(a)*.405);n.lookAt(0,CH-.03,0);dev.add(n)});
  var grooveMat=new THREE.MeshStandardMaterial({color:0x8e949d,metalness:.9,roughness:.35});
  [.035,CH-.07].forEach(function(y){var gr=new THREE.Mesh(new THREE.TorusGeometry(CR+.001,.0045,8,160),grooveMat);gr.rotation.x=Math.PI/2;gr.position.y=y;dev.add(gr)});

  /* bilezik baskısı: metal üstüne doğrudan, şeffaf zemin, 4096 px */
  var printTex=tex(4096,300,function(g,w,h){
    g.clearRect(0,0,w,h);var seg=w/2,F="Arial, Helvetica, 'Liberation Sans', sans-serif";
    function W(sc){g.font='600 '+116*sc+'px '+F;var a=g.measureText('www.').width,c=g.measureText('yakitkoruma.com').width;g.font='900 '+176*sc+'px '+F;var b=g.measureText('CVS').width+6*sc;g.font='700 '+112*sc+'px '+F;return [a,b,c,g.measureText('0532 397 83 97').width,110*sc]}
    var sc=1,ws=W(1),tot=ws[0]+ws[1]+ws[2]+ws[3]+ws[4];if(tot>seg*.9){sc=seg*.9/tot;ws=W(sc);tot=ws[0]+ws[1]+ws[2]+ws[3]+ws[4]}
    for(var k=0;k<2;k++){
      var x=k*seg+(seg-tot)/2,y=h*.66;
      g.font='600 '+116*sc+'px '+F;g.fillStyle='#2b2e8c';g.fillText('www.',x,y);x+=ws[0];
      g.font='900 '+176*sc+'px '+F;g.fillStyle='#d7232f';g.fillText('CVS',x,y+12*sc);x+=ws[1];
      g.font='600 '+116*sc+'px '+F;g.fillStyle='#2b2e8c';g.fillText('yakitkoruma.com',x,y);x+=ws[2]+ws[4];
      g.font='700 '+112*sc+'px '+F;g.fillStyle='#c8102e';g.fillText('0532 397 83 97',x,y);
    }
  },true);
  var print=new THREE.Mesh(new THREE.CylinderGeometry(CR+.0015,CR+.0015,.22,192,1,true),new THREE.MeshStandardMaterial({map:printTex,transparent:true,roughness:.45,metalness:.1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  print.position.y=.19;dev.add(print);

  /* üstte siyah kauçuk klape (kapaksız hali) */
  var flapG=new THREE.Group();flapG.position.y=CH-.06;dev.add(flapG);
  var seat=new THREE.Mesh(new THREE.CylinderGeometry(.40,.40,.04,96),rubber);seat.position.y=-.02;flapG.add(seat);
  var fs=new THREE.Shape();(function(){var w=.44,h=.34,r=.06,x=-w/2,y=-h/2;fs.moveTo(x+r,y);fs.lineTo(x+w-r,y);fs.quadraticCurveTo(x+w,y,x+w,y+r);fs.lineTo(x+w,y+h-r);fs.quadraticCurveTo(x+w,y+h,x+w-r,y+h);fs.lineTo(x+r,y+h);fs.quadraticCurveTo(x,y+h,x,y+h-r);fs.lineTo(x,y+r);fs.quadraticCurveTo(x,y,x+r,y)})();
  var flapGeo=new THREE.ExtrudeGeometry(fs,{depth:.05,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:4,curveSegments:16});flapGeo.translate(0,0,-.025);
  var flap=new THREE.Mesh(flapGeo,new THREE.MeshStandardMaterial({color:0x050506,roughness:.8,metalness:0,envMapIntensity:.12}));
  flap.rotation.x=-Math.PI/2+.32;flap.position.set(0,.06,.02);flapG.add(flap);

  /* kilitli kapak (isteğe bağlı) */
  var cap=new THREE.Group();cap.visible=false;dev.add(cap);
  var ribs=tex(2048,64,function(g,w,h){g.fillStyle='#808080';g.fillRect(0,0,w,h);var y0=Math.round(h*.64),y1=Math.round(h*.86);for(var x=0;x<w;x+=16){g.fillStyle='#262626';g.fillRect(x,y0,7,y1-y0)}});
  var prof=[[.33,0],[.49,0],[.503,.015],[.503,.13],[.49,.165],[.45,.19],[.35,.208],[.12,.215],[.001,.215]].map(function(p){return new THREE.Vector2(p[0],p[1])});
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(prof,128),new THREE.MeshStandardMaterial({color:0x060607,roughness:.32,metalness:.05,envMapIntensity:.3,bumpMap:ribs,bumpScale:.01})));
  var boss=new THREE.Mesh(new THREE.CylinderGeometry(.088,.095,.045,64),new THREE.MeshStandardMaterial({color:0xd9dde3,metalness:1,roughness:.18}));boss.position.y=.237;cap.add(boss);
  var kg=new THREE.Group();kg.position.y=.26;cap.add(kg);
  var blade=new THREE.Mesh(new THREE.BoxGeometry(.05,.07,.012),new THREE.MeshStandardMaterial({color:0xcfd3d9,metalness:1,roughness:.2}));blade.position.y=.035;kg.add(blade);
  var kh=new THREE.Shape();(function(){var w=.15,h=.16,r=.05,x=-w/2,y=0;kh.moveTo(x+r,y);kh.lineTo(x+w-r,y);kh.quadraticCurveTo(x+w,y,x+w,y+r);kh.lineTo(x+w,y+h-r);kh.quadraticCurveTo(x+w,y+h,x+w-r,y+h);kh.lineTo(x+r,y+h);kh.quadraticCurveTo(x,y+h,x,y+h-r);kh.lineTo(x,y+r);kh.quadraticCurveTo(x,y,x+r,y);var hp=new THREE.Path();hp.absarc(0,h-.042,.019,0,Math.PI*2,true);kh.holes.push(hp)})();
  var hg=new THREE.ExtrudeGeometry(kh,{depth:.03,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:3,curveSegments:16});hg.translate(0,0,-.015);hg.scale(1.15,1.15,1);
  var head=new THREE.Mesh(hg,new THREE.MeshStandardMaterial({color:0x050506,roughness:.35,metalness:.05,envMapIntensity:.3}));head.position.y=.065;kg.add(head);

  /* zemin gölgesi */
  var blob=tex(256,256,function(g,w,h){var gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(0,0,0,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)});
  var shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false,opacity:.55}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.92;scene.add(shadow);

  cam.position.set(0,.62,5.05);cam.lookAt(0,-.04,0);

  /* etkileşim */
  var yaw=-.6,pitch=.12,vy=0,vp=0,auto=true,dragging=false,lastX=0,lastY=0,idle=0,dirty=true,capK=0,capOn=false,last=0,visible=true,spinOn=true;
  var SPEED=-.55; // saat yönü (üstten bakınca)
  function down(e){dragging=true;auto=false;lastX=e.clientX;lastY=e.clientY;vy=vp=0;box.classList.add('grab');try{cvs.setPointerCapture(e.pointerId)}catch(_){}}
  function move(e){if(!dragging)return;var dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;vy=dx*.009;vp=dy*.007;yaw+=vy;pitch=Math.max(-1.2,Math.min(1.2,pitch+vp));dirty=true;box.classList.add('used')}
  function up(){if(!dragging)return;dragging=false;idle=0;box.classList.remove('grab')}
  cvs.addEventListener('pointerdown',down);cvs.addEventListener('pointermove',move);
  cvs.addEventListener('pointerup',up);cvs.addEventListener('pointercancel',up);cvs.addEventListener('lostpointercapture',up);
  var bCap=box.querySelector('[data-v="cap"]'),bSpin=box.querySelector('[data-v="spin"]'),bReset=box.querySelector('[data-v="reset"]');
  if(bCap)bCap.addEventListener('click',function(){capOn=!capOn;bCap.classList.toggle('on',capOn);bCap.textContent=capOn?'Deckel abnehmen':'Abschließbaren Deckel aufsetzen';dirty=true});
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
    cap.visible=capK>.01;cap.position.y=CH+.012+(1-ck)*.6;cap.rotation.y=(1-ck)*1.2;
    flapG.visible=ck<.9;
    cam.position.set(0,.62+.12*ck,5.05+.75*ck);cam.lookAt(0,-.04+.12*ck,0);
    spin.rotation.y=yaw;pivot.rotation.x=pitch;
    shadow.material.opacity=.55*(1-Math.min(1,Math.abs(pitch)*.6));
    if(dirty){renderer.render(scene,cam);dirty=false;box.classList.add('ready')}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
