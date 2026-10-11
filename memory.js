'use strict';
/* Virtualización de fotogramas (RF-002 / RN-01): los cuadros lejanos del activo
   pasan de ImageData (sin comprimir) a Blob WebP y se restauran al necesitarlos. */
const Memory=(()=>{
 const LIM=10,NEAR=3;let busy=false;
 const isB=v=>v instanceof Blob;
 const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const heavy=()=>performance.memory&&performance.memory.usedJSHeapSize>400*1048576;
 const idx=id=>state.frames.findIndex(f=>f.id===id);
 async function restore(fid){const fd=state.canvasData[fid];if(!fd)return;
  for(const l in fd){const v=fd[l];if(!isB(v))continue;
   const bm=await createImageBitmap(v),c=cv(bm.width,bm.height),x=c.getContext('2d');
   x.drawImage(bm,0,0);bm.close();fd[l]=x.getImageData(0,0,c.width,c.height)}}
 async function restoreAround(id){const a=idx(id);
  for(let i=Math.max(0,a-NEAR);i<=Math.min(state.frames.length-1,a+NEAR);i++)await restore(state.frames[i].id)}
 async function restoreAll(){for(const f of state.frames)await restore(f.id)}
 async function virtualize(){
  if(busy||state.isPlaying||!state.frames)return;busy=true;
  try{const lim=heavy()?NEAR:LIM;
   for(let i=0;i<state.frames.length;i++){
    if(Math.abs(i-idx(state.activeFrameId))<=lim)continue;
    const fd=state.canvasData[state.frames[i].id];if(!fd)continue;
    for(const l in fd){const v=fd[l];if(!v||isB(v))continue;
     const c=cv(v.width,v.height);c.getContext('2d').putImageData(v,0,0);
     const b=await new Promise(r=>c.toBlob(r,'image/webp',1));
     if(fd[l]===v&&Math.abs(i-idx(state.activeFrameId))>lim)fd[l]=b}}
  }finally{busy=false;badge()}}
 function badge(){const e=document.getElementById('mem-badge');if(!e||!state.frames)return;let v=0;
  for(const f of state.frames){const fd=state.canvasData[f.id];if(fd&&Object.values(fd).some(isB))v++}
  e.textContent=`RAM: ${state.frames.length-v} · Virt.: ${v}`+(performance.memory?` · ${(performance.memory.usedJSHeapSize/1048576)|0} MB`:'')}
 // Los lectores de canvasData son síncronos: restauramos antes de que lo usen.
 const o={};['selectFrame','startPlayback','exportGIF','expandCanvas','duplicateActiveLayer'].forEach(n=>o[n]=window[n]);
 window.selectFrame=async id=>{await restoreAround(id);o.selectFrame(id);virtualize()};
 window.startPlayback=async()=>{await restoreAll();o.startPlayback()};
 window.exportGIF=async()=>{await restoreAll();return o.exportGIF()};
 window.expandCanvas=async(...a)=>{await restoreAll();return o.expandCanvas(...a)};
 window.duplicateActiveLayer=async()=>{await restoreAll();return o.duplicateActiveLayer()};
 setInterval(virtualize,5000);
 return{restoreAll,virtualize,badge};
})();
