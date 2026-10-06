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
  } catch (error) {
    console.error('Motornaya game recovery loader failed', error);
    var warning = document.getElementById('webgl-warning');
    var copy = document.getElementById('warning-copy');
    if (warning) warning.classList.remove('is-hidden');
    if (copy) copy.textContent = 'Не удалось загрузить игровой модуль. Обнови страницу и проверь интернет-соединение.';
  }
})();
