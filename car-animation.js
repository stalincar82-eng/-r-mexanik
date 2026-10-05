/* Моторная — Chevrolet Camaro 1967 model bridge. */
(function () {
  'use strict';
  var mixers = [];
  var last = performance.now();
  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var camaroScene = null;
  var camaroRims = [];
  var camaroSourceTires = [];
  var wheelsRepaired = false;

  function isRimNode(node) {
    return !!(node && node.name && /Rim_Main/i.test(node.name));
  }

  function isTireNode(node) {
    return !!(node && node.isMesh && node.name && /tire|tyre/i.test(node.name));
  }

  function boundsCenter(node) {
    if (!node) return null;
    var b = new THREE.Box3().setFromObject(node);
    return b.isEmpty() ? null : b.getCenter(new THREE.Vector3());
  }

  function normalizeCamaroWheelNodes(scene) {
    if (!scene || scene.__motornayaCamaroWheelsNormalized) return;
    camaroScene = scene;
    camaroRims = [];
    camaroSourceTires = [];
    scene.traverse(function (node) {
      if (isRimNode(node)) camaroRims.push(node);
      if (isTireNode(node) && !/_wheel_(?:[0-3]|fixed_[0-3])$/i.test(node.name)) camaroSourceTires.push(node);
    });
    scene.__motornayaCamaroRims = camaroRims;
    scene.__motornayaCamaroSourceTires = camaroSourceTires;
    scene.__motornayaCamaroWheelsNormalized = true;
  }

  function collectCurrentTireMeshes() {
    var result = [];
    if (!camaroScene) return result;
    camaroScene.traverse(function (node) {
      if (!node || !node.isMesh || !node.visible || !node.name) return;
      if (!/_wheel_(?:[0-3]|fixed_[0-3])$/i.test(node.name)) return;
      if (!/tire|tyre/i.test(node.name)) return;
      result.push(node);
    });
    return result;
  }

  function collectWheelPivots(tires) {
    var pivots = [];
    for (var i = 0; i < tires.length; i++) {
      var p = tires[i].parent;
      if (p && pivots.indexOf(p) === -1) pivots.push(p);
    }
    return pivots.length === 4 ? pivots : [];
  }

  function extractConnectedComponents(source) {
    var geometry = source && source.geometry;
    var position = geometry && geometry.attributes && geometry.attributes.position;
    var index = geometry && geometry.index;
    if (!position || !index || index.count < 12) return [];

    var triangleCount = Math.floor(index.count / 3);
    var vertexTriangles = new Array(position.count);
    for (var i = 0; i < position.count; i++) vertexTriangles[i] = [];
    for (var t = 0; t < triangleCount; t++) {
      for (var c = 0; c < 3; c++) vertexTriangles[index.getX(t * 3 + c)].push(t);
    }

    var visited = new Uint8Array(triangleCount);
    var components = [];
    for (t = 0; t < triangleCount; t++) {
      if (visited[t]) continue;
      var queue = [t];
      visited[t] = 1;
      var triangles = [];
      while (queue.length) {
        var current = queue.pop();
        triangles.push(current);
        for (c = 0; c < 3; c++) {
          var neighbours = vertexTriangles[index.getX(current * 3 + c)];
          for (var n = 0; n < neighbours.length; n++) {
            var neighbour = neighbours[n];
            if (!visited[neighbour]) {
              visited[neighbour] = 1;
              queue.push(neighbour);
            }
          }
        }
      }
      if (triangles.length >= 12) components.push({ triangles: triangles });
    }
    return components;
  }

  function makeComponentMesh(source, component, index) {
    var srcGeo = source.geometry;
    var srcIndex = srcGeo.index;
    var remap = {};
    var indices = [];
    var vertexCount = 0;
    var triangles = component.triangles;

    for (var i = 0; i < triangles.length; i++) {
      var tri = triangles[i];
      for (var c = 0; c < 3; c++) {
        var oldIndex = srcIndex.getX(tri * 3 + c);
        if (remap[oldIndex] === undefined) remap[oldIndex] = vertexCount++;
        indices.push(remap[oldIndex]);
      }
    }

    var geo = new THREE.BufferGeometry();
    for (var name in srcGeo.attributes) {
      var attr = srcGeo.attributes[name];
      if (!attr || !attr.array || !attr.itemSize) continue;
      var array = new attr.array.constructor(vertexCount * attr.itemSize);
      for (var key in remap) {
        var oldVertex = Number(key);
        var newVertex = remap[key];
        for (var j = 0; j < attr.itemSize; j++) {
          array[newVertex * attr.itemSize + j] = attr.array[oldVertex * attr.itemSize + j];
        }
      }
      geo.setAttribute(name, new THREE.BufferAttribute(array, attr.itemSize, attr.normalized));
    }
    geo.setIndex(indices);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    var mesh = source.clone(false);
    mesh.geometry = geo;
    mesh.name = source.name + '_fixed_wheel_' + index;
    mesh.visible = true;
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(source.matrixWorld);
    mesh.matrixWorld.copy(source.matrixWorld);
    return mesh;
  }

  function sourceComponents() {
    var sources = camaroSourceTires.slice();
    if (!sources.length && camaroScene) {
      camaroScene.traverse(function (node) {
        if (isTireNode(node) && !/_wheel_(?:[0-3]|fixed_[0-3])$/i.test(node.name)) sources.push(node);
      });
    }
    if (!sources.length) return [];

    /* If the GLB already contains four physical tire meshes, never split them. */
    if (sources.length >= 4) {
      var direct = [];
      for (var i = 0; i < sources.length; i++) {
        var center = boundsCenter(sources[i]);
        if (center) direct.push({ source: sources[i], direct: true, center: center });
      }
      if (direct.length >= 4) return direct.slice(0, 4);
    }

    /* The Camaro file normally has one mesh containing four disconnected tire components. */
    var source = sources[0];
    var parts = extractConnectedComponents(source);
    if (parts.length < 4) return [];
    source.updateMatrixWorld(true);
    var result = [];
    for (i = 0; i < parts.length; i++) {
      var component = parts[i];
      var centerLocal = new THREE.Vector3();
      var count = 0;
      var position = source.geometry.attributes.position;
      var index = source.geometry.index;
      for (var t = 0; t < component.triangles.length; t++) {
        var tri = component.triangles[t];
        for (var c = 0; c < 3; c++) {
          centerLocal.add(new THREE.Vector3().fromBufferAttribute(position, index.getX(tri * 3 + c)));
          count++;
        }
      }
      centerLocal.multiplyScalar(1 / Math.max(1, count));
      var centerWorld = centerLocal.clone().applyMatrix4(source.matrixWorld);
      result.push({ source: source, component: component, direct: false, center: centerWorld });
    }
    result.sort(function (a, b) { return b.component.triangles.length - a.component.triangles.length; });
    return result.slice(0, 4);
  }

  function repairCamaroWheels() {
    if (wheelsRepaired || !camaroScene) return false;
    var currentTires = collectCurrentTireMeshes();
    var pivots = collectWheelPivots(currentTires);
    if (pivots.length !== 4) return false;

    var components = sourceComponents();
    if (components.length !== 4) return false;

    var pivotCenters = pivots.map(boundsCenter);
    var used = {};
    var assignments = [];
    for (var i = 0; i < components.length; i++) {
      var best = -1;
      var bestDistance = Infinity;
      for (var p = 0; p < pivots.length; p++) {
        if (used[p]) continue;
        var d = components[i].center.distanceTo(pivotCenters[p]);
        if (d < bestDistance) { bestDistance = d; best = p; }
      }
      if (best < 0) return false;
      used[best] = true;
      assignments.push({ component: components[i], pivot: pivots[best] });
    }

    for (i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      var mesh;
      if (a.component.direct) {
        mesh = a.component.source;
        if (!mesh.parent) camaroScene.add(mesh);
        mesh.updateMatrixWorld(true);
        a.pivot.updateMatrixWorld(true);
        a.pivot.attach(mesh);
        mesh.visible = true;
      } else {
        mesh = makeComponentMesh(a.component.source, a.component.component, i);
        a.pivot.updateMatrixWorld(true);
        a.pivot.attach(mesh);
      }
    }

    for (i = 0; i < currentTires.length; i++) {
      var old = currentTires[i];
      if (old.parent) old.parent.remove(old);
      if (old.geometry) old.geometry.dispose();
    }

    for (i = 0; i < camaroSourceTires.length; i++) {
      if (camaroSourceTires[i]) camaroSourceTires[i].visible = false;
    }

    wheelsRepaired = true;
    return true;
  }

  function bindAllCamaroRims() {
    if (!camaroScene || !camaroRims.length) return false;
    var tires = [];
    camaroScene.traverse(function (node) {
      if (node && node.isMesh && node.visible && node.name && /_fixed_wheel_[0-3]$/i.test(node.name)) tires.push(node);
    });
    if (tires.length < 4) return false;

    var available = camaroRims.slice();
    var bound = 0;
    for (var i = 0; i < tires.length; i++) {
      var tireCenter = boundsCenter(tires[i]);
      if (!tireCenter) continue;
      var best = null;
      var bestDistance = Infinity;
      for (var r = 0; r < available.length; r++) {
        var rim = available[r];
        if (!rim || rim.__motornayaRimBound) continue;
        var rimCenter = boundsCenter(rim);
        if (!rimCenter) continue;
        var distance = rimCenter.distanceTo(tireCenter);
        if (distance < bestDistance) { bestDistance = distance; best = rim; }
      }
      if (!best || bestDistance > 1.5 || !tires[i].parent) continue;
      tires[i].parent.updateMatrixWorld(true);
      best.updateMatrixWorld(true);
      tires[i].parent.attach(best);
      best.__motornayaRimBound = true;
      bound++;
    }
    return bound === 4;
  }

  function scheduleWheelRepair() {
    var delays = [0, 50, 150, 350, 700, 1200];
    for (var i = 0; i < delays.length; i++) {
      (function (delay) {
        setTimeout(function () {
          repairCamaroWheels();
          bindAllCamaroRims();
        }, delay);
      })(delays[i]);
    }
  }

  function hookWheelPivotAttachment() {
    if (!window.THREE || !THREE.Object3D || !THREE.Object3D.prototype.attach || THREE.Object3D.prototype.__motornayaCamaroAttachHooked) return false;
    var originalAttach = THREE.Object3D.prototype.attach;
    THREE.Object3D.prototype.attach = function (object) {
      originalAttach.call(this, object);
      if (object && object.name && /tire|tyre/i.test(object.name) && camaroRims.length) bindAllCamaroRims();
    };
    THREE.Object3D.prototype.__motornayaCamaroAttachHooked = true;
    return true;
  }

  function startMixer(gltf) {
    if (!gltf || !gltf.scene || !gltf.animations || !gltf.animations.length || !window.THREE) return;
    var mixer = new THREE.AnimationMixer(gltf.scene);
    for (var i = 0; i < gltf.animations.length; i++) {
      mixer.clipAction(gltf.animations[i]).reset().setLoop(THREE.LoopRepeat, Infinity).play();
    }
    mixers.push(mixer);
  }

  function hookLoader() {
    if (!window.THREE || !THREE.GLTFLoader || THREE.GLTFLoader.__motornayaCamaroHooked) return false;
    var originalLoad = THREE.GLTFLoader.prototype.load;
    THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      var actualUrl = String(url || '');
      if (/^(?:\.\/)?(?:car-model|chevrolet_camaro_1967_animated)\.glb(?:\?.*)?$/i.test(actualUrl)) actualUrl = CAMARO_URL;
      return originalLoad.call(this, actualUrl, function (gltf) {
        normalizeCamaroWheelNodes(gltf && gltf.scene);
        startMixer(gltf);
        if (onLoad) onLoad(gltf);
        scheduleWheelRepair();
      }, onProgress, onError);
    };
    THREE.GLTFLoader.__motornayaCamaroHooked = true;
    return true;
  }

  function forceCamaroLabels() {
    var selector = document.getElementById('car-selector');
    if (selector) {
      var oldOption = selector.querySelector('option[value="bmw"]');
      if (oldOption) oldOption.textContent = CAMARO_LABEL;
    }
    var mini = document.querySelector('.mini-brand small');
    if (mini) mini.textContent = CAMARO_LABEL;
    var caption = document.getElementById('car-caption');
    if (caption) caption.textContent = CAMARO_LABEL;
  }

  function frame(now) {
    var delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (var i = 0; i < mixers.length; i++) if (mixers[i]) mixers[i].update(delta);
    requestAnimationFrame(frame);
  }

  hookWheelPivotAttachment();
  hookLoader();
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    hookWheelPivotAttachment();
    if (hookLoader() || tries > 100) clearInterval(timer);
  }, 20);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceCamaroLabels);
  else forceCamaroLabels();
  setInterval(forceCamaroLabels, 500);
  requestAnimationFrame(frame);
})();
