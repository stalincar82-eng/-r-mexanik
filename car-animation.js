/* Моторная — garage camera wrapper. Keeps the proven Camaro bridge intact and adds free garage orbit camera. */
(function () {
  'use strict';

  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'car-animation-original.js?garage-camera-20261005-1', false);
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
    canvas: null,
    scene: null,
    camera: null
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

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function addGarageInterface() {
    if (document.getElementById('garage-camera-controls')) return;

    var style = document.createElement('style');
    style.id = 'motornaya-garage-ui-style';
    style.textContent = '\
      #garage-camera-controls{position:absolute;z-index:58;left:22px;bottom:22px;width:156px;padding:10px;border:1px solid rgba(224,239,226,.18);border-radius:12px;background:rgba(12,19,16,.88);backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.25);pointer-events:auto;touch-action:none}\
      #garage-camera-controls .garage-camera-title{margin:0 0 7px;color:#aab7ad;font:800 8px Arial;letter-spacing:1.1px;text-align:center}\
      #garage-camera-controls .garage-camera-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}\
      #garage-camera-controls button{height:38px;border:1px solid rgba(255,255,255,.16);border-radius:7px;color:#e4ebe5;background:rgba(255,255,255,.06);font:900 16px Arial;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}\
      #garage-camera-controls button:active{transform:scale(.94);background:#d9f36a;color:#17211d}\
      #garage-camera-controls .garage-camera-reset{font-size:10px}\
      #garage-camera-controls .garage-camera-hint{margin-top:7px;color:#7f8c83;font:700 7px Arial;text-align:center}\
      #garage-camera-controls .garage-camera-zoom{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px}\
      #garage-camera-controls .garage-camera-zoom button{height:30px;font-size:13px}\
      .game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{width:min(360px,34vw);max-height:calc(100% - 140px);padding:12px;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.22)}\
      .game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-row{min-height:44px;border-radius:7px}\
      .game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{min-height:32px;padding:0 8px;border-radius:6px;touch-action:manipulation}\
      @media(max-width:700px){#garage-camera-controls{left:10px;bottom:12px;width:148px;padding:8px}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel{right:10px;width:min(340px,calc(100% - 20px));max-height:calc(100% - 112px);padding:10px}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-row{grid-template-columns:24px minmax(0,1fr) auto;gap:5px}.game-ui:has(.mode-button[data-mode="workshop"].is-active) .workshop-panel .part-action{font-size:8px}}\
    ';
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.id = 'garage-camera-controls';
    panel.innerHTML = '<div class="garage-camera-title">КАМЕРА ГАРАЖА</div>' +
      '<div class="garage-camera-grid">' +
      '<span></span><button type="button" data-camera-action="up" aria-label="Камера вверх">▲</button><span></span>' +
      '<button type="button" data-camera-action="left" aria-label="Камера влево">◀</button>' +
      '<button type="button" class="garage-camera-reset" data-camera-action="reset" aria-label="Сбросить камеру">●</button>' +
      '<button type="button" data-camera-action="right" aria-label="Камера вправо">▶</button>' +
      '<span></span><button type="button" data-camera-action="down" aria-label="Камера вниз">▼</button><span></span>' +
      '</div><div class="garage-camera-zoom"><button type="button" data-camera-action="zoomOut" aria-label="Отдалить">−</button><button type="button" data-camera-action="zoomIn" aria-label="Приблизить">+</button></div>' +
      '<div class="garage-camera-hint">Свайп по машине · стрелки · ±</div>';
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

  function updateGarageInterfaceVisibility() {
    var panel = document.getElementById('garage-camera-controls');
    if (panel) panel.style.display = inGarage() ? 'block' : 'none';
  }

  function installPointerCamera(renderer, scene, camera) {
    var canvas = renderer.domElement;
    if (!canvas || orbit.canvas === canvas) return;
    orbit.canvas = canvas;
    orbit.scene = scene;
    orbit.camera = camera;

    canvas.addEventListener('pointerdown', function (event) {
      if (!inGarage()) return;
      orbit.dragging = true;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (error) {}
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
      if (!inGarage()) return;
      orbit.dragging = false;
      consume(event);
    }
    canvas.addEventListener('pointerup', endDrag, true);
    canvas.addEventListener('pointercancel', endDrag, true);
    canvas.addEventListener('pointerleave', function () { orbit.dragging = false; }, true);
  }

  addGarageInterface();

  THREE.WebGLRenderer.prototype.render = function (scene, camera) {
    updateGarageInterfaceVisibility();
    if (inGarage()) {
      installPointerCamera(this, scene, camera);
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