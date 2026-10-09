'use strict';
const W=960,H=540,$=id=>document.getElementById(id);
const view=$('view'),vx=view.getContext('2d');
const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c};
const S={layers:[{n:'Capa 1',v:1,o:1,b:'source-over'}],frames:[[{c:mk(),b:null}]],cur:0,al:0,fps:12,play:false,tool:'brush',undo:[],pw:null};
const LIM=10; // RF-002: cuadros inactivos a >10 posiciones se virtualizan a WebP
const toBlob=c=>new Promise(r=>c.toBlob(r,'image/webp',.95));
const b2url=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});

/* ---------- Memoria: virtualización de cuadros (RF-002 / RN-01) ---------- */
async function ensure(...ix){
 for(const i of ix){const f=S.frames[i];if(!f)continue;
  for(const cell of f){if(cell.c)continue;cell.c=mk();
   if(cell.b){const bm=await createImageBitmap(cell.b);cell.c.getContext('2d').drawImage(bm,0,0);bm.close()}}}
}
const heavy=()=>performance.memory&&performance.memory.usedJSHeapSize>400*1048576;
async function virtualize(){
 const lim=heavy()?1:LIM;
 for(let i=0;i<S.frames.length;i++){if(Math.abs(i-S.cur)<=lim)continue;
  for(const cell of S.frames[i]){if(!cell.c)continue;
   if(!cell.b)cell.b=await toBlob(cell.c);
   if(Math.abs(i-S.cur)>lim)cell.c=null}}
 ui(false);
}

/* ---------- Render ---------- */
let dirty=false;const tmp=mk(),tx=tmp.getContext('2d');
function comp(fr,ctx){for(let l=0;l<S.layers.length;l++){const L=S.layers[l],c=fr[l]&&fr[l].c;if(!L.v||!c)continue;
 ctx.globalAlpha=L.o;ctx.globalCompositeOperation=L.b;ctx.drawImage(c,0,0)}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
function paint(){dirty=false;vx.fillStyle='#fff';vx.fillRect(0,0,W,H);
 if($('onion').checked&&!S.play)for(const d of[-1,1]){const fr=S.frames[S.cur+d];if(!fr)continue;
  tx.clearRect(0,0,W,H);comp(fr,tx);tx.globalCompositeOperation='source-in';tx.fillStyle=d<0?$('oc').value:'#2fb36b';tx.fillRect(0,0,W,H);tx.globalCompositeOperation='source-over';
  vx.globalAlpha=$('oo').value/100;vx.drawImage(tmp,0,0);vx.globalAlpha=1}
 comp(S.frames[S.cur],vx)}
const draw=()=>{if(!dirty){dirty=true;requestAnimationFrame(paint)}};

/* ---------- Dibujo ---------- */
let pts=null,snap=null,cc=null;
const pos=e=>{const r=view.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]};
view.addEventListener('pointerdown',e=>{if(S.play)return;const cell=S.frames[S.cur][S.al];if(!cell||!cell.c)return;
 view.setPointerCapture(e.pointerId);cc=cell.c;cell.b=null;
 snap=mk();snap.getContext('2d').drawImage(cc,0,0);
 S.undo.push({f:S.cur,l:S.al,img:snap});if(S.undo.length>20)S.undo.shift();
 snap=mk();snap.getContext('2d').drawImage(cc,0,0);pts=[pos(e)];stroke();draw()});
view.addEventListener('pointermove',e=>{if(!pts)return;
 const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const q of ev)pts.push(pos(q));stroke();draw()});
['pointerup','pointercancel'].forEach(n=>view.addEventListener(n,()=>{pts=null;ui(false)}));
function stroke(){const x=cc.getContext('2d');x.clearRect(0,0,W,H);x.drawImage(snap,0,0);
 x.lineCap=x.lineJoin='round';x.lineWidth=+$('size').value;
 const er=S.tool==='eraser';x.globalCompositeOperation=er?'destination-out':'source-over';
 x.globalAlpha=er?1:$('alpha').value/100;x.strokeStyle=x.fillStyle=$('color').value;
 if(pts.length<3){x.beginPath();x.arc(pts[0][0],pts[0][1],x.lineWidth/2,0,7);x.fill()}
 else{x.beginPath();x.moveTo(...pts[0]);for(let i=1;i<pts.length-1;i++){const m=[(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2];x.quadraticCurveTo(...pts[i],...m)}x.lineTo(...pts[pts.length-1]);x.stroke()}
 x.globalAlpha=1;x.globalCompositeOperation='source-over'}
async function undo(){const u=S.undo.pop();if(!u)return;await goto(u.f);S.al=Math.min(u.l,S.layers.length-1);
 const cell=S.frames[u.f][u.l];if(!cell)return;cell.b=null;const x=cell.c.getContext('2d');x.clearRect(0,0,W,H);x.drawImage(u.img,0,0);draw();ui()}

/* ---------- Navegación, capas y cuadros ---------- */
async function goto(i){i=Math.max(0,Math.min(S.frames.length-1,i));S.cur=i;await ensure(i,i-1,i+1);draw();ui();if(!S.play)virtualize()}
function ui(full=true){
 const ul=$('list');ul.innerHTML='';
 for(let l=S.layers.length-1;l>=0;l--){const L=S.layers[l],li=document.createElement('li');li.tabIndex=0;li.className=l===S.al?'sel':'';
  li.innerHTML=`<button title="Visibilidad">${L.v?'👁':'—'}</button><span class="nm ${L.v?'':'off'}"></span><button title="Eliminar capa">×</button>`;
  li.querySelector('.nm').textContent=L.n;
  li.onclick=()=>{S.al=l;ui();syncLayer()};
  li.ondblclick=()=>{const n=prompt('Nombre de la capa',L.n);if(n){L.n=n;ui()}};
  li.children[0].onclick=e=>{e.stopPropagation();L.v=!L.v;ui();draw()};
  li.children[2].onclick=e=>{e.stopPropagation();delLayer(l)};
  ul.append(li)}
 const fr=$('frames');fr.innerHTML='';
 S.frames.forEach((f,i)=>{const d=document.createElement('div');d.className='fr'+(i===S.cur?' cur':'')+(f.some(c=>!c.c)?' v':'');d.textContent=i+1;d.onclick=()=>goto(i);fr.append(d)});
 const ram=S.frames.filter(f=>f.every(c=>c.c)).length;
 $('stat').textContent=`Cuadro ${S.cur+1}/${S.frames.length} · RAM: ${ram} · virtualizados: ${S.frames.length-ram}`+(performance.memory?` · ${(performance.memory.usedJSHeapSize/1048576)|0} MB`:'');
}
function syncLayer(){const L=S.layers[S.al];$('blend').value=L.b;$('lo').value=L.o*100;$('oLo').textContent=L.o*100|0}
async function addLayer(){S.layers.splice(S.al+1,0,{n:'Capa '+(S.layers.length+1),v:1,o:1,b:'source-over'});
 S.frames.forEach((f,i)=>f.splice(S.al+1,0,{c:i===S.cur?mk():null,b:null}));S.al++;syncLayer();ui();draw()}
function delLayer(l){if(S.layers.length<2)return;S.layers.splice(l,1);S.frames.forEach(f=>f.splice(l,1));S.al=Math.min(S.al,S.layers.length-1);S.undo=[];syncLayer();ui();draw()}
async function addFrame(dup){const src=S.frames[S.cur];if(dup)await ensure(S.cur);
 const f=S.layers.map((_,l)=>{if(!dup)return{c:null,b:null};const c=mk();c.getContext('2d').drawImage(src[l].c,0,0);return{c,b:null}});
 S.frames.splice(S.cur+1,0,f);S.undo=[];await goto(S.cur+1)}
async function delFrame(){if(S.frames.length<2)return;S.frames.splice(S.cur,1);S.undo=[];await goto(Math.min(S.cur,S.frames.length-1))}

/* ---------- Reproducción ---------- */
async function play(){S.play=!S.play;$('bPlay').textContent=S.play?'Detener':'Reproducir';$('bPlay').classList.toggle('on',S.play);
 let t=performance.now();
 while(S.play){const n=(S.cur+1)%S.frames.length;await ensure(n);S.cur=n;paint();ui(false);
  S.frames.forEach((f,i)=>{if(Math.abs(i-n)>LIM)f.forEach(c=>{if(c.b)c.c=null})});
  t+=1000/S.fps;await new Promise(r=>setTimeout(r,Math.max(0,t-performance.now())))}
 await goto(S.cur)}

/* ---------- Cifrado AES-256-GCM (RF-004) ---------- */
async function mkKey(pw,salt){const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function getPw(){if(!crypto.subtle){alert('El cifrado requiere un contexto seguro (https o localhost).');return null}
 if(!S.pw)S.pw=prompt('Contraseña para cifrar/descifrar el proyecto (AES-256):');return S.pw}
async function pack(){const pw=await getPw();if(!pw)return null;
 const frames=[];for(const f of S.frames)frames.push(await Promise.all(f.map(async c=>c.c?c.c.toDataURL('image/webp',.95):c.b?b2url(c.b):'')));
 const data=new TextEncoder().encode(JSON.stringify({v:2,W,H,fps:S.fps,layers:S.layers,frames}));
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const enc=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await mkKey(pw,salt),data));
 const out=new Uint8Array(28+enc.length);out.set(salt);out.set(iv,16);out.set(enc,28);return out}
async function unpack(buf){const pw=await getPw();if(!pw)return;const u=new Uint8Array(buf);
 try{const d=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(16,28)},await mkKey(pw,u.slice(0,16)),u.slice(28))));
  S.layers=d.layers;S.fps=d.fps;$('fps').value=d.fps;
  S.frames=await Promise.all(d.frames.map(f=>Promise.all(f.map(async s=>({c:null,b:s?await (await fetch(s)).blob():null})))));
  S.cur=0;S.al=0;S.undo=[];await goto(0);syncLayer()}
 catch{S.pw=null;alert('No se pudo abrir: contraseña incorrecta o archivo dañado.')}}
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('lazurik',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>res(r.result);r.onerror=rej});
async function idbOp(m,...a){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('p',m==='get'?'readonly':'readwrite').objectStore('p')[m](...a);q.onsuccess=()=>res(q.result);q.onerror=rej})}
const dl=(href,name)=>{const a=document.createElement('a');a.href=href;a.download=name;a.click()};

/* ---------- Eventos ---------- */
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{S.tool=b.dataset.t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b))});
[['size','oSize'],['alpha','oAlpha'],['oo','oOo']].forEach(([a,o])=>$(a).oninput=()=>{$(o).textContent=$(a).value;draw()});
$('lo').oninput=()=>{S.layers[S.al].o=$('lo').value/100;$('oLo').textContent=$('lo').value;draw()};
$('blend').onchange=()=>{S.layers[S.al].b=$('blend').value;draw()};
$('onion').onchange=$('oc').oninput=draw;
$('fps').onchange=()=>S.fps=Math.max(1,Math.min(60,+$('fps').value||12));
$('bUndo').onclick=undo;$('lAdd').onclick=addLayer;$('fAdd').onclick=()=>addFrame(false);$('fDup').onclick=()=>addFrame(true);$('fDel').onclick=delFrame;
$('bPlay').onclick=play;$('bPrev').onclick=()=>goto(S.cur-1);$('bNext').onclick=()=>goto(S.cur+1);
$('bNew').onclick=()=>{if(!confirm('¿Crear un proyecto nuevo? Se perderán los cambios sin guardar.'))return;
 S.layers=[{n:'Capa 1',v:1,o:1,b:'source-over'}];S.frames=[[{c:mk(),b:null}]];S.cur=S.al=0;S.undo=[];goto(0)};
$('bSave').onclick=async()=>{const p=await pack();if(p){await idbOp('put',p,'proyecto');$('stat').textContent='Guardado cifrado en este navegador (IndexedDB)'}};
$('bLoad').onclick=async()=>{const p=await idbOp('get','proyecto');p?unpack(p):alert('No hay un proyecto guardado en este navegador.')};
$('bExp').onclick=async()=>{const p=await pack();if(p)dl(URL.createObjectURL(new Blob([p])),'proyecto.laz')};
$('bOpen').onclick=()=>$('file').click();
$('file').onchange=async e=>{const f=e.target.files[0];if(f)unpack(await f.arrayBuffer());e.target.value=''};
$('bPng').onclick=()=>{const c=mk(),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);comp(S.frames[S.cur],x);dl(c.toDataURL('image/png'),`cuadro-${S.cur+1}.png`)};
addEventListener('keydown',e=>{if(/INPUT|SELECT/.test(e.target.tagName)&&e.target.type!=='range')return;
 if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo()}
 else if(e.key==='b')$('bUndo').previousElementSibling&&document.querySelector('[data-t=brush]').click();
 else if(e.key==='e')document.querySelector('[data-t=eraser]').click();
 else if(e.key===' '){e.preventDefault();play()}
 else if(e.key==='ArrowLeft')goto(S.cur-1);else if(e.key==='ArrowRight')goto(S.cur+1)});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js');
setInterval(()=>{if(!S.play&&!pts)virtualize()},5000); // RN-01: revisión periódica de memoria
syncLayer();ui();paint();
