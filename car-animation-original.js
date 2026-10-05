/* Моторная — Chevrolet Camaro 1967 wheel bridge + garage panels. */
(function () {
  'use strict';

  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var camaroScene = null;
  var camaroTires = [];
  var camaroRims = [];
  var originalNames = [];
  var wheelNamesActive = false;
  var garageLiftCar = null;
  var garageLiftHeight = 0;
  var garageLiftBaseY = 0;

  function isTireMesh(node) {
    return !!(node && node.isMesh && node.name && /tire|tyre/i.test(node.name));
  }

  function isRimNode(node) {
    return !!(node && node.name && /Rim_Main/i.test(node.name));
  }

  function center(node) {
    if (!node) return null;
    var box = new THREE.Box3().setFromObject(node);
    return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
  }

  function collectCamaroParts(scene) {
    camaroScene = scene;
    camaroTires = [];
    camaroRims = [];
    if (!scene) return;
    scene.traverse(function (node) {
      if (isTireMesh(node)) camaroTires.push(node);
      if (isRimNode(node)) camaroRims.push(node);
    });
  }

  function protectWholeCamaroTires() {
    if (wheelNamesActive || camaroTires.length !== 4) return false;
    originalNames = [];
    for (var i = 0; i < camaroTires.length; i++) {
      var tire = camaroTires[i];
      var parent = tire.parent;
      originalNames.push({ tire: tire, tireName: tire.name, parent: parent, parentName: parent && parent.name });
      tire.name = 'CamaroWheel_' + i;
      if (parent) parent.name = 'CamaroWheel_' + i + '_Group';
    }
    wheelNamesActive = true;
    return true;
  }

  function restoreWholeCamaroTireNames() {
    if (!wheelNamesActive) return;
    for (var i = 0; i < originalNames.length; i++) {
      var item = originalNames[i];
      if (item.tire) item.tire.name = item.tireName;
      if (item.parent) item.parent.name = item.parentName;
    }
    originalNames = [];
    wheelNamesActive = false;
  }

  function findWheelPivots() {
    var result = [];
    for (var i = 0; i < camaroTires.length; i++) {
      var tire = camaroTires[i];
      if (!tire || !tire.parent) continue;
      var pivot = tire.parent.parent || tire.parent;
      if (pivot && result.indexOf(pivot) === -1) result.push(pivot);
    }
    return result;
  }

  function bindCamaroRims() {
    if (!camaroScene || camaroTires.length !== 4 || camaroRims.length < 4) return false;
    var pivots = findWheelPivots();
    if (pivots.length !== 4) return false;
    var available = camaroRims.slice();
    var bound = 0;
    for (var i = 0; i < camaroTires.length; i++) {
      var tireCenter = center(camaroTires[i]);
      if (!tireCenter) continue;
      var best = null;
      var bestDistance = Infinity;
      for (var r = 0; r < available.length; r++) {
        var rim = available[r];
        if (!rim || rim.__motornayaCamaroBound) continue;
        var rimCenter = center(rim);
        if (!rimCenter) continue;
        var distance = rimCenter.distanceTo(tireCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = rim;
        }
      }
      if (!best || bestDistance > 1.5) continue;
      var pivot = pivots[i];
      pivot.updateMatrixWorld(true);
      best.updateMatrixWorld(true);
      pivot.attach(best);
      best.__motornayaCamaroBound = true;
      bound++;
    }
    return bound === 4;
  }

  function makeCompactGeometry(source, triangleIds) {
    if (!source || !source.index || !source.attributes || !triangleIds.length) return null;
    var sourceIndex = source.index;
    var remap = {};
    var used = [];
    var compactIndices = [];
    for (var i = 0; i < triangleIds.length; i++) {
      var triangleIndex = triangleIds[i];
      for (var corner = 0; corner < 3; corner++) {
        var oldIndex = sourceIndex.getX(triangleIndex * 3 + corner);
        if (remap[oldIndex] === undefined) {
          remap[oldIndex] = used.length;
          used.push(oldIndex);
        }
        compactIndices.push(remap[oldIndex]);
      }
    }
    var geometry = new THREE.BufferGeometry();
    for (var attributeName in source.attributes) {
      var sourceAttribute = source.attributes[attributeName];
      if (!sourceAttribute || !sourceAttribute.array || !sourceAttribute.itemSize) continue;
      var itemSize = sourceAttribute.itemSize;
      var array = new sourceAttribute.array.constructor(used.length * itemSize);
      for (var vertexIndex = 0; vertexIndex < used.length; vertexIndex++) {
        var oldVertex = used[vertexIndex];
        for (var component = 0; component < itemSize; component++) {
          array[vertexIndex * itemSize + component] = sourceAttribute.array[oldVertex * itemSize + component];
        }
      }
      geometry.setAttribute(attributeName, new THREE.BufferAttribute(array, itemSize, sourceAttribute.normalized));
    }
    geometry.setIndex(compactIndices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function componentInfo(source, triangleIds) {
    var position = source.attributes.position;
    var index = source.index;
    var min = new THREE.Vector3(Infinity, Infinity, Infinity);
    var max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (var i = 0; i < triangleIds.length; i++) {
      var triangle = triangleIds[i];
      for (var corner = 0; corner < 3; corner++) {
        var vertexIndex = index.getX(triangle * 3 + corner);
        var vertex = new THREE.Vector3().fromBufferAttribute(position, vertexIndex);
        min.min(vertex);
        max.max(vertex);
      }
    }
    return { triangles: triangleIds, count: triangleIds.length, min: min, max: max, center: new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5) };
  }

  function prepareCamaroGarage(scene) {
    if (!scene || scene.__motornayaCamaroGaragePrepared) return false;
    var bodyMesh = null;
    scene.traverse(function (node) {
      if (!bodyMesh && node.isMesh && /CarPaint_Max.*CarPaint_0/i.test(node.name || '')) bodyMesh = node;
    });
    if (!bodyMesh || !bodyMesh.geometry || !bodyMesh.geometry.index) return false;
    var source = bodyMesh.geometry;
    var position = source.attributes.position;
    var sourceIndex = source.index;
    if (!position || !sourceIndex) return false;
    var triangleCount = Math.floor(sourceIndex.count / 3);
    var vertexToTriangles = new Array(position.count);
    for (var vertexIndex = 0; vertexIndex < position.count; vertexIndex++) vertexToTriangles[vertexIndex] = [];
    for (var triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
      for (var corner = 0; corner < 3; corner++) {
        var vertex = sourceIndex.getX(triangleIndex * 3 + corner);
        vertexToTriangles[vertex].push(triangleIndex);
      }
    }
    var visited = new Uint8Array(triangleCount);
    var components = [];
    for (var start = 0; start < triangleCount; start++) {
      if (visited[start]) continue;
      var queue = [start];
      visited[start] = 1;
      var component = [];
      while (queue.length) {
        var current = queue.pop();
        component.push(current);
        for (var cornerIndex = 0; cornerIndex < 3; cornerIndex++) {
          var sharedVertex = sourceIndex.getX(current * 3 + cornerIndex);
          var neighbors = vertexToTriangles[sharedVertex];
          for (var neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex++) {
            var neighbor = neighbors[neighborIndex];
            if (!visited[neighbor]) { visited[neighbor] = 1; queue.push(neighbor); }
          }
        }
      }
      if (component.length >= 20) components.push(componentInfo(source, component));
    }
    var selected = { hood: null, trunk: null, doorL: null, doorR: null };
    for (var i = 0; i < components.length; i++) {
      var info = components[i];
      var width = info.max.x - info.min.x;
      if (!selected.hood && info.count > 900 && info.min.z > 0.70 && info.max.z > 1.90 && info.min.y > 0.50 && width > 1.0) { selected.hood = info; continue; }
      if (!selected.trunk && info.count > 100 && info.min.z < -1.45 && info.max.z < -1.45 && info.min.y > 0.65 && info.max.y < 0.90 && width > 0.8) { selected.trunk = info; continue; }
      if (info.count > 200 && info.min.z < -0.55 && info.max.z > 0.55 && info.min.y < 0.12 && info.max.y < 0.72 && width > 0.10 && width < 0.22) {
        if (info.center.x < 0 && !selected.doorL) selected.doorL = info;
        if (info.center.x > 0 && !selected.doorR) selected.doorR = info;
      }
    }
    if (!selected.hood || !selected.trunk || !selected.doorL || !selected.doorR) { console.warn('Camaro garage panels were not fully detected', selected); return false; }
    var selectedTriangleMap = {};
    var panelDefs = [
      { key: 'hood', name: 'sm_hood_body', info: selected.hood },
      { key: 'trunk', name: 'sm_trunk_body', info: selected.trunk },
      { key: 'doorL', name: 'sm_door_l', info: selected.doorL },
      { key: 'doorR', name: 'sm_door_r', info: selected.doorR }
    ];
    for (var p = 0; p < panelDefs.length; p++) {
      var ids = panelDefs[p].info.triangles;
      for (var idIndex = 0; idIndex < ids.length; idIndex++) selectedTriangleMap[ids[idIndex]] = true;
    }
    var remaining = [];
    for (var triangle = 0; triangle < triangleCount; triangle++) if (!selectedTriangleMap[triangle]) remaining.push(triangle);
    var parent = bodyMesh.parent;
    if (!parent) return false;
    var baseGeometry = makeCompactGeometry(source, remaining);
    var baseMesh = bodyMesh.clone(false);
    baseMesh.name = '_group1M_CarPaint_Base';
    baseMesh.geometry = baseGeometry;
    parent.add(baseMesh);
    for (var panelIndex = 0; panelIndex < panelDefs.length; panelIndex++) {
      var def = panelDefs[panelIndex];
      var panelGeometry = makeCompactGeometry(source, def.info.triangles);
      var panelMesh = bodyMesh.clone(false);
      panelMesh.name = def.name;
      panelMesh.geometry = panelGeometry;
      panelMesh.__motornayaGaragePart = def.key;
      parent.add(panelMesh);
    }
    bodyMesh.visible = false;
    scene.__motornayaCamaroGaragePrepared = true;
    return true;
  }

  function hookCamaroGarageHinges() {
    if (!window.THREE || !THREE.Object3D || THREE.Object3D.prototype.__motornayaCamaroGarageHooked) return false;
    var originalAttach = THREE.Object3D.prototype.attach;
    THREE.Object3D.prototype.attach = function (object) {
      originalAttach.call(this, object);
      if (!object || !object.__motornayaGaragePart || this.__motornayaCamaroGarageHingeDone) return;
      var part = object.__motornayaGaragePart;
      var box = new THREE.Box3().setFromObject(object);
      if (box.isEmpty() || !this.parent) return;
      var hingeWorld = box.getCenter(new THREE.Vector3());
      if (part === 'hood') hingeWorld.set(hingeWorld.x, box.min.y, box.min.z);
      else if (part === 'trunk') hingeWorld.set(hingeWorld.x, box.min.y, box.max.z);
      else hingeWorld.set(hingeWorld.x, (box.min.y + box.max.y) * 0.5, box.max.z);
      object.updateMatrixWorld(true);
      var worldMatrix = object.matrixWorld.clone();
      this.position.copy(this.parent.worldToLocal(hingeWorld.clone()));
      this.updateMatrixWorld(true);
      var localMatrix = new THREE.Matrix4().copy(this.matrixWorld).invert().multiply(worldMatrix);
      localMatrix.decompose(object.position, object.quaternion, object.scale);
      object.updateMatrixWorld(true);
      this.__motornayaCamaroGarageHingeDone = true;
    };
    THREE.Object3D.prototype.__motornayaCamaroGarageHooked = true;
    return true;
  }

  function hookCamaroSteeringDirection() {
    if (!window.THREE || !THREE.Object3D || THREE.Object3D.prototype.__motornayaCamaroSteeringHooked) return false;
    var originalAdd = THREE.Object3D.prototype.add;
    var originalUpdateMatrix = THREE.Object3D.prototype.updateMatrix;
    THREE.Object3D.prototype.add = function () {
      originalAdd.apply(this, arguments);
      for (var i = 0; i < arguments.length; i++) {
        var object = arguments[i];
        if (!object || !object.name || !/^CamaroWheel_\d+_Group$/i.test(object.name)) continue;
        var steeringPivot = this.parent;
        if (!steeringPivot || steeringPivot.__motornayaCamaroSteeringInverted) continue;
        steeringPivot.__motornayaCamaroSteeringInverted = true;
      }
    };
    THREE.Object3D.prototype.updateMatrix = function () {
      if (this.__motornayaCamaroSteeringInverted) {
        this.rotation.y = -this.rotation.y;
        originalUpdateMatrix.call(this);
        this.rotation.y = -this.rotation.y;
        return;
      }
      originalUpdateMatrix.call(this);
    };
    THREE.Object3D.prototype.__motornayaCamaroSteeringHooked = true;
    return true;
  }

  function hookGarageLift() {
    if (!window.THREE || !THREE.Object3D || THREE.Object3D.prototype.__motornayaGarageLiftHooked) return false;
    var originalAdd = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function () {
      originalAdd.apply(this, arguments);
      if (this.isScene) {
        for (var i = 0; i < arguments.length; i++) {
          var object = arguments[i];
          if (object && object.isGroup && object.children.length === 0 && !garageLiftCar) {
            garageLiftCar = object;
            garageLiftBaseY = object.position.y;
          }
        }
      }
    };
    THREE.Object3D.prototype.__motornayaGarageLiftHooked = true;

    var panel = document.createElement('div');
    panel.id = 'garage-lift-controls';
    panel.style.cssText = 'display:none;position:absolute;z-index:55;left:25px;top:93px;width:190px;padding:12px;border:1px solid rgba(224,239,226,.16);background:rgba(17,25,22,.94);pointer-events:auto;color:#d7e0d8;font:700 10px Arial;box-sizing:border-box';
    panel.innerHTML = '<div style="color:#d9f36a;letter-spacing:1px;margin-bottom:9px">ПОДЪЁМНИК</div><div style="display:flex;gap:6px"><button id="garage-lift-up" type="button" style="flex:1;min-height:34px;border:1px solid rgba(217,243,106,.45);background:#d9f36a;color:#17211d;font-weight:800">▲ ПОДНЯТЬ</button><button id="garage-lift-down" type="button" style="flex:1;min-height:34px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#d7e0d8;font-weight:800">▼ ОПУСТИТЬ</button></div><div id="garage-lift-value" style="margin-top:8px;color:#98a49b">Высота: 0.0 м</div>';
    function ensurePanel() {
      if (!panel.parentNode) document.getElementById('game-ui').appendChild(panel);
    }
    function setLift(delta) {
      if (!garageLiftCar) return;
      garageLiftHeight = Math.max(0, Math.min(1.45, garageLiftHeight + delta));
      garageLiftCar.position.y = garageLiftBaseY + garageLiftHeight;
      var value = document.getElementById('garage-lift-value');
      if (value) value.textContent = 'Высота: ' + garageLiftHeight.toFixed(1) + ' м';
    }
    document.addEventListener('click', function (event) {
      if (event.target && event.target.id === 'garage-lift-up') setLift(0.25);
      if (event.target && event.target.id === 'garage-lift-down') setLift(-0.25);
    });
    setInterval(function () {
      if (!garageLiftCar) return;
      ensurePanel();
      var inGarage = Math.abs(garageLiftCar.position.x - 30) < 4;
      panel.style.display = inGarage ? 'block' : 'none';
      if (!inGarage) garageLiftHeight = 0;
    }, 250);
    return true;
  }

  function forceLabels() {
    var selector = document.getElementById('car-selector');
    if (selector) {
      var option = selector.querySelector('option[value="bmw"]');
      if (option) option.textContent = CAMARO_LABEL;
    }
    var mini = document.querySelector('.mini-brand small');
    if (mini) mini.textContent = CAMARO_LABEL;
    var caption = document.getElementById('car-caption');
    if (caption) caption.textContent = CAMARO_LABEL;
  }

  function hookLoader() {
    if (!window.THREE || !THREE.GLTFLoader || THREE.GLTFLoader.__motornayaCamaroHooked) return false;
    var originalLoad = THREE.GLTFLoader.prototype.load;
    THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      var actualUrl = String(url || '');
      if (/^(?:\.\/)?(?:car-model|chevrolet_camaro_1967_animated)\.glb(?:\?.*)?$/i.test(actualUrl)) actualUrl = CAMARO_URL;
      return originalLoad.call(this, actualUrl, function (gltf) {
        collectCamaroParts(gltf && gltf.scene);
        protectWholeCamaroTires();
        prepareCamaroGarage(gltf && gltf.scene);
        if (onLoad) onLoad(gltf);
        restoreWholeCamaroTireNames();
        setTimeout(bindCamaroRims, 0);
        setTimeout(bindCamaroRims, 50);
        setTimeout(bindCamaroRims, 150);
        setTimeout(bindCamaroRims, 350);
        setTimeout(bindCamaroRims, 700);
      }, onProgress, onError);
    };
    THREE.GLTFLoader.__motornayaCamaroHooked = true;
    return true;
  }

  hookGarageLift();
  hookCamaroSteeringDirection();
  hookCamaroGarageHinges();
  hookLoader();
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    hookGarageLift();
    hookCamaroSteeringDirection();
    hookCamaroGarageHinges();
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceLabels);
  else forceLabels();
  setInterval(forceLabels, 500);
})();
