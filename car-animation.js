/* Моторная — Chevrolet Camaro 1967 model bridge. */
(function () {
  'use strict';
  var mixers = [];
  var last = performance.now();
  var CAMARO_URL = '1967_chevrolet_camaro_ss_350_coupe.glb';
  var CAMARO_LABEL = 'CHEVROLET CAMARO · 1967 SS 350';
  var camaroRims = [];
  var camaroScene = null;
  var tiresRepaired = false;

  function isRimNode(node) {
    return !!(node && node.name && /Rim_Main/i.test(node.name));
  }

  function normalizeCamaroWheelNodes(scene) {
    if (!scene || scene.__motornayaCamaroWheelsNormalized) return;
    camaroScene = scene;
    camaroRims = [];
    scene.traverse(function (node) {
      if (isRimNode(node)) camaroRims.push(node);
    });
    scene.__motornayaCamaroRims = camaroRims;
    scene.__motornayaCamaroWheelsNormalized = true;
  }

  function boundsCenter(node) {
    var bounds = new THREE.Box3().setFromObject(node);
    return bounds.isEmpty() ? null : bounds.getCenter(new THREE.Vector3());
  }

  function boundsVolume(node) {
    var bounds = new THREE.Box3().setFromObject(node);
    if (bounds.isEmpty()) return 0;
    var size = bounds.getSize(new THREE.Vector3());
    return size.x * size.y * size.z;
  }

  function findActualTireMeshes() {
    var tires = [];
    if (!camaroScene) return tires;
    camaroScene.traverse(function (node) {
      if (!node || !node.name || !node.isMesh || !node.visible) return;
      if (!/_wheel_(?:[0-3]|fixed_[0-3])$/i.test(node.name)) return;
      if (!/tire|tyre/i.test(node.name)) return;
      if (!node.parent) return;
      tires.push(node);
    });
    return tires;
  }

  /* The old game.js splitter divides one tire across the X axis. A real tire
     is thick along X, so that can literally cut a wheel in half. The original
     Camaro tire mesh is one disconnected component per physical wheel.
     Rebuild the four wheels from connected triangle components instead. */
  function repairCamaroTires() {
    if (tiresRepaired || !camaroScene) return false;

    var splitMeshes = [];
    var sourceMeshes = [];
    camaroScene.traverse(function (node) {
      if (!node || !node.isMesh || !node.name) return;
      if (/_wheel_[0-3]$/i.test(node.name) && /tire|tyre/i.test(node.name)) splitMeshes.push(node);
      if (!/_wheel_/i.test(node.name) && /tire|tyre/i.test(node.name)) sourceMeshes.push(node);
    });
    if (splitMeshes.length < 4 || !sourceMeshes.length) return false;

    splitMeshes.sort(function (a, b) { return a.name.localeCompare(b.name); });
    var pivots = [];
    for (var i = 0; i < splitMeshes.length; i++) {
      var pivot = splitMeshes[i].parent;
      if (!pivot || pivots.indexOf(pivot) !== -1) continue;
      pivots.push(pivot);
    }
    if (pivots.length !== 4) return false;

    var source = sourceMeshes[0];
    var position = source.geometry && source.geometry.attributes && source.geometry.attributes.position;
    var index = source.geometry && source.geometry.index;
    if (!position || !index || index.count < 12) return false;
    source.updateMatrixWorld(true);

    var triangleCount = Math.floor(index.count / 3);
    var vertexTriangles = new Array(position.count);
    var t;
    for (t = 0; t < position.count; t++) vertexTriangles[t] = [];
    for (t = 0; t < triangleCount; t++) {
      for (var k = 0; k < 3; k++) {
        var vertexIndex = index.getX(t * 3 + k);
        vertexTriangles[vertexIndex].push(t);
      }
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
        for (var corner = 0; corner < 3; corner++) {
          var v = index.getX(current * 3 + corner);
          var neighbours = vertexTriangles[v];
          for (var n = 0; n < neighbours.length; n++) {
            var neighbour = neighbours[n];
            if (!visited[neighbour]) {
              visited[neighbour] = 1;
              queue.push(neighbour);
            }
          }
        }
      }
      if (triangles.length >= 12) {
        var center = new THREE.Vector3();
        var count = 0;
        for (var ci = 0; ci < triangles.length; ci++) {
          var tri = triangles[ci];
          for (var cornerIndex = 0; cornerIndex < 3; cornerIndex++) {
            var p = new THREE.Vector3().fromBufferAttribute(position, index.getX(tri * 3 + cornerIndex));
            source.localToWorld(p);
            center.add(p);
            count++;
          }
        }
        center.multiplyScalar(1 / Math.max(1, count));
        components.push({ triangles: triangles, center: center });
      }
    }

    components.sort(function (a, b) { return b.triangles.length - a.triangles.length; });
    if (components.length < 4) return false;
    components = components.slice(0, 4);

    var pivotCenters = pivots.map(function (pivot) {
      return boundsCenter(pivot) || new THREE.Vector3();
    });
    var used = {};
    var assignments = [];
    for (var componentIndex = 0; componentIndex < components.length; componentIndex++) {
      var bestPivot = -1;
      var bestDistance = Infinity;
      for (var pivotIndex = 0; pivotIndex < pivots.length; pivotIndex++) {
        if (used[pivotIndex]) continue;
        var distance = components[componentIndex].center.distanceTo(pivotCenters[pivotIndex]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPivot = pivotIndex;
        }
      }
      if (bestPivot < 0) return false;
      used[bestPivot] = true;
      assignments.push({ component: components[componentIndex], pivot: pivots[bestPivot] });
    }

    for (var assignmentIndex = 0; assignmentIndex < assignments.length; assignmentIndex++) {
      var assignment = assignments[assignmentIndex];
      var componentTriangles = assignment.component.triangles;
      var geometry = new THREE.BufferGeometry();
      var remap = {};
      var indices = [];
      var uniqueVertexCount = 0;
      var triIndex;
      for (triIndex = 0; triIndex < componentTriangles.length; triIndex++) {
        var triangleIndex = componentTriangles[triIndex];
        for (var corner2 = 0; corner2 < 3; corner2++) {
          var sourceVertex = index.getX(triangleIndex * 3 + corner2);
          if (remap[sourceVertex] === undefined) remap[sourceVertex] = uniqueVertexCount++;
          indices.push(remap[sourceVertex]);
        }
      }
      for (var attributeName in source.geometry.attributes) {
        var sourceAttribute = source.geometry.attributes[attributeName];
        if (!sourceAttribute || !sourceAttribute.array || !sourceAttribute.itemSize) continue;
        var array = new sourceAttribute.array.constructor(uniqueVertexCount * sourceAttribute.itemSize);
        for (var oldKey in remap) {
          var oldIndex = Number(oldKey);
          var newIndex = remap[oldKey];
          for (var componentIndex2 = 0; componentIndex2 < sourceAttribute.itemSize; componentIndex2++) {
            array[newIndex * sourceAttribute.itemSize + componentIndex2] = sourceAttribute.array[oldIndex * sourceAttribute.itemSize + componentIndex2];
          }
        }
        geometry.setAttribute(attributeName, new THREE.BufferAttribute(array, sourceAttribute.itemSize, sourceAttribute.normalized));
      }
      geometry.setIndex(indices);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      var fixed = source.clone(false);
      fixed.geometry = geometry;
      fixed.name = source.name + '_fixed_wheel_' + assignmentIndex;
      fixed.visible = true;
      fixed.matrixAutoUpdate = true;
      fixed.applyMatrix4(source.matrixWorld);
      assignment.pivot.attach(fixed);
    }

    for (var oldIndex = 0; oldIndex < splitMeshes.length; oldIndex++) {
      var oldMesh = splitMeshes[oldIndex];
      if (oldMesh.parent) oldMesh.parent.remove(oldMesh);
      if (oldMesh.geometry) oldMesh.geometry.dispose();
    }
    source.visible = false;
    tiresRepaired = true;
    return true;
  }

  function bindAllCamaroRims() {
    if (!camaroScene || !camaroRims.length) return false;
    var tires = findActualTireMeshes();
    if (tires.length < 4) return false;

    var available = camaroRims.slice();
    var bound = 0;
    for (var tireIndex = 0; tireIndex < tires.length; tireIndex++) {
      var tire = tires[tireIndex];
      var tireCenter = boundsCenter(tire);
      if (!tireCenter) continue;
      var best = null;
      var bestDistance = Infinity;
      var bestVolume = -1;
      for (var rimIndex = 0; rimIndex < available.length; rimIndex++) {
        var rim = available[rimIndex];
        if (!rim || rim.__motornayaRimBound) continue;
        var center = boundsCenter(rim);
        if (!center) continue;
        var distance = center.distanceTo(tireCenter);
        var volume = boundsVolume(rim);
        if (distance < bestDistance - 0.02 || (Math.abs(distance - bestDistance) <= 0.02 && volume > bestVolume)) {
          best = rim;
          bestDistance = distance;
          bestVolume = volume;
        }
      }
      if (!best || bestDistance > 1.25) continue;
      var spinPivot = tire.parent;
      if (!spinPivot) continue;
      spinPivot.updateMatrixWorld(true);
      best.updateMatrixWorld(true);
      spinPivot.attach(best);
      best.__motornayaRimBound = true;
      spinPivot.__motornayaCamaroRimBound = true;
      bound++;
    }
    return bound >= 4;
  }

  function scheduleRimBinding() {
    var delays = [0, 40, 120, 300, 700, 1200];
    for (var i = 0; i < delays.length; i++) {
      (function (delay) {
        setTimeout(function () {
          repairCamaroTires();
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
        scheduleRimBinding();
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