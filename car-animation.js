/* Motornaya — procedural car animation helper.
 * Loaded before game.js so it can hook GLTFLoader and play embedded GLB clips.
 * It also adds a subtle idle/engine vibration to animated model roots.
 */
(function () {
  'use strict';

  var mixers = [];
  var roots = [];
  var last = performance.now();

  function startMixer(gltf) {
    if (!gltf || !gltf.scene || !gltf.animations || !gltf.animations.length || !window.THREE) return;
    var mixer = new THREE.AnimationMixer(gltf.scene);
    for (var i = 0; i < gltf.animations.length; i++) {
      mixer.clipAction(gltf.animations[i]).reset().play();
    }
    mixers.push(mixer);
    roots.push(gltf.scene);
  }

  function hookLoader() {
    if (!window.THREE || !THREE.GLTFLoader || THREE.GLTFLoader.__motornayaAnimationHooked) return false;
    var originalLoad = THREE.GLTFLoader.prototype.load;
    THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      return originalLoad.call(this, url, function (gltf) {
        startMixer(gltf);
        if (onLoad) onLoad(gltf);
      }, onProgress, onError);
    };
    THREE.GLTFLoader.__motornayaAnimationHooked = true;
    return true;
  }

  function frame(now) {
    var delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (var i = mixers.length - 1; i >= 0; i--) {
      if (mixers[i] && mixers[i].update) mixers[i].update(delta);
    }
    /* Gentle showroom vibration. It is deliberately tiny so it never fights
       the game's steering/position animation. */
    var t = now * 0.001;
    for (var j = 0; j < roots.length; j++) {
      var root = roots[j];
      if (!root || !root.userData) continue;
      if (!root.userData.motornayaBaseY) root.userData.motornayaBaseY = root.position.y;
      root.position.y = root.userData.motornayaBaseY + Math.sin(t * 7.0 + j) * 0.003;
      root.rotation.z += Math.sin(t * 5.0 + j) * 0.00008;
    }
    requestAnimationFrame(frame);
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);
  requestAnimationFrame(frame);
})();
