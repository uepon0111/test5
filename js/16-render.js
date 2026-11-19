/* js/16-render.js — 2D描画(線路・駅・列車・プレビュー・操作点) */
/* ---- 描画 ---- */
function draw(){
  const z=cam.z,X=v=>(v-cam.x)*z+W/2,Y=v=>(v-cam.y)*z+H/2;
  cx.setTransform(dpr,0,0,dpr,0,0);const gl=glDraw();if(gl)cx.clearRect(0,0,W,H);else{cx.fillStyle='#f3f7fb';cx.fillRect(0,0,W,H)}
  const{s:ls,c:lc,y:lq}=lin(),H3=z*Math.sqrt(Math.max(0,1-lq*lq)),UPx=-ls/lq,UPy=-lc/lq,T=(a,b)=>[W/2+lc*(a-W/2)-ls*(b-H/2),H/2+lq*(ls*(a-W/2)+lc*(b-H/2))];
  cx.save();cx.translate(W/2,H/2);cx.transform(lc,lq*ls,-ls,lq*lc,0,0);cx.translate(-W/2,-H/2);   /* 地面を回転+縦圧縮して斜めから見る */
  const cn=[[0,0],[W,0],[0,H],[W,H]].map(p=>s2w(p[0],p[1])),xs=cn.map(p=>p.x),ys=cn.map(p=>p.y),x0=Math.floor(Math.min(...xs))-1,x1=Math.ceil(Math.max(...xs))+1,y0=Math.floor(Math.min(...ys))-1,y1=Math.ceil(Math.max(...ys))+1;
  const gs=z>=14?1:z>=7?5:10;
  if(!gl)for(let gx=Math.ceil(x0/gs)*gs;gx<=x1;gx+=gs)for(let gy=Math.ceil(y0/gs)*gs;gy<=y1;gy+=gs){
    const M=gx%5===0&&gy%5===0,r=M?2:1.4;cx.fillStyle=M?'#a9bbcc':'#cdd9e5';cx.fillRect(X(gx)-r,Y(gy)-r,r*2,r*2)}
  const vis=[];
  if(!gl)for(const e of edges.values())if(Math.max(e[0],e[2])>=x0&&Math.min(e[0],e[2])<=x1&&Math.max(e[1],e[3])>=y0&&Math.min(e[1],e[3])<=y1)vis.push(e);
  const path=off=>{cx.beginPath();for(const e of vis){
    const ax=X(e[0]),ay=Y(e[1]),bx=X(e[2]),by=Y(e[3]);
    if(off){const l=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/l*off,ny=(bx-ax)/l*off;cx.moveTo(ax+nx,ay+ny);cx.lineTo(bx+nx,by+ny);cx.moveTo(ax-nx,ay-ny);cx.lineTo(bx-nx,by-ny)}
    else{cx.moveTo(ax,ay);cx.lineTo(bx,by)}}};
  cx.lineCap='round';cx.lineJoin='round';
  if(sel&&sel.type==='edges'){cx.beginPath();for(const k of sel.keys){const e=edges.get(k);if(e){cx.moveTo(X(e[0]),Y(e[1]));cx.lineTo(X(e[2]),Y(e[3]))}}cx.strokeStyle='rgba(47,125,225,.3)';cx.lineWidth=Math.max(10,z*.85);cx.stroke()}
  if(gl);else if(z>=12){
    path(0);cx.strokeStyle='#e4ddd0';cx.lineWidth=z*SZ.bed;cx.stroke();
    path(0);cx.lineCap='butt';cx.setLineDash([z*.07,z*.16]);cx.strokeStyle='#b99d7c';cx.lineWidth=z*SZ.slp;cx.stroke();cx.setLineDash([]);cx.lineCap='round';
    path(z*.09);cx.strokeStyle='#5d6a79';cx.lineWidth=Math.max(1.2,z*.05);cx.stroke();
  }else{path(0);cx.strokeStyle='#5d6a79';cx.lineWidth=Math.max(1.5,z*.1);cx.stroke()}
  if(dtr&&R&&tab!=='add'){   /* ダイヤ編集中: 地図を薄くし、進路を進行方向の右側に太く重ねて矢印で向きを示す */
    cx.fillStyle='rgba(243,247,251,.3)';cx.fillRect(0,0,W,H);
    const o=z*.17,lw=Math.max(4,z*.16),U=R.st.map(a=>{const l=Math.hypot(a[2]-a[0],a[3]-a[1]);return[(a[2]-a[0])/l,(a[3]-a[1])/l,a]});
    cx.beginPath();
    for(const[ux,uy,a]of U){cx.moveTo(X(a[0])-uy*o,Y(a[1])+ux*o);cx.lineTo(X(a[2])-uy*o,Y(a[3])+ux*o)}
    cx.strokeStyle='#fff';cx.lineWidth=lw+4;cx.stroke();cx.strokeStyle='#f08c1a';cx.lineWidth=lw;cx.stroke();
    if(z>=9){const s=Math.max(2.5,z*.09);cx.beginPath();
      for(const[ux,uy,a]of U){const mx=X((a[0]+a[2])/2)-uy*o,my=Y((a[1]+a[3])/2)+ux*o;
        cx.moveTo(mx-ux*s-uy*s,my-uy*s+ux*s);cx.lineTo(mx+ux*s,my+uy*s);cx.lineTo(mx-ux*s+uy*s,my-uy*s-ux*s)}
      cx.strokeStyle='#fff';cx.lineWidth=Math.max(1.5,z*.05);cx.stroke()}
    cx.beginPath();   /* 選ばれていない分岐の先は点線で示す */
    for(const r of R.rows)if(r.br){const[nx,ny]=r.k.split(',').map(Number),di=+r.br.key.split('|')[1];
      for(const v of r.br.o)if(v!==r.br.c){const d=DIRS[(di+BO[v])%8];cx.moveTo(X(nx),Y(ny));cx.lineTo(X(nx+d[0]*.8),Y(ny+d[1]*.8))}}
    cx.setLineDash([4,4]);cx.strokeStyle='#8a99a8';cx.lineWidth=3;cx.stroke();cx.setLineDash([]);
  }
  /* 分岐点 */
  for(const[k,d]of deg){
    if(d<3)continue;const[nx,ny]=k.split(',').map(Number);if(nx<x0||nx>x1||ny<y0||ny>y1)continue;
    cx.beginPath();cx.arc(X(nx),Y(ny),z*.17,0,7);cx.fillStyle='#fff';cx.fill();cx.strokeStyle='#2f7de1';cx.lineWidth=2;cx.stroke();
  }
  /* 駅: 番線ぶんのホーム・屋根・駅舎・跨線橋 (3D表示では積層して立体にする) */
  const rr=(a,b,c,d,r)=>{cx.beginPath();cx.roundRect(a,b,c,d,r)};
  for(const[k,name]of stations){
    const[sx,sy]=xy(k);if(sx<x0-5||sx>x1+5||sy<y0-5||sy>y1+5)continue;
    /* 寸法は向きによらず共通: 寸法は SZ に集約 (ホーム幅・長さ・駅舎の奥行き) / 駅舎の長さ=ホームの長さ / 線路の脇を空けるので隣の線路にかからない */
    const[n,di,bs,sd,ln]=pget(k),D=DIRS[di],P=DIRS[(di+2)%8],g=2*Math.hypot(...P)*z,an=Math.atan2(D[1],D[0]),px=X(sx),py=Y(sy),sg=-bs,
      tw=z*SZ.tw,PW=z*SZ.pw,Lp=z*bl(ln),BD=z*SZ.bd,yN=-(tw+PW+z*.3),yF=yN-BD,h1=H3*.95,h2=H3*1.65,hp=H3*.18,hr=H3*.88,pv=[],th=Math.atan2(ls,lc),vF=sg*Math.cos(an+th)>0,vX=Math.sin(an+th)>0,UX=UPx*Math.cos(an)+UPy*Math.sin(an),UY=sg*(UPy*Math.cos(an)-UPx*Math.sin(an)),
      F=(u,f)=>{cx.save();cx.translate(px+UPx*u,py+UPy*u);cx.rotate(an);cx.scale(1,sg);f();cx.restore()},
      box=(x,y,w,h,u0,u1,sc,tc)=>{const m=u1-u0>1?Math.ceil((u1-u0)/3):0;for(let i=0;i<m;i++)F(u0+(u1-u0)*i/m,()=>{cx.fillStyle=sc;cx.fillRect(x,y,w,h)});F(u1,()=>{cx.fillStyle=tc;cx.fillRect(x,y,w,h)})};
    pv.push(...prects(sd,bs,g,tw,PW,ln));   /* 各番線の駅舎側/反対側のホーム */
    F(0,()=>{cx.fillStyle='rgba(30,50,70,.16)';for(const[a,b,,,,l]of pv)cx.fillRect(-z*l/2+2,a+3,z*l,b-a)});
    for(const[a,b,s,,,l]of pv){const Lh=z*l/2;box(-Lh,a,Lh*2,b-a,0,hp,'#aab6c3','#dfe5ec');F(hp,()=>{cx.fillStyle='#f2c230';if(s!==1)cx.fillRect(-Lh,a,Lh*2,z*.07);if(s!==0)cx.fillRect(-Lh,b-z*.07,Lh*2,z*.07);
      cx.fillStyle='#fff';for(let j=0;j<=l;j++){const u=-Lh+j*z;if(s!==1)cx.fillRect(u-z*.02,a,z*.04,z*.17);if(s!==0)cx.fillRect(u-z*.02,b-z*.17,z*.04,z*.17)}})}   /* 白い目印=1両(1マス)ごとの乗車位置 */
    for(const[a,b,,,,l]of pv){const d=PD(l);   /* 長さに応じた屋根・階段・照明 (設計図は PD) */
      for(const u of d.st)F(hp,()=>{cx.fillStyle='#8aa0b5';cx.fillRect(u*z-z*.22,(a+b)/2-z*.28,z*.44,z*.56);cx.fillStyle='#fff';for(let q=-.2;q<=.21;q+=.1)cx.fillRect(u*z-z*.18,(a+b)/2+q*z*1.2-z*.012,z*.36,z*.024)});
      for(const[u0,u1]of d.r){const c0=u0*z,c1=u1*z;
        for(const u of[c0,c1])for(const v of[a+z*.05,b-z*.15])box(u-z*.05,v,z*.1,z*.1,0,hr,'#51647a','#51647a');
        F(hr,()=>{rr(c0-z*.1,a+z*.02,c1-c0+z*.2,b-a-z*.04,z*.05);cx.fillStyle='rgba(235,244,252,.62)';cx.fill();cx.strokeStyle='#6f8aa6';cx.lineWidth=1.5;cx.stroke();
          cx.beginPath();for(let q=c0;q<=c1;q+=z*.5){cx.moveTo(q,a+z*.04);cx.lineTo(q,b-z*.04)}cx.strokeStyle='rgba(111,138,166,.5)';cx.lineWidth=1;cx.stroke()})}
      for(const u of d.lamp)box(u*z-z*.04,(a+b)/2-z*.04,z*.08,z*.08,0,hr*.85,'#51647a','#ffe9a0')}
    /* 設定中の番線のホームを青い破線で囲む */
    if(sel&&sel.type==='sta'&&sel.k===k)for(const[a,b,,i,j,l]of pv)if(i===psel||j===psel)F(hp,()=>{rr(-z*l/2-3,a-3,z*l+6,b-a+6,5);cx.save();cx.setLineDash([6,4]);cx.strokeStyle='#2f7de1';cx.lineWidth=2.5;cx.stroke();cx.restore()});
    /* 駅舎: 2階建て (1m≒H3/6)。1F=ガラス張りの吹き抜けロビー(約5.7m) / 2F=白い箱を街側へ張り出して玄関の庇にし、連続窓+看板帯 / 薄い屋根スラブ+屋上設備 (全高約9.9m)。跨線橋は2Fの床へつながる */
    const G1=yF+z*.35,x2=-Lp*.55,T2=h2-h1,fy1=vF?yN:G1,fy2=vF?yN:yF,ex1=vX?Lp:-Lp,ex2=vX?Lp:x2,w0=h1+T2*.14,w1=h1+T2*.62,gl='#4d7899',
      Q=(p,q,u0,u1,c)=>F(0,()=>{cx.beginPath();cx.moveTo(p[0]+UX*u0,p[1]+UY*u0);cx.lineTo(q[0]+UX*u0,q[1]+UY*u0);cx.lineTo(q[0]+UX*u1,q[1]+UY*u1);cx.lineTo(p[0]+UX*u1,p[1]+UY*u1);cx.closePath();cx.fillStyle=c;cx.fill()}),
      ML=(xa,xb,y,u0,u1,st,c)=>F(0,()=>{cx.beginPath();for(let q=xa+st;q<xb-1;q+=st){cx.moveTo(q+UX*u0,y+UY*u0);cx.lineTo(q+UX*u1,y+UY*u1)}cx.strokeStyle=c;cx.lineWidth=1.2;cx.stroke()});
    F(0,()=>{cx.fillStyle='rgba(30,50,70,.2)';cx.fillRect(-Lp+3,yF+3,Lp*2,BD)});
    box(-Lp,G1,Lp*2,yN-G1,0,h1,'#9fc0d8','#e9eef3');
    Q([-Lp+z*.12,fy1],[Lp-z*.12,fy1],H3*.04,h1-H3*.05,gl);Q([ex1,G1+z*.12],[ex1,yN-z*.12],H3*.04,h1-H3*.05,gl);
    ML(-Lp+z*.12,Lp-z*.12,fy1,H3*.04,h1-H3*.05,z*.5,'rgba(225,240,250,.5)');
    if(!vF)Q([-z*.3,G1],[z*1.1,G1],0,H3*.46,'#d4eef9');   /* 玄関の自動ドア (街側) */
    for(const q of[x2+z*.2,Lp-z*.2])box(q-z*.05,yF+z*.08,z*.1,z*.1,0,h1,'#f4f6f8','#fff');   /* 張り出した2Fを支える柱 */
    box(x2,yF,Lp-x2,yN-yF,h1,h2-H3*.05,'#f2f5f8','#f2f5f8');
    Q([x2+z*.15,fy2],[Lp-z*.15,fy2],w0,w1,'#35546f');Q([ex2,yF+z*.15],[ex2,yN-z*.15],w0,w1,'#35546f');
    Q([x2+z*.15,fy2],[Lp-z*.15,fy2],w0+(w1-w0)*.6,w1,'rgba(160,200,230,.35)');ML(x2+z*.15,Lp-z*.15,fy2,w0,w1,z*.6,'rgba(220,236,248,.45)');
    Q([x2+z*.15,fy2],[Lp-z*.15,fy2],h1+T2*.7,h1+T2*.85,'#2f7de1');   /* 看板帯 */
    box(x2-z*.1,yF-z*.1,Lp-x2+z*.2,yN-yF+z*.2,h2-H3*.05,h2,'#d3dae2','#eef1f5');
    box(Lp-z*1.1,yF+z*.3,z*.6,z*.45,h2,h2+H3*.14,'#a9b4c0','#ced5dd');box(x2+z*.3,yF+z*.3,z*.45,z*.4,h2,h2+H3*.1,'#a9b4c0','#ced5dd');
    const ye=Math.max(0,...pv.map(r=>r[1]));   /* 跨線橋: 2Fの床から一番遠いホームまで (ガラス張りの屋根付き通路) */
    if(ye>0){for(const[a,b]of pv)box(-z*.3,(a+b)/2-z*.07,z*.14,z*.14,0,h1,'#6b7d92','#6b7d92');
      box(-z*.3,yN,z*.6,ye-yN,h1-H3*.06,h1,'#7e8fa2','#9fb0c1');box(-z*.3,yN,z*.6,ye-yN,h1,h1+H3*.42,'#bfe0f0','#f3f6f9')}
    {const ly=(yF+BD/2)*sg,[tx,ty]=T(px-Math.sin(an)*ly,py+Math.cos(an)*ly),fs=Math.max(11,Math.min(15,z*.36));
      cx.save();cx.setTransform(dpr,0,0,dpr,0,0);cx.font=`700 ${fs}px system-ui,sans-serif`;cx.textAlign='left';cx.textBaseline='middle';
      const lh=fs*1.8,lw=cx.measureText(name).width+lh+fs*.5,lx=tx-lw/2,cy=ty-h2-(H3>1?lh*.7:0);
      cx.shadowColor='rgba(30,50,70,.28)';cx.shadowBlur=8;cx.shadowOffsetY=2;rr(lx,cy-lh/2,lw,lh,lh/2);cx.fillStyle='#fff';cx.fill();cx.shadowColor='transparent';
      cx.beginPath();cx.arc(lx+lh/2,cy,fs*.52,0,7);cx.fillStyle='#2f7de1';cx.fill();cx.beginPath();cx.arc(lx+lh/2,cy,fs*.2,0,7);cx.fillStyle='#fff';cx.fill();
      cx.fillStyle='#1f2d3d';cx.fillText(name,lx+lh,cy+.5);cx.restore()}
  }
  if(dtr&&R&&tab!=='add'){cx.textBaseline='middle';   /* 項目の番号と、駅の停車設定を地図上に表示 */
    R.rows.forEach((r,i)=>{const[nx,ny]=r.k.split(',').map(Number),q=Math.max(9,z*.26),d=R.rows.slice(0,i).filter(x=>x.k===r.k).length,px=X(nx)+q*1.1,py=Y(ny)+q*1.1+d*q*2.1,c=i===curN,e=ET[r.id];
      cx.beginPath();cx.arc(px,py,q,0,7);cx.fillStyle=KC[r.sa||'b'];cx.fill();cx.strokeStyle=c?'#1fa971':'#fff';cx.lineWidth=c?4.5:2.5;cx.stroke();
      cx.font=`700 ${Math.max(10,z*.3)}px system-ui,sans-serif`;cx.textAlign='center';cx.fillStyle='#fff';cx.fillText(i+1,px,py);
      const t=(r.sa?SH[r.sa]+' ':'')+(e?hm(e.a):'');if(t){cx.textAlign='left';cx.lineWidth=4;cx.strokeStyle='#fff';cx.strokeText(t,px+q+3,py);cx.fillStyle=c?'#12804f':KC[r.sa||'b'];cx.fillText(t,px+q+3,py)}})}
  if(sel&&(sel.type==='node'||sel.type==='sta')){const[nx,ny]=sel.k.split(',').map(Number);cx.beginPath();cx.arc(X(nx),Y(ny),Math.max(14,z*.42),0,7);cx.fillStyle='rgba(47,125,225,.18)';cx.fill();cx.strokeStyle='#2f7de1';cx.lineWidth=3;cx.stroke()}
  if(tool==='sta')stPrev(X,Y,z);
  if(tool==='train'&&tab==='add'&&!diaEl.hidden)addPrev(X,Y,z);
  if(fk){const[fx,fy]=fk.split(',').map(Number);cx.beginPath();cx.arc(X(fx),Y(fy),Math.max(16,z*.5),0,7);cx.strokeStyle='#1f2d3d';cx.lineWidth=4;cx.stroke()}
  /* 敷設プレビュー / カーソル */
  if(tool==='lay'){
    const tg=pend||hover;
    if(chain){
      if(tg){const pts=route(chain.p,tg,chain.pd);cx.beginPath();
        pts.forEach((p,i)=>i?cx.lineTo(X(p.x),Y(p.y)):cx.moveTo(X(p.x),Y(p.y)));
        cx.strokeStyle='rgba(47,125,225,.5)';cx.lineWidth=z*.3;cx.stroke()}
      cx.beginPath();cx.arc(X(chain.p.x),Y(chain.p.y),Math.max(7,z*.2),0,7);cx.fillStyle='#2f7de1';cx.fill();cx.strokeStyle='#fff';cx.lineWidth=2;cx.stroke();
    }
    if(tg){
      const on=deg.has(tg.x+','+tg.y);
      cx.beginPath();cx.arc(X(tg.x),Y(tg.y),pend?Math.max(11,z*.32):z*(on?.3:.14),0,7);
      if(on||pend){cx.strokeStyle=on?'#1fa971':'#2f7de1';cx.lineWidth=3;cx.stroke()}else{cx.fillStyle='#2f7de1';cx.fill()}
    }
  }
  if(hl){const e=hl.e;cx.beginPath();cx.moveTo(X(e[0]),Y(e[1]));cx.lineTo(X(e[2]),Y(e[3]));cx.strokeStyle='rgba(226,70,70,.6)';cx.lineWidth=z*.4;cx.stroke()}
  /* 列車: 編成の両数ぶん、1両(=1マス)ずつ線路に沿って描く (3D時は断面を積み重ねて箱型にする) */
  const hh=H3*.5,N=hh>1?8:0,C=['#8f2e22','#a53727','#bb4130','#d6e8f6','#d6e8f6','#c9432f','#dd4c37','#e5533d'],CL=SZ.cl;
  for(const t of trains){
    const cs=cars(t),on=(sel&&sel.t===t)||dtr===t,n=cs.length;
    cs.forEach((q,i)=>{const gx=X(q.x),gy=Y(q.y),F=(u,f)=>{cx.save();cx.translate(gx+UPx*u,gy+UPy*u);cx.rotate(q.a);f();cx.restore()},B=()=>{cx.beginPath();cx.roundRect(-z*CL/2,-z*SZ.trw/2,z*CL,z*SZ.trw,z*.12)};
      if(on)F(0,()=>{cx.beginPath();cx.roundRect(-z*(CL/2+.05),-z*(SZ.trw/2+.22),z*(CL+.1),z*(SZ.trw+.44),z*.16);cx.fillStyle='rgba(47,125,225,.22)';cx.fill();cx.strokeStyle='#2f7de1';cx.lineWidth=3;cx.stroke()});
      if(N){F(0,()=>{B();cx.fillStyle='rgba(30,50,70,.2)';cx.fill()});for(let j=0;j<N;j++)F(hh*j/N,()=>{B();cx.fillStyle=C[j];cx.fill()})}
      F(hh,()=>{B();cx.fillStyle='#e5533d';cx.fill();cx.fillStyle='#fff';for(const w of[-.3,-.05,.2])cx.fillRect(z*w-z*.07,-z*.1,z*.14,z*.2);
        if(i===n-1){cx.fillStyle='#35506b';cx.fillRect(z*.27,-z*.12,z*.13,z*.24)}})});   /* 先頭の両に運転台 */
    if(dtr&&tab!=='add'){const p=tpos(t),[tx,ty]=T(X(p.x)+UPx*hh,Y(p.y)+UPy*hh);cx.save();cx.setTransform(dpr,0,0,dpr,0,0);cx.font='700 12px system-ui,sans-serif';cx.textAlign='center';cx.textBaseline='bottom';cx.lineWidth=4;cx.strokeStyle='#fff';cx.strokeText(tname(t),tx,ty-z*.4);cx.fillStyle=t===dtr?'#f08c1a':'#2b3a4a';cx.fillText(tname(t),tx,ty-z*.4);cx.restore()}
  }
  cx.restore();
  if(tool==='train'&&tab==='add'&&!diaEl.hidden)addHdl();
}
function addHdl(){   /* 向きを選ぶ丸い操作点 (矢じりは線路に沿って外向き。文字ではなく図形で描く) */
  const g=aGeo();if(!g)return;const rd=ptype==='mouse'?17:24;
  cx.save();cx.setTransform(dpr,0,0,dpr,0,0);cx.lineCap=cx.lineJoin='round';
  for(const h of g.h){const on=apnd.hv===h.sg;cx.save();cx.translate(h.x,h.y);
    cx.shadowColor='rgba(30,50,70,.3)';cx.shadowBlur=8;cx.shadowOffsetY=2;cx.beginPath();cx.arc(0,0,rd,0,7);cx.fillStyle=on?'#2f7de1':'#fff';cx.fill();cx.shadowColor='transparent';cx.strokeStyle='#2f7de1';cx.lineWidth=2.5;cx.stroke();
    cx.rotate(h.a);cx.beginPath();cx.moveTo(-rd*.22,-rd*.4);cx.lineTo(rd*.28,0);cx.lineTo(-rd*.22,rd*.4);cx.strokeStyle=on?'#fff':'#2f7de1';cx.lineWidth=3;cx.stroke();cx.restore()}
  cx.restore()}
