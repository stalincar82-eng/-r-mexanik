/* Моторная — Chevrolet Camaro 1967 model bridge. */
(function () {
  'use strict';
  var mixers = [];
  var last = performance.now();
  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var camaroModelRoot = null;
  var camaroRims = [];

  function normalizeCamaroWheelNodes(scene) {
    if (!scene || scene.__motornayaCamaroWheelsNormalized) return;
    var wheelIndex = 0;
    camaroRims = [];
    scene.traverse(function (node) {
      if (!node || !node.name) return;

      /* Mark only the real tyre meshes. Do NOT rename the Camaro rim nodes:
         game.js has a legacy BMW disk detector, and leaving the rim names
         untouched lets this bridge exclusively control their attachment. */
      if (/tire|tyre/i.test(node.name) && node.isMesh) {
        node.name = 'CAMARO_WHEEL_GROUP_' + wheelIndex++;
        return;
      }

      if (/Rim_Main/i.test(node.name)) camaroRims.push(node);
    });
    camaroModelRoot = scene;
    scene.__motornayaCamaroWheelsNormalized = true;
  }

  function rimCenter(node) {
    var bounds = new THREE.Box3().setFromObject(node);
    return bounds.isEmpty() ? null : bounds.getCenter(new THREE.Vector3());
  }

  function bindRimToSteeringPivot(pivot, tire) {
    if (!camaroModelRoot || !pivot || !tire || !camaroRims.length) return;

    var tireBounds = new THREE.Box3().setFromObject(tire);
    if (tireBounds.isEmpty()) return;
    var tireCenter = tireBounds.getCenter(new THREE.Vector3());

    var best = null;
    var bestDistance = Infinity;
    for (var i = 0; i < camaroRims.length; i++) {
      var rim = camaroRims[i];
      if (!rim || rim.__motornayaRimBound) continue;
      var center = rimCenter(rim);
      if (!center) continue;
      var distance = center.distanceTo(tireCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = rim;
      }
    }

    /* The Camaro wheel is compact, so a rim farther than this is not the
       matching wheel. This also prevents accidentally grabbing body chrome. */
    if (!best || bestDistance > 0.9) return;

    pivot.updateMatrixWorld(true);
    best.updateMatrixWorld(true);
    pivot.attach(best);
    best.__motornayaRimBound = true;
  }

  function hookWheelPivotAttachment() {
    if (!window.THREE || !THREE.Object3D || !THREE.Object3D.prototype.attach || THREE.Object3D.prototype.__motornayaCamaroAttachHooked) return false;
    var originalAttach = THREE.Object3D.prototype.attach;
    THREE.Object3D.prototype.attach = function (object) {
      originalAttach.call(this, object);
      if (object && object.name && /^CAMARO_WHEEL_GROUP_/i.test(object.name)) {
        /* At this exact moment `this` is the spinPivot created by game.js.
           Attach the matching physical rim to the same pivot, so steering and
           wheel spin can never separate the tire from its disk. */
        bindRimToSteeringPivot(this, object);
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
        camaroModelRoot = gltf && gltf.scene;
        startMixer(gltf);
        if (onLoad) onLoad(gltf);
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