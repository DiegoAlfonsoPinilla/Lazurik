'use strict';
/* Iconos de trazo simple. Uso: Icons.get('brush') o <span data-icon="brush"></span> */
const Icons=(()=>{
 const p=d=>`<path d="${d}"/>`;
 const M={
  select:'<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 3"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/>'+p('M5 15V6a2 2 0 012-2h9'),
  move:p('M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3'),
  brush:p('M20 4c-5 1-9 5-10 9l2 2c4-1 8-5 8-11z')+p('M10 13c-3 0-5 2-5 5 0 1-1 2-2 3 4 1 8 0 8-4'),
  pencil:p('M4 20l1-4L16 5l3 3L8 19zM14 7l3 3'),
  marker:p('M14 4l6 6-8 8H8v-4zM4 21h6'),
  eraser:p('M8 20h12M5 15l9-9 5 5-6 6H8z'),
  star:p('M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5l-5.4 3 1.2-6L3.3 9.3l6.1-.7z'),
  wave:p('M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0'),
  bucket:p('M5 11l7-7 7 7-6 6a2 2 0 01-3 0zM20 15c0 2 0 4-1 4s-1-2-1-4'),
  text:p('M5 6V4h14v2M12 4v16M9 20h6'),
  line:p('M5 19L19 5'),
  rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',
  circle:'<circle cx="12" cy="12" r="8"/>',
  bubble:p('M4 5h16v11H11l-5 4v-4H4z'),
  dropper:p('M14 4l6 6-3 1-8 8-4 1 1-4 8-8zM13 7l4 4'),
  zoom:'<circle cx="10.5" cy="10.5" r="6"/>'+p('M15 15l5 5'),
  eye:p('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z')+'<circle cx="12" cy="12" r="3"/>',
  eyeoff:p('M2 12s4-7 10-7c2 0 4 .7 5.5 1.7M22 12s-4 7-10 7c-2 0-4-.7-5.5-1.7M3 3l18 18'),
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/>'+p('M8 11V8a4 4 0 018 0v3'),
  unlock:'<rect x="5" y="11" width="14" height="9" rx="2"/>'+p('M8 11V8a4 4 0 017.5-2'),
  trash:p('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'),
  plus:p('M12 5v14M5 12h14'),
  up:p('M6 15l6-6 6 6'), down:p('M6 9l6 6 6-6'),
  play:p('M7 4l13 8-13 8z'), pause:p('M8 5v14M16 5v14'),
  prev:p('M15 6l-6 6 6 6'), next:p('M9 6l6 6-6 6'),
  first:p('M6 5v14M18 6l-8 6 8 6'), last:p('M18 5v14M6 6l8 6-8 6'),
  undo:p('M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3'), redo:p('M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3'),
  onion:p('M12 3c4 4 6 7 6 10a6 6 0 01-12 0c0-3 2-6 6-10z'),
  layers:p('M12 3l9 5-9 5-9-5zM3 13l9 5 9-5'),
  palette:p('M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 003-3A9 9 0 0012 3z')+'<circle cx="8" cy="10" r=".8"/><circle cx="12" cy="7.5" r=".8"/><circle cx="16" cy="10" r=".8"/>',
  gear:'<circle cx="12" cy="12" r="3"/>'+p('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2'),
  expand:p('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'),
  chat:p('M4 5h16v11H11l-5 4v-4H4z'),
  film:'<rect x="3" y="5" width="18" height="14" rx="2"/>'+p('M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4'),
  folder:p('M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z')
 };
 const get=n=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${M[n]||''}</svg>`;
 const mount=(r=document)=>r.querySelectorAll('[data-icon]').forEach(e=>{if(!e.firstChild)e.innerHTML=get(e.dataset.icon)});
 // Si el logo remoto no carga, usa el logo local.
 const logos=()=>document.querySelectorAll('img[src^="http"]').forEach(i=>{
  const f=()=>{if(!i.src.endsWith('assets/logo.svg'))i.src='assets/logo.svg'};
  i.addEventListener('error',f);if(i.complete&&!i.naturalWidth)f()});
 document.addEventListener('DOMContentLoaded',()=>{mount();logos()});
 return{get,mount};
})();
