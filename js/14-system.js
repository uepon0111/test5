/* js/14-system.js — 互換処理・保存の取りこぼし防止・例外の封じ込め */

/* ---- 互換: roundRect 非対応ブラウザ用 (無いと毎フレーム例外で描画が止まる) ---- */
if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.max(0,Math.min(+r||0,Math.abs(w)/2,Math.abs(h)/2));this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath()};
/* ---- 保存の取りこぼし防止 / 例外の封じ込め ---- */
addEventListener('pagehide',()=>{if(svT){clearTimeout(svT);flush()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&svT){clearTimeout(svT);flush()}});
let errN=0;
function sanitize(){for(let i=trains.length-1;i>=0;i--){const t=trains[i];if(![t.ax,t.ay,t.bx,t.by,t.t].every(Number.isFinite)||!has(t.ax,t.ay,t.bx,t.by)||!t.cf||!t.cf.s||!t.cf.b||!t.cf.d)trains.splice(i,1)}}
function fail(e){if(errN++<5)console.error(e);sanitize();if(errN===1)msg('内部エラーを検出しました。続く場合は再読み込みしてください')}
