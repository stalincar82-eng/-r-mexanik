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

    /* Camaro uses the opposite steering sign from the old BMW model. */
    code = code.replace(
      "var targetSteering = (left ? 1 : 0) - (right ? 1 : 0);",
      "var targetSteering = (right ? 1 : 0) - (left ? 1 : 0);"
    );

    /* The old game has a generic wheel splitter. The Camaro GLB already contains
       four complete tires, so prevent the splitter from treating them as a tire
       source. Rename the tire meshes and their immediate wheel parents first. */
    if (window.THREE && THREE.GLTFLoader && THREE.GLTFLoader.prototype && !THREE.GLTFLoader.prototype.__motornayaCamaroWholeWheelGuard) {
      var originalLoad = THREE.GLTFLoader.prototype.load;
      THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
        var guardedLoad = function (gltf) {
          try {
            var root = gltf && gltf.scene;
            var tires = [];
            if (root && root.traverse) root.traverse(function (node) {
              if (node && node.isMesh && node.name && /tire|tyre/i.test(node.name)) tires.push(node);
            });
            if (tires.length === 4) {
              for (var i = 0; i < 4; i++) {
                var tire = tires[i];
                var parent = tire.parent;
                tire.name = 'CamaroWheel_' + i;
                if (parent) parent.name = 'CamaroWheel_' + i + '_Group';
              }
            }
          } catch (guardError) { console.warn('Camaro whole-wheel guard:', guardError); }
          if (onLoad) onLoad(gltf);
        };
        return originalLoad.call(this, url, guardedLoad, onProgress, onError);
      };
      THREE.GLTFLoader.prototype.__motornayaCamaroWholeWheelGuard = true;
    }

    /* The original disk matcher is BMW-specific. Camaro rims are named Rim_Main.
       Make the existing accessory binder recognize them so the rims are attached
       to the same wheel pivots and rotate/steer together with the tires. */
    code = code.replace(
      "if (/^(?:m:)?SM_Disk_[LR]_0000_001_SM_Disk_[LR]_0000_001_MAT_Details_Disk(?:_009)?_/i.test(node.name)) {",
      "if (/^(?:m:)?SM_Disk_[LR]_0000_001_SM_Disk_[LR]_0000_001_MAT_Details_Disk(?:_009)?_/i.test(node.name) || /Rim_Main/i.test(node.name)) {"
    );

    (0, eval)(code);

    function removeGarageCameraPanel() {
      var panel = document.getElementById('garage-camera-controls');
      if (panel) panel.remove();
    }
    var cameraStyle = document.getElementById('motornaya-camera-kill-style');
    if (!cameraStyle) {
      cameraStyle = document.createElement('style');
      cameraStyle.id = 'motornaya-camera-kill-style';
      cameraStyle.textContent = '#garage-camera-controls{display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}';
      document.head.appendChild(cameraStyle);
    }
    removeGarageCameraPanel();
    if (window.MutationObserver) new MutationObserver(removeGarageCameraPanel).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(removeGarageCameraPanel, 500);
    function syncCamaroBrand() {
      var select = document.getElementById('car-selector');
      if (select) {
        var option = select.querySelector('option[value="bmw"]');
        if (option) option.textContent = 'CHEVROLET CAMARO SS · 1967';
        if (!select.value) select.value = 'bmw';
      }
      var brand = document.querySelector('.mini-brand small');
      if (brand) brand.textContent = 'CHEVROLET CAMARO SS · 1967';
    }
    syncCamaroBrand();
    setTimeout(syncCamaroBrand, 250);
    setTimeout(syncCamaroBrand, 1000);
  } catch (error) {
    console.error('Motornaya game recovery loader failed', error);
    var warning = document.getElementById('webgl-warning');
    var copy = document.getElementById('warning-copy');
    if (warning) warning.classList.remove('is-hidden');
    if (copy) copy.textContent = 'Не удалось загрузить игровой модуль. Обнови страницу и проверь интернет-соединение.';
  }
})();
