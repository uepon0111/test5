/* js/15-webgl.js — WebGL描画(背景の格子・線路) */
/* ---- WebGL: 背景の格子点と線路をGPUで描く。線路の頂点は線路が変わった時だけ作り直す。非対応・失敗時は従来の2D描画へ自動で戻る ---- */
const glc=document.getElementById('gl'),hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255),CB=hx('#e4ddd0'),CS=hx('#b99d7c'),CR=hx('#5d6a79'),
PH='#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n',
VQ='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}',
FQ=PH+'uniform vec4 u;uniform vec3 k;uniform vec2 r;uniform vec2 m;void main(){vec2 s=vec2(gl_FragCoord.x,m.y-gl_FragCoord.y)/m.x-r*.5;vec2 v=vec2(s.x,s.y/k.z);vec2 w=vec2(k.x*v.x+k.y*v.y,k.x*v.y-k.y*v.x)/u.z+u.xy;vec2 g=floor(w/u.w+.5)*u.w;vec2 d=(w-g)*u.z;bool M=mod(g.x,5.)<.01&&mod(g.y,5.)<.01;float q=M?2.:1.4;float al=clamp(q+.5-max(abs(d.x),abs(d.y)),0.,1.);vec3 c=M?vec3(.663,.733,.8):vec3(.804,.851,.898);gl_FragColor=vec4(c*al,al);}',
VE='attribute vec2 p;attribute vec2 t;attribute vec3 e;uniform vec4 u;uniform vec3 k;uniform vec2 r;uniform vec3 w;varying float a;void main(){vec2 q=(p-u.xy)*u.z+t*e.y*w.z+vec2(-t.y,t.x)*(e.z*w.x+w.y);a=e.x;gl_Position=vec4((k.x*q.x-k.y*q.y)/r.x*2.,-(k.z*(k.y*q.x+k.x*q.y))/r.y*2.,0.,1.);}',
FE=PH+'uniform vec3 c;uniform float d;varying float a;void main(){if(d>.5&&mod(a,.23)>.07)discard;gl_FragColor=vec4(c,1.);}';
let G=null,GQ,GE,gn=0,gver=-1;
function glProg(v,f){const mk=(t,s)=>{const o=G.createShader(t);G.shaderSource(o,s);G.compileShader(o);if(!G.getShaderParameter(o,G.COMPILE_STATUS))throw new Error(G.getShaderInfoLog(o));return o},p=G.createProgram();G.attachShader(p,mk(G.VERTEX_SHADER,v));G.attachShader(p,mk(G.FRAGMENT_SHADER,f));G.linkProgram(p);if(!G.getProgramParameter(p,G.LINK_STATUS))throw new Error(G.getProgramInfoLog(p));p.b=G.createBuffer();return p}
function glInit(){try{G=glc.getContext('webgl',{alpha:false,antialias:true,failIfMajorPerformanceCaveat:true});if(!G)return;
  GQ=glProg(VQ,FQ);GE=glProg(VE,FE);G.bindBuffer(G.ARRAY_BUFFER,GQ.b);G.bufferData(G.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),G.STATIC_DRAW);
  G.enable(G.BLEND);G.blendFunc(G.ONE,G.ONE_MINUS_SRC_ALPHA);gver=-1}catch(err){console.warn('WebGLを使えないため2D描画で動作します:',err);G=null}}
glc.addEventListener('webglcontextlost',e=>{e.preventDefault();G=null});glc.addEventListener('webglcontextrestored',glInit);glInit();
function glBuild(){   /* 線路1本 = 6頂点 [位置2, 向き2, 辺に沿った距離/端の向き/左右] */
  const a=new Float32Array(edges.size*42),V=[[0,-1],[0,1],[1,1],[0,-1],[1,1],[1,-1]];let i=0;
  for(const e of edges.values()){const dx=e[2]-e[0],dy=e[3]-e[1],l=Math.hypot(dx,dy),tx=dx/l,ty=dy/l;
    for(const[f,s]of V){a[i]=f?e[2]:e[0];a[i+1]=f?e[3]:e[1];a[i+2]=tx;a[i+3]=ty;a[i+4]=f?l:0;a[i+5]=f?1:-1;a[i+6]=s;i+=7}}
  G.bindBuffer(G.ARRAY_BUFFER,GE.b);G.bufferData(G.ARRAY_BUFFER,a,G.STATIC_DRAW);gn=edges.size*6;gver=ver}
function glDraw(){   /* 成功したら true (背景・格子点・線路は描画済み) */
  if(!G||!W||!H)return false;
  try{
    const z=cam.z,{s,c,y:q}=lin(),U=(p,n)=>(p.U=p.U||{})[n]||(p.U[n]=G.getUniformLocation(p,n)),A=(p,n,sz,st,o)=>{const l=G.getAttribLocation(p,n);G.enableVertexAttribArray(l);G.vertexAttribPointer(l,sz,G.FLOAT,false,st,o)};
    G.viewport(0,0,glc.width,glc.height);G.clearColor(.953,.969,.984,1);G.clear(G.COLOR_BUFFER_BIT);
    G.useProgram(GQ);G.bindBuffer(G.ARRAY_BUFFER,GQ.b);A(GQ,'a',2,0,0);
    G.uniform4f(U(GQ,'u'),cam.x,cam.y,z,z>=14?1:z>=7?5:10);G.uniform3f(U(GQ,'k'),c,s,q);G.uniform2f(U(GQ,'r'),W,H);G.uniform2f(U(GQ,'m'),glc.width/W,glc.height);
    G.drawArrays(G.TRIANGLE_STRIP,0,4);
    if(gver!==ver)glBuild();
    if(gn){
      G.useProgram(GE);G.bindBuffer(G.ARRAY_BUFFER,GE.b);A(GE,'p',2,28,0);A(GE,'t',2,28,8);A(GE,'e',3,28,16);
      G.uniform4f(U(GE,'u'),cam.x,cam.y,z,0);G.uniform3f(U(GE,'k'),c,s,q);G.uniform2f(U(GE,'r'),W,H);
      const L=(col,hw,off,ext,dash)=>{G.uniform3f(U(GE,'w'),hw,off,ext);G.uniform3fv(U(GE,'c'),col);G.uniform1f(U(GE,'d'),dash);G.drawArrays(G.TRIANGLES,0,gn)};
      if(z>=12){const h=z*SZ.bed/2,r=Math.max(.6,z*.025);L(CB,h,0,h,0);L(CS,z*SZ.slp/2,0,0,1);L(CR,r,z*.09,r,0);L(CR,r,-z*.09,r,0)}
      else{const h=Math.max(.75,z*.05);L(CR,h,0,h,0)}
    }
    return true;
  }catch(err){console.warn(err);G=null;return false}
}

