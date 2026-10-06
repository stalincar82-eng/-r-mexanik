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
