/* Моторная — stable garage UI loader. Wheel behavior is owned by game.js and is intentionally untouched. */
(function(){
  'use strict';
  function removeCameraPanel(){
    var panel=document.getElementById('garage-camera-controls');
    if(panel)panel.remove();
  }
  function loadGarageUI(){
    try{
      var s=document.createElement('script');
      s.src='garage-upgrades.js?garage-ui-20261006-13';
      s.async=false;
      document.head.appendChild(s);
    }catch(e){console.error('Motornaya garage UI failed',e);}
    var fix=document.createElement('style');
    fix.id='motornaya-camera-kill-final';
    fix.textContent='#garage-camera-controls{display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}';
    document.head.appendChild(fix);
    removeCameraPanel();
    setInterval(removeCameraPanel,250);
    window.addEventListener('resize',removeCameraPanel);
    window.addEventListener('orientationchange',removeCameraPanel);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGarageUI,{once:true});
  else loadGarageUI();
})();
