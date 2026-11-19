/* js/10-routing.js — ダイヤ: 分岐・折返しの設定から進路を計算 */
/* ---- ダイヤ: 分岐・折り返しの設定から進路を自動計算する ---- */
const ST={g:'停車・直進',t:'停車・折り返し',p:'通過'},BN={f:'直進',r:'右へ',l:'左へ'},BO={f:0,r:1,l:7},OF={0:'f',1:'r',7:'l'};
function go(cf,ax,ay,bx,by){   /* 辺 a→b から b に着いたときの処理 (走行と経路計算で共通) */
  const di=dirIdx(bx-ax,by-ay),k=bx+','+by,sk=k+'|'+di,al=outs(bx,by,di),sa=(stations.has(k)||pn.has(k))?cf.s[sk]||cf.s[k]||'g':null,turn=sa==='t'||!al.length;
  let br=null,i=al[0];
  if(!turn){
    const key=k+'|'+di,w=(di+BO[cf.b[key]||'f'])%8;
    if(al.includes(w))i=w;
    if(al.length>1)br={key,o:al.map(j=>OF[(j-di+8)%8]),c:OF[(i-di+8)%8]};   /* 合流側からの進入は選択肢が無いので対象外 */
  }
  return{k,sk,sa,br,turn,nx:turn?[bx,by,ax,ay]:[bx,by,bx+DIRS[i][0],by+DIRS[i][1]]};
}
function calcRoute(cf,a){   /* a から現在の設定で進み、同じ辺に戻るまで辿る */
  const pos=new Map(),st=[],ev=[],rows=[];let lg=0;
  while(!pos.has(a.join())){
    pos.set(a.join(),st.length);st.push(a);
    const r=go(cf,...a),add=(id,o)=>{ev.push({s:st.length-1,id});if(!rows.some(x=>x.id===id))rows.push({id,k:r.k,lg,...o})};
    if(r.sa)add('s:'+r.sk,{sa:r.sa});
    if(r.br)add('b:'+r.br.key,{br:r.br});
    if(r.turn)lg++;a=r.nx;
  }
  return{st,ev,rows,pos,tn:lg,loop:pos.get(a.join())};
}
