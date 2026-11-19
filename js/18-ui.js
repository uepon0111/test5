/* js/18-ui.js — ツール切替・ボタン割り当て・選択パネル・ショートカット */
function arSync(){const{s,c,y:q}=lin();document.querySelectorAll('.ar[data-di]').forEach(el=>{const d=DIRS[+el.dataset.di];if(!d)return;const a=Math.round(Math.atan2(q*(s*d[0]+c*d[1]),c*d[0]-s*d[1])*180/Math.PI)+'';if(el.dataset.a!==a){el.dataset.a=a;el.style.transform='rotate('+a+'deg)'}})}   /* 矢印アイコンを、地図上の実際の向き (回転・傾き込み) に合わせる */
const hs=()=>(tool==='train'?TH[tab]:(coarse?HINT_T:HINT)[tool])+(v3?(coarse?' / 2本指ひねりで回転':' / 右ドラッグで回転・傾き'):'');
function tog3(){v3=!v3;document.getElementById('v3').classList.toggle('on',v3);hintEl.textContent=hs()}
function setTool(t){
  tool=t;chain=pend=sel=apnd=null;hl=null;
  document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t));
  hintEl.textContent=hs();cv.style.cursor=t==='sel'?'default':'crosshair';
  if(t==='train'){diaEl.hidden=false;vk='';setTab(tab)}else hideDia();
}
function toggle(){run=!run;playEl.innerHTML=ic(run?'pause':'play')+`<span class="lbl">${run?'停止':'再生'}</span>`}
const zoom=f=>{stopCam();cam.z=Math.min(160,Math.max(5,cam.z*f))};
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
playEl.onclick=toggle;
document.getElementById('undo').onclick=undo;
okEl.onclick=()=>{if(pend){const p=pend;pend=null;layTo(p)}};
document.getElementById('done').onclick=()=>{chain=pend=null};
const selEl=document.getElementById('selp'),sinfoEl=document.getElementById('sinfo'),sactEl=document.getElementById('sact'),sactlEl=document.getElementById('sactl'),sdiaEl=document.getElementById('sdia'),srenEl=document.getElementById('sren');
const pstEl=document.getElementById('pst'),pcnEl=document.getElementById('pcn'),psdEl=document.getElementById('psd'),bump=d=>{if(sel&&sel.type==='sta'){setPl(sel.k,pget(sel.k)[0]+d);panel()}};
const PT=['なし','右','左','両側'];
function psdRender(){   /* 設定する番線を選び、その番線のホームだけ表示する (右・左は矢印の向きに進むときの右手・左手) */
  if(!sel||sel.type!=='sta'){psdEl.hidden=true;return}
  const[n,di,bs,sd,ln]=pget(sel.k);if(pk!==sel.k){pk=sel.k;psel=0}psel=Math.max(0,Math.min(psel,n-1));
  const tabs=n>1?`<span class="seg" role="group" aria-label="設定する番線">${sd.map((f,i)=>`<button data-p="${i}" aria-pressed="${i===psel}" class="${i===psel?'on':''}${f?'':' no'}">${i+1}番線</button>`).join('')}</span>`:'',
    N=bs>0?1:2,F=3-N,sh=[psel<n-1&&(sd[psel]&F)&&(sd[psel+1]&N)?psel+2:0,psel>0&&(sd[psel]&N)&&(sd[psel-1]&F)?psel:0].filter(Boolean),isn=sh.length?`<div class="r"><span class="k">島式ホーム: ${sh.join('・')}番線と共有</span></div>`:'',
    h=`${tabs?`<div class="r"><span class="k">向き${arw(di)}</span>${tabs}</div>`:''}<div class="r"><span class="k">${n>1?'ホーム':`向き${arw(di)}・ホーム`}</span><span class="seg" role="group" aria-label="${psel+1}番線のホーム">${PT.map((t,v)=>`<button data-f="${v}" aria-pressed="${v===sd[psel]}" class="${v===sd[psel]?'on':''}">${t}</button>`).join('')}</span></div>${isn}<div class="r"><span class="k">長さ</span><span class="stp"><button data-l="-1" aria-label="ホームを短くする">−</button><b style="min-width:3.4em">${ln[psel]}両分</b><button data-l="1" aria-label="ホームを長くする">＋</button></span></div><button id="pfl" title="駅舎を反対側へ移す">駅舎⇄</button>`;
  psdEl.hidden=false;if(psdEl.dataset.h!==h){psdEl.dataset.h=h;psdEl.innerHTML=h}
}
psdEl.onclick=e=>{const b=e.target.closest('button');if(!b||!sel||sel.type!=='sta')return;
  if(b.dataset.p!==undefined){psel=+b.dataset.p;psdRender();return}
  if(b.dataset.f!==undefined){const[n,,bs,sd]=pget(sel.k),v=sd.slice(),N=bs>0?1:2,F=3-N;v[psel]=+b.dataset.f;if(psel<n-1)v[psel+1]=(v[psel+1]&~N)|(v[psel]&F?N:0);if(psel>0)v[psel-1]=(v[psel-1]&~F)|(v[psel]&N?F:0);setPl(sel.k,n,0,v);panel();return}
  if(b.dataset.l!==undefined){setLn(sel.k,psel,+b.dataset.l);panel();return}
  if(b.id==='pfl'){const[n,,bs]=pget(sel.k);setPl(sel.k,n,-bs);panel()}};
document.getElementById('pm').onclick=()=>bump(-1);document.getElementById('pp').onclick=()=>bump(1);
sactEl.onclick=selAct;sdiaEl.onclick=()=>{if(sel&&sel.type==='train'){const t=sel.t;setTool('train');setTab('set');selectTrain(t)}};srenEl.onclick=()=>{if(sel&&sel.type==='train')renTrain(sel.t)};document.getElementById('sdel').onclick=selDel;document.getElementById('sx').onclick=()=>{sel=null};
document.getElementById('spd').oninput=e=>speed=+e.target.value;
clkEl.onchange=()=>{const v=clkEl.value.split(':').map(Number);if(v.length<2||v.some(isNaN))return;clock=v[0]*3600+v[1]*60+(v[2]||0);trains.forEach(t=>{t.w=null;t.ld={};if(t.pid!=null){t.w=clock+(t.off||0);t.wk=''}})};
document.getElementById('zi').onclick=()=>zoom(1.25);
document.getElementById('zo').onclick=()=>zoom(.8);
document.getElementById('home').onclick=()=>{fz=null;camT={x:0,y:0,z:40};yaw=-.6;tilt=.66};
document.getElementById('v3').onclick=tog3;
document.getElementById('clr').onclick=()=>{if(confirm('すべての線路と列車を削除しますか？')){snap();edges.clear();trains.length=0;stations.clear();pl.clear();chain=pend=sel=null;rebuild()}};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b)b.blur()});
addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(apnd){apnd=null;return}chain=pend=sel=null;closeDia();return}
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
  const k=(e.key||'').toLowerCase();
  if(e.ctrlKey||e.metaKey||e.altKey){if(k==='z'){e.preventDefault();undo()}return}
  if(k==='escape'){chain=pend=sel=null;closeDia()}
  else if(k==='v')setTool('sel');else if(k==='l')setTool('lay');else if(k==='e')setTool('erase');else if(k==='t')setTool('train');else if(k==='s')setTool('sta');else if(k==='3')tog3();else if(k==='d'){setTool('train');setTab('set')}
  else if(k===' '){e.preventDefault();if(!e.repeat)toggle()}
});
