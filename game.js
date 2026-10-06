(function () {
  'use strict';
  var source = 'https://raw.githubusercontent.com/stalincar82-eng/-r-mexanik/2e159d7a6b39f8af004d8b8e13db3e4080a7e3c7/game.js';
  var xhr = new XMLHttpRequest();
  try {
    xhr.open('GET', source, false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) throw new Error('HTTP ' + xhr.status);
    var code = xhr.responseText;

    code = code.replace("bmw: { url: 'car-model.glb', label: 'BMW M3 GTR', targetLength: 4.2 },", "bmw: { url: '1967_chevrolet_camaro_ss_350_coupe.glb', label: 'CHEVROLET CAMARO SS · 1967', targetLength: 4.2 },");
    code = code.replace("var targetSteering = (left ? 1 : 0) - (right ? 1 : 0);", "var targetSteering = (right ? 1 : 0) - (left ? 1 : 0);");

    if (window.THREE && THREE.GLTFLoader && THREE.GLTFLoader.prototype && !THREE.GLTFLoader.prototype.__motornayaCamaroWholeWheelGuard) {
      var originalLoad = THREE.GLTFLoader.prototype.load;
      THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
        var guardedLoad = function (gltf) {
          try {
            var root = gltf && gltf.scene, tires = [];
            if (root && root.traverse) root.traverse(function (node) {
              if (node && node.isMesh && node.name && /tire|tyre/i.test(node.name)) tires.push(node);
            });
            if (tires.length === 4) {
              for (var i = 0; i < 4; i++) {
                var tire = tires[i], parent = tire.parent;
                tire.name = 'CamaroWheel_' + i;
                if (parent) parent.name = 'CamaroWheel_' + i + '_Group';
              }
            }
          } catch (e) { console.warn('Camaro wheel guard:', e); }
          if (onLoad) onLoad(gltf);
        };
        return originalLoad.call(this, url, guardedLoad, onProgress, onError);
      };
      THREE.GLTFLoader.prototype.__motornayaCamaroWholeWheelGuard = true;
    }

    code = code.replace("if (/^(?:m:)?SM_Disk_[LR]_0000_001_SM_Disk_[LR]_0000_001_MAT_Details_Disk(?:_009)?_/i.test(node.name)) {", "if (/^(?:m:)?SM_Disk_[LR]_0000_001_SM_Disk_[LR]_0000_001_MAT_Details_Disk(?:_009)?_/i.test(node.name) || /Rim_Main/i.test(node.name)) {");
    code = code.replace("if (Math.abs(speed) > 0.5) heading += steering * Math.min(1.35, Math.abs(speed) / 18) * delta * (speed < 0 ? -1 : 1);", "if (Math.abs(speed) > 0.5) heading -= steering * Math.min(1.35, Math.abs(speed) / 18) * delta * (speed < 0 ? -1 : 1);");

    var camStart = code.indexOf('function updateCamera(delta) {');
    if (camStart >= 0) {
      var camEnd = code.indexOf('\n  function ', camStart + 10);
      if (camEnd > camStart) {
        var nativeCamera = "function updateCamera(delta) {\n    if (!car) return;\n    cameraDistance += (cameraZoomTarget - cameraDistance) * Math.min(1, delta * 7);\n    if (!cameraManualOrbit) {\n      cameraOrbit += (0 - cameraOrbit) * Math.min(1, delta * 2.2);\n      cameraElevation += (0 - cameraElevation) * Math.min(1, delta * 2.0);\n    }\n    /* Camera follows the same heading vector as the original chase camera: this is the rear of the Camaro. */\n    var followYaw = heading + cameraOrbit;\n    var followDistance = driving ? cameraDistance : 7.0;\n    var rearX = Math.sin(followYaw) * followDistance;\n    var rearZ = -Math.cos(followYaw) * followDistance;\n    cameraPosition.set(car.position.x + rearX, car.position.y + 2.05 + cameraElevation + followDistance * 0.045, car.position.z + rearZ);\n    camera.position.lerp(cameraPosition, Math.min(1, delta * 12.0));\n    cameraTarget.set(car.position.x, car.position.y + 0.72, car.position.z);\n    camera.lookAt(cameraTarget);\n  }";
        code = code.slice(0, camStart) + nativeCamera + code.slice(camEnd);
      }
    }

    code = code.replace("var cameraElevation = 0;", "var cameraElevation = 0;\n  var cameraDistance = 12.5;\n  var cameraZoomTarget = 12.5;\n  var cameraManualOrbit = false;\n  var motornayaPointers = {};\n  var motornayaPinchStart = 0;\n  var motornayaPinchZoom = 12.5;");

    var cameraInputCode = "\n  function installMotornayaCameraInput() {\n    if (!renderer || !renderer.domElement || renderer.domElement.__motornayaNativeCameraInput) return;\n    var canvas = renderer.domElement;\n    canvas.__motornayaNativeCameraInput = true;\n    canvas.style.touchAction = 'none';\n    function ids() { return Object.keys(motornayaPointers); }\n    function distance2(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }\n    canvas.addEventListener('pointerdown', function(e) {\n      if (e.pointerType !== 'touch' && e.pointerType !== 'mouse') return;\n      e.preventDefault(); e.stopImmediatePropagation();\n      try { canvas.setPointerCapture(e.pointerId); } catch(_) {}\n      motornayaPointers[e.pointerId] = {x:e.clientX,y:e.clientY};\n      var list = ids();\n      if (list.length === 2) { var a=motornayaPointers[list[0]],b=motornayaPointers[list[1]]; motornayaPinchStart=distance2(a,b); motornayaPinchZoom=cameraZoomTarget; cameraManualOrbit=true; } else cameraManualOrbit=true;\n    }, true);\n    canvas.addEventListener('pointermove', function(e) {\n      if (!motornayaPointers[e.pointerId]) return;\n      e.preventDefault(); e.stopImmediatePropagation();\n      var p=motornayaPointers[e.pointerId], dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;\n      var list=ids();\n      if (list.length >= 2) { var a=motornayaPointers[list[0]],b=motornayaPointers[list[1]],d=distance2(a,b); if (!motornayaPinchStart) { motornayaPinchStart=d; motornayaPinchZoom=cameraZoomTarget; } cameraZoomTarget=Math.max(7,Math.min(18,motornayaPinchZoom-(d-motornayaPinchStart)*0.018)); }\n      else { cameraOrbit += dx * 0.012; cameraElevation = Math.max(-0.5,Math.min(0.6,cameraElevation + dy * 0.004)); }\n    }, true);\n    function end(e) { if (e) { delete motornayaPointers[e.pointerId]; try { canvas.releasePointerCapture(e.pointerId); } catch(_) {} } if (ids().length < 2) motornayaPinchStart=0; if (ids().length === 0) cameraManualOrbit=false; }\n    canvas.addEventListener('pointerup', end, true); canvas.addEventListener('pointercancel', end, true); canvas.addEventListener('pointerleave', function(e){ if(e.pointerType==='mouse') end(e); }, true);\n    canvas.addEventListener('wheel', function(e){ e.preventDefault(); e.stopImmediatePropagation(); cameraZoomTarget=Math.max(7,Math.min(18,cameraZoomTarget+e.deltaY*0.018)); }, {capture:true,passive:false});\n  }\n";
    var inputMarker = "\n  /* MOTORNAYA_NATIVE_CAMERA_INPUT */\n";
    code = code.replace("  animate();", cameraInputCode + inputMarker + "  installMotornayaCameraInput();\n  animate();");

    code = code.replace("var roadMat = material(0x414a47, 0.96);", "var roadCanvas = document.createElement('canvas'); roadCanvas.width = roadCanvas.height = 128; var roadCtx = roadCanvas.getContext('2d'); roadCtx.fillStyle = '#303b43'; roadCtx.fillRect(0,0,128,128); for(var rn=0;rn<1100;rn++){var rv=35+Math.floor(Math.random()*35); roadCtx.fillStyle='rgb('+rv+','+(rv+5)+','+(rv+9)+')'; roadCtx.fillRect(Math.random()*128,Math.random()*128,1+Math.random()*2,1+Math.random()*2);} var roadTexture = new THREE.CanvasTexture(roadCanvas); roadTexture.wrapS=THREE.RepeatWrapping; roadTexture.wrapT=THREE.RepeatWrapping; roadTexture.repeat.set(5,18); var roadMat = new THREE.MeshStandardMaterial({map:roadTexture, color:0xb8c4cc, roughness:0.92, metalness:0.02});");
    code = code.replace("var sidewalkMat = material(0xc5c4aa);", "var sidewalkMat = material(0xd1b98e, 0.92);");
    code = code.replace("var palette = [0xb8aa91, 0xa0b1a2, 0xc0b5a3, 0x87978f, 0xb7b8a7];", "var palette = [0xd35d57, 0x3f78a4, 0x3f9675, 0xd28b43, 0x7654a8, 0xc35c8b, 0x4e9baf];");
    code = code.replace("var windowMat = new THREE.MeshStandardMaterial({ color: 0xd4c98f, emissive: 0x5c5230, roughness: 0.4 });", "var windowMat = new THREE.MeshStandardMaterial({ color: 0x8de8ff, emissive: 0x195a72, roughness: 0.28, metalness: 0.08 });");

    (0, eval)(code);

    function removeGarageCameraPanel() { var panel = document.getElementById('garage-camera-controls'); if (panel) panel.remove(); }
    var cameraStyle = document.getElementById('motornaya-camera-kill-style');
    if (!cameraStyle) { cameraStyle = document.createElement('style'); cameraStyle.id = 'motornaya-camera-kill-style'; cameraStyle.textContent = '#garage-camera-controls{display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}'; document.head.appendChild(cameraStyle); }
    removeGarageCameraPanel();
    if (window.MutationObserver) new MutationObserver(removeGarageCameraPanel).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(removeGarageCameraPanel, 500);
    function syncCamaroBrand() { var select = document.getElementById('car-selector'); if (select) { var option = select.querySelector('option[value="bmw"]'); if (option) option.textContent = 'CHEVROLET CAMARO SS · 1967'; if (!select.value) select.value = 'bmw'; } var brand = document.querySelector('.mini-brand small'); if (brand) brand.textContent = 'CHEVROLET CAMARO SS · 1967'; }
    syncCamaroBrand(); setTimeout(syncCamaroBrand, 250); setTimeout(syncCamaroBrand, 1000);
  } catch (error) { console.error('Motornaya game recovery loader failed', error); var warning = document.getElementById('webgl-warning'), copy = document.getElementById('warning-copy'); if (warning) warning.classList.remove('is-hidden'); if (copy) copy.textContent = 'Не удалось загрузить игровой модуль. Обнови страницу и проверь интернет-соединение.'; }
})();