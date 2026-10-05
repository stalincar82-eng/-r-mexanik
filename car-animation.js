/* Моторная — Chevrolet Camaro 1967 model bridge. */
(function () {
  'use strict';
  var mixers = [];
  var last = performance.now();
  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var wheelAccessoryTimer;

  function normalizeCamaroWheelNodes(scene) {
    if (!scene || scene.__motornayaCamaroWheelsNormalized) return;
    var wheelIndex = 0;
    scene.traverse(function (node) {
      if (!node || !node.name || !/tire|tyre/i.test(node.name)) return;
      node.name = 'CAMARO_WHEEL_GROUP_' + wheelIndex++;
    });
    scene.__motornayaCamaroWheelsNormalized = true;
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

  /* Camaro rims/disks are separate meshes. The generic wheel detector creates
     an unnamed spinPivot around the tire. Attach the matching rim to that same
     pivot so steering rotates the complete wheel instead of the tire alone. */
  function syncCamaroWheelAccessories() {
    if (!window.scene || !window.THREE || !scene.traverse) return;
    var tires = [];
    var accessories = [];

    scene.traverse(function (node) {
      if (!node || !node.isMesh || !node.name) return;
      var name = String(node.name);
      if (/CAMARO_WHEEL_GROUP_/i.test(name)) {
        var tireBounds = new THREE.Box3().setFromObject(node);
        if (!tireBounds.isEmpty()) tires.push({ node: node, center: tireBounds.getCenter(new THREE.Vector3()) });
      } else if (/(?:rim|disk|disc|hubcap|wheel[_ .-]*(?:rim|disk|disc))/i.test(name) && !/brake/i.test(name)) {
        var accessoryBounds = new THREE.Box3().setFromObject(node);
        if (!accessoryBounds.isEmpty()) accessories.push({ node: node, center: accessoryBounds.getCenter(new THREE.Vector3()) });
      }
    });

    for (var i = 0; i < accessories.length; i++) {
      var accessory = accessories[i];
      var nearest = null;
      var nearestDistance = Infinity;
      for (var j = 0; j < tires.length; j++) {
        var distance = accessory.center.distanceTo(tires[j].center);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = tires[j].node;
        }
      }
      if (!nearest || nearestDistance > 0.8) continue;

      var pivot = nearest.parent;
      while (pivot && pivot !== scene) {
        if (pivot.isGroup && !pivot.name && pivot.parent && pivot.parent.isGroup) break;
        pivot = pivot.parent;
      }
      if (!pivot || pivot === scene || !pivot.attach) continue;
      if (accessory.node.parent !== pivot) pivot.attach(accessory.node);
    }
  }

  function frame(now) {
    var delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (var i = 0; i < mixers.length; i++) if (mixers[i]) mixers[i].update(delta);
    requestAnimationFrame(frame);
  }

  hookLoader();
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceCamaroLabels);
  else forceCamaroLabels();
  setInterval(forceCamaroLabels, 500);
  wheelAccessoryTimer = setInterval(syncCamaroWheelAccessories, 250);
  requestAnimationFrame(frame);
})();