/* Моторная — camera follow v6: apply AFTER the game's own camera update/render. */
(function(){
'use strict';
if(window.__MOTORNAYA_CAMERA_V6__)return;
window.__MOTORNAYA_CAMERA_V6__=true;
var S={car:null,yaw:0,orbit:0,elev:-0.10,dist:14,ready:false,pointers:{},pinch:0,pinchZoom:14,drag:false};
function findCar(scene){
  var wheels=[];
  scene.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))wheels.push(o);});
  if(wheels.length<4)return null;
  for(var i=0;i<wheels.length;i++)for(var p=wheels[i];p;p=p.parent){var n=0;p.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))n++;});if(n>=4)return p;}
  return wheels[0].parent||wheels[0];
}
function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function canvas(){return document.querySelector('#scene canvas')||document.querySelector('canvas');}
function input(){var c=canvas();if(!c){setTimeout(input,150);return;}if(c.__motornayaV6Input)return;c.__motornayaV6Input=true;c.style.touchAction='none';
 c.addEventListener('pointerdown',function(e){if(e.pointerType!=='touch'&&e.pointerType!=='mouse')return;S.pointers[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(S.pointers);if(ids.length===2){var a=S.pointers[ids[0]],b=S.pointers[ids[1]];S.pinch=Math.hypot(a.x-b.x,a.y-b.y);S.pinchZoom=S.dist;S.drag=false;}else{S.drag=true;S.lx=e.clientX;S.ly=e.clientY;}if(c.setPointerCapture)try{c.setPointerCapture(e.pointerId);}catch(_){}if(e.cancelable)e.preventDefault();},{passive:false});
 c.addEventListener('pointermove',function(e){if(!S.pointers[e.pointerId])return;S.pointers[e.pointerId].x=e.clientX;S.pointers[e.pointerId].y=e.clientY;var ids=Object.keys(S.pointers);if(ids.length>=2){var a=S.pointers[ids[0]],b=S.pointers[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y);if(!S.pinch){S.pinch=d;S.pinchZoom=S.dist;}S.dist=Math.max(7,Math.min(20,S.pinchZoom-(d-S.pinch)*0.018));S.drag=false;}else if(S.drag){var dx=e.clientX-S.lx,dy=e.clientY-S.ly;S.lx=e.clientX;S.ly=e.clientY;if(Math.abs(dx)+Math.abs(dy)>.25){S.orbit=Math.max(-Math.PI,Math.min(Math.PI,S.orbit-dx*0.014));S.elev=Math.max(-0.42,Math.min(.42,S.elev+dy*.0032));}}if(e.cancelable)e.preventDefault();},{passive:false});
 function end(e){if(e&&e.pointerId!=null)delete S.pointers[e.pointerId];if(Object.keys(S.pointers).length<2)S.pinch=0;S.drag=false;}
 c.addEventListener('pointerup',end,{passive:true});c.addEventListener('pointercancel',end,{passive:true});c.addEventListener('pointerout',function(e){if(e.pointerType==='mouse')end(e);},{passive:true});
 c.addEventListener('wheel',function(e){e.preventDefault();S.dist=Math.max(7,Math.min(20,S.dist+e.deltaY*.018));},{passive:false});
}
function hook(){if(!window.THREE||!THREE.WebGLRenderer){setTimeout(hook,100);return;}if(THREE.WebGLRenderer.prototype.__MOTORNAYA_V6_RENDER)return;var old=THREE.WebGLRenderer.prototype.render;
 THREE.WebGLRenderer.prototype.render=function(scene,camera){
   var result=old.call(this,scene,camera);
   try{
     if(!S.car)S.car=findCar(scene);
     if(S.car){
       var p=S.car.getWorldPosition(new THREE.Vector3());
       var q=S.car.getWorldQuaternion(new THREE.Quaternion());
       var f=new THREE.Vector3(0,0,1).applyQuaternion(q).normalize();
       var carYaw=Math.atan2(f.x,f.z);
       var moving=false;
       if(S.lastP){var dx=p.x-S.lastP.x,dz=p.z-S.lastP.z;if(Math.hypot(dx,dz)>.0008){moving=true;S.moveYaw=Math.atan2(dx,dz);}}
       S.lastP=p.clone();
       if(!isFinite(carYaw))carYaw=S.moveYaw||0;
       var travelYaw=(typeof S.moveYaw==='number'&&moving&&window.__motornayaReverseCamera)?S.moveYaw:carYaw;
       var desired=travelYaw+Math.PI+S.orbit;
       if(!S.ready){S.yaw=desired;S.ready=true;}else S.yaw+=angleDelta(S.yaw,desired)*.20;
       var wanted=new THREE.Vector3(p.x+Math.sin(S.yaw)*S.dist,p.y+1.65+S.elev+S.dist*.035,p.z+Math.cos(S.yaw)*S.dist);
       camera.position.lerp(wanted,.32);
       var look=p.clone();look.y+=.68;camera.lookAt(look);
       if(!S.drag&&Object.keys(S.pointers).length===0)S.orbit*=.965;
     }
   }catch(e){console.warn('Motornaya camera v6',e);}
   return result;
 };
 THREE.WebGLRenderer.prototype.__MOTORNAYA_V6_RENDER=true;
}
S.dist=14;S.lx=0;S.ly=0;
input();hook();
})();
