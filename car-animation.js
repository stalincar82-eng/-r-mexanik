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
    var bounds = new THREE.Box3().setFromObject(node);
    return bounds.isEmpty() ? null : bounds.getCenter(new THREE.Vector3());
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
      var pivot = tires[i].parent;
      if (pivot && pivots.indexOf(pivot) === -1) pivots.push(pivot);
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
    var i;
    for (i = 0; i < position.count; i++) vertexTriangles[i] = [];

    var t;
    for (t = 0; t < triangleCount; t++) {
      for (var c = 0; c < 3; c++) {
        vertexTriangles[index.getX(t * 3 + c)].push(t);
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

  function componentCenter(source, component) {
    var position = source.geometry.attributes.position;
    var index = source.geometry.index;
    var center = new THREE.Vector3();
    var count = 0;
    for (var i = 0; i < component.triangles.length; i++) {
      var tri = component.triangles[i];
      for (var c = 0; c < 3; c++) {
        center.add(new THREE.Vector3().fromBufferAttribute(position, index.getX(tri * 3 + c)));
        count++;
      }
    }
    center.multiplyScalar(1 / Math.max(1, count));
    return center.applyMatrix4(source.matrixWorld);
  }

  function makeMergedMesh(source, components, name) {
    var srcGeo = source.geometry;
    var srcIndex = srcGeo.index;
    var remap = {};
    var indices = [];
    var vertexCount = 0;
    var i;

    for (i = 0; i < components.length; i++) {
      var triangles = components[i].triangles;
      for (var t = 0; t < triangles.length; t++) {
        var tri = triangles[t];
        for (var c = 0; c < 3; c++) {
          var oldIndex = srcIndex.getX(tri * 3 + c);
          if (remap[oldIndex] === undefined) remap[oldIndex] = vertexCount++;
          indices.push(remap[oldIndex]);
        }
      }
    }

    var geo = new THREE.BufferGeometry();
    for (var attributeName in srcGeo.attributes) {
      var attr = srcGeo.attributes[attributeName];
      if (!attr || !attr.array || !attr.itemSize) continue;
      var array = new attr.array.constructor(vertexCount * attr.itemSize);
      for (var key in remap) {
        var oldVertex = Number(key);
        var newVertex = remap[key];
        for (var componentIndex = 0; componentIndex < attr.itemSize; componentIndex++) {
          array[newVertex * attr.itemSize + componentIndex] = attr.array[oldVertex * attr.itemSize + componentIndex];
        }
      }
      geo.setAttribute(attributeName, new THREE.BufferAttribute(array, attr.itemSize, attr.normalized));
    }
    geo.setIndex(indices);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    var mesh = source.clone(false);
    mesh.geometry = geo;
    mesh.name = name;
    mesh.visible = true;
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(source.matrixWorld);
    mesh.matrixWorld.copy(source.matrixWorld);
    return mesh;
  }

  function sourceDirectMeshes() {
    var direct = [];
    for (var i = 0; i < camaroSourceTires.length; i++) {
      var center = boundsCenter(camaroSourceTires[i]);
      if (center) direct.push({ source: camaroSourceTires[i], center: center });
    }
    return direct;
  }

  function repairCamaroWheels() {
    if (wheelsRepaired || !camaroScene) return false;

    var currentTires = collectCurrentTireMeshes();
    var pivots = collectWheelPivots(currentTires);
    if (pivots.length !== 4) return false;

    for (var p = 0; p < pivots.length; p++) pivots[p].updateMatrixWorld(true);
    var pivotCenters = pivots.map(boundsCenter);

    /* If the GLB has four physical tire meshes, keep every tire whole. */
    var direct = sourceDirectMeshes();
    if (direct.length >= 4) {
      direct.sort(function (a, b) { return a.center.z - b.center.z; });
      var usedDirect = {};
      for (var di = 0; di < 4; di++) {
        var bestDirect = -1;
        var bestDistance = Infinity;
        for (var dj = 0; dj < direct.length; dj++) {
          if (usedDirect[dj]) continue;
          var dd = direct[dj].center.distanceTo(pivotCenters[di]);
          if (dd < bestDistance) { bestDistance = dd; bestDirect = dj; }
        }
        if (bestDirect < 0) return false;
        usedDirect[bestDirect] = true;
        var directMesh = direct[bestDirect].source;
        directMesh.visible = true;
        directMesh.updateMatrixWorld(true);
        pivots[di].attach(directMesh);
      }
    } else {
      /* One source mesh may contain 5+ disconnected pieces. Never discard the
         extra piece: assign every component to one of the four wheel pivots.
         This is what fixes the Camaro front-left tire that was being cut in half. */
      var source = camaroSourceTires[0];
      if (!source || !source.geometry || !source.geometry.index) return false;
      source.updateMatrixWorld(true);
      var components = extractConnectedComponents(source);
      if (components.length < 4) return false;

      var records = [];
      for (var ci = 0; ci < components.length; ci++) {
        records.push({ component: components[ci], center: componentCenter(source, components[ci]) });
      }

      /* Seed each wheel with its closest unique component so every wheel gets
         one complete base component before smaller/extra pieces are assigned. */
      var groups = [[], [], [], []];
      var usedComponents = {};
      for (p = 0; p < 4; p++) {
        var seed = -1;
        var seedDistance = Infinity;
        for (ci = 0; ci < records.length; ci++) {
          if (usedComponents[ci]) continue;
          var seedDistanceNow = records[ci].center.distanceTo(pivotCenters[p]);
          if (seedDistanceNow < seedDistance) {
            seedDistance = seedDistanceNow;
            seed = ci;
          }
        }
        if (seed < 0) return false;
        usedComponents[seed] = true;
        groups[p].push(records[seed].component);
      }

      /* Assign all remaining components to the nearest wheel. This deliberately
         keeps both halves of a wheel together instead of taking only the four
         largest components. */
      for (ci = 0; ci < records.length; ci++) {
        if (usedComponents[ci]) continue;
        var bestPivot = 0;
        var bestRemainingDistance = Infinity;
        for (p = 0; p < 4; p++) {
          var remainingDistance = records[ci].center.distanceTo(pivotCenters[p]);
          if (remainingDistance < bestRemainingDistance) {
            bestRemainingDistance = remainingDistance;
            bestPivot = p;
          }
        }
        groups[bestPivot].push(records[ci].component);
      }

      for (p = 0; p < 4; p++) {
        var merged = makeMergedMesh(source, groups[p], source.name + '_fixed_wheel_' + p);
        pivots[p].updateMatrixWorld(true);
        pivots[p].attach(merged);
      }
    }

    for (var ti = 0; ti < currentTires.length; ti++) {
      var old = currentTires[ti];
      if (old.parent) old.parent.remove(old);
      if (old.geometry) old.geometry.dispose();
    }
    for (var si = 0; si < camaroSourceTires.length; si++) {
      camaroSourceTires[si].visible = false;
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
      if (!tireCenter || !tires[i].parent) continue;
      var best = null;
      var bestDistance = Infinity;
      for (var r = 0; r < available.length; r++) {
        var rim = available[r];
        if (!rim || rim.__motornayaRimBound) continue;
        var rimCenter = boundsCenter(rim);
        if (!rimCenter) continue;
        var distance = rimCenter.distanceTo(tireCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = rim;
        }
      }
      if (!best || bestDistance > 1.5) continue;
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