/* Моторная — Chevrolet Camaro 1967 model bridge. */
(function () {
  'use strict';
  var mixers = [];
  var last = performance.now();
  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var camaroRims = [];
  var camaroScene = null;

  function isRimNode(node) {
    return !!(node && node.name && /Rim_Main/i.test(node.name));
  }

  function normalizeCamaroWheelNodes(scene) {
    if (!scene || scene.__motornayaCamaroWheelsNormalized) return;
    camaroScene = scene;
    camaroRims = [];

    /* Keep every Rim_Main candidate. Some Camaro exports put the four rims
       inside a common parent, so rejecting nested Rim_Main nodes can leave
       only one physical rim available. The binder below chooses one real
       rim per wheel by world-space proximity. */
    scene.traverse(function (node) {
      if (isRimNode(node)) camaroRims.push(node);
    });

    scene.__motornayaCamaroRims = camaroRims;
    scene.__motornayaCamaroWheelsNormalized = true;
  }

  function boundsCenter(node) {
    var bounds = new THREE.Box3().setFromObject(node);
    return bounds.isEmpty() ? null : bounds.getCenter(new THREE.Vector3());
  }

  function boundsVolume(node) {
    var bounds = new THREE.Box3().setFromObject(node);
    if (bounds.isEmpty()) return 0;
    var size = bounds.getSize(new THREE.Vector3());
    return size.x * size.y * size.z;
  }

  function findActualTireMeshes() {
    var tires = [];
    if (!camaroScene) return tires;
    camaroScene.traverse(function (node) {
      if (!node || !node.name || !node.isMesh || !node.visible) return;
      /* splitTireMesh creates exactly four visible meshes named *_wheel_0..3
         and parents each one to the steering/spin pivot. */
      if (!/_wheel_[0-3]$/i.test(node.name)) return;
      if (!/tire|tyre/i.test(node.name)) return;
      if (!node.parent) return;
      tires.push(node);
    });
    return tires;
  }

  function bindAllCamaroRims() {
    if (!camaroScene || !camaroRims.length) return false;

    var tires = findActualTireMeshes();
    if (tires.length < 4) return false;

    var available = camaroRims.slice();
    var bound = 0;

    /* Process each actual tire and choose the nearest unused Rim_Main node.
       If several nodes occupy the same wheel, prefer the largest node because
       it is normally the parent carrying the complete visible rim assembly. */
    for (var tireIndex = 0; tireIndex < tires.length; tireIndex++) {
      var tire = tires[tireIndex];
      var tireCenter = boundsCenter(tire);
      if (!tireCenter) continue;

      var best = null;
      var bestDistance = Infinity;
      var bestVolume = -1;
      for (var rimIndex = 0; rimIndex < available.length; rimIndex++) {
        var rim = available[rimIndex];
        if (!rim || rim.__motornayaRimBound) continue;
        var center = boundsCenter(rim);
        if (!center) continue;
        var distance = center.distanceTo(tireCenter);
        var volume = boundsVolume(rim);
        if (distance < bestDistance - 0.02 || (Math.abs(distance - bestDistance) <= 0.02 && volume > bestVolume)) {
          best = rim;
          bestDistance = distance;
          bestVolume = volume;
        }
      }

      /* Camaro is already scaled by game.js. A real rim is virtually at the
         tire centre; anything much farther away is body/chrome geometry. */
      if (!best || bestDistance > 1.25) continue;

      var spinPivot = tire.parent;
      if (!spinPivot) continue;
      spinPivot.updateMatrixWorld(true);
      best.updateMatrixWorld(true);
      spinPivot.attach(best);
      best.__motornayaRimBound = true;
      spinPivot.__motornayaCamaroRimBound = true;
      bound++;
    }

    return bound >= 4;
  }

  function scheduleRimBinding() {
    /* game.js creates/splits the wheel meshes inside its GLTF onLoad callback.
       Run after that callback, then retry briefly so all four pivots are present. */
    var delays = [0, 40, 120, 300, 700, 1200];
    for (var i = 0; i < delays.length; i++) {
      (function (delay) {
        setTimeout(function () {
          if (bindAllCamaroRims()) return;
        }, delay);
      })(delays[i]);
    }
  }

  function hookWheelPivotAttachment() {
    if (!window.THREE || !THREE.Object3D || !THREE.Object3D.prototype.attach || THREE.Object3D.prototype.__motornayaCamaroAttachHooked) return false;
    var originalAttach = THREE.Object3D.prototype.attach;
    THREE.Object3D.prototype.attach = function (object) {
      originalAttach.call(this, object);
      /* Keep the old immediate path as a fast first pass. The post-load
         reconciliation above is authoritative and catches all four wheels. */
      if (object && object.name && /tire|tyre/i.test(object.name) && camaroRims.length) {
        bindAllCamaroRims();
      }
    };
    THREE.Object3D.prototype.__motornayaCamaroAttachHooked = true;
    return true;
  }

  function startMixer(gltf) {
    if (!gltf || !gltf.scene || !gltf.animations || !gltf.animations.length || !window.THREE) return;
    var mixer = new THREE.AnimationMixer(gltf.scene);
    for (var i = 0; i < gltf.animations.length; i++) {
      mixer.clipAction(gltf.animations[i]).reset().setLoop(THREE.LoopRepeat, Infinity).play();
    }
    mixers.push(mixer);
  }

  function hookLoader() {
    if (!window.THREE || !THREE.GLTFLoader || THREE.GLTFLoader.__motornayaCamaroHooked) return false;
    var originalLoad = THREE.GLTFLoader.prototype.load;
    THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      var actualUrl = String(url || '');
      if (/^(?:\.\/)?(?:car-model|chevrolet_camaro_1967_animated)\.glb(?:\?.*)?$/i.test(actualUrl)) actualUrl = CAMARO_URL;
      return originalLoad.call(this, actualUrl, function (gltf) {
        normalizeCamaroWheelNodes(gltf && gltf.scene);
        startMixer(gltf);
        if (onLoad) onLoad(gltf);
        scheduleRimBinding();
      }, onProgress, onError);
    };
    THREE.GLTFLoader.__motornayaCamaroHooked = true;
    return true;
  }

  function forceCamaroLabels() {
    var selector = document.getElementById('car-selector');
    if (selector) {
      var oldOption = selector.querySelector('option[value="bmw"]');
      if (oldOption) oldOption.textContent = CAMARO_LABEL;
    }
    var mini = document.querySelector('.mini-brand small');
    if (mini) mini.textContent = CAMARO_LABEL;
    var caption = document.getElementById('car-caption');
    if (caption) caption.textContent = CAMARO_LABEL;
  }

  function frame(now) {
    var delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (var i = 0; i < mixers.length; i++) if (mixers[i]) mixers[i].update(delta);
    requestAnimationFrame(frame);
  }

  hookWheelPivotAttachment();
  hookLoader();
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    hookWheelPivotAttachment();
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceCamaroLabels);
  else forceCamaroLabels();
  setInterval(forceCamaroLabels, 500);
  requestAnimationFrame(frame);
})();