/* js/19-main.js — リサイズ・初期化・メインループ */
function resize(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=glc.width=Math.round(W*dpr);cv.height=glc.height=Math.round(H*dpr)}
addEventListener('resize',resize);

/* ---- 初期化 ---- */
resize();
if(!load()){
  const L=P=>{let pd=-1;for(let i=1;i<P.length;i++)pd=lay({x:P[i-1][0],y:P[i-1][1]},{x:P[i][0],y:P[i][1]},pd)};
  L([[-6,-3],[4,-3],[7,0],[4,3],[-6,3],[-9,0],[-6,-3]]);
  L([[-2,-3],[1,-6],[5,-6]]);
  [['2,-3','駅1'],['0,3','駅2'],['5,-6','駅3']].forEach(([k,n])=>stations.set(k,n));rebuild();setPl('0,3',2);hist.length=0;addTrain({x:0,y:-3});
}else rebuild();
setTool('lay');toggle();
let last=performance.now();
(function loop(n){requestAnimationFrame(loop);const dt=Math.max(0,Math.min(.1,(n-last)/1000));last=n;try{relink();if(run)step(dt)}catch(e){fail(e)}try{
  if(chain)sel=null;if(apnd&&!edges.has(apnd.k))apnd=null;
  if(sel&&(sel.type==='train'?!trains.includes(sel.t):sel.type==='sta'?!stations.has(sel.k):sel.type==='node'?(deg.get(sel.k)||0)<3:!(sel.keys=sel.keys.filter(k=>edges.has(k))).length))sel=null;
  if(sel!==shown){shown=sel;panel()}
  camStep();dSync();tlSync();arSync();const bz=!!sel,md=tool==='train'&&!diaEl.hidden?(tab==='add'?'add':'dia'):tool==='lay'&&chain?'lay':tool==='erase'?'erase':tool==='sta'?'sta':'',B=document.body;B.classList.toggle('busy',bz);if((B.dataset.md||'')!==md){if(md)B.dataset.md=md;else B.removeAttribute('data-md')}hintEl.hidden=(bz||md==='dia')&&performance.now()-mT>4500;if(document.activeElement!==clkEl){const s=hms(clock);if(clkEl.value!==s)clkEl.value=s}actEl.hidden=!chain;okEl.hidden=!pend}catch(e){fail(e)}try{draw();ring()}catch(e){fail(e);cv.width=cv.width}})(last);
