/* Моторная — Chevrolet Camaro 1967 wheel bridge. */
(function () {
  'use strict';

  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var camaroScene = null;
  var camaroTires = [];
  var camaroRims = [];
  var originalNames = [];
  var wheelNamesActive = false;

  function isTireMesh(node) {
    return !!(node && node.isMesh && node.name && /tire|tyre/i.test(node.name));
  }

  function isRimNode(node) {
    return !!(node && node.name && /Rim_Main/i.test(node.name));
  }

  function center(node) {
    if (!node) return null;
    var box = new THREE.Box3().setFromObject(node);
    return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
  }

  function collectCamaroParts(scene) {
    camaroScene = scene;
    camaroTires = [];
    camaroRims = [];
    if (!scene) return;
    scene.traverse(function (node) {
      if (isTireMesh(node)) camaroTires.push(node);
      if (isRimNode(node)) camaroRims.push(node);
    });
  }

  /* The Camaro GLB contains FOUR already-complete physical tire meshes.
     game.js has a generic splitter intended for a single mesh containing
     four wheels. Running that splitter on one Camaro tire cuts it into
     quarters. Temporarily rename the four physical wheels so game.js takes
     its normal whole-wheel fallback path. Names are restored immediately
     after game.js finishes discoverCarParts(). */
  function protectWholeCamaroTires() {
    if (wheelNamesActive || camaroTires.length !== 4) return false;
    originalNames = [];
    for (var i = 0; i < camaroTires.length; i++) {
      var tire = camaroTires[i];
      var parent = tire.parent;
      originalNames.push({ tire: tire, tireName: tire.name, parent: parent, parentName: parent && parent.name });
      tire.name = 'CamaroWheel_' + i;
      if (parent) parent.name = 'CamaroWheel_' + i + '_Group';
    }
    wheelNamesActive = true;
    return true;
  }

  function restoreWholeCamaroTireNames() {
    if (!wheelNamesActive) return;
    for (var i = 0; i < originalNames.length; i++) {
      var item = originalNames[i];
      if (item.tire) item.tire.name = item.tireName;
      if (item.parent) item.parent.name = item.parentName;
    }
    originalNames = [];
    wheelNamesActive = false;
  }

  function findWheelPivots() {
    var result = [];
    for (var i = 0; i < camaroTires.length; i++) {
      var tire = camaroTires[i];
      if (!tire || !tire.parent) continue;
      /* game.js fallback registers the complete physical wheel parent as a
         group, then puts that group under steering pivot -> spinPivot. */
      var pivot = tire.parent.parent || tire.parent;
      if (pivot && result.indexOf(pivot) === -1) result.push(pivot);
    }
    return result;
  }

  function bindCamaroRims() {
    if (!camaroScene || camaroTires.length !== 4 || camaroRims.length < 4) return false;
    var pivots = findWheelPivots();
    if (pivots.length !== 4) return false;

    var available = camaroRims.slice();
    var bound = 0;
    for (var i = 0; i < camaroTires.length; i++) {
      var tireCenter = center(camaroTires[i]);
      if (!tireCenter) continue;
      var best = null;
      var bestDistance = Infinity;
      for (var r = 0; r < available.length; r++) {
        var rim = available[r];
        if (!rim || rim.__motornayaCamaroBound) continue;
        var rimCenter = center(rim);
        if (!rimCenter) continue;
        var distance = rimCenter.distanceTo(tireCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = rim;
        }
      }
      if (!best || bestDistance > 1.5) continue;
      var pivot = pivots[i];
      pivot.updateMatrixWorld(true);
      best.updateMatrixWorld(true);
      pivot.attach(best);
      best.__motornayaCamaroBound = true;
      bound++;
    }
    return bound === 4;
  }

  function forceLabels() {
    var selector = document.getElementById('car-selector');
    if (selector) {
      var option = selector.querySelector('option[value="bmw"]');
      if (option) option.textContent = CAMARO_LABEL;
    }
    var mini = document.querySelector('.mini-brand small');
    if (mini) mini.textContent = CAMARO_LABEL;
    var caption = document.getElementById('car-caption');
    if (caption) caption.textContent = CAMARO_LABEL;
  }

  function hookLoader() {
    if (!window.THREE || !THREE.GLTFLoader || THREE.GLTFLoader.__motornayaCamaroHooked) return false;
    var originalLoad = THREE.GLTFLoader.prototype.load;
    THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      var actualUrl = String(url || '');
      if (/^(?:\.\/)?(?:car-model|chevrolet_camaro_1967_animated)\.glb(?:\?.*)?$/i.test(actualUrl)) actualUrl = CAMARO_URL;
      return originalLoad.call(this, actualUrl, function (gltf) {
        collectCamaroParts(gltf && gltf.scene);
        protectWholeCamaroTires();
        if (onLoad) onLoad(gltf);
        /* discoverCarParts() is synchronous, so names can be restored now. */
        restoreWholeCamaroTireNames();
        setTimeout(bindCamaroRims, 0);
        setTimeout(bindCamaroRims, 50);
        setTimeout(bindCamaroRims, 150);
        setTimeout(bindCamaroRims, 350);
        setTimeout(bindCamaroRims, 700);
      }, onProgress, onError);
    };
    THREE.GLTFLoader.__motornayaCamaroHooked = true;
    return true;
  }

  hookLoader();
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceLabels);
  else forceLabels();
  setInterval(forceLabels, 500);
})();