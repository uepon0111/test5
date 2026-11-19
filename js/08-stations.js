/* js/08-stations.js — 駅とホーム: 計画・干渉判定・設置プレビュー */
const nm=()=>{const u=new Set(stations.values());let i=1;while(u.has('駅'+i))i++;return'駅'+i};
function nearS(w,r){let b=null,best=1e9;for(const k of stations.keys()){const[x,y]=xy(k),[n,di,bs,,ln]=pget(k),D=DIRS[di],L=Math.hypot(...D),dx=w.x-x,dy=w.y-y,u=(dx*D[0]+dy*D[1])/L,v=-bs*(dy*D[0]-dx*D[1])/L,m=Math.hypot(dx,dy);
  if((m<r||(Math.abs(u)<Math.max(...ln)/2+.2&&v>-(SZ.tw+SZ.pw+.3+SZ.bd+.15)&&v<(n-1)*2*L+SZ.tw+SZ.pw+.05))&&m<best){best=m;b=k}}return b}
/* ---- 駅のホーム: 番線を増やすと、駅舎と反対側に平行な線路だけを敷く (本線とは自動でつながない。ダイヤの分岐項目で番線を選べる) ---- */
const ck=k=>{const p=pn.get(k);return p?p.s:k},sname=k=>stations.get(ck(k))||'';
const sp=k=>{const p=pn.get(k),v=pl.get(p?p.s:k);return v&&v[0]>1?` <small>${(p?p.i:0)+1}番線</small>`:''};
function dest(x,y,w){for(let g=0;g<14;g++){x+=DIRS[w][0];y+=DIRS[w][1];const k=kk(x,y),p=pn.get(k);if(p)return p;if(stations.has(k))return{s:k,i:0};const al=outs(x,y,w);if(!al.length)return null;w=al[0]}return null}
const dl=(key,v)=>{const[k,di]=key.split('|'),[x,y]=xy(k),d=dest(x,y,(+di+BO[v])%8);return d?` (${stations.get(d.s)} ${d.i+1}番線)`:''};
function axis(k){const[x,y]=xy(k);let r=-1;for(let i=3;i>=0;i--){const d=DIRS[i],a=has(x,y,x+d[0],y+d[1]),b=has(x,y,x-d[0],y-d[1]);if(a&&b)return i;if(a||b)r=i}return r}
/* 駅舎は線路の少ない側に建てる (+1=進行方向の右 / -1=左)。ホームは駅舎に近い線から 1番線・2番線… */
const bside=(k,di)=>{const[x,y]=xy(k),D=DIRS[di],P=DIRS[(di+2)%8],o=s=>{let q=0;for(let t=-2;t<=2;t++)for(let m=1;m<=3;m++)if(deg.has(kk(x+t*D[0]+s*m*P[0],y+t*D[1]+s*m*P[1])))q++;return q};return o(1)<o(-1)?1:-1};
/* pl: 駅 -> [番線数, 本線の向き, 駅舎の側, 各番線のホーム(0=なし 1=右 2=左 3=両側), 自動敷設でない既存の線路, 各番線のホームの長さ(マス=両数)] */
const pget=k=>{const p=pl.get(k),di=p?p[1]:Math.max(0,axis(k)),bs=p?p[2]:bside(k,di),n=p?p[0]:1;return[n,di,bs,p?p[3]:[bs>0?1:2],Array.from({length:n},(_,i)=>p&&p[5]&&p[5][i]||PL0)]};   /* [番線数,向き,駅舎の側,各番線のホーム,各番線の長さ(マス)] */
function platPlan(k,di,n,bs,ln=[]){   /* 駅舎と反対側へ、本線と平行な線路だけを2マス間隔で敷く (本線へのつなぎは敷設ツールで自分で引く) */
  const[x,y]=xy(k),D=DIRS[di],P=DIRS[(di+2)%8],E=[],N=[];
  for(let i=1;i<n;i++){const T=Math.max(di%2?2:3,tm(di,ln[i]||PL0)),o=-bs*2*i;let p=   /* 平行な線路の長さは、その番線のホームの長さに合わせる */
    [x+o*P[0]-T*D[0],y+o*P[1]-T*D[1]];
    for(let q=0;q<2*T;q++){E.push([p[0],p[1],p[0]+D[0],p[1]+D[1]]);p=[p[0]+D[0],p[1]+D[1]]}
    N[i]=kk(x+o*P[0],y+o*P[1])}
  return{E,N};
}
function fits(k,di,n,E,old){   /* 本線が駅の前後で直線か、新しい線路が他の線路とぶつからないか (予定の場所に既にある線路はそのまま使うので干渉にしない) */
  const[x,y]=xy(k),D=DIRS[di],nd=e=>[kk(e[0],e[1]),kk(e[2],e[3])],free=new Set(old.flatMap(nd));
  for(let t=-2;t<2;t++)if(!has(x+t*D[0],y+t*D[1],x+(t+1)*D[0],y+(t+1)*D[1]))return false;
  E.filter(e=>has(...e)).forEach(e=>nd(e).forEach(q=>free.add(q)));
  return E.every(e=>has(...e)||nd(e).every(q=>free.has(q)||!deg.has(q)));
}
/* ---- ホームの長さ (番線ごと・単位=マス=両数) ---- */
const tm=(di,l)=>Math.ceil(l/2/(di%2?Math.SQRT2:1)-1e-9),bl=ln=>Math.min(Math.max(...ln)/2,3.2);   /* tm=ホーム半分に必要な本線の点の数 / bl=駅舎の半分の長さ */
/* ホームの設計図: 長さごとに屋根・階段・照明の配置を変える (単位=マス、ホームの中心が0) */
const PD=l=>l<=3?{r:[[-.6,.6]],st:[],lamp:[]}:l<=5?{r:[[-l*.34,l*.34]],st:[],lamp:[-l/2+.4,l/2-.4]}:l<=8?{r:[[-l*.44,-l*.08],[l*.08,l*.44]],st:[0],lamp:[-l/2+.5,l/2-.5]}:{r:[[-l*.44,-l*.18],[-l*.12,l*.12],[l*.18,l*.44]],st:[-l/2+.45,l/2-.45],lamp:[-l*.3,0,l*.3]};
const reach=(k,di)=>{const[x,y]=xy(k),D=DIRS[di];return[1,-1].map(s=>{let r=0;while(r<9&&(has(x+s*r*D[0],y+s*r*D[1],x+s*(r+1)*D[0],y+s*(r+1)*D[1])||!deg.has(kk(x+s*(r+1)*D[0],y+s*(r+1)*D[1]))))r++;return r})};   /* 本線を前後にあと何点ぶん直線に延ばせるか (辺があるか、先の点が空いている所まで) */
const extMain=(k,di,T)=>{const[x,y]=xy(k),D=DIRS[di],E=[];for(let t=-T;t<T;t++){const e=[x+t*D[0],y+t*D[1],x+(t+1)*D[0],y+(t+1)*D[1]];if(!has(...e))E.push(e)}return E};
function setLn(k,i,d){const[n,,bs,sd,ln]=pget(k),N=bs>0?1:2,F=3-N,v=Math.max(PLMIN,Math.min(PLMAX,ln[i]+d)),l=ln.slice();l[i]=v;
  if(i<n-1&&(sd[i]&F)&&(sd[i+1]&N))l[i+1]=v;if(i>0&&(sd[i]&N)&&(sd[i-1]&F))l[i-1]=v;   /* 島式ホームは両側の番線で同じ長さ */
  if(v!==ln[i])setPl(k,n,0,0,false,l)}
const sw=f=>f===1?2:f===2?1:f;
function setPl(k,n,bsN,sdN,quiet,lnN){   /* 番線数・駅舎の側・各番線のホーム・各番線の長さを変更する */
  const[n0,di,b0,s0,l0]=pget(k),bs=bsN||b0;n=Math.max(1,Math.min(PMAX,n));
  const ln=(lnN||l0).slice(0,n);while(ln.length<n)ln.push(ln[ln.length-1]||PL0);
  const old=n0>1?platPlan(k,di,n0,b0,l0).E:[],nw=n>1?platPlan(k,di,n,bs,ln):null,ow=new Set((pl.get(k)||[])[4]||[]),Tm=Math.max(2,tm(di,Math.max(...ln)));   /* ow=以前から利用していた既存の線路 / Tm=本線に必要な前後の点の数 */
  if(Tm>2&&Math.min(...reach(k,di))<Tm){msg('ホームを延ばせません: 本線の前後に、直線の線路を敷く空きが必要です');return}
  if(nw&&(n!==n0||bs!==b0||ln.some((v,i)=>v!==l0[i]))&&!fits(k,di,n,nw.E,old)){msg('この番線数・長さにはできません: 駅舎と反対側に、並行する線路を敷く空きが必要です (「駅舎⇄」で駅舎を反対側へ移せます)');return}
  if(!quiet)snap();
  if(Tm>2)extMain(k,di,Tm).forEach(e=>addE(...e));   /* 長いホームは本線を前後に延ばす */
  const keep=new Set((nw?nw.E:[]).map(e=>norm(...e).join())),oq=new Set(old.map(e=>norm(...e).join())),own=[...keep].filter(q=>edges.has(q)&&(!oq.has(q)||ow.has(q)));   /* own=自動敷設ではなく元からある線路 (番線を減らしても消さない) */
  old.forEach(e=>{const q=norm(...e).join();if(!keep.has(q)&&!ow.has(q))delE(q)});
  if(nw)nw.E.forEach(e=>addE(...e));
  const sd=(sdN||s0.map(f=>bs===b0?f:sw(f))).slice(0,n);while(sd.length<n)sd.push(bs>0?1:2);
  pl.set(k,[n,di,bs,isl(sd,bs),own,ln]);rebuild();
}
const rmSta=k=>{setPl(k,1,0,0,true);stations.delete(k);pl.delete(k)};
/* ---- ホーム: 隣り合う番線が共有する側は 1つの島式ホームにまとめる ---- */
const isl=(sd,bs)=>{const N=bs>0?1:2,F=3-N,o=sd.slice();for(let i=0;i<o.length-1;i++)if((o[i]&F)||(o[i+1]&N)){o[i]|=F;o[i+1]|=N}return o};
function prects(sd,bs,g,tw,PW,ln=[]){   /* [奥行きの始点,終点,種類(0=反対側 1=駅舎側 2=島式),番線,番線2,長さ(マス)] */
  const N=bs>0?1:2,F=3-N,o=[],L=i=>ln[i]||PL0;
  sd.forEach((f,i)=>{const c=i*g;
    if((f&N)&&!(i&&(sd[i-1]&F)))o.push([c-tw-PW,c-tw,1,i,i,L(i)]);
    if(f&F)o.push((sd[i+1]&N)?[c+tw,c+g-tw,2,i,i+1,Math.max(L(i),L(i+1))]:[c+tw,c+tw+PW,0,i,i,L(i)])});
  return o}
/* ---- 駅の新設: 線路を自動で敷き、ぶつかる場所を調べて赤く示す ---- */
const sat=(A,B)=>{for(const P of[A,B])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],nx=a[1]-b[1],ny=b[0]-a[0],pa=A.map(p=>p[0]*nx+p[1]*ny),pb=B.map(p=>p[0]*nx+p[1]*ny);
  if(Math.max(...pa)<=Math.min(...pb)+1e-9||Math.max(...pb)<=Math.min(...pa)+1e-9)return false}return true};
const FP=(x,y,di,bs,sd,ln=sd.map(()=>PL0))=>{const D=DIRS[di],P=DIRS[(di+2)%8],L=Math.hypot(...D),yN=-(SZ.tw+SZ.pw+.3),
  Q=(a,b,l)=>[[-l,a],[l,a],[l,b],[-l,b]].map(([u,v])=>[x+(u*D[0]-bs*v*P[0])/L,y+(u*D[1]-bs*v*P[1])/L]);
  return[...prects(sd,bs,2*L,SZ.tw,SZ.pw,ln).map(r=>Q(r[0],r[1],r[5]/2)),Q(yN-SZ.bd,yN,bl(ln))]};   /* 駅が占める範囲 (ホーム+駅舎) */
function stPlan(x,y,di,bs){
  const D=DIRS[di],E=[],sg=e=>[[e[0],e[1]],[e[2],e[3]]];
  for(let t=-3;t<3;t++){const e=[x+t*D[0],y+t*D[1],x+(t+1)*D[0],y+(t+1)*D[1]];if(!has(...e))E.push(e)}   /* 既存の線路はそのまま使い、足りない所だけ敷く */
  const F=FP(x,y,di,bs,[bs>0?1:2]),o=[];
  for(const e of edges.values()){if(Math.abs(e[0]-x)>7||Math.abs(e[1]-y)>7)continue;const q=sg(e);if(F.some(r=>sat(r,q))||E.some(n=>sat(sg(n),q)))o.push({e})}
  for(const k2 of stations.keys()){const[a,b]=xy(k2);if(k2===kk(x,y)||Math.abs(a-x)>12||Math.abs(b-y)>12)continue;
    const[n2,d2,b2,s2,l2]=pget(k2),G=FP(a,b,d2,b2,s2,l2);if(G.some(g=>F.some(r=>sat(r,g))||E.some(n=>sat(sg(n),g))))o.push({G})}
  return{x,y,di,bs,E,F,o}}
function stBest(x,y){const b=stBest0(x,y);if(!b.o.length||deg.has(kk(x,y)))return b;
  for(const[dx,dy]of DIRS){const a=x+dx,c=y+dy,k=kk(a,c);if(!deg.has(k)||stations.has(k)||pn.has(k))continue;const p=stBest0(a,c);if(!p.o.length)return p}   /* ぶつかる時は隣の既存の線路を使う */
  return b}
function stBest0(x,y){const k=kk(x,y),A=[];
  if(deg.has(k)){const a=axis(k);for(let i=0;i<4;i++){const d=DIRS[i];if(has(x,y,x+d[0],y+d[1])||has(x,y,x-d[0],y-d[1]))A.push(i)}A.sort((p,q)=>(q===a)-(p===a))}   /* 既存の線路の向きを優先 */
  if(!A.length)A.push(0,2,1,3);
  let b=null;for(const di of A){const s=bside(k,di);for(const bs of[s,-s]){const p=stPlan(x,y,di,bs);if(!p.o.length)return p;if(!b||p.o.length<b.o.length)b=p}}
  return b}
let stC=null,stBad=null;
const stBestC=(x,y)=>{const key=x+','+y+','+ver;if(!stC||stC.key!==key)stC={key,q:stBest(x,y)};return stC.q};
function stPrev(X,Y,z){   /* 駅ツールの予告表示: 青=設置できる / 赤=ぶつかる所 */
  if(hover&&stations.has(kk(hover.x,hover.y))){cx.beginPath();cx.arc(X(hover.x),Y(hover.y),Math.max(12,z*.4),0,7);cx.strokeStyle='#d9382f';cx.lineWidth=3;cx.stroke();return}
  const q=hover?stBestC(hover.x,hover.y):stBad&&performance.now()-stBad.t<4000?stBad.q:null;if(!q)return;
  const ok=!q.o.length,col=ok?'#2f7de1':'#d9382f',
    poly=(P,f,s)=>{cx.beginPath();P.forEach((p,i)=>i?cx.lineTo(X(p[0]),Y(p[1])):cx.moveTo(X(p[0]),Y(p[1])));cx.closePath();cx.fillStyle=f;cx.fill();if(s){cx.strokeStyle=s;cx.lineWidth=2.5;cx.stroke()}},
    seg=(e,c,w)=>{cx.beginPath();cx.moveTo(X(e[0]),Y(e[1]));cx.lineTo(X(e[2]),Y(e[3]));cx.strokeStyle=c;cx.lineWidth=w;cx.stroke()};
  cx.lineJoin=cx.lineCap='round';
  q.E.forEach(e=>seg(e,'rgba(47,125,225,.55)',Math.max(4,z*.2)));   /* 自動で敷く線路 */
  q.F.forEach(r=>poly(r,ok?'rgba(47,125,225,.16)':'rgba(217,56,47,.1)',col));   /* 駅が占める範囲 */
  for(const c of q.o)if(c.G)c.G.forEach(r=>poly(r,'rgba(217,56,47,.4)','#d9382f'));else{seg(c.e,'#fff',Math.max(10,z*.55));seg(c.e,'#d9382f',Math.max(6,z*.36))}   /* ぶつかる相手 */
  cx.beginPath();cx.arc(X(q.x),Y(q.y),Math.max(8,z*.26),0,7);cx.fillStyle=col;cx.fill();cx.strokeStyle='#fff';cx.lineWidth=2;cx.stroke();
  if(hover){const a=q.o.some(c=>c.e),b=q.o.some(c=>c.G),m=ok?'クリックで駅を設置 (青い線の線路を自動で敷設)':`干渉: 赤い部分が${[a&&'線路',b&&'他の駅'].filter(Boolean).join('・')}とぶつかります`;if(hintEl.textContent!==m)hintEl.textContent=m}}
