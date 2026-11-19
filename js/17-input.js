/* js/17-input.js — 入力: ポインタ・ホイール・選択・削除・取り消し */

/* ---- 入力 ---- */
const hit=(g,px)=>Math.max(g,px/cam.z);
/* 列車の向き選び: 位置を決めたあと、線路の前後に出す2つの丸い操作点 (画面上の座標なので3D表示でも歪まない) */
function aGeo(){if(!apnd)return null;const{s,c,y:q}=lin(),z=cam.z,P=(x,y)=>{const a=(x-cam.x)*z+W/2,b=(y-cam.y)*z+H/2;return[W/2+c*(a-W/2)-s*(b-H/2),H/2+q*(s*(a-W/2)+c*(b-H/2))]},
  e=apnd.e,l=Math.hypot(e[2]-e[0],e[3]-e[1]),ux=(e[2]-e[0])/l,uy=(e[3]-e[1])/l,o=P(apnd.p.x,apnd.p.y),D=Math.max(z*1.3,ptype==='mouse'?44:56);
  return{o,h:[1,-1].map(sg=>{const m=P(apnd.p.x+ux*sg,apnd.p.y+uy*sg),vx=m[0]-o[0],vy=m[1]-o[1],v=Math.hypot(vx,vy)||1;return{sg,x:o[0]+vx/v*D,y:o[1]+vy/v*D,a:Math.atan2(vy,vx)}})}}
function aHit(x,y){const g=aGeo(),rd=ptype==='mouse'?20:28;return g&&g.h.find(h=>Math.hypot(x-h.x,y-h.y)<rd)||null}
const ptrs=new Map(),hist=[];let pin=null,pend=null,sel=null,shown=null;
const gs=()=>{const[a,b]=[...ptrs.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)||1,r:Math.atan2(b.y-a.y,b.x-a.x)}};
function snap(){hist.push(JSON.stringify([[...edges.values()],[...stations],trains.map(({id,ax,ay,bx,by,t,cf,dw,iv,pid,off,no,ci,nm,nc})=>({id,ax,ay,bx,by,t,cf,dw,iv,pid,off,no,ci,nm,nc})),[...pl]]));if(hist.length>60)hist.shift()}
function undo(){
  if(!hist.length)return;
  const[E,S,T,PL]=JSON.parse(hist.pop()),cur=new Map(trains.map(t=>[t.id,t]));edges.clear();E.forEach(e=>addE(...e));stations.clear();S.forEach(([k,n])=>stations.set(k,n));pl.clear();(PL||[]).forEach(([k,v])=>pl.set(k,v));
  trains.length=0;(T||[]).forEach(q=>trains.push(cur.get(q.id)||q));   /* 列車も元に戻す(設定は現在のものを保持) */
  for(let i=trains.length-1;i>=0;i--){const t=trains[i];if(!edges.has(norm(t.ax,t.ay,t.bx,t.by).join()))trains.splice(i,1)}
  chain=pend=sel=apnd=null;relink();rebuild();
}
function nearJ(w,r,mn=3){let b=null;for(const[k,d]of deg){if(d<mn)continue;const[x,y]=k.split(',').map(Number),m=Math.hypot(x-w.x,y-w.y);if(m<r){r=m;b=k}}return b}
/* 長押し選択: 列車 > 分岐点 > 線路区間 */
function section(k0){
  const keys=new Set([k0]),e=edges.get(k0);
  const walk=(x,y,px,py)=>{
    for(let g=0;g<4000;g++){
      if(deg.get(x+','+y)!==2)return;
      const d=DIRS.find(d=>(x+d[0]!==px||y+d[1]!==py)&&has(x,y,x+d[0],y+d[1]));
      if(!d)return;
      const nx=x+d[0],ny=y+d[1],k=norm(x,y,nx,ny).join();
      if(keys.has(k))return;
      keys.add(k);px=x;py=y;x=nx;y=ny;
    }
  };
  walk(e[2],e[3],e[0],e[1]);walk(e[0],e[1],e[2],e[3]);
  return[...keys];
}
function pick(w){
  const t=trains.find(t=>thit(t,w));
  if(t)return{type:'train',t};
  const sk=nearS(w,hit(.6,28));if(sk)return{type:'sta',k:sk};
  const k=nearJ(w,hit(.6,28));
  if(k)return{type:'node',k};
  const n=nearEdge(w,hit(.4,18));
  return n?{type:'edges',keys:section(n.k)}:null;
}
function selAct(){
  if(!sel)return;
  if(sel.type==='train')flip(sel.t);
  else if(sel.type==='sta'){const n=prompt('駅名を入力',stations.get(sel.k));if(n&&n.trim()){snap();stations.set(sel.k,n.trim().slice(0,12));rebuild();shown=null}}
}
function selDel(){
  if(!sel)return;
  if(sel.type==='train')rmTrain(sel.t);
  else{
    snap();
    if(sel.type==='sta')rmSta(sel.k);
    else if(sel.type==='edges')sel.keys.forEach(delE);
    else{const[x,y]=sel.k.split(',').map(Number);DIRS.forEach(d=>{if(has(x,y,x+d[0],y+d[1]))delE(norm(x,y,x+d[0],y+d[1]).join())})}
    rebuild();
  }
  sel=null;
}
function panel(){
  selEl.hidden=!sel;if(!sel)return;
  const T=sel.type;
  sinfoEl.textContent=T==='train'?`${tname(sel.t)}を選択中`:T==='sta'?`駅「${stations.get(sel.k)}」を選択中`:T==='node'?'分岐点を選択中':`線路を選択中 (${sel.keys.length}マス)`;
  sactEl.hidden=T==='edges'||T==='node';srenEl.hidden=T!=='train';pstEl.hidden=T!=='sta';if(T==='sta')pcnEl.textContent=pget(sel.k)[0];psdRender();sdiaEl.hidden=T!=='train';sactlEl.textContent=T==='train'?'反転':'駅名';
}
function ring(){   /* 長押し中の進行リング */
  if(!drag||!drag.tm||drag.mv||drag.lp)return;
  const f=Math.min(1,(performance.now()-drag.t0)/450);if(f<.3)return;
  cx.beginPath();cx.arc(drag.sx,drag.sy,24,-Math.PI/2,-Math.PI/2+Math.PI*2*f);cx.strokeStyle='#2f7de1';cx.lineWidth=4;cx.lineCap='round';cx.stroke();
}
function erase(e){
  const w=s2w(e.clientX,e.clientY),i=trains.findIndex(t=>thit(t,w));
  if(i>=0){rmTrain(trains[i]);return}
  const n=nearEdge(w,hit(.35,16));
  if(n){if(drag&&!drag.sn){snap();drag.sn=true}delE(n.k);rebuild()}
}
function click(e,b){
  if(b!==0){chain=pend=apnd=null;return}
  if(sel&&tool!=='sel'){sel=null;return}   /* 最初のタップは選択解除のみ */
  const w=s2w(e.clientX,e.clientY),p={x:Math.round(w.x),y:Math.round(w.y)};
  if(tool==='lay'){
    if(e.pointerType!=='mouse'&&chain&&(p.x!==chain.p.x||p.y!==chain.p.y)){
      if(pend&&pend.x===p.x&&pend.y===p.y){pend=null;layTo(p)}else pend=p;   /* タッチは仮置き→再タップで確定 */
    }else{pend=null;layTo(p,e.shiftKey)}
  }
  else if(tool==='sta'){const k=kk(p.x,p.y);
    if(stations.has(k)){snap();rmSta(k);rebuild()}
    else if(pn.has(k))msg('ここはホームの線路です。駅を選んで「ホーム」の番線数で変更できます');
    else{const q=stBestC(p.x,p.y);
      if(q.o.length){stBad={q,t:performance.now()};msg('干渉があるため駅を置けません (赤い部分)。位置をずらしてください')}
      else{snap();q.E.forEach(e=>addE(...e));const k2=kk(q.x,q.y);stations.set(k2,nm());pl.set(k2,[1,q.di,q.bs,[q.bs>0?1:2]]);rebuild()}}}
  else if(tool==='train'){if(tab==='add'){const h=aHit(e.clientX,e.clientY);if(h){const a=apnd;apnd=null;addTrainAt(a,h.sg<0);return}const n=nearEdge(w,hit(.6,26));apnd=n?{k:n.k,e:n.e,t:n.t,p:{x:n.e[0]+(n.e[2]-n.e[0])*n.t,y:n.e[1]+(n.e[3]-n.e[1])*n.t},hv:0}:null}else{const o=pick(w);if(o&&o.type==='train')selectTrain(o.t)}}
  else if(tool==='erase')erase(e);
  else if(tool==='sel'){const o=pick(w);sel=o&&(o.type==='train'||o.type==='sta')?o:null;
  }
}
cv.addEventListener('pointerdown',e=>{ptype=e.pointerType;
  stopCam();try{cv.setPointerCapture(e.pointerId)}catch(_){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size>1){drag=null;pin=gs();return}   /* 2本指: ピンチ/移動 */
  drag={sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,b:e.button,mv:false,t:e.pointerType!=='mouse'};
  if(tool==='erase'&&e.button===0&&!drag.t)erase(e);
  if(tool!=='erase'&&tool!=='train'&&e.button===0&&!(tool==='lay'&&chain)){   /* 長押しで選択 */
    const d=drag;d.t0=performance.now();
    d.tm=setTimeout(()=>{
      if(drag!==d||d.mv||ptrs.size!==1)return;
      const o=pick(s2w(d.sx,d.sy));
      if(o){sel=o;d.lp=true;if(navigator.vibrate)navigator.vibrate(18)}
    },450);
  }
});
cv.addEventListener('pointermove',e=>{ptype=e.pointerType;
  if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size>1){
    const g=gs();
    if(pin){const a=s2w(pin.x,pin.y);if(v3)yaw+=g.r-pin.r;cam.z=Math.min(160,Math.max(5,cam.z*g.d/pin.d));const b=s2w(g.x,g.y);cam.x+=a.x-b.x;cam.y+=a.y-b.y}
    pin=g;return;
  }
  const w=s2w(e.clientX,e.clientY);hw=w;hover={x:Math.round(w.x),y:Math.round(w.y)};
  if(apnd){const h=aHit(e.clientX,e.clientY);apnd.hv=h?h.sg:0;cv.style.cursor=h?'pointer':'crosshair'}
  posEl.textContent=`x ${hover.x}   y ${hover.y}`;
  hl=tool==='erase'?nearEdge(w,hit(.35,16)):null;
  if(!drag)return;
  const er=tool==='erase'&&drag.b===0;
  if(!drag.mv&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>(drag.t?10:5))drag.mv=true;
  if(er){if(!drag.t||drag.mv)erase(e)}
  else if(drag.mv){if(v3&&drag.b===2){yaw+=(e.clientX-drag.lx)*.008;tilt=Math.min(.95,Math.max(.3,tilt+(e.clientY-drag.ly)*.004))}else{const a=s2w(drag.lx,drag.ly),b=s2w(e.clientX,e.clientY);cam.x+=a.x-b.x;cam.y+=a.y-b.y}}
  drag.lx=e.clientX;drag.ly=e.clientY;
});
cv.addEventListener('pointerup',e=>{
  ptrs.delete(e.pointerId);if(ptrs.size<2)pin=null;
  if(drag)clearTimeout(drag.tm);
  if(drag&&!drag.mv&&!drag.lp&&!(tool==='erase'&&drag.b===0&&!drag.t))click(e,drag.b);
  drag=null;
});
cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);pin=null;drag=null});
cv.addEventListener('lostpointercapture',e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pin=null});addEventListener('blur',()=>{ptrs.clear();pin=null;drag=null});
cv.addEventListener('pointerleave',e=>{hover=null;hl=null;if(e.pointerType==='mouse')hw=null;if(e.pointerType==='mouse'&&tool==='sta')hintEl.textContent=hs()});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{
  e.preventDefault();stopCam();const a=s2w(e.clientX,e.clientY);
  const dy=Math.max(-300,Math.min(300,e.deltaY*(e.deltaMode===1?33:e.deltaMode===2?400:1)||0));cam.z=Math.min(160,Math.max(5,cam.z*Math.exp(-dy*.0015)));
  const b=s2w(e.clientX,e.clientY);cam.x+=a.x-b.x;cam.y+=a.y-b.y;
},{passive:false});

