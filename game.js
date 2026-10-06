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
    /* The Camaro GLB already contains four complete tires; keep the old splitter from treating them as a source mesh. */
    if (window.THREE && THREE.GLTFLoader && THREE.GLTFLoader.prototype && !THREE.GLTFLoader.prototype.__motornayaCamaroWholeWheelGuard) {
      var originalLoad = THREE.GLTFLoader.prototype.load;
      THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
        var guardedLoad = function (gltf) {
          try {
            var root = gltf && gltf.scene, tires = [];
            if (root && root.traverse) root.traverse(function (node) { if (node && node.isMesh && node.name && /tire|tyre/i.test(node.name)) tires.push(node); });
            if (tires.length === 4) for (var i = 0; i < 4; i++) { var tire = tires[i], parent = tire.parent; tire.name = 'CamaroWheel_' + i; if (parent) parent.name = 'CamaroWheel_' + i + '_Group'; }
          } catch (guardError) { console.warn('Camaro whole-wheel guard:', guardError); }
          if (onLoad) onLoad(gltf);
        };
        return originalLoad.call(this, url, guardedLoad, onProgress, onError);
      };
      THREE.GLTFLoader.prototype.__motornayaCamaroWholeWheelGuard = true;
    }
    /* Camaro rims use Rim_Main; bind them to the same wheel pivots. */
    code = code.replace("if (/^(?:m:)?SM_Disk_[LR]_0000_001_SM_Disk_[LR]_0000_001_MAT_Details_Disk(?:_009)?_/i.test(node.name)) {", "if (/^(?:m:)?SM_Disk_[LR]_0000_001_SM_Disk_[LR]_0000_001_MAT_Details_Disk(?:_009)?_/i.test(node.name) || /Rim_Main/i.test(node.name)) {");
    /* Wheel visuals now point right/left correctly. Keep the car body rotation in the same sign as that visual steering. */
    code = code.replace("if (Math.abs(speed) > 0.5) heading += steering * Math.min(1.35, Math.abs(speed) / 18) * delta * (speed < 0 ? -1 : 1);", "if (Math.abs(speed) > 0.5) heading -= steering * Math.min(1.35, Math.abs(speed) / 18) * delta * (speed < 0 ? -1 : 1);");
    /* Build a richer city immediately after the original procedural city. No vehicle or camera code is changed. */
    code = code.replace("  buildCity();", "  buildCity();\n  buildCityEnhancement();");
    code = code.replace("\n})();", "\n  function buildCityEnhancement() {\n    var colors = [0x6e8795, 0x8f7f72, 0x667d72, 0x9b8b78, 0x536b80, 0x7d6f88, 0x738a83];\n    var glass = material(0x7fc7d8, 0.3, 0.2);\n    glass.emissive = new THREE.Color(0x163a46);\n    var warm = new THREE.MeshStandardMaterial({ color: 0xffd66b, emissive: 0x8a5b18, roughness: 0.32 });\n    var neon = new THREE.MeshStandardMaterial({ color: 0xd9f36a, emissive: 0x5c7a18, roughness: 0.3 });\n    var wood = material(0x654a35, 0.75, 0.05);\n    var dark = material(0x252c2b, 0.85, 0.15);\n    var flower = material(0xd65f73, 0.9, 0);\n    var concrete = material(0x8d958d, 0.9, 0);\n    function building(x,z,w,d,h,c) {\n      var b = box(scene,w,h,d,c,x,h/2,z);\n      b.castShadow = true;\n      box(scene,w+0.9,0.18,d+0.9,0x8d9482,x,0.09,z,concrete);\n      var levels=Math.max(2,Math.floor(h/1.55));\n      for(var r=0;r<levels;r++){\n        var y=1.05+r*1.35;\n        if(y>h-0.45) break;\n        for(var col=-1;col<=1;col++){\n          var ww=Math.min(0.72,(w-1.2)/3);\n          box(scene,ww,0.58,0.07,0xc8d9d1,x+col*(w*0.28),y,z+d/2+0.045, r%3===0 ? glass : warm);\n        }\n      }\n      if(h>7){\n        box(scene,w*0.72,0.12,0.12,0xd9f36a,x,h-0.55,z+d/2+0.08,neon);\n      }\n    }\n    /* Dense secondary blocks fill the empty plots without touching the road lanes. */\n    var blocks=[[-40,-40,11,12,10],[-40,-13,12,10,7],[-40,14,10,12,13],[-40,41,12,10,9],[-13,-40,10,12,8],[-13,40,12,11,12],[14,-40,12,10,11],[14,40,10,12,8],[41,-40,12,11,14],[41,-13,11,10,8],[41,14,12,12,12],[41,41,11,10,9]];\n    for(var bi=0;bi<blocks.length;bi++){ var q=blocks[bi]; building(q[0],q[1],q[2],q[3],q[4],colors[bi%colors.length]); }\n    /* Cafés, tables and benches around the central blocks. */\n    var cafes=[[-13,-13],[13,-13],[-13,13],[13,13],[-40,0],[40,0]];\n    for(var ci=0;ci<cafes.length;ci++){\n      var cx=cafes[ci][0], cz=cafes[ci][1];\n      box(scene,4.8,2.8,3.6,0x6b6258,cx,1.4,cz);\n      box(scene,5.0,0.14,3.8,0x4a514c,cx,2.85,cz);\n      for(var ti=0;ti<3;ti++){\n        var tx=cx-1.55+ti*1.55, tz=cz+2.55;\n        var top=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.52,0.1,16),wood); top.position.set(tx,0.78,tz); top.castShadow=true; scene.add(top);\n        box(scene,0.1,0.7,0.1,0x3c403d,tx,0.42,tz,dark);\n        box(scene,1.05,0.08,0.38,wood,tx-0.7,0.65,tz+0.55);\n        box(scene,1.05,0.08,0.38,wood,tx+0.7,0.65,tz-0.55);\n      }\n      for(var pi=0;pi<4;pi++){\n        var px=cx-1.5+(pi%2)*3, pz=cz-2.4+Math.floor(pi/2)*0.9;\n        box(scene,0.8,0.32,0.8,concrete,px,0.16,pz);\n        var bush=new THREE.Mesh(new THREE.SphereGeometry(0.38,8,6),material(0x4e7b58)); bush.position.set(px,0.58,pz); bush.castShadow=true; scene.add(bush);\n      }\n    }\n    /* More street furniture, planters and lamps make the sidewalks feel inhabited. */\n    for(var s=-45;s<=45;s+=9){\n      if(Math.abs(s)<7) continue;\n      addBench(s, -5.4, s%18===0);\n      addBench(-5.4, s, s%18!==0);\n      addPlanter(s, 5.4);\n      addPlanter(5.4, s);\n    }\n    function addBench(x,z,rot){\n      var g=new THREE.Group(); g.position.set(x,0,z); if(rot) g.rotation.y=Math.PI/2;\n      box(g,1.8,0.12,0.42,wood,0,0.72,0); box(g,0.12,0.5,0.12,dark,-0.62,0.45,0); box(g,0.12,0.5,0.12,dark,0.62,0.45,0); box(g,1.8,0.65,0.1,wood,0,0.95,-0.17); scene.add(g);\n    }\n    function addPlanter(x,z){\n      box(scene,1.1,0.45,1.1,concrete,x,0.22,z);\n      var crown=new THREE.Mesh(new THREE.SphereGeometry(0.52,9,7),material(0x4c8055)); crown.position.set(x,0.82,z); crown.castShadow=true; scene.add(crown);\n      var bloom=new THREE.Mesh(new THREE.SphereGeometry(0.12,7,5),flower); bloom.position.set(x+0.2,1.12,z+0.12); scene.add(bloom);\n    }\n    for(var l=-45;l<=45;l+=13){ addCityLamp(l,-5.8); addCityLamp(5.8,l); }\n    function addCityLamp(x,z){\n      box(scene,0.1,3.7,0.1,0x303936,x,1.85,z);\n      box(scene,0.75,0.12,0.18,0x4b514d,x+0.3,3.55,z);\n      var bulb=new THREE.Mesh(new THREE.SphereGeometry(0.11,8,6),warm); bulb.position.set(x+0.62,3.45,z); scene.add(bulb);\n    }\n    /* A few colorful landmarks give the city a skyline instead of a grid of plain boxes. */\n    building(0,-68,17,8,15,0x475f72); building(27,-68,10,8,20,0x755f79); building(-27,-68,12,8,12,0x7c735f);\n    for(var si=0;si<5;si++){ box(scene,0.16,0.8,0.08,0xd9f36a,-7+si*3.5,9.4,-64.0,neon); }\n  }\n})();");
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
