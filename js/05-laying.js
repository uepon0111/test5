/* js/05-laying.js — 線路の敷設(経路計算と敷設) */
/* 経由地間を 直線 + 45°斜め で結ぶ */
function route(a,b,pd){
  const dx=b.x-a.x,dy=b.y-a.y,ax=Math.abs(dx),ay=Math.abs(dy),sx=Math.sign(dx),sy=Math.sign(dy),m=Math.min(ax,ay),s=Math.max(ax,ay)-m;
  const seg=[[ax>=ay?[sx,0]:[0,sy],s],[[sx,sy],m]];
  if(pd>=0&&pd%2)seg.reverse();
  const pts=[{x:a.x,y:a.y}];let x=a.x,y=a.y;
  for(const[d,n]of seg)for(let i=0;i<n;i++){x+=d[0];y+=d[1];pts.push({x,y})}
  return pts;
}
function lay(a,b,pd){
  const p=route(a,b,pd),n=p.length;
  for(let i=1;i<n;i++)addE(p[i-1].x,p[i-1].y,p[i].x,p[i].y);
  return n>1?dirIdx(p[n-1].x-p[n-2].x,p[n-1].y-p[n-2].y):pd;
}
function layTo(p,keep){   /* 始点→終点で1本敷設して終わり。続けて延長するのは Shift を押しながら */
  if(!chain){chain={p,pd:-1};return}
  if(p.x===chain.p.x&&p.y===chain.p.y){chain=null;return}
  snap();const pd=lay(chain.p,p,chain.pd);chain=keep?{p,pd}:null;rebuild();
}

