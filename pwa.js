'use strict';
// El Service Worker solo funciona con http(s)/localhost, no con file://.
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))
 addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
