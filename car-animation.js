/* Loader for the proven car-animation bridge + the active garage overhaul. */
(function(){
  'use strict';
  function loadGarageLayer(){
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET','car-animation-base.js?bridge-20261006-4',false);
      xhr.send(null);
      if(xhr.status < 200 || xhr.status >= 300) throw new Error('car-animation-base.js HTTP '+xhr.status);
      (0,eval)(xhr.responseText);
    } catch(e) {
      console.error('Motornaya car-animation base failed',e);
      return;
    }
    var fix=document.createElement('style');
    fix.id='motornaya-camera-position-fix';
    fix.textContent='#garage-camera-controls{position:fixed!important;left:auto!important;right:12px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;display:none!important;z-index:9999!important}@media(max-width:700px){#garage-camera-controls{right:8px!important;top:50%!important;left:auto!important;transform:translateY(-50%)!important;width:122px!important}}@media(max-width:430px){#garage-camera-controls{right:6px!important;top:50%!important;left:auto!important;transform:translateY(-50%)!important;width:112px!important}}';
    document.head.appendChild(fix);

    function syncCameraPanel(){
      var panel=document.getElementById('garage-camera-controls');
      if(!panel) return;
      var garage=document.querySelector('.mode-button[data-mode="workshop"].is-active');
      var right=window.innerWidth<=430?'6px':(window.innerWidth<=700?'8px':'12px');
      panel.style.setProperty('position','fixed','important');
      panel.style.setProperty('left','auto','important');
      panel.style.setProperty('right',right,'important');
      panel.style.setProperty('top','50%','important');
      panel.style.setProperty('bottom','auto','important');
      panel.style.setProperty('transform','translateY(-50%)','important');
      panel.style.setProperty('z-index','9999','important');
      panel.style.setProperty('display',garage?'block':'none','important');
    }
    syncCameraPanel();
    setInterval(syncCameraPanel,250);
    window.addEventListener('resize',syncCameraPanel);
    window.addEventListener('orientationchange',syncCameraPanel);

    var s=document.createElement('script');
    s.src='garage-upgrades.js?garage-overhaul-20261006-7';
    s.async=false;
    document.head.appendChild(s);
    setTimeout(syncCameraPanel,100);
    setTimeout(syncCameraPanel,500);
    setTimeout(syncCameraPanel,1000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',loadGarageLayer,{once:true});
  else loadGarageLayer();
})();