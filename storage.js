'use strict';
/* Guardado de proyectos (.laz) cifrado con AES-256-GCM + copia en IndexedDB (RF-004). */
const LazStorage=(()=>{
 const E=new TextEncoder(),D=new TextDecoder();let pw=null;
 const toast=m=>{const t=Object.assign(document.createElement('div'),{className:'laz-toast',textContent:m});document.body.append(t);setTimeout(()=>t.remove(),3200)};
 const ask=()=>{if(!crypto.subtle){alert('El cifrado requiere https o localhost.');return null}
  if(!pw)pw=prompt('Contraseña del proyecto (cifrado AES-256). Si la olvidas, no se puede recuperar:');return pw};
 const key=async(p,salt)=>{const m=await crypto.subtle.importKey('raw',E.encode(p),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
 const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const toURL=img=>{const c=cv(img.width,img.height);c.getContext('2d').putImageData(img,0,0);return c.toDataURL('image/webp',1)};
 const fromURL=async u=>{const bm=await createImageBitmap(await (await fetch(u)).blob()),c=cv(bm.width,bm.height),x=c.getContext('2d');
  x.drawImage(bm,0,0);bm.close();return x.getImageData(0,0,c.width,c.height)};
 const idb=(m,...a)=>new Promise((res,rej)=>{const r=indexedDB.open('lazurik',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');
  r.onerror=rej;r.onsuccess=()=>{const q=r.result.transaction('p',m==='get'?'readonly':'readwrite').objectStore('p')[m](...a);q.onsuccess=()=>res(q.result);q.onerror=rej}});
 async function pack(){const p=ask();if(!p)return null;
  saveLayerData();await Memory.restoreAll();
  const data={};for(const f of state.frames){data[f.id]={};const s=state.canvasData[f.id]||{};for(const l in s)data[f.id][l]=toURL(s[l])}
  const raw=E.encode(JSON.stringify({v:3,w:canvas.width,h:canvas.height,fps:state.fps,layers:state.layers,frames:state.frames,
   activeLayerId:state.activeLayerId,activeFrameId:state.activeFrameId,data}));
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(p,salt),raw));
  const out=new Uint8Array(28+enc.length);out.set(salt);out.set(iv,16);out.set(enc,28);return out}
 async function apply(d){
  const wrap=document.getElementById('editor-wrap');
  if(wrap.classList.contains('hidden')){launchEditor(document.getElementById('start-screen'),wrap,d.w,d.h,1,d.fps);await new Promise(r=>setTimeout(r,500))}
  else initCanvasSize(d.w,d.h);
  Object.assign(state,{layers:d.layers,frames:d.frames,fps:d.fps,activeLayerId:d.activeLayerId,activeFrameId:d.activeFrameId,canvasData:{}});
  for(const f in d.data){state.canvasData[f]={};for(const l in d.data[f])state.canvasData[f][l]=await fromURL(d.data[f][l])}
  document.getElementById('fps-select').value=d.fps;
  buildLayersList();buildTimeline();redrawCanvas();renderOnionSkin();
  Engine.reset();redrawCanvas();
  requestAnimationFrame(resetZoom);Memory.badge()}
 async function unpack(buf){const p=ask();if(!p)return;const u=new Uint8Array(buf);
  try{await apply(JSON.parse(D.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(16,28)},await key(p,u.slice(0,16)),u.slice(28)))));toast('Proyecto abierto')}
  catch(e){console.error(e);pw=null;alert('No se pudo abrir: contraseña incorrecta o archivo dañado.')}}
 return{
  async save(){const b=await pack();if(!b)return;await idb('put',b,'proyecto');
   const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([b])),download:'proyecto.laz'});a.click();
   setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Proyecto guardado y cifrado')},
  openFile(){const i=Object.assign(document.createElement('input'),{type:'file',accept:'.laz'});
   i.onchange=async()=>{if(i.files[0])unpack(await i.files[0].arrayBuffer())};i.click()},
  async recover(){const b=await idb('get','proyecto');b?unpack(b):toast('No hay proyecto guardado en este navegador')}
 };
})();
