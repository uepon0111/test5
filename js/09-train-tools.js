/* js/09-train-tools.js — 列車の向き反転と、配置位置のプレビュー */
function flip(t){if(t.pid!=null){msg('複製した列車は向きを変えられません (親の列車で変更してください)');return}const l=Math.hypot(t.bx-t.ax,t.by-t.ay);[t.ax,t.ay,t.bx,t.by]=[t.bx,t.by,t.ax,t.ay];t.t=l-t.t;t.w=null;t.h=[];save()}

function addPrev(X,Y,z){   /* 列車を置く位置の予告: 決める前は線路上の影だけ / 決めた後は列車の影 (向きは丸い操作点にのせると反映) */
  const a=apnd,n=a||(ptype!=='touch'&&hw&&nearEdge(hw,hit(.6,26)));if(!n)return;
  const e=n.e,p=a?a.p:{x:e[0]+(e[2]-e[0])*n.t,y:e[1]+(e[3]-e[1])*n.t},L=z*newNc/2,hv=a?a.hv:0;
  cx.save();cx.translate(X(p.x),Y(p.y));cx.rotate(Math.atan2(e[3]-e[1],e[2]-e[0])+(hv<0?Math.PI:0));cx.lineCap=cx.lineJoin='round';
  cx.beginPath();cx.roundRect(-L,-z*SZ.trw/2,L*2,z*SZ.trw,z*.12);
  if(a){cx.fillStyle=hv?'rgba(229,83,61,.85)':'rgba(229,83,61,.35)';cx.fill();if(!hv)cx.setLineDash([6,4]);cx.strokeStyle='#2f7de1';cx.lineWidth=3;cx.stroke();cx.setLineDash([]);if(hv){cx.fillStyle='#35506b';cx.fillRect(L-z*.25,-z*.12,z*.15,z*.24)}}
  else{cx.fillStyle='rgba(47,125,225,.14)';cx.fill();cx.strokeStyle='#2f7de1';cx.lineWidth=2.5;cx.stroke()}
  cx.restore()}
