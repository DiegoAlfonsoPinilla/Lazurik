'use strict';
/* Motor de dibujo v0.3 — capas reales, historial por capa, trazos suaves, cursor exacto.
   Se carga después de app.js y reemplaza sus funciones de dibujo y capas. */
const Engine=(()=>{
 const $=id=>document.getElementById(id);
 const dctx=canvas.getContext('2d');
 const mk=()=>Object.assign(document.createElement('canvas'),{width:canvas.width,height:canvas.height});
 const BRUSH=['pincel','lapiz','marcador','borrador'];
 const EDIT=[...BRUSH,'estrellas','organico','relleno','texto','linea','rectangulo','circulo','seleccionar','duplicador'];
 const cache=new Map(),CAP=40,H={stack:[],idx:-1,pre:null};
 let curKey=null,raf=0,size='',lp={x:0,y:0};
 const keyOf=()=>state.activeFrameId+'|'+state.activeLayerId;
 const toast=m=>{const t=Object.assign(document.createElement('div'),{className:'laz-toast',textContent:m});document.body.append(t);setTimeout(()=>t.remove(),2200)};

 /* ---- Capas reales: un lienzo por capa y cuadro (caché LRU; la verdad sigue en state.canvasData) ---- */
 function getC(fid,lid){
  const d=(state.canvasData[fid]||{})[lid],k=fid+'|'+lid;let c=cache.get(k);
  if(c&&(c.width!==canvas.width||c.height!==canvas.height)){cache.delete(k);c=null}
  if(c&&(c._s===d||d instanceof Blob)){cache.delete(k);cache.set(k,c);return c}
  c=mk();if(d instanceof ImageData)c.getContext('2d').putImageData(d,0,0);c._s=d;
  cache.set(k,c);if(cache.size>CAP)cache.delete(cache.keys().next().value);return c}
 function bind(){ctx=getC(state.activeFrameId,state.activeLayerId).getContext('2d');curKey=keyOf()}
 function flushSel(){ // si cambias de capa con una selección abierta, se confirma en su capa original
  if(!curKey||curKey===keyOf()||!(state.sel.active||state.dup.active))return;
  const [f,l]=curKey.split('|'),nf=state.activeFrameId,nl=state.activeLayerId;
  state.activeFrameId=f;state.activeLayerId=l;ctx=getC(f,l).getContext('2d');
  state.sel.active?commitSelection():commitDup();
  state.activeFrameId=nf;state.activeLayerId=nl}
 function paint(){raf=0;const s=canvas.width+'x'+canvas.height;if(s!==size){size=s;H.stack=[];H.idx=-1;H.pre=null}
  flushSel();bind();const fid=state.activeFrameId;dctx.clearRect(0,0,canvas.width,canvas.height);
  for(const L of state.layers){if(!L.visible)continue;dctx.globalAlpha=L.opacity/100;dctx.drawImage(getC(fid,L.id),0,0)}
  dctx.globalAlpha=1}
 const sched=()=>{if(!raf)raf=requestAnimationFrame(paint)};
 function save(){const f=state.activeFrameId,l=state.activeLayerId,c=getC(f,l);
  const img=c.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
  (state.canvasData[f]=state.canvasData[f]||{})[l]=img;c._s=img;return img}

 /* ---- Historial por capa: cada paso guarda su capa; deshacer quita exactamente un trazo ---- */
 const same=(a,b)=>{if(a.width!==b.width||a.height!==b.height)return false;
  const x=new Uint32Array(a.data.buffer),y=new Uint32Array(b.data.buffer);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true};
 function begin(){bind();const f=state.activeFrameId,l=state.activeLayerId,d=(state.canvasData[f]||{})[l];
  H.pre={f,l,img:d instanceof ImageData?d:new ImageData(canvas.width,canvas.height)}}
 function commit(){const p=H.pre;H.pre=null;const img=save();
  if(!p||p.f!==state.activeFrameId||p.l!==state.activeLayerId||same(p.img,img))return;
  H.stack.splice(H.idx+1);H.stack.push({f:p.f,l:p.l,before:p.img,after:img});
  if(H.stack.length>60)H.stack.shift();H.idx=H.stack.length-1}
 async function put(e,img){(state.canvasData[e.f]=state.canvasData[e.f]||{})[e.l]=img;
  if(state.activeFrameId!==e.f)await selectFrame(e.f);
  state.activeLayerId=e.l;redrawCanvas();buildLayersList();renderOnionSkin()}
 const valid=e=>state.frames.some(f=>f.id===e.f)&&state.layers.some(l=>l.id===e.l);
 async function step(dir){
  for(;;){const i=dir<0?H.idx:H.idx+1;if(i<0||i>=H.stack.length)return;const e=H.stack[i];H.idx+=dir;
   if(valid(e)){await put(e,dir<0?e.before:e.after);return}}}

 /* ---- Trazos: se dibuja en un búfer a opacidad completa y se compone una sola vez (sin manchas) ---- */
 const ST={on:false,tool:'',base:null,cv:null,cx:null,p0:null,m0:null,w:1,end:null,endKey:''};
 const widthOf=e=>state.brushSize*(ST.tool==='marcador'?3:1)*(e.pointerType==='pen'?.15+.85*Math.max(.05,e.pressure||.5):1);
 const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const col=()=>ST.tool==='borrador'?'#000':state.brushColor;
 function curve(m0,c,m1,w){const x=ST.cx;x.save();x.lineWidth=w;x.lineJoin='round';x.lineCap=ST.tool==='marcador'?'square':'round';
  x.strokeStyle=col();if(ST.tool==='pincel'){x.shadowColor=col();x.shadowBlur=Math.max(1,w*.25)}
  x.beginPath();x.moveTo(m0.x,m0.y);x.quadraticCurveTo(c.x,c.y,m1.x,m1.y);x.stroke();x.restore()}
 function compose(){const a=state.brushOpacity/100*(ST.tool==='marcador'?.55:1);
  ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(ST.base,0,0);
  ctx.globalAlpha=a;ctx.globalCompositeOperation=ST.tool==='borrador'?'destination-out':'source-over';
  ctx.drawImage(ST.cv,0,0);ctx.restore();sched()}
 function sStart(e){begin();ST.tool=state.activeTool;
  if(!ST.base||ST.base.width!==canvas.width||ST.base.height!==canvas.height){ST.base=mk();ST.cv=mk();ST.cx=ST.cv.getContext('2d')}
  ST.cx.clearRect(0,0,canvas.width,canvas.height);
  const bx=ST.base.getContext('2d');bx.clearRect(0,0,canvas.width,canvas.height);bx.drawImage(ctx.canvas,0,0);
  const p=getPos(e);ST.w=widthOf(e);
  if(e.shiftKey&&ST.end&&ST.endKey===keyOf())curve(ST.end,ST.end,p,ST.w); // Shift: línea recta desde el último punto
  else{ST.cx.fillStyle=col();ST.cx.beginPath();ST.cx.arc(p.x,p.y,ST.w/2,0,7);ST.cx.fill()}
  ST.p0=ST.m0=p;ST.on=true;compose()}
 function sMove(e){const p=getPos(e);ST.w+=(widthOf(e)-ST.w)*.4;const m=mid(ST.p0,p);
  curve(ST.m0,ST.p0,m,ST.w);ST.m0=m;ST.p0=p;compose()}
 function sEnd(){curve(ST.m0,ST.p0,ST.p0,ST.w);compose();ST.end={...ST.p0};ST.endKey=keyOf();ST.on=false;commit();sched()}

 /* ---- Cursor de pincel exacto (corregido: se posiciona en coordenadas del lienzo, no de pantalla) ---- */
 function cursor(e){const cur=$('eraser-cursor');if(!cur)return;
  if(!BRUSH.includes(state.activeTool)){cur.style.display='none';return}
  const wrap=$('canvas-wrap'),r=wrap.getBoundingClientRect(),s=r.width/wrap.offsetWidth||1;
  const sz=state.brushSize*(state.activeTool==='marcador'?3:1)*(canvas.offsetWidth/canvas.width);
  Object.assign(cur.style,{display:'block',width:sz+'px',height:sz+'px',left:(e.clientX-r.left)/s+'px',top:(e.clientY-r.top)/s+'px',borderWidth:Math.max(.5,1.5/s)+'px'})}

 /* ---- Eventos de puntero (ratón, lápiz y táctil) con captura y puntos agrupados ---- */
 const ev=(e,q)=>({clientX:q.clientX,clientY:q.clientY,target:e.target,button:e.button,shiftKey:e.shiftKey,altKey:e.altKey,
  pointerType:e.pointerType,pressure:q.pressure,preventDefault(){}});
 function canEdit(){const L=activeLayer();
  if(!L)return toast('No hay capa activa'),false;
  if(!L.visible)return toast('La capa está oculta'),false;
  if(L.locked)return toast('La capa está bloqueada'),false;return true}
 function pd(e){if(e.pointerType==='mouse'&&e.button!==0&&!(state.activeTool==='zoom'&&e.button===2))return;
  const t=state.activeTool;bind();
  if(e.altKey&&BRUSH.includes(t)){const p=getPos(e);pickColor(p.x,p.y);return} // Alt: cuentagotas rápido
  if(EDIT.includes(t)&&!canEdit())return;
  e.currentTarget.setPointerCapture(e.pointerId);
  BRUSH.includes(t)?sStart(ev(e,e)):onDown(ev(e,e));sched()}
 function pm(e){cursor(e);
  const list=(e.getCoalescedEvents&&e.getCoalescedEvents())||[];
  for(const q of(list.length?list:[e]))ST.on?sMove(ev(e,q)):onMove(ev(e,q));sched()}
 function pu(e){ST.on?sEnd():onUp(ev(e,e));sched()}
 window.initCanvasEvents=()=>{
  for(const el of[canvas,selCvs]){el.addEventListener('pointerdown',pd);el.addEventListener('pointermove',pm);
   el.addEventListener('pointerup',pu);el.addEventListener('pointercancel',pu);
   el.addEventListener('pointerleave',()=>{const c=$('eraser-cursor');if(c)c.style.display='none'});
   el.addEventListener('contextmenu',e=>e.preventDefault())}}
 $('canvas-viewport').addEventListener('pointermove',e=>{lp={x:e.clientX,y:e.clientY}});

 /* ---- Zoom centrado en el puntero ---- */
 window.applyZoom=d=>{const vp=$('canvas-viewport'),wrap=$('canvas-wrap'),old=state.zoomLevel;
  const nz=Math.min(12,Math.max(.05,old*(d>0?1.25:.8))),vr=vp.getBoundingClientRect();
  const inV=lp.x>=vr.left&&lp.x<=vr.right&&lp.y>=vr.top&&lp.y<=vr.bottom;
  const px=inV?lp.x:vr.left+vr.width/2,py=inV?lp.y:vr.top+vr.height/2;
  const r=wrap.getBoundingClientRect(),u=(px-r.left)/old,v=(py-r.top)/old;
  state.zoomLevel=nz;wrap.style.transform=`scale(${nz})`;wrap.style.transformOrigin='top left';
  const r2=wrap.getBoundingClientRect();vp.scrollLeft+=r2.left+u*nz-px;vp.scrollTop+=r2.top+v*nz-py;
  $('zoom-display').textContent=Math.round(nz*100)+'%'};

 /* ---- Exportación: solo capas visibles y sin la capa mantequilla (referencia) ---- */
 function flat(fid,bg){const c=mk(),x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,c.width,c.height)}
  for(const L of state.layers){if(!L.visible||L.butter)continue;x.globalAlpha=L.opacity/100;x.drawImage(getC(fid,L.id),0,0)}return c}
 const dl=(url,n)=>Object.assign(document.createElement('a'),{download:n,href:url}).click();
 window.exportPNG=()=>{save();dl(flat(state.activeFrameId).toDataURL('image/png'),'lazurik.png')};
 window.exportJPG=()=>{save();dl(flat(state.activeFrameId,'#fff').toDataURL('image/jpeg',.95),'lazurik.jpg')};

 /* ---- Reemplazos de funciones de app.js ---- */
 window.redrawCanvas=()=>{if(raf){cancelAnimationFrame(raf);raf=0}paint()};
 window.saveLayerData=save;
 window.beginEdit=begin;window.commitEdit=commit;window.pushHistory=commit;
 window.undo=()=>step(-1);window.redo=()=>step(1);
 window.updateEraserCursor=(x,y)=>cursor({clientX:x,clientY:y});
 window.pickColor=(x,y)=>{paint();const p=dctx.getImageData(~~x,~~y,1,1).data;
  setColor('#'+[p[0],p[1],p[2]].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase())};
 window.initCanvasSize=(w=800,h=500)=>{for(const c of[canvas,onionCvs,selCvs]){c.width=w;c.height=h}
  state.canvasData={};Engine.reset();redrawCanvas()};
 return{canEdit,toast,reset(){cache.clear();H.stack=[];H.idx=-1;H.pre=null;curKey=null;state.history=[];state.histIdx=-1}};
})();
