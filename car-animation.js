/* Loader for the proven car-animation bridge + the active garage overhaul. */
(function(){
  'use strict';
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET','car-animation-base.js?bridge-20261006-1',false);
    xhr.send(null);
    if(xhr.status < 200 || xhr.status >= 300) throw new Error('car-animation-base.js HTTP '+xhr.status);
    (0,eval)(xhr.responseText);
  } catch(e) {
    console.error('Motornaya car-animation base failed',e);
    return;
  }
  var s=document.createElement('script');
  s.src='garage-upgrades.js?garage-overhaul-20261006-4';
  s.async=false;
  document.head.appendChild(s);
})();