/* Моторная — stable garage UI loader. Wheel behavior is owned by game.js and is intentionally untouched. */
(function(){
  'use strict';
  function removeCameraPanel(){
    var panel=document.getElementById('garage-camera-controls');
    if(panel)panel.remove();
  }
  function addQualityOfLifeUI(){
    if(document.getElementById('motornaya-fullscreen')) return;
    var button=document.createElement('button');
    button.id='motornaya-fullscreen';
    button.type='button';
    button.setAttribute('aria-label','Полноэкранный режим');
    button.textContent='⛶';
    button.style.cssText='position:absolute;z-index:46;right:72px;bottom:28px;width:38px;height:36px;border:1px solid rgba(255,255,255,.22);border-radius:6px;color:#d7e0d8;background:rgba(17,25,22,.82);font-size:18px;cursor:pointer;pointer-events:auto;touch-action:manipulation;';
    button.addEventListener('click',function(){
      var el=document.documentElement;
      try{
        if(document.fullscreenElement){
          if(document.exitFullscreen) document.exitFullscreen();
        }else if(el.requestFullscreen){
          el.requestFullscreen();
        }
      }catch(e){console.warn('Fullscreen unavailable',e);}
    });
    var ui=document.getElementById('game-ui');
    if(ui) ui.appendChild(button);
    else document.getElementById('game')?.appendChild(button);
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
    fix.textContent='#garage-camera-controls{display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}@media(max-width:700px){#motornaya-fullscreen{right:62px;bottom:80px;width:34px;height:34px;font-size:16px}}';
    document.head.appendChild(fix);
    removeCameraPanel();
    addQualityOfLifeUI();
    setInterval(removeCameraPanel,250);
    setInterval(addQualityOfLifeUI,500);
    window.addEventListener('resize',removeCameraPanel);
    window.addEventListener('orientationchange',removeCameraPanel);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGarageUI,{once:true});
  else loadGarageUI();
})();
