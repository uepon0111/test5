/* js/07-trains.js — 列車の命名・追加・削除 */
/* ---- 列車 ---- */
/* 列車名: 親は「列車N」、子は「親の名前-M」(列車1-1, 列車1-2…)。番号は消しても詰め直さず、空いた最小の番号を使う */
const nextNo=()=>{const u=new Set(trains.filter(t=>t.pid==null).map(t=>t.no));let i=1;while(u.has(i))i++;return i},
  nextCi=p=>{const u=new Set(trains.filter(t=>t.pid===p.id).map(t=>t.ci));let i=1;while(u.has(i))i++;return i},
  parentOf=t=>t.pid!=null?t._p||trains.find(q=>q.id===t.pid)||null:null,
  tname=t=>{if(t.nm)return t.nm;const p=parentOf(t);return p&&p!==t?tname(p)+'-'+(t.ci||1):'列車'+(t.no||t.id)};
function addTrainAt(n,r){const e=n.e;snap();   /* n=置く位置 (辺と辺上の位置) / r=辺とは逆向きに走らせるか */
  const t={id:++tid,no:nextNo(),ax:r?e[2]:e[0],ay:r?e[3]:e[1],bx:r?e[0]:e[2],by:r?e[1]:e[3],t:(r?1-n.t:n.t)*Math.hypot(e[2]-e[0],e[3]-e[1]),cf:{s:{},b:{},d:{}},dw:30,iv:0,nc:newNc};
  trains.push(t);save();selectTrain(t,false)}
function addTrain(w){const n=nearEdge(w,hit(.6,26));if(n)addTrainAt(n,false)}
const rmTrain=t=>{snap();trains.splice(trains.indexOf(t),1);save()};
