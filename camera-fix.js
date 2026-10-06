/* Моторная — camera follow: camera is always behind the car while driving. */
(function(){
'use strict';
if(window.__MOTORNAYA_CAMERA_REAR_V7__) return;
window.__MOTORNAYA_CAMERA_REAR_V7__=true;

var S={car:null,orbit:0,elev:-0.08,dist:14,ready:false,pointers:{},pinch:0,pinchZoom:14,drag:false,lx:0,ly:0};

function findCar(scene){
  var wheels=[];
  scene.traverse(function(o){
    if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name)) wheels.push(o);
  });
  if(wheels.length<4) return null;
  for(var i=0;i<wheels.length;i++){
    for(var p=wheels[i];p;p=p.parent){
      var n=0;
      p.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name)) n++;});
      if(n>=4) return p;
    }
  }
  return wheels[0].parent||wheels[0];
}

function canvas(){return document.querySelector('#scene canvas')||document.querySelector('canvas');}

function input(){
  var c=canvas();
  if(!c){setTimeout(input,150);return;}
  if(c.__motornayaRearCameraInput)return;
  c.__motornayaRearCameraInput=true;
  c.style.touchAction='none';

  c.addEventListener('pointerdown',function(e){
    if(e.pointerType!=='touch'&&e.pointerType!=='mouse')return;
    S.pointers[e.pointerId]={x:e.clientX,y:e.clientY};
    var ids=Object.keys(S.pointers);
    if(ids.length===2){
      var a=S.pointers[ids[0]],b=S.pointers[ids[1]];
      S.pinch=Math.hypot(a.x-b.x,a.y-b.y);S.pinchZoom=S.dist;S.drag=false;
    }else{S.drag=true;S.lx=e.clientX;S.ly=e.clientY;}
    try{c.setPointerCapture(e.pointerId);}catch(_){}
    if(e.cancelable)e.preventDefault();
  },{passive:false});

  c.addEventListener('pointermove',function(e){
    if(!S.pointers[e.pointerId])return;
    S.pointers[e.pointerId].x=e.clientX;S.pointers[e.pointerId].y=e.clientY;
    var ids=Object.keys(S.pointers);
    if(ids.length>=2){
      var a=S.pointers[ids[0]],b=S.pointers[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(!S.pinch){S.pinch=d;S.pinchZoom=S.dist;}
      S.dist=Math.max(7,Math.min(20,S.pinchZoom-(d-S.pinch)*0.018));
      S.drag=false;
    }else if(S.drag){
      var dx=e.clientX-S.lx,dy=e.clientY-S.ly;
      S.lx=e.clientX;S.ly=e.clientY;
      if(Math.abs(dx)+Math.abs(dy)>.25){
        S.orbit=Math.max(-Math.PI,Math.min(Math.PI,S.orbit-dx*0.014));
        S.elev=Math.max(-0.42,Math.min(.42,S.elev+dy*.0032));
      }
    }
    if(e.cancelable)e.preventDefault();
  },{passive:false});

  function end(e){
    if(e&&e.pointerId!=null)delete S.pointers[e.pointerId];
    if(Object.keys(S.pointers).length<2)S.pinch=0;
    if(Object.keys(S.pointers).length===0)S.drag=false;
  }
  c.addEventListener('pointerup',end,{passive:true});
  c.addEventListener('pointercancel',end,{passive:true});
  c.addEventListener('pointerout',function(e){if(e.pointerType==='mouse')end(e);},{passive:true});
  c.addEventListener('wheel',function(e){
    e.preventDefault();S.dist=Math.max(7,Math.min(20,S.dist+e.deltaY*.018));
  },{passive:false});
}

function hook(){
  if(!window.THREE||!THREE.WebGLRenderer){setTimeout(hook,100);return;}
  if(THREE.WebGLRenderer.prototype.__MOTORNAYA_REAR_CAMERA_RENDER)return;
  var old=THREE.WebGLRenderer.prototype.render;

  THREE.WebGLRenderer.prototype.render=function(scene,camera){
    try{
      if(!S.car)S.car=findCar(scene);
      if(S.car){
        var p=S.car.getWorldPosition(new THREE.Vector3());
        /* The game moves the Camaro with heading: x += sin(heading), z += cos(heading).
           Therefore the camera rear direction is exactly heading + PI. */
        var heading=S.car.rotation.y;
        if(!isFinite(heading))heading=0;
        var yaw=heading+Math.PI+S.orbit;
        var wanted=new THREE.Vector3(
          p.x+Math.sin(yaw)*S.dist,
          p.y+1.62+S.elev+S.dist*.035,
          p.z-Math.cos(yaw)*S.dist
        );
        if(!S.ready){camera.position.copy(wanted);S.ready=true;}
        else camera.position.lerp(wanted,.20);
        var look=p.clone();
        look.y+=.68;
        camera.lookAt(look);
        if(!S.drag&&Object.keys(S.pointers).length===0){
          S.orbit*=.90;
          S.elev*=.90;
        }
      }
    }catch(e){console.warn('Motornaya rear camera',e);}
    return old.call(this,scene,camera);
  };
  THREE.WebGLRenderer.prototype.__MOTORNAYA_REAR_CAMERA_RENDER=true;
}

S.dist=14;
input();
hook();
})();
