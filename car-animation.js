/* Моторная — garage camera wrapper. Keeps the proven Camaro bridge intact and adds free garage orbit camera. */
(function () {
  'use strict';

  /* Keep the current working Camaro/wheel/garage implementation byte-for-byte in
     car-animation-original.js. Load it synchronously because game.js is deferred
     and must see all of its loader hooks before it creates the car. */
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
    canvas.addEventListener('pointerleave', function () {
      orbit.dragging = false;
    }, true);
  }

  THREE.WebGLRenderer.prototype.render = function (scene, camera) {
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