// ═══════════════════════════════════════════════
//  LAZURIK — script.js  (completo, funcional)
// ═══════════════════════════════════════════════

// ─── 1. STATE ────────────────────────────────────
const state = {
  activeTool:    "pincel",
  brushColor:    "#B8A7E8",
  brushSize:     6,
  brushOpacity:  100,
  zoomLevel:     1,
  layers:        [{ id:"lyr-1", name:"Capa 1", visible:true, locked:false, opacity:100 }],
  activeLayerId: "lyr-1",
  frames:        [{ id:"frm-1" }],
  activeFrameId: "frm-1",
  fps:           12,
  isPlaying:     false,
  canvasData:    {},
  history:       [],
  histIdx:       -1,
  textPendingPos: null,
  _prevTool:     "pincel",
  recentColors:  [],
  starDensity:   3,
  organicIntensity: 30,
  customFont:    null,
  vinetas:       [],
  sel: {
    active:false, drawing:false, moving:false,
    x:0, y:0, w:0, h:0, startX:0, startY:0,
    dragOffX:0, dragOffY:0, cut:null, bgSnapshot:null
  },
  dup: {
    active:false, drawing:false, moving:false,
    x:0, y:0, w:0, h:0, startX:0, startY:0,
    dragOffX:0, dragOffY:0, cut:null, bgSnapshot:null
  }
};

// ─── 2. CANVAS ELEMENTS ──────────────────────────
const canvas   = document.getElementById("main-canvas");
let ctx = canvas.getContext("2d");
const onionCvs = document.getElementById("onion-canvas");
const onionCtx = onionCvs.getContext("2d");
const selCvs   = document.getElementById("selection-canvas");
const selCtx   = selCvs.getContext("2d");

let isDrawing = false, lastX=0, lastY=0, shapeX0=0, shapeY0=0;
let shapeSnapshot = null;
let isPanning = false, panPrevX=0, panPrevY=0;
let marchDash = 0;

// ─── 3. TOOLS LIST ───────────────────────────────
const TOOLS = [
  { id:"seleccionar", icon:"select", label:"Selec.",   key:"s" },
  { id:"duplicador",  icon:"copy", label:"Duplic.",  key:"d" },
  { id:"mover",       icon:"move",  label:"Mover",   key:"v" },
  { id:"pincel",      icon:"brush", label:"Pincel",  key:"b" },
  { id:"lapiz",       icon:"pencil",  label:"Lápiz",   key:"p" },
  { id:"marcador",    icon:"marker", label:"Marcad.", key:"m" },
  { id:"borrador",    icon:"eraser",  label:"Borr.",   key:"e" },
  { id:"estrellas",   icon:"star", label:"Estrell.", key:"w" },
  { id:"organico",    icon:"wave", label:"Orgánic.", key:"o" },
  { id:"relleno",     icon:"bucket",  label:"Relleno", key:"f" },
  { id:"texto",       icon:"text",  label:"Texto",   key:"t" },
  { id:"linea",       icon:"line",  label:"Línea",   key:"l" },
  { id:"rectangulo",  icon:"rect",  label:"Rect.",   key:"r" },
  { id:"circulo",     icon:"circle",  label:"Círculo", key:"c" },
  { id:"vineta",      icon:"bubble", label:"Viñeta",  key:"" },
  { id:"cuentagotas", icon:"dropper", label:"Gotas",   key:"i" },
  { id:"zoom",        icon:"zoom", label:"Zoom",    key:"z" },
];

const FREE_TOOLS  = ["pincel","lapiz","borrador","marcador","organico"];
const SHAPE_TOOLS = ["linea","rectangulo","circulo"];

// ─── 4. CANVAS INIT ──────────────────────────────
function initCanvasSize(w=800, h=500) {
  canvas.width=w; canvas.height=h;
  onionCvs.width=w; onionCvs.height=h;
  selCvs.width=w; selCvs.height=h;
  state.canvasData={}; state.history=[]; state.histIdx=-1;
  ctx.clearRect(0,0,w,h);
  pushHistory();
}

function syncOverlaySize() {
  if (onionCvs.width!==canvas.width||onionCvs.height!==canvas.height) {
    onionCvs.width=canvas.width; onionCvs.height=canvas.height;
    selCvs.width=canvas.width; selCvs.height=canvas.height;
  }
}

function getPos(e) {
  const rect=canvas.getBoundingClientRect();
  const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
  const src=e.touches?e.touches[0]:e;
  return { x:(src.clientX-rect.left)*scaleX, y:(src.clientY-rect.top)*scaleY };
}

// ─── 5. HISTORY ──────────────────────────────────
function pushHistory() {
  const snap=ctx.getImageData(0,0,canvas.width,canvas.height);
  state.history.splice(state.histIdx+1);
  state.history.push(snap);
  if(state.history.length>80) state.history.shift();
  else state.histIdx=state.history.length-1;
  state.histIdx=state.history.length-1;
  saveLayerData();
}

function undo() {
  if(state.histIdx<=0) return;
  state.histIdx--;
  ctx.putImageData(state.history[state.histIdx],0,0);
  saveLayerData();
}

function redo() {
  if(state.histIdx>=state.history.length-1) return;
  state.histIdx++;
  ctx.putImageData(state.history[state.histIdx],0,0);
  saveLayerData();
}

function saveLayerData() {
  if(!state.canvasData[state.activeFrameId]) state.canvasData[state.activeFrameId]={};
  state.canvasData[state.activeFrameId][state.activeLayerId]=ctx.getImageData(0,0,canvas.width,canvas.height);
}

function redrawCanvas() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const fd=state.canvasData[state.activeFrameId]; if(!fd) return;
  state.layers.forEach(layer=>{
    if(!layer.visible) return;
    const imgData=fd[layer.id]; if(!imgData) return;
    const off=document.createElement("canvas"); off.width=canvas.width; off.height=canvas.height;
    off.getContext("2d").putImageData(imgData,0,0);
    ctx.save(); ctx.globalAlpha=layer.opacity/100; ctx.drawImage(off,0,0); ctx.restore();
  });
}

// ─── 6. SELECTION (MOVE ONLY - NO DUPLICATE) ─────
function commitSelection() {
  const sel=state.sel; if(!sel.active) return;
  ctx.putImageData(sel.bgSnapshot,0,0);
  if(sel.cut && sel.w>0 && sel.h>0) {
    const sc=document.createElement("canvas"); sc.width=sel.w; sc.height=sel.h;
    sc.getContext("2d").putImageData(sel.cut,0,0);
    ctx.drawImage(sc,sel.x,sel.y);
  }
  pushHistory();
  clearSelectionState();
}

function clearSelectionState() {
  const sel=state.sel;
  sel.active=sel.drawing=sel.moving=false;
  sel.cut=sel.bgSnapshot=null;
  sel.x=sel.y=sel.w=sel.h=0;
  selCtx.clearRect(0,0,selCvs.width,selCvs.height);
}

// ─── 7. DUPLICATOR ───────────────────────────────
function commitDup() {
  const dup=state.dup; if(!dup.active) return;
  pushHistory();
  clearDupState();
}

function clearDupState() {
  const dup=state.dup;
  dup.active=dup.drawing=dup.moving=false;
  dup.cut=dup.bgSnapshot=null;
  dup.x=dup.y=dup.w=dup.h=0;
  selCtx.clearRect(0,0,selCvs.width,selCvs.height);
}

// ─── 8. MARCHING ANTS ────────────────────────────
function marchingAntsLoop() {
  selCtx.clearRect(0,0,selCvs.width,selCvs.height);
  const sel=state.activeTool==="seleccionar"?state.sel:state.dup;
  const show=(sel.active||sel.drawing)&&(Math.abs(sel.w)>2||Math.abs(sel.h)>2);
  if(show) {
    const rx=sel.drawing?(sel.w<0?sel.startX+sel.w:sel.startX):sel.x;
    const ry=sel.drawing?(sel.h<0?sel.startY+sel.h:sel.startY):sel.y;
    const rw=Math.abs(sel.w), rh=Math.abs(sel.h);
    selCtx.save();
    selCtx.lineWidth=1.5; selCtx.setLineDash([6,4]);
    selCtx.lineDashOffset=-marchDash; selCtx.strokeStyle="#ffffff";
    selCtx.strokeRect(rx+.5,ry+.5,rw,rh);
    selCtx.lineDashOffset=-marchDash+10; selCtx.strokeStyle="#000000";
    selCtx.strokeRect(rx+.5,ry+.5,rw,rh);
    selCtx.restore();
    marchDash=(marchDash+0.4)%20;
  }
  requestAnimationFrame(marchingAntsLoop);
}

// ─── 9. ERASER CURSOR ────────────────────────────
function updateEraserCursor(clientX, clientY) {
  const cur=document.getElementById("eraser-cursor");
  const wrap=document.getElementById("canvas-wrap");
  if(!cur||!wrap) return;
  if(state.activeTool!=="borrador") { cur.style.display="none"; return; }
  const rect=wrap.getBoundingClientRect();
  const size=Math.max(4, state.brushSize * state.zoomLevel);
  cur.style.display="block";
  cur.style.width=size+"px";
  cur.style.height=size+"px";
  cur.style.left=(clientX-rect.left)+"px";
  cur.style.top=(clientY-rect.top)+"px";
}

// ─── 10. CANVAS EVENTS ───────────────────────────
function initCanvasEvents() {
  canvas.addEventListener("mousedown",  onDown);
  canvas.addEventListener("mousemove",  onMove);
  canvas.addEventListener("mouseup",    onUp);
  canvas.addEventListener("mouseleave", onLeave);
  canvas.addEventListener("touchstart", onDown, {passive:false});
  canvas.addEventListener("touchmove",  onMove, {passive:false});
  canvas.addEventListener("touchend",   onUp);
  canvas.addEventListener("contextmenu", e=>e.preventDefault());
  selCvs.addEventListener("mousedown",  onDown);
  selCvs.addEventListener("mousemove",  onMove);
  selCvs.addEventListener("mouseup",    onUp);
  selCvs.addEventListener("mouseleave", onLeave);
  selCvs.addEventListener("touchstart", onDown, {passive:false});
  selCvs.addEventListener("touchmove",  onMove, {passive:false});
  selCvs.addEventListener("touchend",   onUp);
  document.addEventListener("mousemove", e=>{
    if(state.activeTool==="borrador") updateEraserCursor(e.clientX, e.clientY);
  });
}

function isSelCanvas(e){return e.target===selCvs;}

function onDown(e) {
  if(e.touches) e.preventDefault();
  const tool=state.activeTool;
  const isSelTool=(tool==="seleccionar"||tool==="duplicador");
  if(isSelCanvas(e) && !isSelTool) return;
  if(!isSelCanvas(e) && isSelTool) return;
  const pos=getPos(e);
  if(tool==="mover") {
    isPanning=true;
    const src=e.touches?e.touches[0]:e;
    panPrevX=src.clientX; panPrevY=src.clientY;
    canvas.style.cursor="grabbing"; return;
  }
  if(tool==="seleccionar") {
    const sel=state.sel;
    if(sel.active) {
      if(pos.x>=sel.x&&pos.x<=sel.x+sel.w&&pos.y>=sel.y&&pos.y<=sel.y+sel.h) {
        sel.moving=true; sel.dragOffX=pos.x-sel.x; sel.dragOffY=pos.y-sel.y; return;
      } else { commitSelection(); }
    }
    sel.drawing=true; sel.active=false;
    sel.startX=pos.x; sel.startY=pos.y;
    sel.x=pos.x; sel.y=pos.y; sel.w=0; sel.h=0; return;
  }
  if(tool==="duplicador") {
    const dup=state.dup;
    if(dup.active) {
      if(pos.x>=dup.x&&pos.x<=dup.x+dup.w&&pos.y>=dup.y&&pos.y<=dup.y+dup.h) {
        dup.moving=true; dup.dragOffX=pos.x-dup.x; dup.dragOffY=pos.y-dup.y; return;
      } else { commitDup(); }
    }
    dup.drawing=true; dup.active=false;
    dup.startX=pos.x; dup.startY=pos.y;
    dup.x=pos.x; dup.y=pos.y; dup.w=0; dup.h=0; return;
  }
  if(tool==="relleno") { floodFill(~~pos.x,~~pos.y,state.brushColor); return; }
  if(tool==="cuentagotas") { pickColor(pos.x,pos.y); return; }
  if(tool==="zoom") { applyZoom(e.button===2?-0.15:0.15); return; }
  if(tool==="texto") {
    state.textPendingPos=pos; openModal("modal-text");
    setTimeout(()=>document.getElementById("text-val").focus(),100); return;
  }
  if(tool==="vineta") { openModal("modal-vinetas"); return; }
  if(tool==="estrellas") {
    isDrawing=true; beginEdit(); drawStarBrush(pos.x,pos.y); return;
  }
  isDrawing=true; lastX=pos.x; lastY=pos.y; shapeX0=pos.x; shapeY0=pos.y;
  if(SHAPE_TOOLS.includes(tool)) { beginEdit(); shapeSnapshot=ctx.getImageData(0,0,canvas.width,canvas.height); }
  else if(FREE_TOOLS.includes(tool)) beginEdit();
}

function onMove(e) {
  if(e.touches) e.preventDefault();
  const tool=state.activeTool;
  const isSelTool=(tool==="seleccionar"||tool==="duplicador");
  if(isSelCanvas(e)&&!isSelTool) return;
  if(!isSelCanvas(e)&&isSelTool) return;
  const pos=getPos(e);
  if(tool==="borrador") updateEraserCursor(e.clientX||e.touches?.[0]?.clientX||0, e.clientY||e.touches?.[0]?.clientY||0);
  if(isPanning) {
    const src=e.touches?e.touches[0]:e;
    const vp=document.getElementById("canvas-viewport");
    vp.scrollLeft-=src.clientX-panPrevX; vp.scrollTop-=src.clientY-panPrevY;
    panPrevX=src.clientX; panPrevY=src.clientY; return;
  }
  if(tool==="seleccionar" && state.sel.drawing) {
    const sel=state.sel;
    sel.w=pos.x-sel.startX; sel.h=pos.y-sel.startY; return;
  }
  if(tool==="seleccionar" && state.sel.moving) {
    const sel=state.sel;
    const newX=Math.round(pos.x-sel.dragOffX), newY=Math.round(pos.y-sel.dragOffY);
    ctx.putImageData(sel.bgSnapshot,0,0);
    const sc=document.createElement("canvas"); sc.width=sel.w; sc.height=sel.h;
    sc.getContext("2d").putImageData(sel.cut,0,0);
    ctx.drawImage(sc,newX,newY);
    sel.x=newX; sel.y=newY; return;
  }
  if(tool==="duplicador" && state.dup.drawing) {
    const dup=state.dup;
    dup.w=pos.x-dup.startX; dup.h=pos.y-dup.startY; return;
  }
  if(tool==="duplicador" && state.dup.moving) {
    const dup=state.dup;
    const newX=Math.round(pos.x-dup.dragOffX), newY=Math.round(pos.y-dup.dragOffY);
    ctx.putImageData(dup.bgSnapshot,0,0);
    const sc=document.createElement("canvas"); sc.width=dup.w; sc.height=dup.h;
    sc.getContext("2d").putImageData(dup.cut,0,0);
    ctx.drawImage(sc,newX,newY);
    dup.x=newX; dup.y=newY; return;
  }
  if(!isDrawing) return;
  if(tool==="estrellas") { drawStarBrush(pos.x,pos.y); return; }
  if(FREE_TOOLS.includes(tool)) {
    applyStroke({x:lastX,y:lastY},pos); lastX=pos.x; lastY=pos.y;
  } else if(SHAPE_TOOLS.includes(tool)) {
    drawShape(shapeX0,shapeY0,pos.x,pos.y,true);
  }
}

function onUp(e) {
  const tool=state.activeTool;
  const isSelTool=(tool==="seleccionar"||tool==="duplicador");
  if(isSelCanvas(e)&&!isSelTool) return;
  if(!isSelCanvas(e)&&isSelTool) return;
  if(isPanning) { isPanning=false; canvas.style.cursor="grab"; return; }
  if(tool==="seleccionar" && state.sel.drawing) {
    const sel=state.sel; sel.drawing=false;
    const rw=Math.abs(sel.w), rh=Math.abs(sel.h);
    if(rw<3||rh<3) { clearSelectionState(); return; }
    const rx=sel.w<0?sel.startX+sel.w:sel.startX;
    const ry=sel.h<0?sel.startY+sel.h:sel.startY;
    const cx=Math.max(0,Math.round(rx)), cy=Math.max(0,Math.round(ry));
    const cw=Math.min(canvas.width-cx,Math.round(rw)), ch=Math.min(canvas.height-cy,Math.round(rh));
    if(cw<2||ch<2) { clearSelectionState(); return; }
    beginEdit();
    sel.bgSnapshot=ctx.getImageData(0,0,canvas.width,canvas.height);
    sel.cut=ctx.getImageData(cx,cy,cw,ch);
    ctx.clearRect(cx,cy,cw,ch);
    sel.x=cx; sel.y=cy; sel.w=cw; sel.h=ch; sel.active=true;
    saveLayerData(); return;
  }
  if(tool==="seleccionar" && state.sel.moving) {
    state.sel.moving=false; saveLayerData(); return;
  }
  if(tool==="duplicador" && state.dup.drawing) {
    const dup=state.dup; dup.drawing=false;
    const rw=Math.abs(dup.w), rh=Math.abs(dup.h);
    if(rw<3||rh<3) { clearDupState(); return; }
    const rx=dup.w<0?dup.startX+dup.w:dup.startX;
    const ry=dup.h<0?dup.startY+dup.h:dup.startY;
    const cx=Math.max(0,Math.round(rx)), cy=Math.max(0,Math.round(ry));
    const cw=Math.min(canvas.width-cx,Math.round(rw)), ch=Math.min(canvas.height-cy,Math.round(rh));
    if(cw<2||ch<2) { clearDupState(); return; }
    beginEdit();
    dup.bgSnapshot=ctx.getImageData(0,0,canvas.width,canvas.height);
    dup.cut=ctx.getImageData(cx,cy,cw,ch);
    dup.x=cx; dup.y=cy; dup.w=cw; dup.h=ch; dup.active=true;
    saveLayerData(); return;
  }
  if(tool==="duplicador" && state.dup.moving) {
    state.dup.moving=false; saveLayerData(); return;
  }
  if(!isDrawing) return;
  isDrawing=false;
  let pos;
  if(e.changedTouches&&e.changedTouches.length) {
    const t=e.changedTouches[0]; const r=canvas.getBoundingClientRect();
    pos={x:(t.clientX-r.left)*(canvas.width/r.width),y:(t.clientY-r.top)*(canvas.height/r.height)};
  } else { pos=getPos(e); }
  if(tool==="estrellas") { commitEdit(); return; }
  if(SHAPE_TOOLS.includes(tool)) {
    if(shapeSnapshot) { ctx.putImageData(shapeSnapshot,0,0); shapeSnapshot=null; }
    ctx.setLineDash([]);
    drawShape(shapeX0,shapeY0,pos.x,pos.y,false);
    commitEdit();
  } else if(FREE_TOOLS.includes(tool)) { commitEdit(); }
}

function onLeave(e) {
  if(isPanning) { isPanning=false; canvas.style.cursor="grab"; return; }
  if(isDrawing&&SHAPE_TOOLS.includes(state.activeTool)) {
    isDrawing=false;
    if(shapeSnapshot) { ctx.putImageData(shapeSnapshot,0,0); shapeSnapshot=null; }
  } else if(isDrawing) { isDrawing=false; saveLayerData(); }
  if(state.sel.moving) { state.sel.moving=false; saveLayerData(); }
  if(state.dup.moving) { state.dup.moving=false; saveLayerData(); }
  document.getElementById("eraser-cursor").style.display="none";
}

// ─── 11. DRAWING FUNCTIONS ───────────────────────
function applyStroke(from, to) {
  const layer=activeLayer(); if(!layer||!layer.visible||layer.locked) return;
  ctx.save();
  ctx.lineCap="round"; ctx.lineJoin="round";
  const tool=state.activeTool;
  if(tool==="borrador") {
    ctx.globalCompositeOperation="destination-out";
    ctx.globalAlpha=state.brushOpacity/100;
    ctx.lineWidth=state.brushSize;
    ctx.strokeStyle="rgba(0,0,0,1)";
    ctx.shadowBlur=0;
  } else if(tool==="marcador") {
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=(state.brushOpacity/100)*0.55;
    ctx.lineWidth=state.brushSize*3;
    ctx.lineCap="square";
    ctx.strokeStyle=state.brushColor;
    ctx.shadowBlur=1; ctx.shadowColor=state.brushColor;
  } else if(tool==="lapiz") {
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=(state.brushOpacity/100)*(layer.opacity/100);
    ctx.lineWidth=state.brushSize;
    ctx.strokeStyle=state.brushColor;
    ctx.shadowBlur=0;
  } else if(tool==="organico") {
    applyOrganicStroke(from,to);
    ctx.restore(); return;
  } else {
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=(state.brushOpacity/100)*(layer.opacity/100);
    ctx.lineWidth=state.brushSize;
    ctx.strokeStyle=state.brushColor;
    ctx.shadowColor=state.brushColor;
    ctx.shadowBlur=Math.max(1,state.brushSize*0.3);
  }
  ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
  ctx.restore();
}

function applyOrganicStroke(from, to) {
  const layer=activeLayer(); if(!layer||!layer.visible||layer.locked) return;
  const intensity=state.organicIntensity/100;
  ctx.save();
  ctx.strokeStyle=state.brushColor;
  ctx.globalAlpha=state.brushOpacity/100;
  ctx.lineCap="round"; ctx.lineJoin="round";
  const segments=5;
  for(let i=0;i<segments;i++) {
    const t0=i/segments, t1=(i+1)/segments;
    const x0=from.x+(to.x-from.x)*t0, y0=from.y+(to.y-from.y)*t0;
    const x1=from.x+(to.x-from.x)*t1, y1=from.y+(to.y-from.y)*t1;
    const jitter=intensity*state.brushSize*1.5;
    const cpx=(x0+x1)/2+(Math.random()-.5)*jitter;
    const cpy=(y0+y1)/2+(Math.random()-.5)*jitter;
    const wobble=1+(Math.random()-.5)*intensity*0.8;
    ctx.beginPath();
    ctx.lineWidth=Math.max(1,state.brushSize*wobble);
    ctx.moveTo(x0,y0);
    ctx.quadraticCurveTo(cpx,cpy,x1,y1);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── 12. STAR BRUSH ──────────────────────────────
function drawStar(c, cx, cy, spikes, outerR, innerR) {
  let rot=(Math.PI/2)*3;
  const step=Math.PI/spikes;
  c.beginPath(); c.moveTo(cx,cy-outerR);
  for(let i=0;i<spikes;i++) {
    c.lineTo(cx+Math.cos(rot)*outerR,cy+Math.sin(rot)*outerR); rot+=step;
    c.lineTo(cx+Math.cos(rot)*innerR,cy+Math.sin(rot)*innerR); rot+=step;
  }
  c.lineTo(cx,cy-outerR); c.closePath(); c.fill();
}

function drawStarBrush(x, y) {
  const layer=activeLayer(); if(!layer||!layer.visible||layer.locked) return;
  const density=state.starDensity||3;
  for(let i=0;i<density;i++) {
    const spread=state.brushSize*2.5;
    const sx=x+(Math.random()-.5)*spread;
    const sy=y+(Math.random()-.5)*spread;
    const size=state.brushSize*0.25+Math.random()*state.brushSize*0.6;
    const rotation=Math.random()*Math.PI*2;
    ctx.save();
    ctx.translate(sx,sy); ctx.rotate(rotation);
    ctx.globalAlpha=(state.brushOpacity/100)*(0.5+Math.random()*0.5);
    ctx.fillStyle=state.brushColor;
    drawStar(ctx,0,0,5,size,size*0.4);
    ctx.restore();
  }
}

// ─── 13. SHAPES ──────────────────────────────────
function drawShape(x0,y0,x1,y1,preview=false) {
  if(preview&&shapeSnapshot) ctx.putImageData(shapeSnapshot,0,0);
  ctx.save();
  ctx.globalAlpha=state.brushOpacity/100;
  ctx.strokeStyle=state.brushColor;
  ctx.lineWidth=state.brushSize;
  ctx.lineCap="round";
  if(preview) ctx.setLineDash([6,3]);
  switch(state.activeTool) {
    case"linea": ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();break;
    case"rectangulo": ctx.beginPath();ctx.rect(x0,y0,x1-x0,y1-y0);ctx.stroke();break;
    case"circulo": {
      const rx=(x1-x0)/2, ry=(y1-y0)/2;
      ctx.beginPath();ctx.ellipse(x0+rx,y0+ry,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2);ctx.stroke();break;
    }
  }
  ctx.restore(); if(!preview) ctx.setLineDash([]);
}

// ─── 14. FLOOD FILL ──────────────────────────────
function floodFill(startX,startY,fillHex) {
  beginEdit(); const T=28;
  const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
  const data=imgData.data, W=canvas.width, H=canvas.height;
  const si=(startX+startY*W)*4;
  const tR=data[si],tG=data[si+1],tB=data[si+2],tA=data[si+3];
  const fR=parseInt(fillHex.slice(1,3),16),fG=parseInt(fillHex.slice(3,5),16),fB=parseInt(fillHex.slice(5,7),16);
  if(fR===tR&&fG===tG&&fB===tB&&255===tA) return;
  const stack=[startX+startY*W], visited=new Uint8Array(W*H);
  while(stack.length) {
    const pos=stack.pop(); if(visited[pos]) continue; visited[pos]=1;
    const i=pos*4;
    if(Math.abs(data[i]-tR)>T||Math.abs(data[i+1]-tG)>T||Math.abs(data[i+2]-tB)>T||Math.abs(data[i+3]-tA)>T) continue;
    data[i]=fR;data[i+1]=fG;data[i+2]=fB;data[i+3]=255;
    const x=pos%W,y=~~(pos/W);
    if(x>0)stack.push(pos-1); if(x<W-1)stack.push(pos+1);
    if(y>0)stack.push(pos-W); if(y<H-1)stack.push(pos+W);
  }
  ctx.putImageData(imgData,0,0); commitEdit();
}

// ─── 15. PICK COLOR ──────────────────────────────
function pickColor(x,y) {
  const p=ctx.getImageData(~~x,~~y,1,1).data;
  setColor("#"+[p[0],p[1],p[2]].map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase());
}

// ─── 16. TEXT ────────────────────────────────────
function placeText() {
  const text=(document.getElementById("text-val").value||"").trim();
  const size=parseInt(document.getElementById("text-size").value)||28;
  const pos=state.textPendingPos;
  if(!text||!pos) { closeModal("modal-text"); return; }
  beginEdit();
  ctx.save();
  ctx.font=`${size}px 'Segoe UI',Arial,sans-serif`;
  ctx.fillStyle=state.brushColor;
  ctx.globalAlpha=state.brushOpacity/100;
  ctx.fillText(text,pos.x,pos.y);
  ctx.restore();
  commitEdit(); redrawCanvas(); state.textPendingPos=null;
  document.getElementById("text-val").value="";
  closeModal("modal-text");
}

// ─── 17. ZOOM ────────────────────────────────────
function applyZoom(delta) {
  state.zoomLevel=Math.min(12,Math.max(0.05,state.zoomLevel+delta));
  const wrap=document.getElementById("canvas-wrap");
  wrap.style.transform=`scale(${state.zoomLevel})`;
  wrap.style.transformOrigin="top left";
  document.getElementById("zoom-display").textContent=Math.round(state.zoomLevel*100)+"%";
}

function resetZoom() {
  const vp=document.getElementById("canvas-viewport");
  const s=Math.max(0.05,Math.min((vp.clientWidth-40)/canvas.width,(vp.clientHeight-40)/canvas.height,1));
  state.zoomLevel=s;
  const wrap=document.getElementById("canvas-wrap");
  wrap.style.transform=`scale(${s})`;
  wrap.style.transformOrigin="top left";
  document.getElementById("zoom-display").textContent=Math.round(s*100)+"%";
}

document.getElementById("canvas-viewport").addEventListener("wheel",e=>{
  if(!e.ctrlKey&&!e.metaKey) return;
  e.preventDefault(); applyZoom(e.deltaY<0?0.1:-0.1);
},{passive:false});

// ─── 18. TOOLBAR ─────────────────────────────────
function buildToolbar() {
  const list=document.getElementById("tools-list"); list.innerHTML="";
  TOOLS.forEach(tool=>{
    const btn=document.createElement("button");
    btn.className="tool-btn"+(tool.id===state.activeTool?" active":"");
    btn.dataset.tool=tool.id;
    btn.setAttribute("data-tip",`${tool.label}${tool.key?" ("+tool.key.toUpperCase()+")":""}`);
    btn.innerHTML=`<span>${Icons.get(tool.icon)}</span><span class="tool-btn-lbl">${tool.label}</span>`;
    btn.addEventListener("click",()=>setTool(tool.id));
    list.appendChild(btn);
  });
}

function setTool(id) {
  const prev=state.activeTool;
  if(prev==="seleccionar"&&id!=="seleccionar") commitSelection();
  if(prev==="duplicador"&&id!=="duplicador") commitDup();
  state._prevTool=prev;
  state.activeTool=id;
  const selTools=["seleccionar","duplicador"];
  if(selTools.includes(id)) {
    selCvs.classList.add("sel-active"); canvas.style.pointerEvents="none";
  } else {
    selCvs.classList.remove("sel-active"); canvas.style.pointerEvents="all";
  }
  if(id!=="borrador") document.getElementById("eraser-cursor").style.display="none";
  const cursors={borrador:"none",cuentagotas:"crosshair",relleno:"copy",mover:"grab",zoom:"zoom-in",texto:"text",seleccionar:"crosshair",duplicador:"crosshair",vineta:"cell"};
  canvas.style.cursor=cursors[id]||"crosshair";
  selCvs.style.cursor=cursors[id]||"crosshair";
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===id));
  document.getElementById("tool-name-label").textContent=TOOLS.find(t=>t.id===id)?.label||id;
  buildPropsBar();
}

function buildPropsBar() {
  const cont=document.getElementById("props-bar-content"); cont.innerHTML="";
  const t=state.activeTool;
  const sep=()=>{const d=document.createElement("div");d.className="pb-sep";cont.appendChild(d);};
  const addSlider=(label,id,min,max,val,onInput)=>{
    sep();
    const g=document.createElement("div"); g.className="pb-group";
    const lbl=document.createElement("label"); lbl.textContent=label;
    const num=document.createElement("span"); num.className="pb-num"; num.id=id+"-num"; num.textContent=val;
    const sl=document.createElement("input"); sl.type="range"; sl.min=min; sl.max=max; sl.value=val; sl.id=id+"-sl";
    sl.addEventListener("input",e=>{const v=Number(e.target.value);num.textContent=onInput(v)||v;});
    g.append(lbl,num,sl); cont.appendChild(g);
  };
  const showSize=FREE_TOOLS.includes(t)||SHAPE_TOOLS.includes(t)||t==="estrellas";
  const showOpacity=showSize||t==="relleno";
  if(showSize) addSlider("Grosor","pb-size",1,150,state.brushSize,v=>{state.brushSize=v;return v;});
  if(showOpacity) addSlider("Opacidad","pb-op",1,100,state.brushOpacity,v=>{state.brushOpacity=v;return v+"%";});
  if(t==="estrellas") addSlider("Densidad","pb-density",1,8,state.starDensity,v=>{state.starDensity=v;return v;});
  if(t==="organico") addSlider("Intensidad","pb-intensity",0,100,state.organicIntensity,v=>{state.organicIntensity=v;return v;});
  if(t==="texto") {
    sep();
    const g=document.createElement("div"); g.className="pb-group";
    const lbl=document.createElement("label"); lbl.textContent="Tamaño";
    const inp=document.createElement("input"); inp.type="number"; inp.min=8; inp.max=300; inp.value=28; inp.id="pb-fontsize";
    g.append(lbl,inp); cont.appendChild(g);
  }
  if(t==="seleccionar") {
    sep();
    const note=document.createElement("span"); note.style.cssText="font-size:11px;color:var(--text2);";
    note.textContent="Arrastra → selecciona · Mueve dentro · Clic fuera = confirmar";
    cont.appendChild(note);
  }
  if(t==="duplicador") {
    sep();
    const note=document.createElement("span"); note.style.cssText="font-size:11px;color:var(--text2);";
    note.textContent="Arrastra → copia · Mueve la copia · Clic fuera = confirmar";
    cont.appendChild(note);
  }
  if(t==="vineta") {
    sep();
    const btn=document.createElement("button"); btn.className="btn-primary"; btn.style.cssText="padding:4px 12px;font-size:11px;";
    btn.textContent="Insertar viñeta o globo";
    btn.addEventListener("click",()=>openModal("modal-vinetas"));
    cont.appendChild(btn);
  }
}

// ─── 19. COLORS ──────────────────────────────────
const SWATCHES=[
  "#B8A7E8","#9B87D4","#7B67C0","#5A4898",
  "#F3B6CE","#E890B0","#D06090","#C040A0",
  "#A9D8F2","#78B8E0","#5098C8","#3070A8",
  "#B8E3D2","#80C8A8","#50A880","#308860",
  "#F8DFA6","#F0C060","#D8A030","#C08020",
  "#F5C6A5","#E8A070","#D07840","#B05820",
  "#FF6B6B","#FF4040","#CC0000","#880000",
  "#FFFFFF","#DDDDDD","#888888","#000000",
];

function buildSwatches() {
  const grid=document.getElementById("color-swatches-grid"); grid.innerHTML="";
  SWATCHES.forEach(c=>{
    const sw=document.createElement("div");
    sw.className="color-sw"; sw.style.backgroundColor=c; sw.title=c;
    sw.addEventListener("click",()=>setColor(c));
    grid.appendChild(sw);
  });
}

function addRecentColor(hex) {
  if(!hex) return;
  state.recentColors=state.recentColors.filter(c=>c!==hex);
  state.recentColors.unshift(hex);
  if(state.recentColors.length>8) state.recentColors.pop();
  buildRecentColors();
}

function buildRecentColors() {
  const row=document.getElementById("recent-swatches"); if(!row) return;
  row.innerHTML="";
  state.recentColors.forEach(c=>{
    const sw=document.createElement("div");
    sw.className="color-sw recent-sw"; sw.style.backgroundColor=c; sw.title=c;
    sw.addEventListener("click",()=>setColor(c));
    row.appendChild(sw);
  });
}

function setColor(hex) {
  if(!hex.startsWith("#")) hex="#"+hex;
  hex=hex.toUpperCase();
  if(!/^#[0-9A-F]{6}$/.test(hex)) return;
  state.brushColor=hex;
  const fg=document.getElementById("color-fg-swatch"); if(fg) fg.style.backgroundColor=hex;
  const nat=document.getElementById("color-native"); if(nat) nat.value=hex;
  const hi=document.getElementById("hex-input"); if(hi) hi.value=hex.replace("#","");
  const fp=document.getElementById("full-color-picker"); if(fp) fp.value=hex;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const rr=document.getElementById("rgb-r"),rg=document.getElementById("rgb-g"),rb=document.getElementById("rgb-b");
  if(rr) rr.value=r; if(rg) rg.value=g; if(rb) rb.value=b;
  document.querySelectorAll(".color-sw").forEach(sw=>sw.classList.toggle("active",sw.title===hex));
  addRecentColor(hex);
}

function rgbToHex(r,g,b) {
  return "#"+[r,g,b].map(v=>Math.min(255,Math.max(0,~~v)).toString(16).padStart(2,"0")).join("").toUpperCase();
}

function applyHexInput() {
  const raw=document.getElementById("hex-input").value.replace("#","").trim();
  if(/^[0-9A-Fa-f]{6}$/.test(raw)) setColor("#"+raw);
}

function initColors() {
  buildSwatches(); buildRecentColors(); setColor(state.brushColor);
  document.getElementById("color-fg-swatch").addEventListener("click",()=>document.getElementById("color-native").click());
  document.getElementById("color-native").addEventListener("input",e=>setColor(e.target.value));
  document.getElementById("full-color-picker").addEventListener("input",e=>setColor(e.target.value));
  document.getElementById("btn-open-picker").addEventListener("click",()=>document.getElementById("full-color-picker").click());
  document.getElementById("btn-hex-ok").addEventListener("click",applyHexInput);
  document.getElementById("hex-input").addEventListener("keydown",e=>{if(e.key==="Enter") applyHexInput();});
  ["rgb-r","rgb-g","rgb-b"].forEach(id=>{
    document.getElementById(id).addEventListener("change",()=>{
      const r=parseInt(document.getElementById("rgb-r").value)||0;
      const g=parseInt(document.getElementById("rgb-g").value)||0;
      const b=parseInt(document.getElementById("rgb-b").value)||0;
      setColor(rgbToHex(r,g,b));
    });
  });
}

// ─── 20. COLOR GUIDE ─────────────────────────────
const COLOR_GUIDE={
  "Primarios":[{name:"Rojo",hex:"#FF0000"},{name:"Amarillo",hex:"#FFFF00"},{name:"Azul",hex:"#0000FF"}],
  "Secundarios":[{name:"Verde",hex:"#00CC44"},{name:"Naranja",hex:"#FF8800"},{name:"Violeta",hex:"#8800CC"}],
  "Terciarios":[{name:"Rojo-Naranja",hex:"#FF4400"},{name:"Amarillo-Naranja",hex:"#FFAA00"},{name:"Amarillo-Verde",hex:"#AACC00"},{name:"Azul-Verde",hex:"#00CCAA"},{name:"Azul-Violeta",hex:"#4400FF"},{name:"Rojo-Violeta",hex:"#CC0088"}],
  "Complementarios":[{name:"Rojo",hex:"#FF0000"},{name:"Cyan",hex:"#00FFFF"},{name:"Amarillo",hex:"#FFFF00"},{name:"Violeta",hex:"#8800FF"},{name:"Azul",hex:"#0000FF"},{name:"Naranja",hex:"#FF8800"}],
  "Análogos":[{name:"Rojo",hex:"#FF0000"},{name:"Naranja",hex:"#FF6600"},{name:"Amarillo",hex:"#FFCC00"},{name:"Amarillo-Verde",hex:"#AACC00"},{name:"Verde",hex:"#00CC44"},{name:"Azul-Verde",hex:"#00CCAA"}],
  "Triádicos":[{name:"Rojo",hex:"#FF0000"},{name:"Amarillo",hex:"#FFFF00"},{name:"Azul",hex:"#0000FF"},{name:"Cian",hex:"#00FFFF"},{name:"Magenta",hex:"#FF00FF"},{name:"Verde lima",hex:"#88FF00"}],
  "Cálidos":[{name:"Rojo oscuro",hex:"#8B0000"},{name:"Rojo",hex:"#FF0000"},{name:"Naranja rojizo",hex:"#FF4500"},{name:"Naranja",hex:"#FF8C00"},{name:"Dorado",hex:"#FFD700"},{name:"Amarillo suave",hex:"#FFEC8B"}],
  "Fríos":[{name:"Azul marino",hex:"#000080"},{name:"Azul",hex:"#0000FF"},{name:"Azul cielo",hex:"#87CEEB"},{name:"Cian",hex:"#00FFFF"},{name:"Verde agua",hex:"#00CED1"},{name:"Lavanda",hex:"#B8A7E8"}],
};

function buildColorGuide() {
  const cont=document.getElementById("color-guide-content"); if(!cont) return;
  cont.innerHTML="";
  for(const[section,colors] of Object.entries(COLOR_GUIDE)) {
    const sec=document.createElement("div"); sec.className="cg-section";
    const title=document.createElement("div"); title.className="cg-title"; title.textContent=section;
    sec.appendChild(title);
    const row=document.createElement("div"); row.className="cg-row";
    colors.forEach(c=>{
      const item=document.createElement("div"); item.className="cg-item";
      const sw=document.createElement("div"); sw.className="cg-swatch"; sw.style.backgroundColor=c.hex; sw.title=c.name+" "+c.hex;
      sw.addEventListener("click",()=>{setColor(c.hex);closeModal("modal-color-guide");});
      const lbl=document.createElement("span"); lbl.className="cg-lbl"; lbl.textContent=c.name;
      item.append(sw,lbl); row.appendChild(item);
    });
    sec.appendChild(row); cont.appendChild(sec);
  }
}

function initColorGuideBtn() {
  document.getElementById("btn-color-guide").addEventListener("click",()=>openModal("modal-color-guide"));
}

// ─── 21. LAYERS ──────────────────────────────────
function activeLayer(){return state.layers.find(l=>l.id===state.activeLayerId);}

function buildLayersList() {
  const list=document.getElementById("layers-list"); list.innerHTML="";
  [...state.layers].reverse().forEach(layer=>{
    const item=document.createElement("div");
    item.className="layer-item"+(layer.id===state.activeLayerId?" active":"")+(layer.butter?" butter-layer":"");
    const row=document.createElement("div"); row.className="layer-row";
    const vis=document.createElement("button"); vis.className="layer-vis"+(layer.visible?"":" hidden-eye");
    vis.innerHTML=Icons.get(layer.visible?"eye":"eyeoff");
    vis.addEventListener("click",e=>{e.stopPropagation();layer.visible=!layer.visible;redrawCanvas();buildLayersList();});
    const nameField=document.createElement("input"); nameField.type="text"; nameField.className="layer-name-field"; nameField.value=layer.name;
    nameField.addEventListener("click",e=>e.stopPropagation());
    nameField.addEventListener("change",e=>{layer.name=e.target.value;});
    const lockBtn=document.createElement("button"); lockBtn.className="layer-lock"+(layer.locked?" locked":"");
    lockBtn.innerHTML=Icons.get(layer.locked?"lock":"unlock");
    lockBtn.addEventListener("click",e=>{e.stopPropagation();layer.locked=!layer.locked;buildLayersList();});
    row.append(vis,nameField,lockBtn); item.appendChild(row);
    if(layer.id===state.activeLayerId) {
      const opRow=document.createElement("div"); opRow.className="layer-opacity-row";
      const opLbl=document.createElement("span"); opLbl.className="op-lbl"; opLbl.textContent=layer.opacity+"%";
      const opSl=document.createElement("input"); opSl.type="range"; opSl.min=0; opSl.max=100; opSl.value=layer.opacity;
      opSl.addEventListener("click",e=>e.stopPropagation());
      opSl.addEventListener("input",e=>{layer.opacity=Number(e.target.value);opLbl.textContent=layer.opacity+"%";redrawCanvas();});
      opRow.append(opLbl,opSl); item.appendChild(opRow);
    }
    item.addEventListener("click",()=>{state.activeLayerId=layer.id;redrawCanvas();buildLayersList();});
    list.appendChild(item);
  });
}

function addLayer() {
  const id="lyr-"+Date.now();
  state.layers.push({id,name:"Capa "+(state.layers.length+1),visible:true,locked:false,opacity:100});
  state.activeLayerId=id; redrawCanvas();
  saveLayerData(); buildLayersList();
}

function addButterLayer() {
  const id="butter-"+Date.now();
  state.layers.push({id,name:"Mantequilla",visible:true,locked:false,opacity:50,butter:true});
  state.activeLayerId=id; redrawCanvas();
  saveLayerData(); buildLayersList();
}

function deleteActiveLayer() {
  if(state.layers.length===1) { alert("No puedes eliminar la última capa."); return; }
  const id=state.activeLayerId;
  state.layers=state.layers.filter(l=>l.id!==id);
  Object.keys(state.canvasData).forEach(fid=>delete state.canvasData[fid][id]);
  state.activeLayerId=state.layers[state.layers.length-1].id;
  redrawCanvas(); buildLayersList();
}

function duplicateActiveLayer() {
  const orig=state.layers.find(l=>l.id===state.activeLayerId); if(!orig) return;
  const id="lyr-"+Date.now();
  state.layers.push({...orig,id,name:orig.name+" copia"});
  Object.keys(state.canvasData).forEach(fid=>{
    if(state.canvasData[fid]&&state.canvasData[fid][orig.id]) {
      const src=state.canvasData[fid][orig.id];
      state.canvasData[fid][id]=new ImageData(new Uint8ClampedArray(src.data),src.width,src.height);
    }
  });
  state.activeLayerId=id; buildLayersList();
}

function moveLayer(dir) {
  const idx=state.layers.findIndex(l=>l.id===state.activeLayerId);
  const to=idx+dir; if(to<0||to>=state.layers.length) return;
  [state.layers[idx],state.layers[to]]=[state.layers[to],state.layers[idx]];
  redrawCanvas(); buildLayersList();
}

function initLayers() {
  document.getElementById("btn-add-layer").addEventListener("click",addLayer);
  document.getElementById("btn-add-butter").addEventListener("click",addButterLayer);
  document.getElementById("btn-layer-del").addEventListener("click",deleteActiveLayer);
  document.getElementById("btn-layer-dup").addEventListener("click",duplicateActiveLayer);
  document.getElementById("btn-layer-up").addEventListener("click",()=>moveLayer(1));
  document.getElementById("btn-layer-dn").addEventListener("click",()=>moveLayer(-1));
}

// ─── 22. TIMELINE ────────────────────────────────
let playInterval=null;

function buildTimeline() {
  const strip=document.getElementById("frames-strip"); strip.innerHTML="";
  state.frames.forEach((frame,i)=>{
    const cell=document.createElement("button");
    cell.className="frame-cell"+(frame.id===state.activeFrameId?" active":"");
    cell.textContent=i+1; cell.title=`Fotograma ${i+1} — doble clic=eliminar`;
    cell.addEventListener("click",()=>selectFrame(frame.id));
    cell.addEventListener("dblclick",e=>{e.stopPropagation();deleteFrame(frame.id);});
    strip.appendChild(cell);
  });
  const addBtn=document.createElement("button");
  addBtn.id="btn-add-frame"; addBtn.textContent="+"; addBtn.title="Agregar fotograma";
  addBtn.addEventListener("click",addFrame);
  strip.appendChild(addBtn);
  document.getElementById("frame-counter").textContent=`${frameIdx()+1}/${state.frames.length}`;
  updateTlBtns();
}

function frameIdx(){return state.frames.findIndex(f=>f.id===state.activeFrameId);}

function selectFrame(id) {
  if(state.sel.active||state.sel.drawing) commitSelection();
  if(state.dup.active||state.dup.drawing) commitDup();
  state.activeFrameId=id; redrawCanvas(); renderOnionSkin(); buildTimeline();
}

function addFrame() {
  const id="frm-"+Date.now(); state.frames.push({id});
  state.activeFrameId=id; redrawCanvas();
  buildTimeline(); renderOnionSkin();
}

function deleteFrame(id) {
  if(state.frames.length===1) return;
  const idx=state.frames.findIndex(f=>f.id===id);
  state.frames=state.frames.filter(f=>f.id!==id);
  delete state.canvasData[id];
  selectFrame(state.frames[Math.max(0,idx-1)].id);
}

function duplicateFrame() {
  const id="frm-"+Date.now(); const idx=frameIdx();
  state.frames.splice(idx+1,0,{id});
  const orig=state.canvasData[state.activeFrameId];
  if(orig) {
    state.canvasData[id]={};
    Object.entries(orig).forEach(([lid,imgData])=>{
      state.canvasData[id][lid]=new ImageData(new Uint8ClampedArray(imgData.data),imgData.width,imgData.height);
    });
  }
  selectFrame(id);
}

function stopPlayback() {
  state.isPlaying=false; clearInterval(playInterval);
  const btn=document.getElementById("tl-play");
  btn.innerHTML=Icons.get("play"); btn.classList.remove("playing");
}

function startPlayback() {
  state.isPlaying=true;
  const btn=document.getElementById("tl-play");
  btn.innerHTML=Icons.get("pause"); btn.classList.add("playing");
  playInterval=setInterval(()=>{
    const next=(frameIdx()+1)%state.frames.length;
    state.activeFrameId=state.frames[next].id;
    redrawCanvas(); buildTimeline();
  },1000/state.fps);
}

function updateTlBtns() {
  const idx=frameIdx(), last=state.frames.length-1;
  document.getElementById("tl-first").disabled=idx===0;
  document.getElementById("tl-prev").disabled=idx===0;
  document.getElementById("tl-next").disabled=idx===last;
  document.getElementById("tl-last").disabled=idx===last;
}

function initTimeline() {
  document.getElementById("tl-play").addEventListener("click",()=>state.isPlaying?stopPlayback():startPlayback());
  document.getElementById("tl-first").addEventListener("click",()=>selectFrame(state.frames[0].id));
  document.getElementById("tl-last").addEventListener("click",()=>selectFrame(state.frames[state.frames.length-1].id));
  document.getElementById("tl-prev").addEventListener("click",()=>{const i=frameIdx();if(i>0)selectFrame(state.frames[i-1].id);});
  document.getElementById("tl-next").addEventListener("click",()=>{const i=frameIdx();if(i<state.frames.length-1)selectFrame(state.frames[i+1].id);});
  document.getElementById("tl-dup").addEventListener("click",duplicateFrame);
  document.getElementById("tl-del-frame").addEventListener("click",()=>deleteFrame(state.activeFrameId));
  document.getElementById("fps-select").addEventListener("change",e=>{
    state.fps=Number(e.target.value);
    if(state.isPlaying) { stopPlayback(); startPlayback(); }
  });
}

// ─── 23. ONION SKIN ──────────────────────────────
const onion={enabled:false,prevFrames:1,nextFrames:0,opacity:40};

function renderOnionSkin() {
  syncOverlaySize();
  onionCtx.clearRect(0,0,onionCvs.width,onionCvs.height);
  if(!onion.enabled||state.isPlaying) return;
  const curIdx=frameIdx(), base=onion.opacity/100;
  function renderOFrame(fIdx,alpha,isPrev) {
    if(fIdx<0||fIdx>=state.frames.length) return;
    const fd=state.canvasData[state.frames[fIdx].id]; if(!fd) return;
    const tmp=document.createElement("canvas"); tmp.width=onionCvs.width; tmp.height=onionCvs.height;
    const tc=tmp.getContext("2d");
    state.layers.forEach(layer=>{
      if(!layer.visible) return;
      const imgData=fd[layer.id]; if(!imgData) return;
      const off=document.createElement("canvas"); off.width=tmp.width; off.height=tmp.height;
      off.getContext("2d").putImageData(imgData,0,0);
      tc.save(); tc.globalAlpha=layer.opacity/100; tc.drawImage(off,0,0); tc.restore();
    });
    onionCtx.save();
    onionCtx.globalAlpha=alpha; onionCtx.drawImage(tmp,0,0);
    onionCtx.globalCompositeOperation="source-atop";
    onionCtx.globalAlpha=alpha*0.35;
    onionCtx.fillStyle=isPrev?"rgba(80,120,255,1)":"rgba(255,80,80,1)";
    onionCtx.fillRect(0,0,onionCvs.width,onionCvs.height);
    onionCtx.restore();
  }
  for(let i=1;i<=onion.prevFrames;i++) renderOFrame(curIdx-i,base*Math.pow(0.65,i-1),true);
  for(let i=1;i<=onion.nextFrames;i++) renderOFrame(curIdx+i,base*Math.pow(0.65,i-1)*0.8,false);
}

function initOnionSkin() {
  const panel=document.getElementById("onion-panel");
  const controls=document.getElementById("onion-controls");
  document.getElementById("btn-onion-toggle").addEventListener("click",()=>panel.classList.toggle("hidden"));
  document.getElementById("onion-enabled").addEventListener("change",e=>{
    onion.enabled=e.target.checked;
    controls.classList.toggle("onion-off",!onion.enabled);
    renderOnionSkin();
  });
  document.getElementById("onion-opacity-sl").addEventListener("input",e=>{
    onion.opacity=Number(e.target.value);
    document.getElementById("onion-opacity-val").textContent=onion.opacity+"%";
    renderOnionSkin();
  });
  document.getElementById("onion-prev-btns").addEventListener("click",e=>{
    if(!e.target.classList.contains("step-btn")) return;
    onion.prevFrames=Number(e.target.dataset.val);
    e.target.closest(".onion-steps").querySelectorAll(".step-btn").forEach(b=>b.classList.toggle("active",b.dataset.val==onion.prevFrames));
    renderOnionSkin();
  });
  document.getElementById("onion-next-btns").addEventListener("click",e=>{
    if(!e.target.classList.contains("step-btn")) return;
    onion.nextFrames=Number(e.target.dataset.val);
    e.target.closest(".onion-steps").querySelectorAll(".step-btn").forEach(b=>b.classList.toggle("active",b.dataset.val==onion.nextFrames));
    renderOnionSkin();
  });
}

// ─── 24. EXPAND CANVAS ───────────────────────────
function expandCanvas(top,right,bottom,left) {
  const newW=canvas.width+left+right, newH=canvas.height+top+bottom;
  Object.keys(state.canvasData).forEach(fid=>{
    const fd=state.canvasData[fid];
    Object.keys(fd).forEach(lid=>{
      const old=fd[lid], nd=new ImageData(newW,newH);
      for(let row=0;row<old.height;row++) {
        const srcStart=row*old.width*4, dstStart=(row+top)*newW*4+left*4;
        nd.data.set(old.data.subarray(srcStart,srcStart+old.width*4),dstStart);
      }
      fd[lid]=nd;
    });
  });
  canvas.width=newW; canvas.height=newH;
  onionCvs.width=newW; onionCvs.height=newH;
  selCvs.width=newW; selCvs.height=newH;
  redrawCanvas(); pushHistory(); requestAnimationFrame(resetZoom);
}

// ─── 25. THEME SYSTEM ────────────────────────────
let themeMode="light";

function setTheme(mode) {
  themeMode=mode;
  if(mode==="light"||mode==="dark") { document.body.className="theme-"+mode; clearCustomVars(); }
  document.querySelectorAll("input[name='theme-radio']").forEach(r=>r.checked=r.value===mode);
  document.getElementById("custom-theme-fields").classList.toggle("hidden",mode!=="custom");
  localStorage.setItem("laz-theme",mode);
}

function clearCustomVars() {
  ["--bg","--panel","--navbar","--sidebar","--border","--primary","--primary-dk","--secondary","--font-display"]
    .forEach(v=>document.documentElement.style.removeProperty(v));
}

function applyCustomTheme(vars) {
  document.body.className=""; clearCustomVars();
  if(vars.primary) {
    document.documentElement.style.setProperty("--primary",vars.primary);
    document.documentElement.style.setProperty("--primary-dk",shadeHex(vars.primary,-30));
  }
  if(vars.secondary) document.documentElement.style.setProperty("--secondary",vars.secondary);
  if(vars.bg) document.documentElement.style.setProperty("--bg",vars.bg);
  if(vars.panel) {
    document.documentElement.style.setProperty("--panel",vars.panel);
    document.documentElement.style.setProperty("--navbar",vars.panel);
    document.documentElement.style.setProperty("--sidebar",vars.panel);
  }
  if(vars.font) document.documentElement.style.setProperty("--font-display",vars.font);
  themeMode="custom";
  document.querySelectorAll("input[name='theme-radio']").forEach(r=>r.checked=r.value==="custom");
  document.getElementById("custom-theme-fields").classList.remove("hidden");
  localStorage.setItem("laz-theme","custom");
  localStorage.setItem("laz-theme-custom",JSON.stringify(vars));
}

function shadeHex(hex,amount) {
  const r=Math.min(255,Math.max(0,parseInt(hex.slice(1,3),16)+amount));
  const g=Math.min(255,Math.max(0,parseInt(hex.slice(3,5),16)+amount));
  const b=Math.min(255,Math.max(0,parseInt(hex.slice(5,7),16)+amount));
  return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
}

function loadSavedTheme() {
  const saved=localStorage.getItem("laz-theme")||"light";
  if(saved==="custom") {
    const vars=JSON.parse(localStorage.getItem("laz-theme-custom")||"{}");
    applyCustomTheme(vars);
  } else { setTheme(saved); }
}

function initThemeSystem() {
  loadSavedTheme();
  document.querySelectorAll("input[name='theme-radio']").forEach(radio=>{
    radio.addEventListener("change",e=>{
      const val=e.target.value;
      if(val==="custom") {
        document.getElementById("custom-theme-fields").classList.remove("hidden");
        const saved=JSON.parse(localStorage.getItem("laz-theme-custom")||"{}");
        if(saved.primary){document.getElementById("t-primary-pick").value=saved.primary;document.getElementById("t-primary-hex").value=saved.primary.replace("#","");}
        if(saved.secondary){document.getElementById("t-secondary-pick").value=saved.secondary;document.getElementById("t-secondary-hex").value=saved.secondary.replace("#","");}
        if(saved.bg){document.getElementById("t-bg-pick").value=saved.bg;document.getElementById("t-bg-hex").value=saved.bg.replace("#","");}
        if(saved.panel){document.getElementById("t-panel-pick").value=saved.panel;document.getElementById("t-panel-hex").value=saved.panel.replace("#","");}
      } else {
        document.getElementById("custom-theme-fields").classList.add("hidden");
        setTheme(val);
      }
    });
  });
  [["t-primary"],["t-secondary"],["t-bg"],["t-panel"]].forEach(([pfx])=>{
    const pick=document.getElementById(pfx+"-pick");
    const hex=document.getElementById(pfx+"-hex");
    if(!pick||!hex) return;
    pick.addEventListener("input",e=>{hex.value=e.target.value.replace("#","").toUpperCase();});
    hex.addEventListener("change",e=>{if(/^[0-9A-Fa-f]{6}$/.test(e.target.value)) pick.value="#"+e.target.value;});
  });
  document.getElementById("btn-theme-apply").addEventListener("click",()=>{
    applyCustomTheme({
      primary:document.getElementById("t-primary-pick").value,
      secondary:document.getElementById("t-secondary-pick").value,
      bg:document.getElementById("t-bg-pick").value,
      panel:document.getElementById("t-panel-pick").value,
      font:state.customFont||"'Times New Roman', Times, serif"
    });
  });
  document.getElementById("btn-theme-reset").addEventListener("click",()=>{
    localStorage.removeItem("laz-theme-custom"); localStorage.removeItem("laz-font");
    setTheme("light");
    document.querySelectorAll("input[name='theme-radio']").forEach(r=>r.checked=r.value==="light");
    document.getElementById("custom-theme-fields").classList.add("hidden");
  });
}

// ─── 26. FONT PICKER ─────────────────────────────
const FONTS=[
  {name:"Times New Roman",    css:"'Times New Roman', Times, serif"},
  {name:"Georgia",            css:"Georgia, 'Times New Roman', serif"},
  {name:"Palatino Linotype",  css:"'Palatino Linotype', Palatino, serif"},
  {name:"Garamond",           css:"Garamond, serif"},
  {name:"Baskerville",        css:"Baskerville, 'Baskerville Old Face', serif"},
  {name:"Segoe UI",           css:"'Segoe UI', system-ui, sans-serif"},
  {name:"Inter",              css:"Inter, 'Helvetica Neue', sans-serif"},
  {name:"Verdana",            css:"Verdana, Geneva, sans-serif"},
  {name:"Trebuchet MS",       css:"'Trebuchet MS', 'Lucida Grande', sans-serif"},
  {name:"Century Gothic",     css:"'Century Gothic', 'Apple Gothic', sans-serif"},
  {name:"Tahoma",             css:"Tahoma, Geneva, sans-serif"},
  {name:"Courier New",        css:"'Courier New', Courier, monospace"},
  {name:"Lucida Console",     css:"'Lucida Console', Monaco, monospace"},
  {name:"Lucida Handwriting", css:"'Lucida Handwriting', cursive"},
  {name:"Comic Sans MS",      css:"'Comic Sans MS', cursive"},
];

function buildFontPicker() {
  const grid=document.getElementById("font-picker-grid"); if(!grid) return;
  grid.innerHTML="";
  const saved=localStorage.getItem("laz-font")||null;
  FONTS.forEach(f=>{
    const btn=document.createElement("button");
    btn.className="font-opt"+(state.customFont===f.css||saved===f.css?" active":"");
    btn.style.fontFamily=f.css;
    btn.innerHTML=`<span class="font-name" style="font-family:var(--font-ui)">${f.name}</span><span class="font-preview">Lazurik — Dibuja · Anima</span>`;
    btn.addEventListener("click",()=>{
      state.customFont=f.css;
      grid.querySelectorAll(".font-opt").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.documentElement.style.setProperty("--font-display",f.css);
      localStorage.setItem("laz-font",f.css);
    });
    grid.appendChild(btn);
  });
  if(saved) { state.customFont=saved; document.documentElement.style.setProperty("--font-display",saved); }
}

// ─── 27. VINETAS ─────────────────────────────────
let selectedVineta=null;

function initVinetas() {
  let currentVinetaType="panel-rect";
  document.querySelectorAll(".vineta-type-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".vineta-type-btn").forEach(b=>b.classList.remove("selected","active"));
      btn.classList.add("selected","active");
      currentVinetaType=btn.dataset.type;
      const textField=document.getElementById("vineta-text-field");
      textField.style.display=currentVinetaType.startsWith("panel")?"none":"block";
    });
  });
  document.getElementById("btn-vineta-insert").addEventListener("click",()=>{
    const text=document.getElementById("vineta-text-input").value||"Texto...";
    createVineta(currentVinetaType,text);
    closeModal("modal-vinetas");
    document.getElementById("vineta-text-input").value="";
  });
}

function createVineta(type,text) {
  const id="vin-"+Date.now();
  const wrap=document.getElementById("canvas-wrap");
  const isPanel=type.startsWith("panel");
  const w=isPanel?220:180, h=isPanel?160:100;
  const cw=canvas.width*state.zoomLevel, ch=canvas.height*state.zoomLevel;
  const vx=Math.max(0,(cw/2-w/2)), vy=Math.max(0,(ch/2-h/2));
  const el=document.createElement("div");
  el.className="vineta-overlay vineta-"+type;
  el.dataset.id=id;
  el.style.left=vx+"px"; el.style.top=vy+"px";
  el.style.width=w+"px"; el.style.height=h+"px";
  if(!isPanel) {
    const textEl=document.createElement("div");
    textEl.className="vineta-text"; textEl.contentEditable="true";
    textEl.textContent=text;
    el.appendChild(textEl);
  }
  const delBtn=document.createElement("button"); delBtn.className="vineta-del-btn"; delBtn.textContent="✕";
  delBtn.addEventListener("click",e=>{e.stopPropagation();removeVineta(id);});
  el.appendChild(delBtn);
  const resHandle=document.createElement("div"); resHandle.className="vineta-resize-handle";
  el.appendChild(resHandle);
  makeDraggable(el);
  makeResizable(el,resHandle);
  wrap.appendChild(el);
  state.vinetas.push({id,type,element:el});
}

function removeVineta(id) {
  const v=state.vinetas.find(v=>v.id===id);
  if(v) { v.element.remove(); state.vinetas=state.vinetas.filter(v=>v.id!==id); }
}

function makeDraggable(el) {
  let startX,startY,startLeft,startTop;
  el.addEventListener("mousedown",e=>{
    if(e.target.classList.contains("vineta-del-btn")||e.target.classList.contains("vineta-text")||e.target.classList.contains("vineta-resize-handle")) return;
    startX=e.clientX; startY=e.clientY;
    startLeft=parseInt(el.style.left)||0; startTop=parseInt(el.style.top)||0;
    const onMove=e=>{el.style.left=(startLeft+e.clientX-startX)+"px";el.style.top=(startTop+e.clientY-startY)+"px";};
    const onUp=()=>{document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);};
    document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp);
    e.stopPropagation();
  });
}

function makeResizable(el,handle) {
  let startX,startY,startW,startH;
  handle.addEventListener("mousedown",e=>{
    startX=e.clientX; startY=e.clientY;
    startW=parseInt(el.style.width)||100; startH=parseInt(el.style.height)||60;
    const onMove=e=>{
      el.style.width=Math.max(60,startW+e.clientX-startX)+"px";
      el.style.height=Math.max(40,startH+e.clientY-startY)+"px";
    };
    const onUp=()=>{document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);};
    document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp);
    e.stopPropagation();
  });
}

// ─── 28. MODALS & MENUS ──────────────────────────
function openModal(id){document.getElementById(id)?.classList.remove("hidden");}
function closeModal(id){document.getElementById(id)?.classList.add("hidden");}

function initMenus() {
  document.querySelectorAll(".menu-item").forEach(item=>{
    item.addEventListener("click",e=>{
      const wasOpen=item.classList.contains("open");
      closeAllMenus();
      if(!wasOpen) item.classList.add("open");
      e.stopPropagation();
    });
  });
  document.addEventListener("click",closeAllMenus);
  document.querySelectorAll(".dropdown button[data-action]").forEach(btn=>{
    btn.addEventListener("click",e=>{e.stopPropagation();handleAction(btn.dataset.action);closeAllMenus();});
  });
  document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.dataset.close)));
  document.querySelectorAll(".preset-btn:not(.vineta-type-btn)").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const pg=btn.closest(".preset-grid"); if(!pg) return;
      pg.querySelectorAll(".preset-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      const box=btn.closest(".modal-box")||btn.closest("#start-screen"); if(!box) return;
      const wIn=box.querySelector("#nuevo-w")||box.querySelector("#sd-w")||box.querySelector("#sa-w")||box.querySelector("[id$='-w']");
      const hIn=box.querySelector("#nuevo-h")||box.querySelector("#sd-h")||box.querySelector("#sa-h")||box.querySelector("[id$='-h']");
      if(wIn) wIn.value=btn.dataset.w; if(hIn) hIn.value=btn.dataset.h;
    });
  });
  document.getElementById("btn-nuevo-apply").addEventListener("click",()=>{
    const w=parseInt(document.getElementById("nuevo-w").value)||800;
    const h=parseInt(document.getElementById("nuevo-h").value)||500;
    state.layers=[{id:"lyr-1",name:"Capa 1",visible:true,locked:false,opacity:100}];
    state.activeLayerId="lyr-1"; state.frames=[{id:"frm-1"}]; state.activeFrameId="frm-1";
    initCanvasSize(w,h); buildLayersList(); buildTimeline();
    closeModal("modal-nuevo"); requestAnimationFrame(resetZoom);
  });
  document.getElementById("btn-prop-apply").addEventListener("click",()=>{
    const w=parseInt(document.getElementById("prop-w").value)||800;
    const h=parseInt(document.getElementById("prop-h").value)||500;
    canvas.width=w; canvas.height=h; onionCvs.width=w; onionCvs.height=h; selCvs.width=w; selCvs.height=h;
    state.canvasData={}; state.history=[]; state.histIdx=-1;
    Engine.reset(); redrawCanvas(); closeModal("modal-props"); requestAnimationFrame(resetZoom);
  });
  document.getElementById("btn-expand-apply").addEventListener("click",()=>{
    const top=Math.max(0,parseInt(document.getElementById("exp-top").value)||0);
    const right=Math.max(0,parseInt(document.getElementById("exp-right").value)||0);
    const bottom=Math.max(0,parseInt(document.getElementById("exp-bottom").value)||0);
    const left=Math.max(0,parseInt(document.getElementById("exp-left").value)||0);
    if(top+right+bottom+left===0){closeModal("modal-expand");return;}
    expandCanvas(top,right,bottom,left); closeModal("modal-expand");
  });
  document.getElementById("btn-text-place").addEventListener("click",placeText);
  document.getElementById("text-val").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey) placeText();});
  document.getElementById("pb-undo").addEventListener("click",undo);
  document.getElementById("pb-redo").addEventListener("click",redo);
  document.getElementById("btn-fullscreen-nav").addEventListener("click",()=>{
    document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  });
  document.getElementById("btn-settings-open").addEventListener("click",()=>openModal("modal-settings"));
  initSettingsModal();
}

function initSettingsModal() {
  document.querySelectorAll(".stab").forEach(tab=>{
    tab.addEventListener("click",()=>{
      document.querySelectorAll(".stab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".stab-panel").forEach(p=>p.classList.add("hidden"));
      tab.classList.add("active");
      document.getElementById("stab-"+tab.dataset.tab)?.classList.remove("hidden");
    });
  });
  const splashCheck=document.getElementById("setting-splash");
  if(splashCheck) {
    splashCheck.checked=localStorage.getItem("laz-skip-splash")!=="1";
    splashCheck.addEventListener("change",e=>{
      localStorage.setItem("laz-skip-splash",e.target.checked?"0":"1");
    });
  }
}

function closeAllMenus(){document.querySelectorAll(".menu-item.open").forEach(m=>m.classList.remove("open"));}

function handleAction(action) {
  switch(action) {
    case"nuevo": openModal("modal-nuevo"); break;
    case"guardar": exportPNG(); break;
    case"guardar-jpg": exportJPG(); break;
    case"deshacer": undo(); break;
    case"rehacer": redo(); break;
    case"limpiar-capa": if(Engine.canEdit()){ beginEdit(); ctx.clearRect(0,0,canvas.width,canvas.height); commitEdit(); redrawCanvas(); } break;
    case"zoom-in": applyZoom(0.25); break;
    case"zoom-out": applyZoom(-0.25); break;
    case"zoom-fit": resetZoom(); break;
    case"fullscreen": document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen(); break;
    case"propiedades": document.getElementById("prop-w").value=canvas.width; document.getElementById("prop-h").value=canvas.height; openModal("modal-props"); break;
    case"expandir": openModal("modal-expand"); break;
    case"fps-menu": {
      const v=prompt("FPS (4/8/12/24/30):",state.fps); const n=parseInt(v);
      if([4,8,12,24,30].includes(n)){state.fps=n;document.getElementById("fps-select").value=n;if(state.isPlaying){stopPlayback();startPlayback();}}
      break;
    }
    case"export-png": exportPNG(); break;
    case"export-jpg": exportJPG(); break;
    case"export-gif": exportGIF(); break;
    case"guardar-proyecto": LazStorage.save(); break;
    case"abrir-proyecto": LazStorage.openFile(); break;
    case"recuperar": LazStorage.recover(); break;
  }
}

// ─── 29. EXPORT ──────────────────────────────────
function exportPNG() {
  const link=document.createElement("a"); link.download="lazurik.png"; link.href=canvas.toDataURL("image/png"); link.click();
}

function exportJPG() {
  const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
  const tc=tmp.getContext("2d"); tc.fillStyle="#FFFFFF"; tc.fillRect(0,0,tmp.width,tmp.height); tc.drawImage(canvas,0,0);
  const link=document.createElement("a"); link.download="lazurik.jpg"; link.href=tmp.toDataURL("image/jpeg",.95); link.click();
}

async function exportGIF() {
  if(typeof GIF==="undefined"){alert("La librería GIF no está disponible. Asegúrate de tener conexión a internet.");return;}
  if(state.frames.length<2){alert("Necesitas al menos 2 fotogramas para exportar GIF.");return;}
  openModal("modal-gif");
  document.getElementById("gif-fill").style.width="0%";
  document.getElementById("gif-msg").textContent="Cargando encoder…";
  let workerUrl;
  try {
    const resp=await fetch("https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js");
    if(!resp.ok) throw new Error("HTTP "+resp.status);
    const text=await resp.text();
    workerUrl=URL.createObjectURL(new Blob([text],{type:"text/javascript"}));
  } catch(err) { closeModal("modal-gif"); alert("No se pudo cargar el encoder GIF.\n"+err.message); return; }
  const delay=Math.round(1000/state.fps), total=state.frames.length;
  const gif=new GIF({workers:2,quality:10,width:canvas.width,height:canvas.height,workerScript:workerUrl,repeat:0,background:"#FFFFFF"});
  state.frames.forEach((frame,i)=>{
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    const tc=tmp.getContext("2d"); tc.fillStyle="#FFFFFF"; tc.fillRect(0,0,tmp.width,tmp.height);
    const fd=state.canvasData[frame.id];
    if(fd) {
      state.layers.forEach(layer=>{
        if(!layer.visible||layer.butter) return;
        const imgData=fd[layer.id]; if(!imgData) return;
        const off=document.createElement("canvas"); off.width=tmp.width; off.height=tmp.height;
        off.getContext("2d").putImageData(imgData,0,0);
        tc.save(); tc.globalAlpha=layer.opacity/100; tc.drawImage(off,0,0); tc.restore();
      });
    }
    gif.addFrame(tmp,{delay});
    document.getElementById("gif-fill").style.width=Math.round((i+1)/total*50)+"%";
    document.getElementById("gif-msg").textContent=`Procesando ${i+1}/${total}…`;
  });
  gif.on("progress",p=>{
    document.getElementById("gif-fill").style.width=(50+Math.round(p*50))+"%";
    document.getElementById("gif-msg").textContent="Codificando… "+Math.round(p*100)+"%";
  });
  gif.on("finished",blob=>{
    URL.revokeObjectURL(workerUrl); closeModal("modal-gif");
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a"); link.download="lazurik.gif"; link.href=url; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  });
  gif.render();
}

// ─── 30. ASSISTANT ───────────────────────────────
const KNOWLEDGE={
  "hola":"¡Hola! Soy **Lazurik** Tu asistente creativo. Pregúntame sobre herramientas, capas, animación, colores, atajos y más.",
  "pincel":"El **Pincel** (B) crea trazos suaves con un ligero brillo. Ajusta grosor y opacidad en la barra de propiedades.",
  "lapiz":"El **Lápiz** (P) crea trazos duros y precisos, ideal para contornos limpios. Sin blur.",
  "lápiz":"El **Lápiz** (P) crea trazos duros y precisos, ideal para contornos limpios.",
  "marcador":"El **Marcador** (M) tiene trazo ancho, semi-transparente y bordes cuadrados. Perfecto para fondos de color.",
  "borrador":"El **Borrador** (E) borra píxeles. Verás un círculo indicador mostrando el tamaño real.",
  "estrellas":"El **Pincel de Estrellas** (W) genera estrellas al dibujar. Controla densidad y grosor en la barra.",
  "organico":"El **Pincel Orgánico** (O) crea trazos irregulares naturales. Controla la intensidad del efecto.",
  "grosor":"El **grosor** se controla con el slider «Grosor» en la barra de propiedades o con **[ ]** en teclado.",
  "capa":"Las **capas** son láminas transparentes apiladas. El botón crea una Capa Mantequilla de referencia.",
  "mantequilla":"La **Capa Mantequilla** es una capa de referencia semitransparente útil para animaciones y bocetos.",
  "anima":"Para **animar**: añade fotogramas con **+**, dibuja en cada uno y pulsa ▶.",
  "animacion":"Para animar: añade fotogramas en el timeline, dibuja diferente en cada uno y pulsa ▶.",
  "animación":"Para animar: añade fotogramas en la línea de tiempo y pulsa ▶.",
  "gif":"Ve a **Exportar → GIF animado**. Necesitas al menos 2 fotogramas. El GIF usa el FPS configurado.",
  "exportar":"Puedes exportar en **PNG**, **JPG** o **GIF animado** desde el menú Exportar.",
  "color":"Usa la paleta, escribe un **HEX** (ej: #FF5733) o valores **RGB**. También abre la Guía de Colores.",
  "guia":"La **Guía de Colores** muestra primarios, secundarios, análogos, cálidos y fríos. Clic en un color para usarlo.",
  "recientes":"Los **colores recientes** aparecen automáticamente arriba de la paleta al usar colores.",
  "hex":"Escribe el código hex sin # en el campo del panel Colores y pulsa OK.",
  "rgb":"El panel Colores tiene campos **R G B** (0–255) para introducir cualquier color exacto.",
  "zoom":"Herramienta Zoom (Z), **Ctrl+Rueda**, o teclas **+** y **-**. Tecla **0** = ajustar.",
  "deshacer":"**Ctrl+Z** deshace · **Ctrl+Y** rehace.",
  "seleccionar":"**Seleccionar** (S): arrastra → selecciona y mueve los píxeles. Clic fuera = confirmar.",
  "duplicador":"**Duplicador** (D): arrastra → selecciona y **crea una copia** que puedes mover. El original no se borra.",
  "duplicar":"El **Duplicador** (D) es diferente a Seleccionar: crea una copia mientras el original permanece.",
  "viñeta":"Usa la herramienta **Viñeta** o el botón en la barra para insertar paneles y globos de cómic.",
  "comic":"Las herramientas de cómic incluyen paneles (rect/redondo) y globos (habla/pensamiento/grito).",
  "cebolla":"**Piel de cebolla** : muestra frames cercanos como referencia. Azul = anteriores · Rojo = siguientes.",
  "tema":"Ve a **Configuración → Apariencia** para cambiar entre Claro, Oscuro o Personalizable.",
  "tipografia":"En Configuración → Personalizable puedes elegir entre **15 tipografías** para los títulos.",
  "atajos":"**Atajos:** B=Pincel · P=Lápiz · M=Marcad. · E=Borrador · W=Estrellas · O=Orgánico\nD=Duplic. · S=Selec. · F=Relleno · T=Texto · L=Línea · R=Rect. · C=Círculo\nCtrl+Z=Deshacer · Ctrl+Y=Rehacer · [ / ]=Grosor · 0=Zoom fit",
  "ayuda":"Puedo ayudarte con: herramientas, capas, animación, piel de cebolla, colores, GIF, temas, atajos y más.",
};

const QUICK_SUGGESTIONS=["¿Cómo uso el pincel?","¿Cómo animo?","Exportar GIF","Atajos de teclado","Piel de cebolla","Herramienta Seleccionar","Duplicador vs Seleccionar","Capa Mantequilla","Guía de colores","Cambiar tema"];

async function getAssistantReply(message) {
  await new Promise(r=>setTimeout(r,60+Math.random()*180));
  const q=message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[¿?¡!.,;:]/g,"");
  for(const[k,v] of Object.entries(KNOWLEDGE)){if(q===k) return v;}
  for(const[k,v] of Object.entries(KNOWLEDGE)){if(q.includes(k)) return v;}
  for(const word of q.split(/\s+/)){
    if(word.length<3) continue;
    for(const[k,v] of Object.entries(KNOWLEDGE)){if(k.includes(word)||word.includes(k)) return v;}
  }
  const fb=[
    "Hmm, no estoy seguro Prueba preguntarme sobre: pincel, capas, animación, colores, exportar o atajos.",
    "¡Buena pregunta! Intenta: seleccionar, duplicador, capas, gif, piel de cebolla, tema…",
    "Prueba: **herramientas, capas, animación, exportar GIF, colores, atajos, viñetas**."
  ];
  return fb[Math.floor(Math.random()*fb.length)];
}

function renderBotMsg(text){const d=document.createElement("div");d.className="chat-msg bot";d.innerHTML=text.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");return d;}
function renderUserMsg(text){const d=document.createElement("div");d.className="chat-msg user";d.textContent=text;return d;}
function scrollChat(){const m=document.getElementById("chat-messages");m.scrollTop=m.scrollHeight;}

async function sendChatMessage(text) {
  text=text.trim(); if(!text) return;
  const msgs=document.getElementById("chat-messages");
  const input=document.getElementById("chat-input");
  input.value=""; input.disabled=true;
  msgs.appendChild(renderUserMsg(text)); scrollChat();
  const typing=document.createElement("div"); typing.className="chat-msg bot";
  typing.innerHTML="<em style='opacity:.6'>Lazurik está escribiendo…</em>";
  msgs.appendChild(typing); scrollChat();
  const reply=await getAssistantReply(text);
  msgs.removeChild(typing); msgs.appendChild(renderBotMsg(reply)); scrollChat();
  input.disabled=false; input.focus();
}

function initAssistant() {
  const panel=document.getElementById("assistant-panel");
  function toggle(){
    panel.classList.toggle("open");
    document.getElementById("btn-assistant-toggle").classList.toggle("active",panel.classList.contains("open"));
    if(panel.classList.contains("open")) {
      const msgs=document.getElementById("chat-messages");
      if(msgs.children.length===0) {
        msgs.appendChild(renderBotMsg("¡Hola! Soy **Lazurik** \n¿En qué puedo ayudarte hoy?\nPuedes preguntarme cualquier cosa."));
        const row=document.getElementById("chat-quick"); row.innerHTML="";
        QUICK_SUGGESTIONS.forEach(s=>{
          const c=document.createElement("button"); c.className="quick-chip"; c.textContent=s;
          c.addEventListener("click",()=>sendChatMessage(s)); row.appendChild(c);
        });
        scrollChat();
      }
      setTimeout(()=>document.getElementById("chat-input").focus(),200);
    }
  }
  document.getElementById("btn-assistant-toggle").addEventListener("click",toggle);
  document.getElementById("btn-close-asst").addEventListener("click",()=>{
    panel.classList.remove("open");
    document.getElementById("btn-assistant-toggle").classList.remove("active");
  });
  document.getElementById("btn-chat-send").addEventListener("click",()=>sendChatMessage(document.getElementById("chat-input").value));
  document.getElementById("chat-input").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChatMessage(e.target.value);}});
}

// ─── 31. KEYBOARD ────────────────────────────────
function initKeyboard() {
  document.addEventListener("keydown",e=>{
    const tag=document.activeElement.tagName;
    if(tag==="INPUT"||tag==="TEXTAREA"||document.activeElement.contentEditable==="true") return;
    const key=e.key.toLowerCase();
    const tool=TOOLS.find(t=>t.key&&t.key===key);
    if(tool&&!e.ctrlKey&&!e.metaKey){setTool(tool.id);return;}
    if((key==="+"||key==="=")&&!e.ctrlKey){applyZoom(0.1);return;}
    if((key==="-"||key==="_")&&!e.ctrlKey){applyZoom(-0.1);return;}
    if(key==="0"&&!e.ctrlKey){resetZoom();return;}
    if((e.ctrlKey||e.metaKey)&&key==="z"&&!e.shiftKey){e.preventDefault();undo();return;}
    if((e.ctrlKey||e.metaKey)&&(key==="y"||(key==="z"&&e.shiftKey))){e.preventDefault();redo();return;}
    if(key==="escape"){
      document.querySelectorAll(".modal:not(.hidden)").forEach(m=>m.classList.add("hidden"));
      closeAllMenus(); if(state.sel.active) commitSelection(); if(state.dup.active) commitDup(); return;
    }
    if(key===" "){
      e.preventDefault();
      if(state.activeTool!=="mover"){state._prevTool=state.activeTool;setTool("mover");}
      else{setTool(state._prevTool||"pincel");}
      return;
    }
    if(key==="["){adjustSize(-2);return;}
    if(key==="]"){adjustSize(2);return;}
  });
}

function adjustSize(delta) {
  state.brushSize=Math.min(150,Math.max(1,state.brushSize+delta));
  const sl=document.getElementById("pb-size-sl"); const nm=document.getElementById("pb-size-num");
  if(sl) sl.value=state.brushSize; if(nm) nm.textContent=state.brushSize;
}

// ─── 32. SPLASH & START SCREENS ──────────────────
function initSplash() {
  const splash=document.getElementById("splash-screen");
  const startScreen=document.getElementById("start-screen");
  const editorWrap=document.getElementById("editor-wrap");
  if(localStorage.getItem("laz-skip-splash")==="1") {
    splash.style.display="none"; showStart(); return;
  }
  document.getElementById("btn-comenzar").addEventListener("click",()=>{
    if(document.getElementById("skip-splash-check").checked) localStorage.setItem("laz-skip-splash","1");
    splash.classList.add("fade-out");
    setTimeout(()=>{splash.style.display="none";showStart();},400);
  });
  function showStart() {
    startScreen.classList.remove("hidden");
    document.querySelectorAll("#pg-dibujo .preset-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.getElementById("sd-w").value=btn.dataset.w;
        document.getElementById("sd-h").value=btn.dataset.h;
        document.querySelectorAll("#pg-dibujo .preset-btn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
    document.querySelectorAll("#pg-anim .preset-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.getElementById("sa-w").value=btn.dataset.w;
        document.getElementById("sa-h").value=btn.dataset.h;
        document.querySelectorAll("#pg-anim .preset-btn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
    document.querySelectorAll(".start-opt").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const t=btn.dataset.start;
        if(t==="abrir"){LazStorage.openFile();return;}
        openModal(t==="dibujo"?"modal-start-dibujo":"modal-start-anim");
      });
    });
    document.getElementById("btn-sd-apply").addEventListener("click",()=>{
      const w=parseInt(document.getElementById("sd-w").value)||800;
      const h=parseInt(document.getElementById("sd-h").value)||500;
      closeModal("modal-start-dibujo");
      launchEditor(startScreen,editorWrap,w,h,1,12);
    });
    document.getElementById("btn-sa-apply").addEventListener("click",()=>{
      const w=parseInt(document.getElementById("sa-w").value)||800;
      const h=parseInt(document.getElementById("sa-h").value)||500;
      const fps=parseInt(document.getElementById("sa-fps").value)||12;
      const frames=parseInt(document.getElementById("sa-frames").value)||4;
      closeModal("modal-start-anim");
      launchEditor(startScreen,editorWrap,w,h,frames,fps);
    });
  }
}

function launchEditor(startScreen,editorWrap,w,h,numFrames,fps) {
  startScreen.classList.add("fade-out");
  setTimeout(()=>{
    startScreen.style.display="none";
    editorWrap.classList.remove("hidden");
    initEditor(w,h,numFrames,fps);
  },300);
}

// ─── 33. EDITOR INIT ─────────────────────────────
function initEditor(w=800, h=500, numFrames=1, fps=12) {
  state.frames=[{id:"frm-1"}]; state.activeFrameId="frm-1"; state.fps=fps;
  document.getElementById("fps-select").value=fps;
  for(let i=1;i<numFrames;i++) state.frames.push({id:"frm-"+(i+1)});
  initCanvasSize(w,h);
  initCanvasEvents();
  buildToolbar();
  setTool("pincel");
  initColors();
  buildLayersList();
  initLayers();
  buildTimeline();
  initTimeline();
  initMenus();
  initAssistant();
  initKeyboard();
  initOnionSkin();
  buildColorGuide();
  buildFontPicker();
  initColorGuideBtn();
  initVinetas();
  marchingAntsLoop();
  requestAnimationFrame(resetZoom);
}

// ─── 34. MAIN ENTRY ──────────────────────────────
function main() {
  loadSavedTheme();
  initThemeSystem();
  initSplash();
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",main);
} else {
  main();
}
