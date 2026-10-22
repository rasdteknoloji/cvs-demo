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
    R=createEngine(cvs,stage,capBtn,resetBtn);
    return R;
  }
  function createEngine(cvs,stage,capBtn,resetBtn){
    var R=false;
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
    /* galvaniz pul dokusu ve kumlanmış gri doku */
    var galvMap=tex(1024,1024,function(g,w,h){g.fillStyle='#b9bec5';g.fillRect(0,0,w,h);for(var i=0;i<900;i++){var x=Math.random()*w,y=Math.random()*h,r=6+Math.random()*28,l=170+Math.random()*60|0;g.fillStyle='rgba('+l+','+l+','+(l+4)+','+(.18+Math.random()*.25)+')';g.beginPath();for(var k=0;k<6;k++){var a=k/6*Math.PI*2+Math.random();g.lineTo(x+Math.cos(a)*r*(0.6+Math.random()*.5),y+Math.sin(a)*r*(0.6+Math.random()*.5))}g.fill()}},true);
    var gritMap=tex(512,512,function(g,w,h){var d=g.createImageData(w,h);for(var i=0;i<d.data.length;i+=4){var v=150+Math.random()*60|0;d.data[i]=v;d.data[i+1]=v+2;d.data[i+2]=v+6;d.data[i+3]=255}g.putImageData(d,0,0)},true);
    var M={
      steel:new THREE.MeshStandardMaterial({color:0xf3f5f8,map:brushed,metalness:.95,roughness:.22}),
      matte:new THREE.MeshStandardMaterial({color:0xdfe3e8,map:brushed,metalness:.9,roughness:.42}),
      rubber:new THREE.MeshStandardMaterial({color:0x0a0a0c,roughness:.7,metalness:0,envMapIntensity:.25}),
      plastic:new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.42,metalness:0,envMapIntensity:.35}),
      dark:new THREE.MeshStandardMaterial({color:0x2c3036,metalness:.6,roughness:.55,side:THREE.BackSide}),
      ptfe:new THREE.MeshStandardMaterial({color:0xf4f4f2,roughness:.55,metalness:0,envMapIntensity:.4}),
      galvMap:galvMap,
      galv:new THREE.MeshStandardMaterial({color:0xc2c7cd,map:galvMap,metalness:.82,roughness:.5}),
      grit:new THREE.MeshStandardMaterial({color:0xaeb3ba,map:gritMap,metalness:.55,roughness:.78}),
      machined:new THREE.MeshStandardMaterial({color:0xf2f4f7,map:brushed,metalness:.95,roughness:.22}),
      alIn:new THREE.MeshStandardMaterial({color:0xaeb3ba,map:brushed,metalness:.9,roughness:.38}),
      alEdge:new THREE.MeshStandardMaterial({color:0xd8dce1,metalness:.95,roughness:.3}),
      galvIn:new THREE.MeshStandardMaterial({color:0x8f949b,metalness:.75,roughness:.6}),
      galvEdge:new THREE.MeshStandardMaterial({color:0xc9cdd2,metalness:.85,roughness:.4})
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
    function threads(r,y0,y1,parent,pitch,tube){ /* diş halkaları */
      for(var y=y0;y<y1;y+=(pitch||.024)){var t=new THREE.Mesh(new THREE.TorusGeometry(r,tube||.007,8,96),M.matte);t.rotation.x=Math.PI/2;t.position.y=y;parent.add(t)}
    }


    /* ---------- gerçek delikli gövde: açınım üzerinde mesafe alanı + marching squares, et kalınlıklı ---------- */
    function holesFrom(P,r,h){
      var C=2*Math.PI*r,L=[],y0=P.bot,y1=h-P.top,i,j;
      if(P.k==='saw'){ /* testere kesimi: uçları sivrilen yatay/eğik yarıklar, sıra başına 2 adet */
        var pitch=(y1-y0)/P.rows;
        for(i=0;i<P.rows;i++)for(j=0;j<P.per;j++)L.push({t:'lens',x:(j+.5)/P.per*C+(P.shift||0)*C*(i%2),y:y0+pitch*(i+.5),w:P.arc*C,h:P.hh,a:P.tilt||0});
      }else if(P.k==='punch'){ /* sac delme: köprüleri şaşırtmalı dikdörtgen pencereler */
        var pitch2=(y1-y0)/P.rows,ww=C/P.per-P.bridge;
        var sg=P.stag===0?0:.5;
        for(i=0;i<P.rows;i++){var per=P.rowPer?P.rowPer[i%P.rowPer.length]:P.per,pr=P.pair||[1],sum=0,k;for(k=0;k<per;k++)sum+=pr[k%pr.length];
          var base=(C-per*P.bridge)/sum,x=0,off=(i%2?sg:0)*(base*pr[0]+P.bridge);
          for(j=0;j<per;j++){var w=base*pr[j%pr.length];L.push({t:'rect',x:x+w/2+off,y:y0+pitch2*(i+.5),w:w,h:P.hh,r:P.rad||.006,a:0});x+=w+P.bridge}}
      }
      if(P.k==='mill'){ /* frezeli: uçları yuvarlatılmış (eğik) dikdörtgen yarıklar */
        var pitch3=(y1-y0)/P.rows;
        for(i=0;i<P.rows;i++){var arc=P.arc*(P.rowArc?P.rowArc[i%P.rowArc.length]:1),shx=P.rowShift?P.rowShift[i%P.rowShift.length]:(P.shift||0)*(i%2),per=P.rowPer?P.rowPer[i%P.rowPer.length]:P.per;
          for(j=0;j<per;j++)L.push({t:P.end==='tap'?'tap':'rect',x:(j+.5)/per*C+shx*C,y:y0+pitch3*(i+.5),w:arc*C,h:P.hh,r:P.hh*(P.round||.5)-.0005,tp:(P.tp||1.1)*P.hh,a:P.tilt||0})}
      }
      if(P.dots){var D=P.dots; for(i=0;i<D.rows;i++)for(j=0;j<D.n;j++)L.push({t:'circ',x:(j+(i%2?.5:0))/D.n*C,y:D.y+i*D.gap,r:D.r});}
      return L;
    }
    function sdfFn(L,C){
      return function(sx,y){
        var f=1e9;
        for(var k=0;k<L.length;k++){var H=L[k],dx=sx-H.x;dx-=C*Math.round(dx/C);var dy=y-H.y,d;
          if(Math.abs(dy)>.2||Math.abs(dx)>(H.w||H.r*2)+.05)continue;
          if(H.a){var ca=Math.cos(H.a),sa=Math.sin(H.a),tx=dx*ca+dy*sa;dy=-dx*sa+dy*ca;dx=tx}
          if(H.t==='circ'){d=Math.sqrt(dx*dx+dy*dy)-H.r}
          else if(H.t==='tap'){var hw2=H.w/2,ax=Math.abs(dx),hl=H.h/2*(ax>hw2-H.tp?Math.max(0,(hw2-ax)/H.tp):1);d=Math.max(Math.abs(dy)-hl,ax-hw2)}
          else if(H.t==='rect'){var qx=Math.abs(dx)-H.w/2+H.r,qy=Math.abs(dy)-H.h/2+H.r,ox=Math.max(qx,0),oy=Math.max(qy,0);d=Math.sqrt(ox*ox+oy*oy)+Math.min(Math.max(qx,qy),0)-H.r}
          else{var hw=H.w/2,u=Math.min(1,Math.abs(dx)/hw),hh=H.h/2*Math.pow(Math.max(0,1-Math.pow(u,6)),.22);d=Math.max(Math.abs(dy)-hh,Math.abs(dx)-hw)}
          if(d<f)f=d}
        return f;
      };
    }
    function perfTube(r,h,t,L,res,mO,mI,mW){
      var C=2*Math.PI*r,NU=res,NV=Math.max(8,Math.round(NU*h/C)),du=C/NU,dv=h/NV,f=sdfFn(L,C),W=NU+1,F=new Float32Array(W*(NV+1)),i,j;
      for(j=0;j<=NV;j++)for(i=0;i<=NU;i++)F[j*W+i]=f(i*du,j*dv);
      var O=[],ON=[],OU=[],I=[],IN=[],WP=[],WN=[],e=du*.5;
      function pos(sx,y,rad,A){var th=sx/r;A.push(Math.cos(th)*rad,y,Math.sin(th)*rad)}
      function nrm(sx,sgn,A){var th=sx/r;A.push(Math.cos(th)*sgn,0,Math.sin(th)*sgn)}
      function tri(a,b,c){ /* (s,y) düzleminde CCW */
        pos(a[0],a[1],r,O);pos(c[0],c[1],r,O);pos(b[0],b[1],r,O);nrm(a[0],1,ON);nrm(c[0],1,ON);nrm(b[0],1,ON);
        OU.push(a[0]/C*3,a[1]/h,c[0]/C*3,c[1]/h,b[0]/C*3,b[1]/h);
        pos(a[0],a[1],r-t,I);pos(b[0],b[1],r-t,I);pos(c[0],c[1],r-t,I);nrm(a[0],-1,IN);nrm(b[0],-1,IN);nrm(c[0],-1,IN);
      }
      function wall(A,B){
        var g=[],q;[A,B].forEach(function(p){var gx=(f(p[0]+e,p[1])-f(p[0]-e,p[1])),gy=(f(p[0],p[1]+e)-f(p[0],p[1]-e)),th=p[0]/r,nx=-(gx*-Math.sin(th)),nz=-(gx*Math.cos(th)),ny=-gy,l=Math.hypot(nx,ny,nz)||1;g.push([nx/l,ny/l,nz/l])});
        var a0=[],a1=[],b0=[],b1=[];pos(A[0],A[1],r,a0);pos(A[0],A[1],r-t,a1);pos(B[0],B[1],r,b0);pos(B[0],B[1],r-t,b1);
        var ux=b0[0]-a0[0],uy=b0[1]-a0[1],uz=b0[2]-a0[2],vx=a1[0]-a0[0],vy=a1[1]-a0[1],vz=a1[2]-a0[2],cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
        var flip=(cx*g[0][0]+cy*g[0][1]+cz*g[0][2])<0;
        var T=flip?[[a0,0],[a1,0],[b0,1],[b0,1],[a1,0],[b1,1]]:[[a0,0],[b0,1],[a1,0],[b0,1],[b1,1],[a1,0]];
        T.forEach(function(v){WP.push(v[0][0],v[0][1],v[0][2]);WN.push(g[v[1]][0],g[v[1]][1],g[v[1]][2])});
      }
      for(j=0;j<NV;j++)for(i=0;i<NU;i++){
        var c=[[i*du,j*dv,F[j*W+i]],[(i+1)*du,j*dv,F[j*W+i+1]],[(i+1)*du,(j+1)*dv,F[(j+1)*W+i+1]],[i*du,(j+1)*dv,F[(j+1)*W+i]]];
        var ins=0;for(var k=0;k<4;k++)if(c[k][2]>0)ins++;
        if(ins===0)continue;
        if(ins===4){tri(c[0],c[1],c[2]);tri(c[0],c[2],c[3]);continue}
        var poly=[],cr=[];
        for(k=0;k<4;k++){var a=c[k],b=c[(k+1)%4];if(a[2]>0)poly.push(a);if((a[2]>0)!==(b[2]>0)){var tt=a[2]/(a[2]-b[2]),p=[a[0]+(b[0]-a[0])*tt,a[1]+(b[1]-a[1])*tt];poly.push(p);cr.push(p)}}
        for(k=1;k<poly.length-1;k++)tri(poly[0],poly[k],poly[k+1]);
        if(cr.length===2)wall(cr[0],cr[1]);else if(cr.length===4){wall(cr[0],cr[1]);wall(cr[2],cr[3])}
      }
      var g=new THREE.Group();
      function mk(P,N,U,m){var G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(P,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));if(U)G.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.add(new THREE.Mesh(G,m))}
      mk(O,ON,OU,mO);mk(I,IN,null,mI);mk(WP,WN,null,mW);
      return g;
    }
    function baseTex(kind){return tex(1024,1024,function(g,w,h){g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#000';var R=w/2,k,a;
      if(kind==='p1'){ /* fotoğraftaki taban: ~24 delik + ortada oval yarık */
        var pts=[];for(var yy=-3;yy<=3;yy++)for(var xx=-3;xx<=3;xx++){var px=xx*R*.24+(yy%2?R*.12:0),py=yy*R*.24;if(Math.hypot(px,py)<R*.8&&Math.abs(py)>R*.1)pts.push([px,py])}
        pts.forEach(function(p){g.beginPath();g.arc(R+p[0],R+p[1],R*.06,0,7);g.fill()});rr(g,R-R*.36,R-R*.055,R*.72,R*.11,R*.055);g.fill();
      }else{ /* sac taban: sık delik ızgarası */
        for(var y2=-R;y2<R;y2+=R*.13)for(var x2=-R;x2<R;x2+=R*.13){var xo=x2+((Math.round(y2/(R*.13)))%2?R*.065:0);if(Math.hypot(xo,y2)<R*.82){g.beginPath();g.arc(R+xo,R+y2,R*.042,0,7);g.fill()}}
      }})}

    /* ---------- parametrik ürün ---------- */
    function build(s){
      var dev=new THREE.Group(), cap=new THREE.Group(); cap.visible=false;
      var rb=s.rb, hb=s.hb, cr=s.cr, ch=s.ch, gas=s.gasket?.05:0, nk=.06, body0=-(gas+nk);
      var thin=s.mat==='galv'||s.mat==='grit';
      var mO=thin?(s.mat==='grit'?M.grit:M.galv):M.machined, mI=thin?M.galvIn:M.alIn, mW=thin?M.galvEdge:M.alEdge;
      var tube=perfTube(rb,hb,thin?.007:.022,holesFrom(s.pat,rb,hb),s.res||440,mO,mI,mW);
      tube.position.y=body0-hb;dev.add(tube);
      var base=new THREE.Mesh(new THREE.CircleGeometry(rb-.002,128),new THREE.MeshStandardMaterial({color:thin?0xb4b9c0:0xe2e6eb,map:thin?M.galvMap:brushed,alphaMap:baseTex(s.base||'grid'),alphaTest:.5,metalness:.9,roughness:thin?.5:.3,side:THREE.DoubleSide}));
      base.rotation.x=Math.PI/2;base.position.y=body0-hb+(thin?.004:.012);dev.add(base);
      if(!thin){var base2=base.clone();base2.position.y=body0-hb+.024;dev.add(base2)}
      /* boyun */
      band(rb-.01,rb+.05,body0,-gas,M.steel,dev);
      if(s.neckThread){threads(rb+.053,body0+.012,-gas-.008,dev,.03,.009)}
      for(var i=0;i<3;i++){var a=i/3*Math.PI*2+.4;var sc=new THREE.Mesh(new THREE.CircleGeometry(.012,20),new THREE.MeshStandardMaterial({color:0x15161a,metalness:.4,roughness:.5}));sc.position.set(Math.cos(a)*(rb+.052),-gas-nk/2,Math.sin(a)*(rb+.052));sc.lookAt(Math.cos(a)*3,-gas-nk/2,Math.sin(a)*3);dev.add(sc)}
      if(gas) band(rb+.02,cr-.03,-gas,0,M.rubber,dev);
      if(s.flange){ band(cr-.02,cr+.11,ch-.04,ch+.005,M.steel,dev); var fch=new THREE.Mesh(new THREE.CylinderGeometry(cr+.11,cr+.095,.015,160,1,true),M.steel);fch.position.y=ch-.0475;dev.add(fch); band(cr-.02,cr+.07,ch-.085,ch-.045,M.rubber,dev); }
      /* bilezik */
      var ri=cr-(s.wall||.09);
      band(ri,cr,0,ch-.02,M.steel,dev);
      var cham=new THREE.Mesh(new THREE.CylinderGeometry(cr-.022,cr,.02,160,1,true),M.steel);cham.position.y=ch-.01;dev.add(cham);
      var topR=new THREE.Mesh(new THREE.RingGeometry(ri,cr-.022,160),M.steel);topR.rotation.x=-Math.PI/2;topR.position.y=ch;dev.add(topR);
      var ledge=new THREE.Mesh(new THREE.RingGeometry(rb,ri,128),M.steel);ledge.rotation.x=-Math.PI/2;ledge.position.y=ch*.35;dev.add(ledge);
      var bore=new THREE.Mesh(new THREE.CylinderGeometry(rb+.002,rb+.002,ch*.35-body0,96,1,true),new THREE.MeshStandardMaterial({color:0x8d939c,metalness:.9,roughness:.35,side:THREE.BackSide}));bore.position.y=(ch*.35+body0)/2;dev.add(bore);
      if(s.ring==='bayonet'){[0,Math.PI].forEach(function(a){var n=new THREE.Mesh(new THREE.BoxGeometry(.11,.05,.035),new THREE.MeshBasicMaterial({color:0x1c1d20}));n.position.set(Math.cos(a)*(ri+.005),ch-.03,Math.sin(a)*(ri+.005));n.lookAt(0,ch-.03,0);dev.add(n)})}
      if(s.ring==='thread'){ threads(ri+.004,ch*.45,ch-.03,dev) }
      if(s.lugs){[0,Math.PI].forEach(function(a){var lg=new THREE.Mesh(new THREE.BoxGeometry(.09,ch*.6,.12),M.steel);lg.position.set(Math.cos(a)*(cr+.03),ch*.6,Math.sin(a)*(cr+.03));lg.lookAt(0,ch*.6,0);dev.add(lg)});band(cr-.12,cr-.08,ch,ch+.2,M.steel,dev)}
      if(s.ext) threads(cr+.004,ch*.55,ch-.03,dev,.03,.009);
      if(s.lip) band(cr,cr+.022,ch-.09,ch-.015,M.steel,dev);
      if(s.grip){for(var q=0;q<28;q++){var ga=q/28*Math.PI*2;var gn=new THREE.Mesh(new THREE.BoxGeometry(.018,ch*.3,.014),new THREE.MeshStandardMaterial({color:0x6f747c,metalness:.9,roughness:.45}));gn.position.set(Math.cos(ga)*(cr+.001),ch-.03-ch*.15,Math.sin(ga)*(cr+.001));gn.lookAt(0,gn.position.y,0);dev.add(gn)}}
      [.03,ch-.06].forEach(function(y){var gr=new THREE.Mesh(new THREE.TorusGeometry(cr+.001,.0045,8,160),new THREE.MeshStandardMaterial({color:0x8e949d,metalness:.9,roughness:.35}));gr.rotation.x=Math.PI/2;gr.position.y=y;dev.add(gr)});
      if(s.label){var lb=new THREE.Mesh(new THREE.CylinderGeometry(cr+.0016,cr+.0016,Math.min(.22,ch*.5),192,1,true),new THREE.MeshStandardMaterial({map:labelTex(),transparent:true,roughness:.45,metalness:.1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));lb.position.y=ch*.45;dev.add(lb)}
      if(s.ptfe){band(rb*.55,ri-.004,ch*.35,ch-.05,M.ptfe,dev)}
      /* iki parçalı: ayrı manşon */
      var sleeve=null;
      if(s.sleeve){sleeve=new THREE.Group();band(ri-.032,ri-.004,ch-.1,ch+.3,M.steel,sleeve);var slr=new THREE.Mesh(new THREE.RingGeometry(ri-.032,ri-.004,128),M.steel);slr.rotation.x=-Math.PI/2;slr.position.y=ch+.3;sleeve.add(slr);band(ri-.034,ri-.032,ch+.26,ch+.3,M.steel,sleeve);dev.add(sleeve)}
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
      var topY=ch+(ty?.25:0)+(s.sleeve?.3:0)+(s.lugs?.2:0);return {dev:dev,cap:cap,hasCap:!!ty,height:topY-(body0-hb),mid:(topY+(body0-hb))/2};
    }

    var pivot=new THREE.Group(), spin=new THREE.Group(); scene.add(pivot); pivot.add(spin);
    var blob=tex(256,256,function(g,w,h){var gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(0,0,0,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)});
    var shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false,opacity:.5}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
    var built={}, model=null, capOn=false, capK=0, yaw=-.6, pitch=.15, vy=0, vp=0, auto=true, dragging=false, lx=0, ly=0, idle=0, last=0, running=false, camD=5, autoSpeed=.5, basePitch=.15;
    function show(i){
      if(model){spin.remove(model.dev)}
      if(!built[i]) built[i]=build(DATA[i].m);
      model=built[i]; spin.add(model.dev); model.dev.add(model.cap);
      model.dev.position.y=-model.mid; shadow.position.y=-model.height/2-.05;
      camD=Math.max(4.2,model.height*3.1); capOn=false; capK=0; yaw=-.6; pitch=.15; auto=true;
      if(capBtn){capBtn.hidden=!model.hasCap; capBtn.textContent='Fit the cap'; capBtn.classList.remove('on');}
    }
    /* showroom: birden çok ürün döner tablada */
    function showGroup(idxs){
      if(model){spin.remove(model.dev)}
      var g=new THREE.Group(), n=idxs.length, rad=1.15, maxH=0;
      idxs.forEach(function(i,k){
        if(!built[i]) built[i]=build(DATA[i].m);
        var m=built[i], a=k/n*Math.PI*2-Math.PI/2, h=new THREE.Group();
        m.dev.position.set(0,m.height/2-m.mid,0); m.dev.add(m.cap); m.cap.visible=false;
        h.add(m.dev); h.position.set(Math.cos(a)*rad,0,Math.sin(a)*rad); h.rotation.y=-a; g.add(h);
        var sh=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false,opacity:.45}));
        sh.rotation.x=-Math.PI/2; sh.position.set(h.position.x,.012,h.position.z); g.add(sh);
        maxH=Math.max(maxH,m.height);
      });
      var disc=new THREE.Mesh(new THREE.CylinderGeometry(rad+.75,rad+.8,.09,96),new THREE.MeshStandardMaterial({color:0x101216,metalness:.6,roughness:.45}));
      disc.position.y=-.045; g.add(disc);
      var rim=new THREE.Mesh(new THREE.TorusGeometry(rad+.78,.012,12,120),new THREE.MeshStandardMaterial({color:0xd7232f,metalness:.3,roughness:.4,emissive:0x5a0a10,emissiveIntensity:.6}));
      rim.rotation.x=Math.PI/2; rim.position.y=.005; g.add(rim);
      /* gölgeler */
      renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      g.traverse(function(o){if(o.isMesh){o.castShadow=true;}}); disc.castShadow=false; disc.receiveShadow=true;
      /* tavandan sarkan halka lamba (sıcak ışık) */
      var lamp=new THREE.Group(); lamp.position.y=maxH+.62; g.add(lamp);
      var glow=new THREE.MeshStandardMaterial({color:0xfff1d6,emissive:0xffc77a,emissiveIntensity:2.6,roughness:.4,metalness:.2});
      var gold=new THREE.MeshStandardMaterial({color:0xc9a35a,metalness:.9,roughness:.3});
      var r1=new THREE.Mesh(new THREE.TorusGeometry(.62,.022,12,96),glow); r1.rotation.x=Math.PI/2; lamp.add(r1);
      var r2=new THREE.Mesh(new THREE.TorusGeometry(.44,.022,12,96),glow); r2.rotation.x=Math.PI/2-1.05; r2.rotation.y=.4; lamp.add(r2);
      var r2b=new THREE.Mesh(new THREE.TorusGeometry(.44,.028,12,96),gold); r2b.rotation.copy(r2.rotation); r2b.position.y=-.01; lamp.add(r2b);
      var canopy=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.03,32),gold); canopy.position.y=1.0; lamp.add(canopy);
      for(var ci=0;ci<4;ci++){var ca=ci/4*Math.PI*2+.4;var wire=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.98,6),gold);wire.position.set(Math.cos(ca)*.3,.5,Math.sin(ca)*.3);lamp.add(wire)}
      var lampLight=new THREE.PointLight(0xffd8a0,1.4,8,2); lampLight.position.y=.05; lamp.add(lampLight);
      var spot=new THREE.SpotLight(0xffe4bf,2.6,12,.95,.6,1.1); spot.position.set(0,maxH+.6,0); spot.target.position.set(0,0,0); g.add(spot); g.add(spot.target);
      spot.castShadow=true; spot.shadow.mapSize.set(1024,1024); spot.shadow.bias=-.0006; spot.shadow.radius=4; spot.shadow.camera.near=.5; spot.shadow.camera.far=8;
      var cap=new THREE.Group(); cap.userData.restY=0;
      model={dev:g,cap:cap,hasCap:false,height:maxH,mid:maxH*1.0};
      spin.add(g); g.position.y=-model.mid; shadow.visible=false;
      camD=Math.max(7.0,(rad+.8)*3.9); capOn=false; capK=0; yaw=-.6; pitch=.24; auto=true; autoSpeed=.22; basePitch=.24;
    }
    function size(){var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
    function loop(now){
      if(!running) return;
      var dt=Math.min(.05,last?(now-last)/1000:.016);last=now;
      if(!dragging){
        if(Math.abs(vy)>1e-4||Math.abs(vp)>1e-4){yaw+=vy;pitch=Math.max(-1.2,Math.min(1.2,pitch+vp));vy*=.92;vp*=.9}
        idle+=dt; if(!auto&&idle>2.2)auto=true;
        if(auto){yaw-=autoSpeed*dt;pitch+=(basePitch-pitch)*.02}
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
    if(capBtn)capBtn.addEventListener('click',function(){capOn=!capOn;capBtn.classList.toggle('on',capOn);capBtn.textContent=capOn?'Remove the cap':'Fit the cap'});
    if(resetBtn)resetBtn.addEventListener('click',function(){yaw=-.6;pitch=basePitch;vy=vp=0;auto=true});
    if(window.ResizeObserver)new ResizeObserver(size).observe(stage);else addEventListener('resize',size);
    R={show:show,showGroup:showGroup,start:function(){if(running)return;running=true;last=0;size();requestAnimationFrame(loop)},stop:function(){running=false}};
    return R;
  }

  /* ---------- showroom (ürünler sayfası üstü) ---------- */
  (function(){
    var box=document.getElementById('showroom'); if(!box) return;
    var c=box.querySelector('canvas'), E=createEngine(c,box,null,null); if(!E) {box.classList.add('no3d');return;}
    var idx=[]; DATA.forEach(function(d,i){if(d.m&&!d.m.ptfe&&idx.length<6)idx.push(i)});
    E.showGroup(idx); box.__E=E;
    var vis=true; if('IntersectionObserver' in window){new IntersectionObserver(function(es){vis=es[0].isIntersecting; vis?E.start():E.stop();},{threshold:.05}).observe(box);} else E.start();
    document.addEventListener('visibilitychange',function(){if(document.hidden)E.stop();else if(vis)E.start();});
  })();

  /* ---------- modal ---------- */
  function setView(v,k){
    view=v;
    [].forEach.call(thumbs.children,function(b){b.classList.toggle('on',b.getAttribute('data-v')===(v==='3d'?'3d':String(k)))});
    var E=engine();
    if(v==='3d'&&E){stage.classList.add('is3d');photo.hidden=true;ui.hidden=false;E.start()}
    else{
      if(E)E.stop(); stage.classList.remove('is3d'); ui.hidden=true; photo.hidden=false;
      var p=DATA[cur].p[v==='3d'?0:k]; photo.src='../assets/img/urunler/'+p[0]+'.webp'; photo.width=p[1]; photo.height=p[2];
    }
  }
  function open(i,from){
    cur=i; lastFocus=from||document.activeElement; var d=DATA[i];
    idxEl.textContent=String(i+1).padStart(2,'0')+' / '+String(DATA.length).padStart(2,'0');
    var h='';
    if(d.m) h+='<button type="button" class="pm-t t3d" data-v="3d" aria-label="3D model"><span>3D</span></button>';
    d.p.forEach(function(p,k){h+='<button type="button" class="pm-t" data-v="'+k+'" aria-label="Photo '+(k+1)+'"><img src="../assets/img/urunler/'+p[0]+'-k.webp" alt="" loading="lazy"></button>'});
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
