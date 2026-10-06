/* Loader for the proven car-animation bridge + the active garage overhaul. */
(function(){
  'use strict';
  function loadGarageLayer(){
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET','car-animation-base.js?bridge-20261006-2',false);
      xhr.send(null);
      if(xhr.status < 200 || xhr.status >= 300) throw new Error('car-animation-base.js HTTP '+xhr.status);
      (0,eval)(xhr.responseText);
    } catch(e) {
      console.error('Motornaya car-animation base failed',e);
      return;
    }
    var s=document.createElement('script');
    s.src='garage-upgrades.js?garage-overhaul-20261006-5';
    s.async=false;
    document.head.appendChild(s);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',loadGarageLayer,{once:true});
  else loadGarageLayer();
})();