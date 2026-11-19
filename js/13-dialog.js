/* js/13-dialog.js — 列車の選択・ダイヤ編集ダイアログ・複製 */
const camFor=(x,y,z)=>{const r=mapEl.getBoundingClientRect();return{z,x:x-(r.left+r.width/2-W/2)/z,y:y-(r.top+r.height/2-H/2)/z}},stopCam=()=>{camT=null;fz=null};
function selectTrain(t,zm=true){   /* 一覧・地図・凡例で列車を選ぶ: 設定対象を切り替え、その列車の位置へ地図をズームする */
  if(tool!=='train')return;if(dtr!==t)openDia(t);
  if(zm)fz={t,z:Math.max(cam.z,44),t0:performance.now()}}
const autoSel=()=>{const t=trains.includes(lastT)?lastT:trains[0];if(t)selectTrain(t,false)};
function renTrain(t){const v=prompt('列車名を入力 (空欄で自動の名前に戻ります)',tname(t));if(v===null)return;const s=v.trim().slice(0,16);if(s)t.nm=s;else delete t.nm;shown=null;tHtml='';save()}
function viewSync(){   /* タブと列車の有無に合わせて、パネルの各部の表示を切り替える */
  const none=!trains.length,k=tab+none;if(vk===k)return;vk=k;
  diaEl.querySelectorAll('.st').forEach(e=>e.hidden=tab!=='set'||none);
  gvEl.hidden=tab!=='gr'||none;avEl.hidden=anrEl.hidden=tab!=='add';nsEl.hidden=tab==='add'||!none;dfitEl.hidden=tab==='add'||none;
  diaEl.classList.toggle('wide',tab==='gr');ttabEl.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));gT=0}
const setTab=t=>{tab=t;apnd=null;vk='';diaEl.scrollTop=0;viewSync();if(tool==='train'){hintEl.textContent=hs();if(t!=='add'&&!dtr&&trains.length)autoSel()}};

/* ---- ダイヤ編集ダイアログ ---- */
const diaEl=document.getElementById('dia'),dlEl=document.getElementById('dlist'),dwEl=document.getElementById('dw'),dhEl=document.getElementById('dh'),dmEl=document.getElementById('dm'),dinfoEl=document.getElementById('dinfo'),clkEl=document.getElementById('clk'),gvEl=document.getElementById('gv'),gcv=document.getElementById('gcv'),glgEl=document.getElementById('glg'),gspanEl=document.getElementById('gspan'),tlEl=document.getElementById('tlist'),tselEl=document.getElementById('tsel'),trenEl=document.getElementById('tren'),tdelEl=document.getElementById('tdel'),avEl=document.getElementById('aview'),nsEl=document.getElementById('nosel'),ttabEl=document.getElementById('ttabs'),dfitEl=document.getElementById('dfit');
const rowEls=()=>[...dlEl.querySelectorAll('li[data-id]')];   /* 一覧の「項目の行」だけ (ループ前後の薄い行は含めない) */
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';'),opt=(v,l,s)=>`<option value="${esc(v)}"${v===s?' selected':''}>${esc(l)}</option>`;
const tk=t=>[t.ax,t.ay,t.bx,t.by];
const KC={g:'#2f7de1',t:'#8e44ad',p:'#7b8794',b:'#d6336c'},arw=di=>`<svg class="ar" data-di="${di}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="向き"><path d="M4 12h15M13 6l6 6-6 6"/></svg>`,SH={g:'停車',t:'折返',p:'通過'},mapEl=document.getElementById('map'),rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
let hw=null,apnd=null,ptype='mouse',ubT=0,selRow=null,dHtml='',fitP=false,camT=null,fkT=0,ET={},clock=21600,tab='add',gT=0,gC=null,gLg='',tHtml='',lastT=null,fz=null,vk='';
function markRows(){rowEls().forEach((li,i)=>{const r=R.rows[i];if(!r)return;li.classList.toggle('sel',r.id===selRow);li.classList.toggle('set',r.sa?r.sa!=='g'||dtr.cf.d[r.id.slice(2)]!=null:r.br.c!=='f')})}
const rname=r=>r.sa?esc(sname(r.k))+sp(r.k)+(R.tn?` <small>(${r.lg%2?'復路':'往路'})</small>`:''):'分岐'+arw(+r.br.key.split('|')[1])+' <small>('+r.k.replace(',',', ')+')</small>';
function dRender(){   /* 経路順に 駅・分岐 の設定を並べる (内容が同じなら作り直さない) */
  const m=R.rows.length,fl=Math.max(0,R.rows.findIndex(r=>R.ev.some(e=>e.id===r.id&&e.s>=R.loop))),   /* fl=ループの最初の項目 */
    gh=(i,t,g,w)=>{const r=R.rows[i];return`<li class="ghost k${r.sa||'b'}" data-k="${r.k}" data-gi="${i}" data-gt="${g}"${w?' data-w="1"':''}><i class="no">${i+1}</i><span class="nm"><small>${t}</small>${rname(r)}</span><div class="sub"><span class="eta"></span></div></li>`},
    h=!m?'<li class="empty">設定できる駅・分岐がありません</li>':gh(fl>0?fl-1:m-1,'ループ開始の1つ前','t',fl<1)+R.rows.map((r,i)=>{
    const o=r.sa?Object.entries(ST).map(([v,l])=>opt(v,l,r.sa)):r.br.o.map(v=>opt(v,BN[v]+dl(r.br.key,v),r.br.c)),
      n=rname(r);
    return`<li class="k${r.sa||'b'}" data-id="${esc(r.id)}" data-k="${r.k}"><i class="no">${i+1}</i><span class="nm">${n}<b class="tg">設定済</b></span><select aria-label="${r.sa?'停車の設定':'進む方向'}">${o.join('')}</select><div class="sub"><span class="eta"></span>${r.sa&&r.sa!=='p'?'<label>発車<input type="time" aria-label="発車時刻"></label><button class="cl" title="発車時刻を解除" aria-label="発車時刻を解除">×</button>':''}</div></li>`}).join('')+gh(fl,'ループ終了の1つ後','b');
  if(h===dHtml)return;
  const f=document.activeElement,li=f&&dlEl.contains(f)?f.closest('li'):null,id=li&&li.dataset.id,y=diaEl.scrollTop;
  dlEl.innerHTML=dHtml=h;diaEl.scrollTop=y;curN=-2;
  if(id){const q=dlEl.querySelector(`li[data-id="${id}"] select`);if(q)q.focus()}   /* 操作中の項目のフォーカスを保つ */
}
function openDia(t){dtr=lastT=t;t.dw=t.dw??30;t.iv=t.iv||0;t.cf.d=t.cf.d||{};dwEl.value=t.dw;dncEl.value=t.nc>0?t.nc:NC0;dhEl.value=Math.floor(t.iv/3600);dmEl.value=Math.floor(t.iv%3600/60);anc=R=fk=null;ET={};dHtml='';selRow=null}
function hideDia(){dtr=R=fk=fz=null;ET={};dHtml='';selRow=null;diaEl.hidden=true}
const closeDia=()=>{if(tool==='train')setTool('sel');else hideDia()};
function fitRoute(){   /* 経路全体が、パネルに隠れない地図の範囲に収まるよう表示を合わせる */
  if(!R)return;
  let a=1e9,b=1e9,c=-1e9,d=-1e9;
  for(const s of R.st)for(const i of[0,2]){a=Math.min(a,s[i]);c=Math.max(c,s[i]);b=Math.min(b,s[i+1]);d=Math.max(d,s[i+1])}
  const r=mapEl.getBoundingClientRect(),m=56,z=Math.min(70,Math.max(5,Math.min((r.width-2*m)/Math.max(4,c-a),(r.height-2*m)/Math.max(4,d-b))));
  fz=null;camT={z,x:(a+c)/2-(r.left+r.width/2-W/2)/z,y:(b+d)/2-(r.top+r.height/2-H/2)/z};
}
function panTo(k){   /* 設定中の項目を、パネルに隠れない地図の中央へ (拡大が小さすぎるときは読める大きさまで寄る) */
  const[x,y]=k.split(',').map(Number),r=mapEl.getBoundingClientRect(),z=Math.max(cam.z,24);
  fz=null;camT={z,x:x-(r.left+r.width/2-W/2)/z,y:y-(r.top+r.height/2-H/2)/z};
}
function camStep(){const g=v3&&!(dtr&&tab!=='add')?1:0;k3=Math.abs(g-k3)<.003?g:k3+(g-k3)*(rm?1:.14);   /* ダイヤ編集中は平面表示に戻す */   /* 毎フレーム: 選択中の列車にダイヤを追従 / 選択パネルの重なり回避 / 視点の滑らかな移動 */
  if(fz){if(!trains.includes(fz.t)||performance.now()-fz.t0>900)fz=null;else{const p=tpos(fz.t);camT=camFor(p.x,p.y,fz.z)}}   /* 選んだ列車へ寄る間は、動く列車を追う */
  selEl.hidden=!sel;
  if(fk&&coarse&&performance.now()-fkT>2500)fk=selK();
  if(!camT)return;
  const f=rm?1:.2;cam.x+=(camT.x-cam.x)*f;cam.y+=(camT.y-cam.y)*f;cam.z+=(camT.z-cam.z)*f;
  if(Math.abs(camT.x-cam.x)+Math.abs(camT.y-cam.y)<.01&&Math.abs(camT.z-cam.z)<.05){Object.assign(cam,camT);camT=null}
}
function dSync(){   /* 毎フレーム: 設定や線路が変わったら進路を再計算し、次の項目を強調 */
  if(!dtr)return;
  if(!trains.includes(dtr)){dtr=R=fk=null;ET={};dHtml='';selRow=null;return}
  const k=tk(dtr).join(),calc=a=>{R=calcRoute(dtr.cf,a);R.v=ver;dRender()};
  if(!R||R.v!==ver)calc(anc=anc||tk(dtr));
  let p=R.pos.get(k);
  if(p===undefined||(R.loop>0&&p>=R.loop)){calc(anc=tk(dtr));p=0}   /* 経路から外れた/周回に入ったら現在位置から取り直す */
  if(fitP){fitP=false;fitRoute()}
  ET=eta(dtr);dTimes();markRows();dLock();if(tab==='gr')gDraw();
  const e=R.ev.find(e=>e.s>=p)||R.ev.find(e=>e.s>=R.loop),c=e?R.rows.findIndex(r=>r.id===e.id):-1;
  if(c!==curN){const first=curN===-2;curN=c;rowEls().forEach((li,i)=>li.classList.toggle('cur',i===c));
    const li=rowEls()[c];if(li&&!first&&tab==='set'&&!diaEl.classList.contains('min')&&performance.now()-ubT>6000){const hd=diaEl.querySelector('.dtop'),pr=diaEl.getBoundingClientRect(),lr=li.getBoundingClientRect(),th=getComputedStyle(hd).position==='sticky'?hd.offsetHeight:0;if(lr.top<pr.top+th)diaEl.scrollTop-=pr.top+th-lr.top+4;else if(lr.bottom>pr.bottom)diaEl.scrollTop+=lr.bottom-pr.bottom+4}}
}
dlEl.onchange=e=>{const li=e.target.closest('li[data-id]');if(!li||!dtr)return;const[t,k]=li.dataset.id.split(':');
  if(e.target.type==='time'){const v=e.target.value.split(':');if(v.length<2)delete dtr.cf.d[k];else dtr.cf.d[k]=v[0]*3600+v[1]*60}else dtr.cf[t][k]=e.target.value;save()};
const hf=e=>{const li=e.target.closest('li[data-k]');fk=li?li.dataset.k:null;fkT=performance.now()};
const selK=()=>{const r=R&&R.rows.find(r=>r.id===selRow);return r?r.k:null};
dlEl.addEventListener('mouseover',hf);dlEl.addEventListener('focusin',e=>{hf(e);const li=e.target.closest('li[data-id]');if(li){selRow=li.dataset.id;panTo(li.dataset.k)}});dlEl.onmouseleave=()=>{fk=selK()};
dlEl.addEventListener('click',e=>{const li=e.target.closest('li[data-k]');if(!li)return;selRow=li.dataset.id;
  if(e.target.closest('.cl')){delete dtr.cf.d[li.dataset.id.slice(2)];li.querySelector('input').value='';save();return}
  if(!/^(SELECT|INPUT|LABEL)$/.test(e.target.tagName)){fk=li.dataset.k;fkT=performance.now();panTo(fk)}});
['pointerdown','wheel','keydown','touchmove'].forEach(v=>diaEl.addEventListener(v,()=>{ubT=performance.now()},{passive:true}));
dwEl.oninput=()=>{dtr.dw=Math.max(0,Math.min(600,+dwEl.value||0));save()};
/* ---- 編成 (両数): 選んだ列車の編成 / 次に追加する列車の編成 ---- */
const dncEl=document.getElementById('dnc'),ancEl=document.getElementById('anc'),anrEl=document.getElementById('aview2'),ncv=v=>Math.max(1,Math.min(NCMAX,Math.round(+v||0)));
function chkLen(nc){const bad=[];for(const[k,nm]of stations){const[,,,sd,ln]=pget(k);if(ln.some((l,i)=>sd[i]&&l<nc))bad.push(nm)}if(bad.length)msg(`編成${nc}両より短いホームがあります (はみ出して停車します): ${bad.slice(0,3).join('・')}${bad.length>3?' ほか':''}`)}
dncEl.oninput=()=>{if(!dtr||!dncEl.value)return;dtr.nc=ncv(dncEl.value);save();chkLen(dtr.nc)};
ancEl.oninput=()=>{if(!ancEl.value)return;newNc=ncv(ancEl.value);chkLen(newNc)};
const ivSet=fin=>{if(!dtr||dtr.pid!=null)return;let v=Math.max(0,(+dhEl.value||0)*3600+(+dmEl.value||0)*60);
  const mx=Math.max(0,...trains.filter(c=>c.pid===dtr.id).map(c=>c.off||0));   /* 子列車の間隔より短い繰り返し間隔にはできない */
  if(v>0&&v<mx+60){if(!fin)return;v=mx+60;msg('繰り返し間隔は、子列車の間隔 ('+Math.round(mx/60)+'分) より長くしてください')}
  dtr.iv=v;if(fin){dhEl.value=Math.floor(v/3600);dmEl.value=Math.floor(v%3600/60)}save()};
dhEl.oninput=dmEl.oninput=()=>ivSet(0);dhEl.onchange=dmEl.onchange=()=>ivSet(1);
document.getElementById('dx').onclick=closeDia;
ttabEl.onclick=e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.tab)};gspanEl.onchange=()=>{gT=0};
tlEl.onclick=e=>{const li=e.target.closest('li[data-id]'),t=li&&trains.find(t=>''+t.id===li.dataset.id);if(t)selectTrain(t)};
tdelEl.onclick=()=>{if(dtr)rmTrain(dtr)};trenEl.onclick=()=>{if(dtr)renTrain(dtr)};
glgEl.onclick=e=>{const b=e.target.closest('button'),t=b&&trains.find(t=>''+t.id===b.dataset.id);if(t)selectTrain(t)};
setTab('add');
document.getElementById('dflip').onclick=()=>flip(dtr);
document.getElementById('dfit').onclick=fitRoute;
document.getElementById('dmin').onclick=e=>{const m=diaEl.classList.toggle('min');e.currentTarget.innerHTML=ic(m?'plus':'minus')+`<span>${m?'開く':'畳む'}</span>`;vk=''};
/* ---- ダイヤの複製: 子は親の設定(cf・停車時間・間隔)を共有し、親の off 秒後に同じ経路を走る ---- */
function link(t,p){t.pid=p.id;t.cf=p.cf;t._p=p;for(const k of['dw','iv'])Object.defineProperty(t,k,{get:()=>p[k],set(){},enumerable:true,configurable:true})}
function relink(){for(const t of trains)if(t.pid!=null){const p=trains.find(q=>q.id===t.pid&&q!==t);
  if(p){if(t._p!==p)link(t,p)}
  else{const d=t.dw,v=t.iv;t.nm=t.nm||tname(t);t.no=nextNo();delete t.ci;   /* 親が無くなっても名前は保つ */ t.cf=JSON.parse(JSON.stringify(t.cf));t.cf.d=t.cf.d||{};for(const k in t.cf.d)t.cf.d[k]+=t.off||0;   /* 親が無くなったら独立した列車にする */
    Object.defineProperties(t,{dw:{value:d,writable:true,enumerable:true,configurable:true},iv:{value:v,writable:true,enumerable:true,configurable:true}});delete t.pid;delete t._p;t.off=0;save()}}}
function cloneTrain(p,m){const r=p.pid!=null?trains.find(q=>q.id===p.pid)||p:p,off=(r===p?0:p.off||0)+m*60;
  if(r.iv>0&&off>r.iv-60){const mx=Math.floor((r.iv-60-(off-m*60))/60);msg(mx>=1?`子列車の間隔は繰り返し間隔 (${ft(r.iv)}) を超えられません。${mx}分以内にしてください`:`繰り返し間隔 (${ft(r.iv)}) の中には、これ以上の子列車を置けません`);return null}
  snap();
  const t={id:++tid,ci:nextCi(r),ax:r.ax,ay:r.ay,bx:r.bx,by:r.by,t:0,off,ld:{},cf:r.cf,wk:'',nc:r.nc};
  t.w=r.w!=null?r.w+off:clock+off-r.t*SPC;if(r.w!=null)t.wk=r.wk;link(t,r);trains.push(t);save();return t}
const dcmEl=document.getElementById('dcm'),dparEl=document.getElementById('dpar'),dflipEl=document.getElementById('dflip'),dcloneEl=document.getElementById('dclone');
document.getElementById('dclone').onclick=()=>{if(!dtr)return;const m=Math.max(1,Math.min(1439,Math.round(+dcmEl.value||0)));const c=cloneTrain(dtr,m);if(c)selectTrain(c)};
function dLock(){const c=dtr.pid!=null;for(const e of[dwEl,dhEl,dmEl,dflipEl])e.disabled=c;
  {const r=c?parentOf(dtr)||dtr:dtr,lim=r.iv>0?Math.floor((r.iv-60-(r===dtr?0:dtr.off||0))/60):1439,mx=Math.max(1,Math.min(1439,lim));if(+dcmEl.max!==mx)dcmEl.max=mx;dcloneEl.disabled=lim<1}   /* 複製の間隔は繰り返し間隔の中に収める */
  dlEl.querySelectorAll('select,input,.cl').forEach(e=>{if(e.disabled!==c)e.disabled=c});
  const s=c&&tab==='set'?`${tname(parentOf(dtr)||dtr)}の${Math.round((dtr.off||0)/60)}分後に同じ経路を走ります。設定は親の列車に従うため、ここでは変更できません`:'';
  dparEl.hidden=!s;if(dparEl.textContent!==s)dparEl.textContent=s}
