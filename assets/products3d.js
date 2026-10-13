/* CVS ürün kataloğu: kartlar + tek ortak 3D sahne (her ürün fotoğraflarından ölçeklenmiş parametrik model) */
(function(){
  var grid=document.getElementById('pgrid'); if(!grid) return;
  var DATA=window.CVS_URUNLER||[];
  var modal=document.getElementById('pmodal'), stage=modal.querySelector('.pm-stage'), cvs=modal.querySelector('canvas'),
      photo=modal.querySelector('.pm-photo'), thumbs=modal.querySelector('.pm-thumbs'), ui=modal.querySelector('.pm-ui'),
      idxEl=modal.querySelector('.pm-idx'), capBtn=modal.querySelector('[data-p="cap"]'), resetBtn=modal.querySelector('[data-p="reset"]');
  var cur=-1, view='3d', lastFocus=null;

  /* ---------- 3D motoru (ilk açılışta kurulur) ---------- */
  var R=null;
  function engine(){
    if(R!==null) return R;
    R=false;
    if(typeof THREE==='undefined') return R;
    var renderer;
    try{renderer=new THREE.WebGLRenderer({canvas:cvs,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){return R}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
    var scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(26,1,.05,50);
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
    function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
    var brushed=tex(2048,2048,function(g,w,h){g.fillStyle='#c9ced6';g.fillRect(0,0,w,h);for(var i=0;i<5200;i++){var l=150+Math.random()*95|0;g.strokeStyle='rgba('+l+','+l+','+(l+6)+','+(.04+Math.random()*.08)+')';g.lineWidth=Math.random()*1.6;var y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+(Math.random()-.5)*3);g.stroke()}},true);
    var M={
      steel:new THREE.MeshStandardMaterial({color:0xf3f5f8,map:brushed,metalness:.95,roughness:.22}),
      matte:new THREE.MeshStandardMaterial({color:0xdfe3e8,map:brushed,metalness:.9,roughness:.42}),
      rubber:new THREE.MeshStandardMaterial({color:0x0a0a0c,roughness:.7,metalness:0,envMapIntensity:.25}),
      plastic:new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.42,metalness:0,envMapIntensity:.35}),
      dark:new THREE.MeshStandardMaterial({color:0x2c3036,metalness:.6,roughness:.55,side:THREE.BackSide}),
      ptfe:new THREE.MeshStandardMaterial({color:0xf4f4f2,roughness:.55,metalness:0,envMapIntensity:.4})
    };
    function band(rIn,rOut,y0,y1,mat,parent,seg){
      seg=seg||128;var h=y1-y0,g=new THREE.Group();
      var o=new THREE.Mesh(new THREE.CylinderGeometry(rOut,rOut,h,seg,1,true),mat);o.position.y=y0+h/2;g.add(o);
      var im=mat.clone();im.side=THREE.BackSide;var i=new THREE.Mesh(new THREE.CylinderGeometry(rIn,rIn,h,seg,1,true),im);i.position.y=y0+h/2;g.add(i);
      var t=new THREE.Mesh(new THREE.RingGeometry(rIn,rOut,seg),mat);t.rotation.x=-Math.PI/2;t.position.y=y1;g.add(t);
      var b=new THREE.Mesh(new THREE.RingGeometry(rIn,rOut,seg),mat);b.rotation.x=Math.PI/2;b.position.y=y0;g.add(b);
      parent.add(g);return g;
    }
    var labelCache={};
    function labelTex(small){
      var k=small?'s':'n'; if(labelCache[k]) return labelCache[k];
      labelCache[k]=tex(4096,300,function(g,w,h){
        g.clearRect(0,0,w,h);var seg=w/2,F="Arial, Helvetica, 'Liberation Sans', sans-serif";
        function W(sc){g.font='600 '+116*sc+'px '+F;var a=g.measureText('www.').width,c=g.measureText('yakitkoruma.com').width;g.font='900 '+176*sc+'px '+F;var b=g.measureText('CVS').width+6*sc;g.font='700 '+112*sc+'px '+F;return [a,b,c,g.measureText('0532 397 83 97').width,110*sc]}
        var sc=1,ws=W(1),tot=ws[0]+ws[1]+ws[2]+ws[3]+ws[4];if(tot>seg*.9){sc=seg*.9/tot;ws=W(sc);tot=ws[0]+ws[1]+ws[2]+ws[3]+ws[4]}
        for(var j=0;j<2;j++){var x=j*seg+(seg-tot)/2,y=h*.66;
          g.font='600 '+116*sc+'px '+F;g.fillStyle='#2b2e8c';g.fillText('www.',x,y);x+=ws[0];
          g.font='900 '+176*sc+'px '+F;g.fillStyle='#d7232f';g.fillText('CVS',x,y+12*sc);x+=ws[1];
          g.font='600 '+116*sc+'px '+F;g.fillStyle='#2b2e8c';g.fillText('yakitkoruma.com',x,y);x+=ws[2]+ws[4];
          g.font='700 '+112*sc+'px '+F;g.fillStyle='#c8102e';g.fillText('0532 397 83 97',x,y)}
      },true);
      return labelCache[k];
    }
    /* gövde delik desenleri */
    function pattern(type,r,h){
      var w=2048,hh=Math.max(256,Math.round(2048*h/(2*Math.PI*r)));
      return tex(w,hh,function(g,W,H){
        g.fillStyle='#fff';g.fillRect(0,0,W,H);g.fillStyle='#000';
        function wrap(f){f(0);f(-W)}
        if(type==='hslots'){ /* dikey sütunlarda yatay uzun yarıklar */
          var cols=6,rows=7,top=H*.06,bot=H*.1,rowH=(H-top-bot)/rows,colW=W/cols;
          for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){var sw=colW*.62,sh=rowH*.42,px=x*colW+(colW-sw)/2,py=top+y*rowH+(rowH-sh)/2;wrap(function(o){rr(g,px+o,py,sw,sh,sh/2);g.fill()})}
        }else if(type==='spiral'){ /* yay görünümlü, eğimli yarıklar */
          var n=9,top2=H*.05,bot2=H*.08,rh=(H-top2-bot2)/n;
          for(var i=0;i<n;i++)for(var c=0;c<3;c++){var y0=top2+i*rh+rh*.25;g.save();g.translate(c*W/3+W/6,y0+rh*.25);g.transform(1,-.06,0,1,0,0);wrap(function(o){rr(g,-W/7+o,-rh*.2,W/3.5,rh*.42,rh*.21);g.fill()});g.restore()}
        }else if(type==='holes'){ /* üstte yarık sırası, altta yuvarlak delikler */
          var cols3=12,top3=H*.05;
          for(var x3=0;x3<cols3;x3++){var cw=W/cols3;wrap(function(o){rr(g,x3*cw+cw*.2+o,top3,cw*.6,H*.1,H*.05);g.fill()})}
          var rows3=6,y3=H*.22,rh3=(H*.72)/rows3,r3=Math.min(W/cols3*.24,rh3*.32);
          for(var yy=0;yy<rows3;yy++)for(var xx=0;xx<cols3;xx++){var cx=xx*(W/cols3)+W/cols3/2+(yy%2?W/cols3/2:0),cy=y3+yy*rh3+rh3/2;wrap(function(o){g.beginPath();g.arc(cx+o,cy,r3,0,7);g.fill()})}
        }else if(type==='lattice'){ /* ızgara gibi dik dikdörtgen yarıklar */
          var cols4=10,rows4=5,top4=H*.06,bot4=H*.08,rh4=(H-top4-bot4)/rows4,cw4=W/cols4;
          for(var y4=0;y4<rows4;y4++)for(var x4=0;x4<cols4;x4++){var ox=(y4%2?cw4/2:0);wrap(function(o){rr(g,x4*cw4+cw4*.18+ox+o,top4+y4*rh4+rh4*.12,cw4*.64,rh4*.76,8);g.fill()})}
        }else if(type==='mixed'){ /* yatay yarıklar + delik sırası */
          var rows5=6,top5=H*.05,rh5=(H*.66)/rows5,cols5=4,cw5=W/cols5;
          for(var y5=0;y5<rows5;y5++)for(var x5=0;x5<cols5;x5++){var ox5=(y5%2?cw5/2:0);wrap(function(o){rr(g,x5*cw5+cw5*.12+ox5+o,top5+y5*rh5+rh5*.3,cw5*.76,rh5*.4,rh5*.2);g.fill()})}
          for(var x6=0;x6<16;x6++){var cw6=W/16;wrap(function(o){g.beginPath();g.arc(x6*cw6+cw6/2+o,H*.84,Math.min(cw6*.22,H*.05),0,7);g.fill()})}
        }
      });
    }
    function baseHoles(){return tex(512,512,function(g,w,h){g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';var R=w/2;for(var k=0;k<12;k++){var a=k/12*Math.PI*2;g.beginPath();g.arc(R+Math.cos(a)*R*.66,R+Math.sin(a)*R*.66,R*.085,0,7);g.fill()}for(var k2=0;k2<7;k2++){var a2=k2/7*Math.PI*2;g.beginPath();g.arc(R+Math.cos(a2)*R*.33,R+Math.sin(a2)*R*.33,R*.075,0,7);g.fill()}g.beginPath();g.arc(R,R,R*.07,0,7);g.fill()})}
    function threads(r,y0,y1,parent,outer){ /* diş halkaları */
      for(var y=y0;y<y1;y+=.024){var t=new THREE.Mesh(new THREE.TorusGeometry(r,.007,8,96),M.matte);t.rotation.x=Math.PI/2;t.position.y=y;parent.add(t)}
    }

    /* ---------- parametrik ürün ---------- */
    function build(s){
      var dev=new THREE.Group(), cap=new THREE.Group(); cap.visible=false;
      var rb=s.rb, hb=s.hb, cr=s.cr, ch=s.ch, gas=s.gasket?.05:0, nk=.06, body0=-(gas+nk);
      var pat=pattern(s.body,rb,hb);
      var body=new THREE.Mesh(new THREE.CylinderGeometry(rb,rb,hb,160,1,true),new THREE.MeshStandardMaterial({color:0xf0f2f5,map:brushed,alphaMap:pat,alphaTest:.5,metalness:.94,roughness:.24,side:THREE.DoubleSide}));
      body.position.y=body0-hb/2;dev.add(body);
      var inner=new THREE.Mesh(new THREE.CylinderGeometry(rb-.01,rb-.01,hb,160,1,true),new THREE.MeshStandardMaterial({color:0x2c3036,metalness:.6,roughness:.55,side:THREE.BackSide,alphaMap:pat,alphaTest:.5}));
      inner.position.y=body.position.y;dev.add(inner);
      var core=new THREE.Mesh(new THREE.CylinderGeometry(rb*.5,rb*.5,hb*.9,40),new THREE.MeshStandardMaterial({color:0x0e0f12,roughness:.9}));core.position.y=body.position.y;dev.add(core);
      var base=new THREE.Mesh(new THREE.CircleGeometry(rb,96),new THREE.MeshStandardMaterial({color:0xe2e6eb,map:brushed,alphaMap:baseHoles(),alphaTest:.5,metalness:.95,roughness:.28,side:THREE.DoubleSide}));
      base.rotation.x=Math.PI/2;base.position.y=body0-hb+.01;dev.add(base);
      var rim=new THREE.Mesh(new THREE.TorusGeometry(rb,.013,12,128),M.steel);rim.rotation.x=Math.PI/2;rim.position.y=body0-hb;dev.add(rim);
      if(s.body==='spiral'||s.body==='hslots'){var rim2=rim.clone();rim2.position.y=body0-.012;dev.add(rim2)}
      /* boyun */
      band(rb,rb+.05,body0,-gas,M.steel,dev);
      for(var i=0;i<3;i++){var a=i/3*Math.PI*2+.4;var sc=new THREE.Mesh(new THREE.CircleGeometry(.012,20),new THREE.MeshStandardMaterial({color:0x15161a,metalness:.4,roughness:.5}));sc.position.set(Math.cos(a)*(rb+.052),-gas-nk/2,Math.sin(a)*(rb+.052));sc.lookAt(Math.cos(a)*3,-gas-nk/2,Math.sin(a)*3);dev.add(sc)}
      if(gas) band(rb+.02,cr-.03,-gas,0,M.rubber,dev);
      if(s.flange){ band(cr-.02,cr+.16,-gas-.02,-gas+.012,M.rubber,dev); }
      /* bilezik */
      var ri=cr-(s.wall||.09);
      band(ri,cr,0,ch-.02,M.steel,dev);
      var cham=new THREE.Mesh(new THREE.CylinderGeometry(cr-.022,cr,.02,160,1,true),M.steel);cham.position.y=ch-.01;dev.add(cham);
      var topR=new THREE.Mesh(new THREE.RingGeometry(ri,cr-.022,160),M.steel);topR.rotation.x=-Math.PI/2;topR.position.y=ch;dev.add(topR);
      var ledge=new THREE.Mesh(new THREE.RingGeometry(rb,ri,128),M.steel);ledge.rotation.x=-Math.PI/2;ledge.position.y=ch*.35;dev.add(ledge);
      var bore=new THREE.Mesh(new THREE.CylinderGeometry(rb+.002,rb+.002,ch*.35-body0,96,1,true),new THREE.MeshStandardMaterial({color:0x8d939c,metalness:.9,roughness:.35,side:THREE.BackSide}));bore.position.y=(ch*.35+body0)/2;dev.add(bore);
      if(s.ring==='bayonet'){[0,Math.PI].forEach(function(a){var n=new THREE.Mesh(new THREE.BoxGeometry(.11,.05,.035),new THREE.MeshBasicMaterial({color:0x1c1d20}));n.position.set(Math.cos(a)*(ri+.005),ch-.03,Math.sin(a)*(ri+.005));n.lookAt(0,ch-.03,0);dev.add(n)})}
      if(s.ring==='thread'){ threads(ri+.004,ch*.45,ch-.03,dev) }
      if(s.ext) threads(cr+.004,ch*.55,ch-.03,dev);
      [.03,ch-.06].forEach(function(y){var gr=new THREE.Mesh(new THREE.TorusGeometry(cr+.001,.0045,8,160),new THREE.MeshStandardMaterial({color:0x8e949d,metalness:.9,roughness:.35}));gr.rotation.x=Math.PI/2;gr.position.y=y;dev.add(gr)});
      if(s.label){var lb=new THREE.Mesh(new THREE.CylinderGeometry(cr+.0016,cr+.0016,Math.min(.22,ch*.5),192,1,true),new THREE.MeshStandardMaterial({map:labelTex(),transparent:true,roughness:.45,metalness:.1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));lb.position.y=ch*.45;dev.add(lb)}
      if(s.ptfe){band(rb*.55,ri-.004,ch*.35,ch-.05,M.ptfe,dev)}
      /* iki parçalı: ayrı manşon */
      var sleeve=null;
      if(s.sleeve){sleeve=new THREE.Group();band(cr-.06,cr-.02,0,.22,M.steel,sleeve);threads(cr-.018,.03,.2,sleeve);sleeve.position.set(cr+.34,body0-hb+.02,.05);sleeve.rotation.z=0;dev.add(sleeve)}
      /* kapaklar */
      var ty=s.cap;
      if(ty==='plastic'){ /* siyah plastik, loblu */
        var sh=new THREE.Shape(),N=7,R1=cr+.06,R2=cr-.01;
        for(var k=0;k<=N*16;k++){var t=k/(N*16)*Math.PI*2,m=.5+.5*Math.cos(t*N),r=R2+(R1-R2)*Math.pow(m,3);var x=Math.cos(t)*r,z=Math.sin(t)*r;k?sh.lineTo(x,z):sh.moveTo(x,z)}
        var g1=new THREE.ExtrudeGeometry(sh,{depth:.17,bevelEnabled:true,bevelThickness:.02,bevelSize:.015,bevelSegments:4,curveSegments:4});g1.rotateX(-Math.PI/2);
        cap.add(new THREE.Mesh(g1,M.plastic));
        var dome=new THREE.Mesh(new THREE.CylinderGeometry(cr*.55,cr*.7,.06,64),M.plastic);dome.position.y=.2;cap.add(dome);
        var grip=new THREE.Mesh(new THREE.BoxGeometry(cr*1.1,.07,.09),M.plastic);grip.position.y=.25;cap.add(grip);
      }else if(ty==='flip'){ /* krom halka + siyah kapakçık */
        band(cr-.05,cr+.012,0,.13,M.steel,cap);
        var top=new THREE.Mesh(new THREE.CylinderGeometry(cr-.02,cr-.02,.035,96),M.plastic);top.position.y=.15;cap.add(top);
        var tab=new THREE.Mesh(new THREE.BoxGeometry(.18,.03,.12),M.plastic);tab.position.set(0,.18,cr-.04);cap.add(tab);
        var bell=new THREE.Mesh(new THREE.CylinderGeometry(cr-.05,cr-.09,.12,64,1,true),M.rubber);bell.position.y=-.06;cap.add(bell);
      }else if(ty==='screw'){ /* alüminyum, kenarı oluklu vidalı kapak */
        var cg=new THREE.Group();band(cr-.04,cr+.025,0,.16,M.steel,cg);
        var disc=new THREE.Mesh(new THREE.CylinderGeometry(cr+.025,cr+.025,.03,128),M.matte);disc.position.y=.175;cg.add(disc);
        for(var q=0;q<16;q++){var aa=q/16*Math.PI*2;var nt=new THREE.Mesh(new THREE.BoxGeometry(.03,.09,.02),new THREE.MeshStandardMaterial({color:0x6d727a,metalness:.9,roughness:.4}));nt.position.set(Math.cos(aa)*(cr+.022),.09,Math.sin(aa)*(cr+.022));nt.lookAt(0,.09,0);cg.add(nt)}
        cap.add(cg);
      }else if(ty==='lock'){ /* sekizgen alüminyum kilitli kapak + anahtar */
        var oc=new THREE.Mesh(new THREE.CylinderGeometry(cr+.05,cr+.06,.16,8),M.matte);oc.position.y=.08;oc.rotation.y=Math.PI/8;cap.add(oc);
        var lid=new THREE.Mesh(new THREE.CylinderGeometry(cr-.02,cr+.04,.07,8),M.steel);lid.position.y=.195;lid.rotation.y=Math.PI/8;cap.add(lid);
        var cyl=new THREE.Mesh(new THREE.CylinderGeometry(.07,.075,.05,40),new THREE.MeshStandardMaterial({color:0xd9dde3,metalness:1,roughness:.18}));cyl.position.y=.25;cap.add(cyl);
        var key=new THREE.Group();key.position.y=.27;cap.add(key);
        var bl=new THREE.Mesh(new THREE.BoxGeometry(.045,.07,.012),new THREE.MeshStandardMaterial({color:0xcfd3d9,metalness:1,roughness:.2}));bl.position.y=.035;key.add(bl);
        var hd=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.016,32),new THREE.MeshStandardMaterial({color:0xc8a95a,metalness:1,roughness:.3}));hd.rotation.x=Math.PI/2;hd.position.y=.12;key.add(hd);
      }
      cap.userData.restY=ch+.012;
      return {dev:dev,cap:cap,hasCap:!!ty,height:ch-body0+hb+(ty?.25:0),mid:(ch+(ty?.22:0)+(body0-hb))/2};
    }

    var pivot=new THREE.Group(), spin=new THREE.Group(); scene.add(pivot); pivot.add(spin);
    var blob=tex(256,256,function(g,w,h){var gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(0,0,0,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)});
    var shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false,opacity:.5}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
    var built={}, model=null, capOn=false, capK=0, yaw=-.6, pitch=.15, vy=0, vp=0, auto=true, dragging=false, lx=0, ly=0, idle=0, last=0, running=false, camD=5;
    function show(i){
      if(model){spin.remove(model.dev)}
      if(!built[i]) built[i]=build(DATA[i].m);
      model=built[i]; spin.add(model.dev); model.dev.add(model.cap);
      model.dev.position.y=-model.mid; shadow.position.y=-model.height/2-.05;
      camD=Math.max(4.2,model.height*3.1); capOn=false; capK=0; yaw=-.6; pitch=.15; auto=true;
      capBtn.hidden=!model.hasCap; capBtn.textContent='Kapağı tak'; capBtn.classList.remove('on');
    }
    function size(){var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
    function loop(now){
      if(!running) return;
      var dt=Math.min(.05,last?(now-last)/1000:.016);last=now;
      if(!dragging){
        if(Math.abs(vy)>1e-4||Math.abs(vp)>1e-4){yaw+=vy;pitch=Math.max(-1.2,Math.min(1.2,pitch+vp));vy*=.92;vp*=.9}
        idle+=dt; if(!auto&&idle>2.2)auto=true;
        if(auto){yaw-=.5*dt;pitch+=(.15-pitch)*.02}
      }
      var tk=capOn?1:0;if(capK!==tk)capK=tk>capK?Math.min(1,capK+dt*2.2):Math.max(0,capK-dt*2.2);
      var ck=capK<.5?4*capK*capK*capK:1-Math.pow(-2*capK+2,3)/2;
      if(model){model.cap.visible=capK>.01;model.cap.position.y=model.cap.userData.restY+(1-ck)*.6;model.cap.rotation.y=(1-ck)*1.2}
      spin.rotation.y=yaw;pivot.rotation.x=pitch;
      cam.position.set(0,.55+camD*.08,camD);cam.lookAt(0,-.04,0);
      renderer.render(scene,cam);
      requestAnimationFrame(loop);
    }
    function down(e){dragging=true;auto=false;lx=e.clientX;ly=e.clientY;vy=vp=0;stage.classList.add('grab');stage.classList.add('used');try{cvs.setPointerCapture(e.pointerId)}catch(_){}}
    function move(e){if(!dragging)return;var dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;vy=dx*.009;vp=dy*.007;yaw+=vy;pitch=Math.max(-1.2,Math.min(1.2,pitch+vp))}
    function up(){if(!dragging)return;dragging=false;idle=0;stage.classList.remove('grab')}
    cvs.addEventListener('pointerdown',down);cvs.addEventListener('pointermove',move);cvs.addEventListener('pointerup',up);cvs.addEventListener('pointercancel',up);cvs.addEventListener('lostpointercapture',up);
    capBtn.addEventListener('click',function(){capOn=!capOn;capBtn.classList.toggle('on',capOn);capBtn.textContent=capOn?'Kapağı çıkar':'Kapağı tak'});
    resetBtn.addEventListener('click',function(){yaw=-.6;pitch=.15;vy=vp=0;auto=true});
    if(window.ResizeObserver)new ResizeObserver(size).observe(stage);else addEventListener('resize',size);
    R={show:show,start:function(){if(running)return;running=true;last=0;size();requestAnimationFrame(loop)},stop:function(){running=false}};
    return R;
  }

  /* ---------- modal ---------- */
  function setView(v,k){
    view=v;
    [].forEach.call(thumbs.children,function(b){b.classList.toggle('on',b.getAttribute('data-v')===(v==='3d'?'3d':String(k)))});
    var E=engine();
    if(v==='3d'&&E){stage.classList.add('is3d');photo.hidden=true;ui.hidden=false;E.start()}
    else{
      if(E)E.stop(); stage.classList.remove('is3d'); ui.hidden=true; photo.hidden=false;
      var p=DATA[cur].p[v==='3d'?0:k]; photo.src='assets/img/urunler/'+p[0]+'.webp'; photo.width=p[1]; photo.height=p[2];
    }
  }
  function open(i,from){
    cur=i; lastFocus=from||document.activeElement; var d=DATA[i];
    idxEl.textContent=String(i+1).padStart(2,'0')+' / '+String(DATA.length).padStart(2,'0');
    var h='';
    if(d.m) h+='<button type="button" class="pm-t t3d" data-v="3d" aria-label="3D model"><span>3D</span></button>';
    d.p.forEach(function(p,k){h+='<button type="button" class="pm-t" data-v="'+k+'" aria-label="Fotoğraf '+(k+1)+'"><img src="assets/img/urunler/'+p[0]+'-k.webp" alt="" loading="lazy"></button>'});
    thumbs.innerHTML=h;
    modal.hidden=false; document.body.style.overflow='hidden'; requestAnimationFrame(function(){modal.classList.add('open')});
    var E=d.m?engine():false;
    if(E){E.show(i);setView('3d')} else setView('photo',0);
    stage.classList.remove('used');
    modal.querySelector('.pm-close').focus();
  }
  function close(){var E=R||null;if(E)E.stop();modal.classList.remove('open');setTimeout(function(){modal.hidden=true},250);document.body.style.overflow='';if(lastFocus)lastFocus.focus()}
  function step(d){open((cur+d+DATA.length)%DATA.length)}
  thumbs.addEventListener('click',function(e){var b=e.target.closest('.pm-t');if(!b)return;var v=b.getAttribute('data-v');v==='3d'?setView('3d'):setView('photo',+v)});
  modal.querySelector('.pm-close').addEventListener('click',close);
  modal.querySelector('.pm-prev').addEventListener('click',function(){step(-1)});
  modal.querySelector('.pm-next').addEventListener('click',function(){step(1)});
  modal.addEventListener('click',function(e){if(e.target===modal)close()});
  document.addEventListener('keydown',function(e){if(modal.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1)});
  grid.addEventListener('click',function(e){var c=e.target.closest('.pcard');if(c)open(+c.getAttribute('data-i'),c)});
})();
