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

    /* Keep each Camaro tire whole. */
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

    /* Camera: automatically follows directly behind the Camaro, but touch/mouse drag can orbit around it. */
    code = code.replace("var cameraElevation = 0;", "var cameraElevation = 0;\n  var cameraDistance = 10.5;\n  var cameraZoomTarget = 10.5;\n  var pinchStartDistance = 0;\n  var pinchStartZoom = 10.5;\n  var activePointers = {};\n  var cameraManualOrbit = false;");
    code = code.replace("cameraOrbit -= deltaX * 0.006;\n    cameraElevation = Math.max(-0.4, Math.min(0.75, cameraElevation + deltaY * 0.003));", "if (Math.abs(deltaX) > 0.5) { cameraOrbit -= deltaX * 0.006; cameraManualOrbit = true; }\n    cameraElevation = Math.max(-0.28, Math.min(0.58, cameraElevation + deltaY * 0.0035));\n    var pointerIds = Object.keys(activePointers);\n    if (pointerIds.length >= 2) {\n      var p1 = activePointers[pointerIds[0]], p2 = activePointers[pointerIds[1]];\n      var pinchDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);\n      if (!pinchStartDistance) { pinchStartDistance = pinchDistance; pinchStartZoom = cameraZoomTarget; }\n      cameraZoomTarget = Math.max(6.5, Math.min(15.0, pinchStartZoom - (pinchDistance - pinchStartDistance) * 0.015));\n    }");
    code = code.replace("function beginScenePointer(event) {\n    pointerDown = true;", "function beginScenePointer(event) {\n    activePointers[event.pointerId] = { x: event.clientX, y: event.clientY };\n    if (Object.keys(activePointers).length === 2) {\n      var ids = Object.keys(activePointers), a = activePointers[ids[0]], b = activePointers[ids[1]];\n      pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);\n      pinchStartZoom = cameraZoomTarget;\n    }\n    pointerDown = true;");
    code = code.replace("function moveScenePointer(event) {\n    if (event.pointerType === 'mouse'", "function moveScenePointer(event) {\n    if (activePointers[event.pointerId]) { activePointers[event.pointerId].x = event.clientX; activePointers[event.pointerId].y = event.clientY; }\n    if (event.pointerType === 'mouse'");
    code = code.replace("function endScenePointer() {\n    pointerDown = false;", "function endScenePointer(event) {\n    if (event && activePointers[event.pointerId]) delete activePointers[event.pointerId];\n    if (Object.keys(activePointers).length < 2) pinchStartDistance = 0;\n    pointerDown = false;");
    code = code.replace("renderer.domElement.addEventListener('contextmenu', function (event) { event.preventDefault(); });", "renderer.domElement.addEventListener('wheel', function (event) {\n      event.preventDefault();\n      cameraZoomTarget = Math.max(6.5, Math.min(15.0, cameraZoomTarget + event.deltaY * 0.015));\n    }, { passive: false });\n    renderer.domElement.addEventListener('contextmenu', function (event) { event.preventDefault(); });");
    code = code.replace("var cameraHeading = heading + 0.32 + cameraOrbit;\n    var offsetX = driving ? Math.sin(cameraHeading) * 5.2 : 3.8;\n    var offsetZ = driving ? -Math.cos(cameraHeading) * 6.8 : 4.2;\n    cameraPosition.set(car.position.x + offsetX, (mobile ? 3.5 : 3.1) + cameraElevation, car.position.z + offsetZ);\n    camera.position.lerp(cameraPosition, Math.min(1, delta * (driving ? 2.7 : 3.5)));", "if (driving && !cameraManualOrbit) cameraOrbit *= Math.max(0, 1 - delta * 7);\n    var cameraHeading = driving ? heading + cameraOrbit : heading + 0.32 + cameraOrbit;\n    var distance = driving ? cameraZoomTarget : 5.8;\n    var offsetX = driving ? Math.sin(cameraHeading) * distance * 0.08 : Math.sin(cameraHeading) * 3.8;\n    var offsetZ = driving ? -Math.cos(cameraHeading) * distance : Math.cos(cameraHeading) * 5.0;\n    cameraPosition.set(car.position.x + offsetX, (mobile ? 2.55 : 2.35) + cameraElevation + distance * 0.06, car.position.z + offsetZ);\n    camera.position.lerp(cameraPosition, Math.min(1, delta * (driving ? 12 : 6)));" );

    /* Better road material and saturated city. */
    code = code.replace("var roadMat = material(0x414a47, 0.96);", "var roadCanvas = document.createElement('canvas'); roadCanvas.width = roadCanvas.height = 128; var roadCtx = roadCanvas.getContext('2d'); roadCtx.fillStyle = '#303b43'; roadCtx.fillRect(0,0,128,128); for(var rn=0;rn<1100;rn++){var rv=35+Math.floor(Math.random()*35); roadCtx.fillStyle='rgb('+rv+','+(rv+5)+','+(rv+9)+')'; roadCtx.fillRect(Math.random()*128,Math.random()*128,1+Math.random()*2,1+Math.random()*2);} var roadTexture = new THREE.CanvasTexture(roadCanvas); roadTexture.wrapS=THREE.RepeatWrapping; roadTexture.wrapT=THREE.RepeatWrapping; roadTexture.repeat.set(5,18); var roadMat = new THREE.MeshStandardMaterial({map:roadTexture, color:0xb8c4cc, roughness:0.92, metalness:0.02});");
    code = code.replace("var sidewalkMat = material(0xc5c4aa);", "var sidewalkMat = material(0xd1b98e, 0.92);");
    code = code.replace("var palette = [0xb8aa91, 0xa0b1a2, 0xc0b5a3, 0x87978f, 0xb7b8a7];", "var palette = [0xd35d57, 0x3f78a4, 0x3f9675, 0xd28b43, 0x7654a8, 0xc35c8b, 0x4e9baf];");
    code = code.replace("var windowMat = new THREE.MeshStandardMaterial({ color: 0xd4c98f, emissive: 0x5c5230, roughness: 0.4 });", "var windowMat = new THREE.MeshStandardMaterial({ color: 0x8de8ff, emissive: 0x195a72, roughness: 0.28, metalness: 0.08 });");

    /* Replace the old furniture placement with sidewalk-only positions. */
    code = code.replace("for(var s=-45;s<=45;s+=9){\n      if(Math.abs(s)<7) continue;\n      addBench(s, -5.4, s%18===0);\n      addBench(-5.4, s, s%18!==0);\n      addPlanter(s, 5.4);\n      addPlanter(5.4, s);\n    }", "var sidewalkSpots=[-45,-36,-18,-9,9,18,36,45];\n    for(var ss=0;ss<sidewalkSpots.length;ss++){\n      var s=sidewalkSpots[ss];\n      addBench(s,-5.4,ss%2===0); addBench(-5.4,s,ss%2!==0);\n      addPlanter(s,5.4); addPlanter(5.4,s);\n    }");
    code = code.replace("/* A few colorful landmarks give the city a skyline instead of a grid of plain boxes. */", "for(var rw=-54;rw<=54;rw+=27){\n      for(var rc=-54;rc<=54;rc+=27){\n        if(rw===0 && rc===0) continue;\n        for(var cw=0;cw<4;cw++){ box(scene,1.0,0.025,0.55,0xf4e7c2,rw-1.8+cw*1.2,0.056,rc-2.1); box(scene,1.0,0.025,0.55,0xf4e7c2,rw-1.8+cw*1.2,0.056,rc+2.1); }\n      }\n    }\n    /* A few colorful landmarks give the city a skyline instead of a grid of plain boxes. */");

    (0, eval)(code);

    /* Never show the old camera panel. */
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