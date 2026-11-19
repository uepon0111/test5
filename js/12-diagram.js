/* js/12-diagram.js — ダイヤ一覧の時刻表示・ダイヤグラム(グラフ)・列車一覧 */
function dTimes(){   /* 一覧の到着/発車時刻と、1周の所要時間を更新 */
  dlEl.querySelectorAll('li.ghost').forEach(li=>{const r=R.rows[+li.dataset.gi],q=li.querySelector('.eta'),e=r&&ET[r.id];let x=null;   /* ループ前後の行は表示のみ: 後=次の周の時刻 / 前=ループ直前の項目 (先頭から始まる列車は前の周の時刻) */
    if(e){if(li.dataset.gt==='b')x=e.n;else if(li.dataset.w){if(e.n){const p=e.n.a-e.a;x={a:e.a-p,d:e.d!=null&&e.n.d!=null?e.d-(e.n.d-e.d):null}}}else x=e}
    const s=!x?'':r.sa&&r.sa!=='p'?`着 ${hm(x.a)} → 発 ${hm(x.d!=null?x.d:x.a)}`:`通過 ${hm(x.a)}`;if(q&&q.textContent!==s)q.textContent=s});
  rowEls().forEach((li,i)=>{const r=R.rows[i],q=li.querySelector('.eta');if(!r||!q)return;
    const e=ET[r.id],s=!e?'':r.sa&&r.sa!=='p'?`着 ${hm(e.a)} → 発 ${hm(e.d)}`:`通過 ${hm(e.a)}`;if(q.textContent!==s)q.textContent=s;
    const u=li.querySelector('input');if(u&&document.activeElement!==u){const d=dtr.cf.d[r.id.slice(2)],v=d!=null?hm(d+(dtr.off||0)):e&&e.d!=null?hm(e.d):'';if(u.value!==v)u.value=v;u.classList.toggle('df',d==null)}});   /* 未設定の発車時刻は 到着+停車時間 を薄く表示 */
  let c=0;for(let i=R.loop;i<R.st.length;i++){const a=R.st[i];c+=Math.hypot(a[2]-a[0],a[3]-a[1])*SPC}
  for(const e of R.ev)if(e.s>=R.loop&&e.id[0]==='s'&&R.rows.find(r=>r.id===e.id).sa!=='p')c+=dtr.dw??30;
  const v=dtr.iv||0,bad=v>0&&c>v,s=`1周 約${ft(c)}`+(v?` / 間隔 ${ft(v)}`+(bad?' (間隔を超過)':''):'');
  if(dinfoEl.textContent!==s){dinfoEl.textContent=s;dinfoEl.classList.toggle('bad',bad)}
}

/* ---- ダイヤグラム (横=時刻 / 縦=駅): 選択列車と、線路でつながる列車の予定 ---- */
const GCOL=['#2f7de1','#1fa971','#a259d6','#d9382f','#c28a00','#16a2b8','#e0559b','#6b7b8c'],gcol=t=>t===dtr?'#f08c1a':GCOL[(t.id-1)%8];
function sim(tr,rt,t1){   /* 現在から t1 までの 駅ごとの着・発(通過) を時刻順に先読みする */
  const o=[],ld={...tr.ld},n=rt.st.length,at=new Map();
  rt.ev.forEach(e=>{const r=rt.rows.find(x=>x.id===e.id);if(r.sa)at.set(e.s,[...(at.get(e.s)||[]),r])});
  let i=rt.pos.get(tk(tr).join()),t=clock,off=tr.t;
  if(tr.w!=null){if(tr.wk)o.push({k:ck(tr.wk.split('|')[0]),a:clock,d:tr.w});t=tr.w;off=0}
  for(let c=0;t<t1&&c<30000;c++){
    const a=rt.st[i];t+=(Math.hypot(a[2]-a[0],a[3]-a[1])-off)*SPC;off=0;
    for(const r of at.get(i)||[]){const e={k:ck(r.k),a:t,d:t};
      if(r.sa!=='p'){const sk=r.id.slice(2),d=dep(tr,ld,sk,t+(tr.dw??30));ld[sk]=d;t=d;e.d=d}
      o.push(e)}
    i=i+1<n?i+1:rt.loop;
  }
  return o;
}
function dTrain(){   /* 列車の一覧: 親の下に子を並べる */
  const L=[];trains.filter(t=>t.pid==null).sort((a,b)=>(a.no||0)-(b.no||0)).forEach(r=>{L.push(r,...trains.filter(c=>c.pid===r.id).sort((a,b)=>(a.off||0)-(b.off||0)))});
  for(const t of trains)if(!L.includes(t))L.push(t);
  const h=L.map(t=>{const c=t.pid!=null,p=parentOf(t),n=trains.filter(x=>x.pid===t.id).length;
    return`<li data-id="${t.id}" class="${c?'c':''}${t===dtr?' on':''}"><i class="no">${c?ic('sub'):t.no||t.id}</i><span class="nm">${esc(tname(t))}</span><small>${c&&p?esc(tname(p))+'の'+Math.round((t.off||0)/60)+'分後':n?'子 '+n+'本':''}</small></li>`}).join('')||'<li class="empty">列車がありません</li>';
  if(h===tHtml)return;const y=tlEl.scrollTop;tlEl.innerHTML=tHtml=h;tlEl.scrollTop=y;
  const o=tlEl.querySelector('li.on');if(o){const a=o.offsetTop,b=a+o.offsetHeight;if(a<tlEl.scrollTop)tlEl.scrollTop=a;else if(b>tlEl.scrollTop+tlEl.clientHeight)tlEl.scrollTop=b-tlEl.clientHeight}}
function tlSync(){if(diaEl.hidden)return;if(tab!=='add'&&!dtr&&trains.length)autoSel();dTrain();viewSync();
  const s=dtr?tname(dtr):'なし';if(tselEl.textContent!==s)tselEl.textContent=s;trenEl.disabled=tdelEl.disabled=!dtr}
function gDraw(){
  if(performance.now()-gT<200)return;gT=performance.now();
  const w=gcv.clientWidth,h=gcv.clientHeight;if(!w||!h)return;
  if(!gC||gC.v!==ver||gC.t!==dtr){   /* 選択列車と線路でつながる列車を集める */
    const sn=new Set([dtr.ax+','+dtr.ay]),q=[[dtr.ax,dtr.ay]];
    while(q.length){const[x,y]=q.pop();for(const d of DIRS){const nx=x+d[0],ny=y+d[1],k=nx+','+ny;if(!sn.has(k)&&has(x,y,nx,ny)){sn.add(k);q.push([nx,ny])}}}
    gC={v:ver,t:dtr,tr:[dtr,...trains.filter(t=>t!==dtr&&sn.has(t.ax+','+t.ay))]}}
  const t0=clock,sp=+gspanEl.value,t1=t0+sp,L=gC.tr.map(t=>{const rt=calcRoute(t.cf,tk(t));return{t,rt,ev:sim(t,rt,t1)}}),ord=[];
  for(const{rt}of L){let p=-1;for(const r of rt.rows)if(r.sa){let j=ord.indexOf(ck(r.k));if(j<0){j=p<0?ord.length:p+1;ord.splice(j,0,ck(r.k))}p=j}}
  if(gcv.width!==Math.round(w*dpr)||gcv.height!==Math.round(h*dpr)){gcv.width=Math.round(w*dpr);gcv.height=Math.round(h*dpr)}
  const g=gcv.getContext('2d'),ML=74,MR=18,MT=20,MB=8,pw=w-ML-MR,ph=h-MT-MB,X=t=>ML+(t-t0)/sp*pw,
    Y=new Map(ord.map((k,i)=>[k,MT+(ord.length>1?i*ph/(ord.length-1):ph/2)])),stp=sp<=1800?300:sp<=3600?600:sp<=7200?1200:1800;
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.font='11px system-ui,sans-serif';g.textBaseline='middle';g.lineWidth=1;g.textAlign='center';
  if(!ord.length){g.fillStyle='#6b7b8c';g.fillText('駅を置き、列車が停車・通過すると表示されます',w/2,h/2)}
  for(let tt=Math.ceil(t0/stp)*stp;tt<=t1;tt+=stp){const x=X(tt);g.beginPath();g.moveTo(x,MT-4);g.lineTo(x,MT+ph);g.strokeStyle='#e3ebf3';g.stroke();g.fillStyle='#6b7b8c';g.fillText(hm(tt),x,8)}
  g.textAlign='right';
  for(const[k,y]of Y){g.beginPath();g.moveTo(ML,y);g.lineTo(ML+pw,y);g.strokeStyle='#cfdbe7';g.stroke();g.fillStyle='#2b3a4a';g.fillText(stations.get(k)||'',ML-6,y,ML-10)}
  g.save();g.beginPath();g.rect(ML,MT-4,pw,ph+8);g.clip();g.lineJoin='round';g.textAlign='left';
  for(const{t,ev}of[...L].reverse()){
    if(!ev.length)continue;g.beginPath();
    ev.forEach((e,i)=>{const y=Y.get(e.k);i?g.lineTo(X(e.a),y):g.moveTo(X(e.a),y);if(e.d>e.a)g.lineTo(X(e.d),y)});
    g.strokeStyle=g.fillStyle=gcol(t);g.lineWidth=t===dtr?3:1.6;g.stroke();g.fillText(tname(t),X(ev[0].a)+3,Y.get(ev[0].k)-8)}
  g.restore();
  const lg=L.map(({t})=>`<button data-id="${t.id}"${t===dtr?' class="on"':''}><i class="chip" style="background:${gcol(t)}"></i>${esc(tname(t))}</button>`).join('');
  if(lg!==gLg)glgEl.innerHTML=gLg=lg;
}
