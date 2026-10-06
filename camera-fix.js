/* Моторная — chase camera follows the actual car turn. */
(function(){
  'use strict';
  if(window.__MOTORNAYA_CAMERA_FOLLOW_V4__)return;
  window.__MOTORNAYA_CAMERA_FOLLOW_V4__=true;
  var S={car:null,yaw:0,orbit:0,elev:-0.08,dist:13.5,ready:false,drag:false,lastX:0,lastY:0,touching:false,lastPos:null,moveYaw:0};
  function findCar(scene){
    var wheels=[];
    scene.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))wheels.push(o);});
    if(wheels.length<4)return null;
    var root=null;
    for(var p=wheels[0];p;p=p.parent){var n=0;p.traverse(function(o){if(o&&o.name&&/^CamaroWheel_[0-3](?:_Group)?$/i.test(o.name))n++;});if(n>=4){root=p;break;}}
    return root||wheels[0].parent;
  }
  function ad(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function canvas(){return document.querySelector('#scene canvas')||document.querySelector('canvas');}
  function drag(x,y){var dx=x-S.lastX,dy=y-S.lastY;S.lastX=x;S.lastY=y;if(Math.abs(dx)+Math.abs(dy)<.5)return;S.orbit+=dx*.018;S.orbit=Math.max(-Math.PI,Math.min(Math.PI,S.orbit));S.elev=Math.max(-.34,Math.min(.34,S.elev+dy*.0035));S.drag=true;}
  function installInput(){var c=canvas();if(!c){setTimeout(installInput,200);return;}if(c.__motornayaFollowInput)return;c.__motornayaFollowInput=true;c.style.touchAction='none';
    c.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'||e.pointerType==='mouse'){S.lastX=e.clientX;S.lastY=e.clientY;S.drag=false;}},{passive:false});
    c.addEventListener('pointermove',function(e){if(e.pointerType!=='touch'&&e.pointerType!=='mouse')return;if(e.buttons===0&&e.pointerType==='mouse')return;drag(e.clientX,e.clientY);if(e.cancelable)e.preventDefault();},{passive:false});
    c.addEventListener('pointerup',function(){S.drag=false;},{passive:true});c.addEventListener('pointercancel',function(){S.drag=false;},{passive:true});
    c.addEventListener('wheel',function(e){e.preventDefault();S.dist=Math.max(7,Math.min(17,S.dist+e.deltaY*.015));},{passive:false});
  }
  function installRender(){if(!window.THREE||!THREE.WebGLRenderer){setTimeout(installRender,100);return;}if(THREE.WebGLRenderer.prototype.__MOTOR_FOLLOW_RENDER_V4__)return;var old=THREE.WebGLRenderer.prototype.render;
    THREE.WebGLRenderer.prototype.render=function(scene,camera){try{
      if(!S.car)S.car=findCar(scene);
      if(S.car){
        var pos=S.car.getWorldPosition(new THREE.Vector3());
        /* The game rotates the car object itself with heading. Read that rotation directly. */
        var forward=new THREE.Vector3(0,0,1).applyQuaternion(S.car.getWorldQuaternion(new THREE.Quaternion())).normalize();
        var carYaw=Math.atan2(forward.x,forward.z);
        /* If the wheel root does not expose rotation, use the actual movement direction as fallback. */
        if(S.lastPos){var mx=pos.x-S.lastPos.x,mz=pos.z-S.lastPos.z,ml=Math.hypot(mx,mz);if(ml>.0008)S.moveYaw=Math.atan2(mx,mz);}
        S.lastPos=pos.clone();
        if(!isFinite(carYaw))carYaw=S.moveYaw;
        var rearYaw=carYaw+Math.PI;
        var desired=rearYaw+S.orbit;
        if(!S.ready){S.yaw=desired;S.ready=true;}else S.yaw+=ad(S.yaw,desired)*.18;
        var wanted=new THREE.Vector3(pos.x+Math.sin(S.yaw)*S.dist,pos.y+1.72+S.elev+S.dist*.035,pos.z+Math.cos(S.yaw)*S.dist);
        camera.position.lerp(wanted,.18);
        var look=pos.clone();look.y+=.72;camera.lookAt(look);
        if(!S.drag)S.orbit*=.97;
      }
    }catch(e){console.warn('Motornaya follow camera',e);}return old.call(this,scene,camera);};
    THREE.WebGLRenderer.prototype.__MOTOR_FOLLOW_RENDER_V4__=true;
  }
  installInput();installRender();
})();
