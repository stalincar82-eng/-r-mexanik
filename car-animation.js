/* Loader for the proven car-animation bridge + the active garage overhaul. */
(function(){
  'use strict';
  function loadGarageLayer(){
    try {
      var xhr=new XMLHttpRequest();
      xhr.open('GET','car-animation-base.js?bridge-20261006-12',false);
      xhr.send(null);
      if(xhr.status<200||xhr.status>=300)throw new Error('car-animation-base.js HTTP '+xhr.status);
      (0,eval)(xhr.responseText);
    }catch(e){console.error('Motornaya car-animation base failed',e);return;}
    var fix=document.createElement('style');
    fix.id='motornaya-camera-position-fix';
    fix.textContent='#garage-camera-controls{display:none!important}';
    document.head.appendChild(fix);
    function removeCameraPanel(){var panel=document.getElementById('garage-camera-controls');if(panel)panel.remove();}
    removeCameraPanel();
    setInterval(removeCameraPanel,250);
    window.addEventListener('resize',removeCameraPanel);
    window.addEventListener('orientationchange',removeCameraPanel);
    var s=document.createElement('script');
    s.src='garage-upgrades.js?garage-overhaul-20261006-12';
    s.async=false;
    document.head.appendChild(s);
    setTimeout(removeCameraPanel,100);
    setTimeout(removeCameraPanel,500);
    setTimeout(removeCameraPanel,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGarageLayer,{once:true});else loadGarageLayer();
})();
