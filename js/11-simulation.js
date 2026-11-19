/* js/11-simulation.js — 時刻・発車時刻・走行シミュレーション・到着予測 */
/* ---- 時刻: 1マスの走行=SPC秒。clock は 0:00 からの経過秒 ---- */
const SPC=20,pad=n=>String(n).padStart(2,'0'),hm=t=>{t=Math.floor(t/60)%1440;return pad(Math.floor(t/60))+':'+pad(t%60)},hms=t=>hm(t)+':'+pad(Math.floor(t)%60);
const ft=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+'時間':'')+(m?m+'分':'')+(!h&&s%60?s%60+'秒':'')||'0分'};
function dep(tr,ld,sk,rd){   /* 発車時刻: 設定時刻 (間隔ごとに繰り返し) まで待つ。時刻が無くても間隔があれば前回発車から空ける */
  const D0=(tr.cf.d||{})[sk],D=D0!=null?D0+(tr.off||0):null,P=tr.iv>0?tr.iv:86400;
  if(D!=null)return D+Math.ceil((rd-D)/P-1e-9)*P;
  return tr.iv>0&&ld[sk]!=null?Math.max(rd,ld[sk]+tr.iv):rd;
}
function step(dt){
  const ds=dt*speed*SPC;clock+=ds;
  for(const tr of trains){
    tr.ld=tr.ld||{};
    if(tr.w!=null){if(clock<tr.w)continue;tr.ld[tr.wk]=tr.w;tr.w=null}
    tr.t+=ds/SPC;
    for(let g=0;g<8;g++){
      const len=Math.hypot(tr.bx-tr.ax,tr.by-tr.ay);
      if(tr.t<len)break;
      tr.t-=len;
      const r=go(tr.cf,tr.ax,tr.ay,tr.bx,tr.by);
      tr.h=r.turn?[]:[[tr.ax,tr.ay,tr.bx,tr.by],...(tr.h||[])].slice(0,16);   /* 通った線路の履歴 (後ろの両の位置用) */
      [tr.ax,tr.ay,tr.bx,tr.by]=r.nx;
      if(r.sa&&r.sa!=='p'){const w=dep(tr,tr.ld,r.sk,clock+(tr.dw??30));if(w>clock){tr.w=w;tr.wk=r.sk;tr.t=0;break}tr.ld[r.sk]=clock}
    }
  }
}
function eta(tr){   /* 現在位置から経路を先読みし、各項目に着く(発つ)時刻を求める */
  const o={},ld={...tr.ld},n=R.st.length,at=new Map();let i=R.pos.get(tk(tr).join());
  if(i==null)return o;
  R.ev.forEach(e=>at.set(e.s,[...(at.get(e.s)||[]),e.id]));
  let t=tr.w!=null?tr.w:clock,off=tr.w!=null?0:tr.t;
  for(let c=0;c<3*n;c++){
    const a=R.st[i];t+=(Math.hypot(a[2]-a[0],a[3]-a[1])-off)*SPC;off=0;
    for(const id of at.get(i)||[]){
      const r=R.rows.find(x=>x.id===id),z=!o[id]?(o[id]={a:t}):!o[id].n?(o[id].n={a:t}):null;
      if(r.sa&&r.sa!=='p'){const sk=id.slice(2),d=dep(tr,ld,sk,t+(tr.dw??30));if(z)z.d=d;ld[sk]=d;t=d}
    }
    i=i+1<n?i+1:R.loop;
  }
  return o;
}
