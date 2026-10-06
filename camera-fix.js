/* Моторная — camera follow v5. */
(function(){
'use strict';
if(window.__MOTORNAYA_CAMERA_V5__)return;window.__MOTORNAYA_CAMERA_V5__=true;
var S={car:null,yaw:0,orbit:0,elev:-.08,dist:13.5,ready:false,drag:false,lx:0,ly:0};
function findCar(scene){var w=[];scene.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))w.push(o);});if(w.length<4)return null;for(var p=w[0];p;p=p.parent){var n=0;p.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))n++;});if(n>=4)return p;}return w[0].parent||w[0];}
function ad(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function getCanvas(){return document.querySelector('#scene canvas')||document.querySelector('canvas');}
function input(){var c=getCanvas();if(!c){setTimeout(input,200);return;}if(c.__camV5)return;c.__camV5=true;c.style.touchAction='none';
c.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'||e.pointerType==='mouse'){S.drag=true;S.lx=e.clientX;S.ly=e.clientY;}},{passive:false});
c.addEventListener('pointermove',function(e){if(!S.drag||(e.pointerType!=='touch'&&e.pointerType!=='mouse'))return;var dx=e.clientX-S.lx,dy=e.clientY-S.ly;S.lx=e.clientX;S.ly=e.clientY;S.orbit=Math.max(-Math.PI*.95,Math.min(Math.PI*.95,S.orbit+dx*.014));S.elev=Math.max(-.35,Math.min(.45,S.elev+dy*.003));if(e.cancelable)e.preventDefault();},{passive:false});
c.addEventListener('pointerup',function(){S.drag=false;},{passive:true});c.addEventListener('pointercancel',function(){S.drag=false;},{passive:true});
c.addEventListener('wheel',function(e){e.preventDefault();S.dist=Math.max(7,Math.min(18,S.dist+e.deltaY*.018));},{passive:false});}
function hook(){if(!window.THREE||!THREE.WebGLRenderer){setTimeout(hook,100);return;}if(THREE.WebGLRenderer.prototype.__CAM_V5_RENDER)return;var old=THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render=function(scene,camera){
if(scene&&!scene.__CAM_V5_SCENE){scene.__CAM_V5_SCENE=true;var prev=scene.onBeforeRender;scene.onBeforeRender=function(renderer,sc,cam){if(prev)try{prev.call(this,renderer,sc,cam);}catch(_){ }try{if(!S.car)S.car=findCar(sc);if(!S.car)return;var q=S.car.getWorldQuaternion(new THREE.Quaternion());var f=new THREE.Vector3(0,0,1).applyQuaternion(q).normalize();var rear=Math.atan2(f.x,f.z)+Math.PI;var desired=rear+S.orbit;if(!S.ready){S.yaw=desired;S.ready=true;}else S.yaw+=ad(S.yaw,desired)*.22;var p=S.car.getWorldPosition(new THREE.Vector3());var wanted=new THREE.Vector3(p.x+Math.sin(S.yaw)*S.dist,p.y+2.0+S.elev+S.dist*.035,p.z+Math.cos(S.yaw)*S.dist);cam.position.lerp(wanted,.25);var look=p.clone();look.y+=.72;cam.lookAt(look);if(!S.drag)S.orbit*=.95;}catch(e){console.warn('camera v5',e);}};}
return old.call(this,scene,camera);};THREE.WebGLRenderer.prototype.__CAM_V5_RENDER=true;}
input();hook();
})();
