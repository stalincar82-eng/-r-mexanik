/* Моторная — hard chase camera + forced mobile swipe. */
(function(){
  'use strict';
  if(window.__MOTORNAYA_CAMERA_HARD_V2__)return;
  window.__MOTORNAYA_CAMERA_HARD_V2__=true;
  var S={car:null,yaw:0,orbit:0,elev:-0.10,dist:13.5,ready:false,drag:false,lastX:0,lastY:0,touching:false};
  function findCar(scene){var wheels=[];scene.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))wheels.push(o);});if(wheels.length<4)return null;var root=null;for(var p=wheels[0];p;p=p.parent){var n=0;p.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))n++;});if(n>=4){root=p;break;}}return root||wheels[0].parent;}
  function ad(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function getCanvas(){return document.querySelector('#scene canvas')||document.querySelector('canvas');}
  function insideCanvas(x,y){var c=getCanvas();if(!c)return false;var r=c.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
  function applyDrag(x,y){var dx=x-S.lastX,dy=y-S.lastY;S.lastX=x;S.lastY=y;if(Math.abs(dx)+Math.abs(dy)<0.5)return;S.orbit+=dx*0.020;S.orbit=Math.max(-Math.PI,Math.min(Math.PI,S.orbit));S.elev=Math.max(-0.34,Math.min(0.34,S.elev+dy*0.004));S.drag=true;}
  function installInput(){var c=getCanvas();if(!c){setTimeout(installInput,200);return;}c.style.touchAction='none';c.style.webkitTouchCallout='none';c.style.webkitUserSelect='none';c.style.userSelect='none';if(c.__motornayaTouchV2)return;c.__motornayaTouchV2=true;
    document.addEventListener('touchstart',function(e){if(!e.touches.length)return;var t=e.touches[0];if(!insideCanvas(t.clientX,t.clientY))return;S.touching=true;S.drag=false;S.lastX=t.clientX;S.lastY=t.clientY;e.preventDefault();},{capture:true,passive:false});
    document.addEventListener('touchmove',function(e){if(!S.touching||!e.touches.length)return;var t=e.touches[0];applyDrag(t.clientX,t.clientY);e.preventDefault();},{capture:true,passive:false});
    document.addEventListener('touchend',function(){S.touching=false;S.drag=false;},{capture:true,passive:false});document.addEventListener('touchcancel',function(){S.touching=false;S.drag=false;},{capture:true,passive:false});
    document.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'&&!insideCanvas(e.clientX,e.clientY))return;if(e.pointerType==='touch'||e.pointerType==='mouse'){S.lastX=e.clientX;S.lastY=e.clientY;S.drag=true;}},{capture:true,passive:true});
    document.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse'&&e.pointerType!=='touch')return;if(e.pointerType==='touch'&&(!S.touching||!insideCanvas(e.clientX,e.clientY)))return;if(e.pointerType==='mouse'&&!S.drag)return;applyDrag(e.clientX,e.clientY);if(e.pointerType==='touch'&&e.cancelable)e.preventDefault();},{capture:true,passive:false});
    document.addEventListener('pointerup',function(e){if(e.pointerType==='mouse'||e.pointerType==='touch'){S.drag=false;if(e.pointerType==='touch')S.touching=false;}},{capture:true,passive:true});
  }
  function installRender(){if(!window.THREE||!THREE.WebGLRenderer){setTimeout(installRender,100);return;}if(THREE.WebGLRenderer.prototype.__MOTOR_HARD_RENDER_V2__)return;var old=THREE.WebGLRenderer.prototype.render;THREE.WebGLRenderer.prototype.render=function(scene,camera){try{if(!S.car)S.car=findCar(scene);if(S.car){var q=S.car.getWorldQuaternion(new THREE.Quaternion());var forward=new THREE.Vector3(0,0,1).applyQuaternion(q).normalize();var rearYaw=Math.atan2(forward.x,forward.z)+Math.PI;var desired=rearYaw+S.orbit;if(!S.ready){S.yaw=desired;S.ready=true;}else S.yaw+=ad(S.yaw,desired)*0.12;var pos=S.car.getWorldPosition(new THREE.Vector3());var wanted=new THREE.Vector3(pos.x+Math.sin(S.yaw)*S.dist,pos.y+1.75+S.elev,pos.z+Math.cos(S.yaw)*S.dist);camera.position.lerp(wanted,0.18);var look=pos.clone();look.y+=0.72;camera.lookAt(look);if(!S.drag)S.orbit*=0.985;}}catch(e){console.warn('hard camera v2',e);}return old.call(this,scene,camera);};THREE.WebGLRenderer.prototype.__MOTOR_HARD_RENDER_V2__=true;}
  installInput();installRender();
})();
