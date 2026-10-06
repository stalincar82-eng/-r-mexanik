/* Моторная — hard chase camera + reliable touch orbit. */
(function(){
  'use strict';
  if(window.__MOTORNAYA_CAMERA_HARD__)return;
  window.__MOTORNAYA_CAMERA_HARD__=true;
  var S={car:null,yaw:0,orbit:0,elev:-0.08,dist:12.5,drag:false,lastX:0,lastY:0,pts:{},ready:false};
  function findCar(scene){
    var wheels=[];
    scene.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))wheels.push(o);});
    if(wheels.length<4)return null;
    var root=null;
    for(var p=wheels[0];p;p=p.parent){var n=0;p.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))n++;});if(n>=4){root=p;break;}}
    return root||wheels[0].parent;
  }
  function ad(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function canvas(){return document.querySelector('canvas');}
  function installInput(){
    var c=canvas();if(!c){setTimeout(installInput,250);return;}
    c.style.touchAction='none';c.style.webkitUserSelect='none';c.style.userSelect='none';
    function start(e){S.pts[e.pointerId]={x:e.clientX,y:e.clientY};S.drag=true;S.lastX=e.clientX;S.lastY=e.clientY;if(c.setPointerCapture)try{c.setPointerCapture(e.pointerId);}catch(_){ }if(e.cancelable)e.preventDefault();}
    function move(e){var p=S.pts[e.pointerId];if(!p)return;var dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Object.keys(S.pts).length===1){S.orbit+=dx*0.014;S.orbit=Math.max(-Math.PI,Math.min(Math.PI,S.orbit));S.elev=Math.max(-0.28,Math.min(0.30,S.elev+dy*0.003));}if(e.cancelable)e.preventDefault();}
    function end(e){delete S.pts[e.pointerId];if(!Object.keys(S.pts).length)S.drag=false;}
    c.addEventListener('pointerdown',start,{passive:false});c.addEventListener('pointermove',move,{passive:false});c.addEventListener('pointerup',end,{passive:false});c.addEventListener('pointercancel',end,{passive:false});
    c.addEventListener('touchstart',function(e){if(e.touches.length===1){S.drag=true;S.lastX=e.touches[0].clientX;S.lastY=e.touches[0].clientY;}e.preventDefault();},{passive:false});
    c.addEventListener('touchmove',function(e){if(e.touches.length===1){var t=e.touches[0],dx=t.clientX-S.lastX,dy=t.clientY-S.lastY;S.lastX=t.clientX;S.lastY=t.clientY;S.orbit+=dx*0.014;S.orbit=Math.max(-Math.PI,Math.min(Math.PI,S.orbit));S.elev=Math.max(-0.28,Math.min(.30,S.elev+dy*.003));}e.preventDefault();},{passive:false});
    c.addEventListener('touchend',function(){S.drag=false;},{passive:false});
  }
  function installRender(){
    if(!window.THREE||!THREE.WebGLRenderer){setTimeout(installRender,100);return;}
    if(THREE.WebGLRenderer.prototype.__MOTOR_HARD_RENDER__)return;
    var old=THREE.WebGLRenderer.prototype.render;
    THREE.WebGLRenderer.prototype.render=function(scene,camera){
      try{
        if(!S.car)S.car=findCar(scene);
        if(S.car){
          var q=S.car.getWorldQuaternion(new THREE.Quaternion());
          var f=new THREE.Vector3(0,0,1).applyQuaternion(q).normalize();
          var rear=Math.atan2(f.x,f.z)+Math.PI;
          var desired=rear+S.orbit;
          if(!S.ready){S.yaw=desired;S.ready=true;}
          else S.yaw+=ad(S.yaw,desired)*0.16;
          var pos=S.car.getWorldPosition(new THREE.Vector3());
          var d=S.dist;
          var wanted=new THREE.Vector3(pos.x+Math.sin(S.yaw)*d,pos.y+2.0+S.elev,pos.z+Math.cos(S.yaw)*d);
          camera.position.lerp(wanted,0.16);
          var look=pos.clone();look.y+=0.8;camera.lookAt(look);
          if(!S.drag)S.orbit*=0.975;
        }
      }catch(e){console.warn('hard camera',e);}
      return old.call(this,scene,camera);
    };
    THREE.WebGLRenderer.prototype.__MOTOR_HARD_RENDER__=true;
  }
  installInput();installRender();
})();
