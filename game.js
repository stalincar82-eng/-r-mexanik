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
    (0, eval)(code);

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
