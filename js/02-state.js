/* js/02-state.js — ヒント文言・寸法定数・DOM参照・共有状態(線路/列車/駅/カメラ) */

const HINT={
sel:'操作: ドラッグで移動 / ホイールで拡大縮小 / 列車・駅をクリックで選択 (駅は番線数・ホーム・ホームの長さを設定、列車は「ダイヤ」で運行設定) / 長押しで線路を選択',
lay:'敷設: 始点→終点の順にクリックで敷設 (直線と45°で自動接続)。続けて延長するときはShiftを押しながらクリック。既存の線路上の点から始めると分岐。同じ点の再クリック・右クリック・Escで取り消し',
erase:'削除: 線路や列車をクリック、またはなぞって削除',
train:'列車: 「追加」「ダイヤ設定」「ダイヤグラム」を選んで操作',
sta:'駅: 地面の点をクリックで新設 (線路は自動で敷設、既存の線路があれば利用) / 赤い表示=ぶつかる場所 / 駅をもう一度クリックで撤去'};
const coarse=matchMedia('(pointer:coarse)').matches;
const HINT_T={
sel:'操作: ドラッグで移動 / 2本指で拡大縮小 / 列車・駅をタップで選択 (駅は番線数・ホーム・ホームの長さを設定) / 長押しで線路を選択',
lay:'敷設: 始点→終点の順にタップ。プレビュー後、同じ点を再タップか「確定」で敷設。線路上の点から始めると分岐',
erase:'削除: 線路や列車をタップ、またはなぞって削除 / 2本指で移動と拡大縮小',
train:'列車: 「追加」「ダイヤ設定」「ダイヤグラム」を選んで操作',
sta:'駅: 点をタップで新設 (線路は自動で敷設) / 赤い表示=ぶつかる場所 / 再タップで撤去 / 2本指で移動と拡大縮小'};
const TH={add:'列車の追加: 線路の上に列車を置きます',set:'ダイヤ設定: 一覧で列車を選ぶとその列車へ寄ります。駅・分岐ごとに停車や進路、発車時刻を設定できます',gr:'ダイヤグラム: 横軸=時刻 / 縦軸=駅。凡例で列車を切り替えられます'};
const actEl=document.getElementById('act'),okEl=document.getElementById('ok');
const cv=document.getElementById('c'),cx=cv.getContext('2d'),hintEl=document.getElementById('hint'),posEl=document.getElementById('pos'),playEl=document.getElementById('play');
const DIRS=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
/* ---- 寸法 (すべて「1マス=1」の単位)。ここを変えると線路・ホーム・駅舎・列車の大きさが連動する ----
   bed=道床の幅 / slp=枕木の長さ / tw=線路中心からホーム縁まで / pw=ホーム幅 / bd=駅舎の奥行き / cl=1両の長さ (1両=1マスから連結部を除く) / trw=列車の幅
   比率: 列車幅(.38) < 道床(.56) < ホーム幅(1.3) / 編成(○両=○マス)はホームの長さ(番線ごとに設定)に収まる / 2番線以降の線路間隔(2マス)=tw*2+pw で島式ホームがちょうど収まる */
const SZ={bed:.56,slp:.44,tw:.35,pw:1.3,bd:1.3,cl:.9,trw:.38};
const NC0=4,NCMAX=12,PL0=4,PLMIN=2,PLMAX=10;let newNc=NC0;   /* 編成(両数)の初期・最大 / ホームの長さ(マス)の初期・最小・最大。1両=1マス */
const edges=new Map(),trains=[],stations=new Map(),pl=new Map(),pn=new Map(),PMAX=5;let tid=0;
let mT=0;const kk=(x,y)=>x+','+y,xy=k=>k.split(',').map(Number),msg=t=>{hintEl.textContent=t;mT=performance.now()};
let psel=0,pk=null,W,H,dpr,cam={x:0,y:0,z:40},tool='lay',run=true,speed=3,chain=null,hover=null,hl=null,deg=new Map(),drag=null,dtr=null,fk=null,curN=-2,ver=0,R=null,anc=null;

