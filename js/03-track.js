/* js/03-track.js — 線路データ: 辺の追加・削除・接続数・rebuild */
/* ---- 線路データ ---- */
const norm=(a,b,c,d)=>(a>c||(a===c&&b>d))?[c,d,a,b]:[a,b,c,d];
const addE=(a,b,c,d)=>{const e=norm(a,b,c,d);edges.set(e.join(),e)};
const has=(a,b,c,d)=>edges.has(norm(a,b,c,d).join());
const dirIdx=(dx,dy)=>DIRS.findIndex(d=>d[0]===Math.sign(dx)&&d[1]===Math.sign(dy));
const outs=(x,y,di)=>[0,1,7].map(d=>(di+d)%8).filter(i=>has(x,y,x+DIRS[i][0],y+DIRS[i][1]));
function delE(k){edges.delete(k);for(let i=trains.length-1;i>=0;i--){const t=trains[i];if(norm(t.ax,t.ay,t.bx,t.by).join()===k)trains.splice(i,1)}}
function rebuild(){deg=new Map();for(const e of edges.values())for(const k of[e[0]+','+e[1],e[2]+','+e[3]])deg.set(k,(deg.get(k)||0)+1);
  for(const k of stations.keys())if(!deg.has(k))stations.delete(k);
  pn.clear();for(const[k,[n,di,bs,,,ln]]of[...pl]){const pp=stations.has(k)&&bs&&platPlan(k,di,n,bs,ln);if(!pp||!pp.E.every(e=>has(...e)))pl.delete(k);else pp.N.forEach((q,i)=>{if(q)pn.set(q,{s:k,i})})}
  save()}
