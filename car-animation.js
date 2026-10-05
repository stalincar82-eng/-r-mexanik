/* Моторная — garage interface + camera wrapper. The proven Camaro bridge stays in car-animation-original.js. */
(function () {
  'use strict';

  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'car-animation-original.js?garage-ui-20261006-1', false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      (0, eval)(xhr.responseText);
    } else {
      throw new Error('car-animation-original.js HTTP ' + xhr.status);
    }
  } catch (error) {
    console.error('Motornaya Camaro bridge failed to load', error);
    return;
  }

  if (!window.THREE || !THREE.WebGLRenderer) return;

  var originalRender = THREE.WebGLRenderer.prototype.render;
  var orbit = {
    yaw: 0,
    pitch: 1.08,
    radius: 6.8,
    dragging: false,
    lastX: 0,
    lastY: 0,
    canvas: null
  };

  function inGarage() {
    var button = document.querySelector('.mode-button[data-mode="workshop"].is-active');
    return !!button;
  }

  function findGarageCar(scene) {
    if (!scene) return null;
    var best = null;
    var bestDistance = Infinity;
    for (var i = 0; i < scene.children.length; i++) {
      var child = scene.children[i];
      if (!child || !child.isGroup || !child.children.length) continue;
      if (Math.abs(child.position.x - 30) > 5 || Math.abs(child.position.z) > 5) continue;
      var box = new THREE.Box3().setFromObject(child);
      if (box.isEmpty()) continue;
      var size = box.getSize(new THREE.Vector3());
      if (size.x > 8 || size.z > 8 || size.y > 5) continue;
      var distance = Math.abs(child.position.x - 30) + Math.abs(child.position.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = child;
      }
    }
    return best;
  }

  function injectGarageUI() {
    if (document.getElementById('motornaya-garage-ui')) return;
    var style = document.createElement('style');
    style.id = 'motornaya-garage-ui';
    style.textContent = [
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .topbar{height:58px;padding:0 12px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .car-choice-label{left:12px;top:7px;position:absolute}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .mode-switch{top:7px;left:50%;height:42px;padding:3px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .mode-button{height:36px;min-height:36px;padding:0 12px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .top-status{display:none}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{top:70px;right:12px;width:310px;max-width:calc(100% - 24px);max-height:calc(100% - 84px);padding:12px;border-radius:12px;overflow:auto;box-shadow:0 12px 32px rgba(0,0,0,.32)}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .panel-heading{min-height:30px;align-items:center}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .parts-list{gap:5px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-row{grid-template-columns:25px minmax(0,1fr) auto;gap:6px;min-height:42px;padding:5px;border-radius:8px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{min-width:62px;min-height:32px;padding:0 7px;border-radius:7px;font-size:9px;touch-action:manipulation}',
      '#garage-camera-controls{position:absolute;z-index:58;left:12px;bottom:14px;width:158px;padding:9px;border:1px solid rgba(224,239,226,.18);border-radius:13px;background:rgba(12,19,16,.88);backdrop-filter:blur(8px);box-shadow:0 10px 28px rgba(0,0,0,.28);pointer-events:auto;touch-action:none;box-sizing:border-box}',
      '#garage-camera-controls .garage-camera-title{margin:0 0 7px;color:#aab7ad;font:800 9px Arial;letter-spacing:1px;text-align:center}',
      '#garage-camera-controls .garage-camera-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}',
      '#garage-camera-controls button{height:37px;border:1px solid rgba(255,255,255,.16);border-radius:8px;color:#e4ebe5;background:rgba(255,255,255,.07);font:900 17px Arial;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '#garage-camera-controls button:active{transform:scale(.94);background:#d9f36a;color:#17211d}',
      '#garage-camera-controls .garage-camera-reset{font-size:11px}',
      '#garage-camera-controls .garage-camera-zoom{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px}',
      '#garage-camera-controls .garage-camera-zoom button{height:31px;font-size:14px}',
      '#garage-camera-controls .garage-camera-hint{margin-top:6px;color:#7f8c83;font:700 7px Arial;text-align:center}',
      '#garage-camera-controls .garage-camera-title:before{content:"";display:inline-block;width:6px;height:6px;margin:0 5px 1px 0;border-radius:50%;background:#d9f36a}',
      '#garage-lift-controls,#garage-diagnostics{border-radius:11px!important;box-shadow:0 10px 28px rgba(0,0,0,.25)!important;backdrop-filter:blur(8px)!important}',
      '#garage-lift-controls{left:12px!important;top:70px!important;width:170px!important;padding:9px!important}',
      '#garage-lift-controls button{min-height:36px!important;border-radius:7px!important;font-size:9px!important;touch-action:manipulation}',
      '#garage-diagnostics{left:190px!important;top:70px!important;width:190px!important;padding:9px!important}',
      '@media(max-width:700px){',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .topbar{height:52px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .car-choice-label{top:5px;left:8px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .car-selector{height:32px;min-width:142px;width:142px;padding:5px 7px;font-size:9px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .mode-switch{top:5px;right:8px;left:auto;height:34px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .mode-button{height:28px;min-height:28px;padding:0 8px;font-size:9px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{top:60px;right:8px;width:270px;max-width:calc(100% - 16px);max-height:calc(100% - 70px);padding:9px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-row{grid-template-columns:22px minmax(0,1fr) auto;min-height:39px;gap:5px;padding:4px}',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{min-width:58px;min-height:30px;padding:0 5px;font-size:8px}',
      '#garage-camera-controls{left:8px;bottom:8px;width:145px;padding:7px}',
      '#garage-camera-controls .garage-camera-title{font-size:8px;margin-bottom:5px}',
      '#garage-camera-controls button{height:34px;font-size:15px}',
      '#garage-camera-controls .garage-camera-zoom button{height:28px}',
      '#garage-lift-controls{left:8px!important;top:60px!important;width:150px!important;padding:7px!important}',
      '#garage-lift-controls button{min-height:31px!important;padding:0 4px!important;font-size:8px!important}',
      '#garage-diagnostics{left:164px!important;top:60px!important;width:160px!important;padding:7px!important;font-size:8px!important}',
      '}',
      '@media(max-width:430px){',
      '.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{width:238px}',
      '#garage-camera-controls{width:132px}',
      '#garage-lift-controls{width:135px!important}',
      '#garage-diagnostics{left:148px!important;width:145px!important}',
      '}'
    ].join('');
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.id = 'garage-camera-controls';
    panel.innerHTML = '<div class="garage-camera-title">КАМЕРА</div>' +
      '<div class="garage-camera-grid">' +
      '<span></span><button type="button" data-camera-action="up" aria-label="Вверх">▲</button><span></span>' +
      '<button type="button" data-camera-action="left" aria-label="Влево">◀</button>' +
      '<button type="button" class="garage-camera-reset" data-camera-action="reset" aria-label="Сбросить">●</button>' +
      '<button type="button" data-camera-action="right" aria-label="Вправо">▶</button>' +
      '<span></span><button type="button" data-camera-action="down" aria-label="Вниз">▼</button><span></span>' +
      '</div><div class="garage-camera-zoom"><button type="button" data-camera-action="zoomOut" aria-label="Отдалить">−</button><button type="button" data-camera-action="zoomIn" aria-label="Приблизить">+</button></div>' +
      '<div class="garage-camera-hint">Свайп по машине</div>';
    document.body.appendChild(panel);

    panel.addEventListener('pointerdown', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-camera-action]') : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      var action = button.getAttribute('data-camera-action');
      if (action === 'left') orbit.yaw += 0.22;
      if (action === 'right') orbit.yaw -= 0.22;
      if (action === 'up') orbit.pitch = Math.max(0.34, orbit.pitch - 0.12);
      if (action === 'down') orbit.pitch = Math.min(2.68, orbit.pitch + 0.12);
      if (action === 'zoomIn') orbit.radius = Math.max(4.4, orbit.radius - 0.45);
      if (action === 'zoomOut') orbit.radius = Math.min(10.5, orbit.radius + 0.45);
      if (action === 'reset') { orbit.yaw = 0; orbit.pitch = 1.08; orbit.radius = 6.8; }
    }, true);
  }

  function updateGarageUI() {
    var panel = document.getElementById('garage-camera-controls');
    if (panel) panel.style.display = inGarage() ? 'block' : 'none';
  }

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function installPointerCamera(renderer) {
    var canvas = renderer.domElement;
    if (!canvas || orbit.canvas === canvas) return;
    orbit.canvas = canvas;
    canvas.addEventListener('pointerdown', function (event) {
      if (!inGarage()) return;
      orbit.dragging = true;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
      consume(event);
    }, true);
    canvas.addEventListener('pointermove', function (event) {
      if (!inGarage() || !orbit.dragging) return;
      var dx = event.clientX - orbit.lastX;
      var dy = event.clientY - orbit.lastY;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      orbit.yaw -= dx * 0.008;
      orbit.pitch = Math.max(0.34, Math.min(2.68, orbit.pitch + dy * 0.006));
      consume(event);
    }, true);
    function endDrag(event) {
      orbit.dragging = false;
      if (inGarage()) consume(event);
    }
    canvas.addEventListener('pointerup', endDrag, true);
    canvas.addEventListener('pointercancel', endDrag, true);
  }

  injectGarageUI();

  THREE.WebGLRenderer.prototype.render = function (scene, camera) {
    updateGarageUI();
    if (inGarage()) {
      installPointerCamera(this);
      var car = findGarageCar(scene);
      if (car) {
        var target = new THREE.Vector3(car.position.x, car.position.y + 0.82, car.position.z);
        var horizontal = Math.sin(orbit.pitch) * orbit.radius;
        camera.position.set(
          target.x + Math.sin(orbit.yaw) * horizontal,
          target.y + Math.cos(orbit.pitch) * orbit.radius,
          target.z + Math.cos(orbit.yaw) * horizontal
        );
        camera.lookAt(target);
      }
    } else {
      orbit.dragging = false;
    }
    originalRender.call(this, scene, camera);
  };
  THREE.WebGLRenderer.prototype.__motornayaGarageOrbitHooked = true;
})();
