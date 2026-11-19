/* js/04-storage.js — 保存(localStorage)と読み込み */
let svT=0,svW=0;
function save(){ver++;if(!svT)svT=setTimeout(flush,400)}
function flush(){svT=0;try{localStorage.setItem('rail1',JSON.stringify([...edges.values()]));localStorage.setItem('rail2',JSON.stringify({s:[...stations],p:[...pl],t:trains.map(({id,ax,ay,bx,by,cf,dw,iv,pid,off,no,ci,nm,nc})=>({i:id,ax,ay,bx,by,cf,dw,iv,pid,off,no,ci,nm,nc}))}))}catch(_){if(!svW){svW=1;msg('ブラウザに保存できません (プライベートモードか容量不足)')}}}
function load(){try{const s=localStorage.getItem('rail1');if(s===null)return false;JSON.parse(s).forEach(e=>{if(Array.isArray(e)&&e.length===4&&e.every(Number.isInteger))addE(...e)});
  const x=JSON.parse(localStorage.getItem('rail2')||'{}');(x.s||[]).forEach(([k,n])=>stations.set(k,n));(x.p||[]).forEach(([k,v])=>pl.set(k,v));
  const im=new Map();(x.t||[]).forEach(t=>{if(!has(t.ax,t.ay,t.bx,t.by))return;
    if(!t.cf){t.cf={s:{},b:{}};if(t.d&&t.d.length){for(const k of stations.keys())t.cf.s[k]='p';t.d.forEach(s=>{if(s.a in ST&&t.cf.s[s.k]==='p')t.cf.s[s.k]=s.a})}}   /* 旧ダイヤの駅設定を移行 */
    delete t.d;delete t.n;t.cf.d=t.cf.d||{};t.cf.s=t.cf.s||{};t.cf.b=t.cf.b||{};if(!(t.dw>=0))t.dw=30;const n={...t,t:0,id:++tid,nc:t.nc>0?t.nc:NC0};im.set(t.i,n);delete n.i;trains.push(n)});for(const n of trains)if(n.pid!=null){const p=im.get(n.pid);if(p&&p!==n){n.pid=p.id;n.w=clock+(n.off||0);n.wk=''}else delete n.pid}relink();for(const n of trains)if(n.pid==null){if(!(n.no>0))n.no=nextNo()}else if(!(n.ci>0))n.ci=nextCi({id:n.pid});return true}catch(_){edges.clear();stations.clear();pl.clear();trains.length=0;return false}}

