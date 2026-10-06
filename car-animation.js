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
    var fix=document.createElement('style');
    fix.id='motornaya-camera-position-fix';
    fix.textContent='#garage-camera-controls{left:auto!important;right:10px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;display:none!important}body:has(.mode-button[data-mode="workshop"].is-active) #garage-camera-controls{display:block!important}@media(max-width:700px){#garage-camera-controls{right:7px!important;top:50%!important;left:auto!important;transform:translateY(-50%)!important;width:122px!important}}@media(max-width:430px){#garage-camera-controls{right:6px!important;top:50%!important;left:auto!important;transform:translateY(-50%)!important;width:112px!important}}';
    document.head.appendChild(fix);
    var s=document.createElement('script');
    s.src='garage-upgrades.js?garage-overhaul-20261006-5';
    s.async=false;
    document.head.appendChild(s);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',loadGarageLayer,{once:true});
  else loadGarageLayer();
})();