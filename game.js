(function () {
  'use strict';

  // Stable recovery bridge. The known-good game engine is loaded, but the
  // default car slot is explicitly presented as the Camaro that exists here.
  var source = 'https://raw.githubusercontent.com/stalincar82-eng/-r-mexanik/2e159d7a6b39f8af004d8b8e13db3e4080a7e3c7/game.js';
  var xhr = new XMLHttpRequest();
  try {
    xhr.open('GET', source, false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) throw new Error('HTTP ' + xhr.status);
    var code = xhr.responseText;
    code = code.replace("bmw: { url: 'car-model.glb', label: 'BMW M3 GTR', targetLength: 4.2 },", "bmw: { url: '1967_chevrolet_camaro_ss_350_coupe.glb', label: 'CHEVROLET CAMARO SS · 1967', targetLength: 4.2 },");
    code = code.replace("scene = new THREE.Scene();", "scene = new THREE.Scene(); window.scene = scene;");

    // Safe tuning hooks: the original engine remains intact; only its numeric
    // driving limits are read from the persistent garage progression layer.
    code = code.replace(
      "else if (forward) speed = Math.min(68, speed + 20 * delta);",
      "else if (forward) { var mt = window.__motornayaTune || {}; speed = Math.min(mt.maxSpeed || 68, speed + (mt.accel || 20) * delta); }"
    );
    code = code.replace(
      "else if (reverse) speed = Math.max(-22, speed - 14 * delta);",
      "else if (reverse) { var mr = window.__motornayaTune || {}; speed = Math.max(-(mr.reverse || 22), speed - 14 * delta); }"
    );
    code = code.replace(
      "speed = Math.max(-22, Math.min(68, speed));",
      "var ml = window.__motornayaTune || {}; speed = Math.max(-(ml.reverse || 22), Math.min(ml.maxSpeed || 68, speed));"
    );
    code = code.replace(
      "heading += steering * Math.min(1.35, Math.abs(speed) / 18) * delta * (speed < 0 ? -1 : 1);",
      "heading += steering * Math.min(1.35, Math.abs(speed) / 18) * (window.__motornayaTune && window.__motornayaTune.grip || 1) * delta * (speed < 0 ? -1 : 1);"
    );

    (0, eval)(code);

    // The old floating camera control block is permanently removed.
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
    if (window.MutationObserver) {
      new MutationObserver(removeGarageCameraPanel).observe(document.documentElement, { childList: true, subtree: true });
    }
    setInterval(removeGarageCameraPanel, 500);

    // Keep the visible UI consistent with the actual default model.
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
