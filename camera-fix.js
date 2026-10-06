/* Моторная — stable chase camera controller. */
(function(){
  'use strict';
  var state={orbit:0,elevation:-0.10,distance:11.5,pointers:{},pinch:0,pinchZoom:11.5,car:null,ready:false};
  var lastTime=performance.now();
  function findCar(scene){
    var wheels=[];
    scene.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](_Group)?$/i.test(o.name))wheels.push(o);});
    if(wheels.length<2)return null;
    var a=wheels[0], cur=a;
    while(cur&&cur.parent){
      var count=0;
      cur.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](_Group)?$/i.test(o.name))count++;});
      if(count>=4)return cur;
      cur=cur.parent;
    }
    return a.parent||a;
  }
  function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function install(){
    if(!window.THREE||THREE.WebGLRenderer.prototype.__motornayaStableCamera)return;
    var oldRender=THREE.WebGLRenderer.prototype.render;
    THREE.WebGLRenderer.prototype.render=function(scene,camera){
      try{
        if(!state.car)state.car=findCar(scene);
        if(state.car){
          var now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
          var q=state.car.getWorldQuaternion(new THREE.Quaternion());
          var forward=new THREE.Vector3(0,0,1).applyQuaternion(q).normalize();
          var baseYaw=Math.atan2(forward.x,forward.z);
          var desiredYaw=baseYaw+state.orbit+Math.PI;
          if(!state.ready){state.yaw=desiredYaw;state.ready=true;}
          else state.yaw+=angleDelta(state.yaw,desiredYaw)*Math.min(1,dt*9);
          if(Object.keys(state.pointers).length===0){state.orbit*=Math.max(0,1-dt*1.15);}
          var dist=state.distance;
          var x=state.car.position.x+Math.sin(state.yaw)*dist;
          var z=state.car.position.z+Math.cos(state.yaw)*dist;
          camera.position.x+=(x-camera.position.x)*Math.min(1,dt*9);
          camera.position.y+=(((state.car.position.y+2.15+state.elevation+dist*.045))-camera.position.y)*Math.min(1,dt*9);
          camera.position.z+=(z-camera.position.z)*Math.min(1,dt*9);
          var target=state.car.position.clone();target.y+=.85;
          camera.lookAt(target);
        }
      }catch(e){console.warn('Stable camera:',e);}
      return oldRender.call(this,scene,camera);
    };
    THREE.WebGLRenderer.prototype.__motornayaStableCamera=true;
    function canvas(){return document.querySelector('#scene canvas');}
    function point(e){return{x:e.clientX,y:e.clientY};}
    function down(e){var c=canvas();if(!c||e.target!==c)return;state.pointers[e.pointerId]=point(e);if(Object.keys(state.pointers).length===2){var ids=Object.keys(state.pointers),a=state.pointers[ids[0]],b=state.pointers[ids[1]];state.pinch=Math.hypot(a.x-b.x,a.y-b.y);state.pinchZoom=state.distance;}if(c.setPointerCapture)try{c.setPointerCapture(e.pointerId);}catch(_){}}
    function move(e){if(!state.pointers[e.pointerId])return;var p=state.pointers[e.pointerId],dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;var ids=Object.keys(state.pointers);if(ids.length>=2){var a=state.pointers[ids[0]],b=state.pointers[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y);if(!state.pinch)state.pinch=d;state.distance=Math.max(6,Math.min(16,state.pinchZoom-(d-state.pinch)*.018));}else{state.orbit+=dx*.012;state.orbit=Math.max(-Math.PI*.95,Math.min(Math.PI*.95,state.orbit));state.elevation=Math.max(-.35,Math.min(.35,state.elevation+dy*.0025));}if(e.cancelable)e.preventDefault();}
    function up(e){delete state.pointers[e.pointerId];if(Object.keys(state.pointers).length<2)state.pinch=0;}
    document.addEventListener('pointerdown',down,{passive:false});document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up,{passive:true});document.addEventListener('pointercancel',up,{passive:true});
    document.addEventListener('wheel',function(e){var c=canvas();if(!c||e.target!==c)return;e.preventDefault();state.distance=Math.max(6,Math.min(16,state.distance+e.deltaY*.018));},{passive:false});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
