(function () {
  'use strict';

  // Recovery bridge: the full game implementation is restored from the last
  // known-good commit, then its default BMW slot is redirected to the Camaro
  // GLB that is actually present in this repository.
  var source = 'https://raw.githubusercontent.com/stalincar82-eng/-r-mexanik/2e159d7a6b39f8af004d8b8e13db3e4080a7e3c7/game.js';
  var xhr = new XMLHttpRequest();
  try {
    xhr.open('GET', source, false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) throw new Error('HTTP ' + xhr.status);
    var code = xhr.responseText;
    code = code.replace("bmw: { url: 'car-model.glb', label: 'BMW M3 GTR', targetLength: 4.2 },", "bmw: { url: '1967_chevrolet_camaro_ss_350_coupe.glb', label: 'CHEVROLET CAMARO SS · 1967', targetLength: 4.2 },");
    (0, eval)(code);

    // The original camera block is created by car-animation-base.js. Keep it
    // completely hidden in the city and move it to the RIGHT side in the garage.
    function fixGarageCameraBlock() {
      var panel = document.getElementById('garage-camera-controls');
      if (!panel) return;
      var garage = !!document.querySelector('.mode-button[data-mode="workshop"].is-active');
      if (!garage) {
        panel.style.setProperty('display', 'none', 'important');
        return;
      }
      panel.style.setProperty('display', 'block', 'important');
      panel.style.setProperty('left', 'auto', 'important');
      panel.style.setProperty('right', '10px', 'important');
      panel.style.setProperty('top', '68px', 'important');
      panel.style.setProperty('bottom', 'auto', 'important');
      panel.style.setProperty('z-index', '58', 'important');
    }
    var cameraFixStyle = document.getElementById('motornaya-camera-position-fix');
    if (!cameraFixStyle) {
      cameraFixStyle = document.createElement('style');
      cameraFixStyle.id = 'motornaya-camera-position-fix';
      cameraFixStyle.textContent = '#garage-camera-controls{left:auto!important;right:10px!important;top:68px!important;bottom:auto!important}.game-ui:not(:has(.mode-button[data-mode="workshop"].is-active)) #garage-camera-controls{display:none!important}';
      document.head.appendChild(cameraFixStyle);
    }
    setInterval(fixGarageCameraBlock, 250);
    fixGarageCameraBlock();
  } catch (error) {
    console.error('Motornaya game recovery loader failed', error);
    var warning = document.getElementById('webgl-warning');
    var copy = document.getElementById('warning-copy');
    if (warning) warning.classList.remove('is-hidden');
    if (copy) copy.textContent = 'Не удалось загрузить игровой модуль. Обнови страницу и проверь интернет-соединение.';
  }
})();
