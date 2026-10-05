/* Моторная — Chevrolet Camaro 1967 model + embedded GLB animation bridge. */
(function () {
  'use strict';
  var mixers = [];
  var last = performance.now();
  var CAMARO_URL = 'chevrolet_camaro_1967_animated.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967';

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
      if (/^(?:\.\/)?car-model\.glb(?:\?.*)?$/i.test(actualUrl)) actualUrl = CAMARO_URL;
      return originalLoad.call(this, actualUrl, function (gltf) {
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

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceCamaroLabels);
  else forceCamaroLabels();
  setInterval(forceCamaroLabels, 500);
  requestAnimationFrame(frame);
})();