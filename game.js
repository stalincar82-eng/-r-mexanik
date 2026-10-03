(function () {
  'use strict';

  var host = document.getElementById('scene');
  var warning = document.getElementById('webgl-warning');
  var keyState = {};
  var touchState = {};
  var gasPressedAt = 0;
  var gasTapTimer;
  var parts = {};
  var speed = 0;
  var heading = 0;
  var distance = 0;
  var driving = true;
  var device = 'desktop';
  var toastTimer;
  var scene;
  var camera;
  var renderer;
  var car;
  var wheels = [];
  var selectedCar = 'bmw';
  var loadRequest = 0;
  var pointerDown = false;
  var pointerStartX = 0;
  var pointerStartY = 0;
  var pointerLastX = 0;
  var pointerLastY = 0;
  var cameraOrbit = 0;
  var cameraElevation = 0;
  var mouseSteering = 0;
  var clock;
  var cameraTarget;
  var cameraPosition;

  if (!window.THREE) {
    showWarning('Не удалось загрузить Three.js. Подключись к интернету и обнови страницу.');
    return;
  }

  cameraTarget = new THREE.Vector3();
  cameraPosition = new THREE.Vector3();

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (error) {
    showWarning('Включи аппаратное ускорение и поддержку WebGL в настройках браузера.');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.setClearColor(0xa9b8a8, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9b8a8);
  scene.fog = new THREE.Fog(0xa9b8a8, 48, 155);
  camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 240);
  clock = new THREE.Clock();

  buildLighting();
  buildCity();
  buildCar();
  buildWorkshop();
  bindInterface();
  updatePartsPanel();
  updateCamera(1);
  animate();

  function showWarning(message) {
    warning.classList.remove('is-hidden');
    document.getElementById('warning-copy').textContent = message;
  }

  function material(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: roughness === undefined ? 0.8 : roughness, metalness: metalness || 0 });
  }

  function box(parent, width, height, depth, color, x, y, z, mat) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat || material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function roundedPanel(parent, width, length, thickness, radius, mat, x, y, z) {
    var shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radius, -length / 2);
    shape.lineTo(width / 2 - radius, -length / 2);
    shape.quadraticCurveTo(width / 2, -length / 2, width / 2, -length / 2 + radius);
    shape.lineTo(width / 2, length / 2 - radius);
    shape.quadraticCurveTo(width / 2, length / 2, width / 2 - radius, length / 2);
    shape.lineTo(-width / 2 + radius, length / 2);
    shape.quadraticCurveTo(-width / 2, length / 2, -width / 2, length / 2 - radius);
    shape.lineTo(-width / 2, -length / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -length / 2, -width / 2 + radius, -length / 2);
    var geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: Math.min(radius * 0.2, 0.025),
      bevelThickness: Math.min(thickness * 0.2, 0.02)
    });
    var mesh = new THREE.Mesh(geometry, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function buildLighting() {
    var hemi = new THREE.HemisphereLight(0xe8f1df, 0x536257, 0.72);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffeed2, 1.25);
    sun.position.set(-26, 42, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -36;
    sun.shadow.camera.right = 36;
    sun.shadow.camera.top = 36;
    sun.shadow.camera.bottom = -36;
    scene.add(sun);
    var fill = new THREE.DirectionalLight(0xc3d6e6, 0.55);
    fill.position.set(18, 12, 24);
    scene.add(fill);
  }

  function buildCity() {
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), material(0x778a71));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    scene.add(ground);
    var roadMat = material(0x414a47, 0.96);
    var sidewalkMat = material(0xc5c4aa);
    var roadX = [-54, -27, 0, 27, 54];
    var roadZ = [-54, -27, 0, 27, 54];
    var i;
    for (i = 0; i < roadX.length; i++) {
      box(scene, 8.5, 0.08, 300, 0x414a47, roadX[i], 0, 0, roadMat);
      box(scene, 0.13, 0.014, 300, 0xe7dd9b, roadX[i] - 0.55, 0.05, 0, material(0xe7dd9b));
      box(scene, 0.13, 0.014, 300, 0xe7dd9b, roadX[i] + 0.55, 0.05, 0, material(0xe7dd9b));
    }
    for (i = 0; i < roadZ.length; i++) {
      box(scene, 300, 0.08, 8.5, 0x414a47, 0, 0, roadZ[i], roadMat);
      box(scene, 300, 0.014, 0.13, 0xe7dd9b, 0, 0.05, roadZ[i] - 0.55, material(0xe7dd9b));
      box(scene, 300, 0.014, 0.13, 0xe7dd9b, 0, 0.05, roadZ[i] + 0.55, material(0xe7dd9b));
    }
    for (i = -2; i <= 2; i++) {
      var j;
      for (j = -2; j <= 2; j++) {
        if (i === 0 && j === 0) continue;
        var bx = i * 27 + (i < 0 ? 13.5 : -13.5);
        var bz = j * 27 + (j < 0 ? 13.5 : -13.5);
        var width = 9 + ((Math.abs(i * 3 + j * 5) % 4) * 1.1);
        var depth = 9 + ((Math.abs(i * 7 + j * 2) % 4) * 1.4);
        var height = 3.5 + ((Math.abs(i * 11 + j * 13) % 5) * 1.45);
        var palette = [0xb8aa91, 0xa0b1a2, 0xc0b5a3, 0x87978f, 0xb7b8a7];
        var building = box(scene, width, height, depth, palette[Math.abs(i * 3 + j * 7) % palette.length], bx, height / 2, bz);
        building.castShadow = true;
        box(scene, width + 0.5, 0.22, depth + 0.5, 0x8d9482, bx, 0.12, bz, sidewalkMat);
        var windowMat = new THREE.MeshStandardMaterial({ color: 0xd4c98f, emissive: 0x5c5230, roughness: 0.4 });
        var row;
        for (row = 0; row < Math.min(3, Math.floor(height / 1.7)); row++) {
          box(scene, 0.56, 0.6, 0.08, 0xc7d0bd, bx - width * 0.24, 1.15 + row * 1.35, bz + depth / 2 + 0.045, windowMat);
          box(scene, 0.56, 0.6, 0.08, 0xc7d0bd, bx + width * 0.24, 1.15 + row * 1.35, bz + depth / 2 + 0.045, windowMat);
        }
      }
    }
    addTree(-8, 5); addTree(8, -8); addTree(-11, -8); addTree(9, 9);
    addLamp(-5.7, -5.5); addLamp(5.7, -5.5); addLamp(-5.7, 5.5); addLamp(5.7, 5.5);
    addShopSign();
  }

  function addTree(x, z) {
    var group = new THREE.Group();
    group.position.set(x, 0, z);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.35, 7), material(0x705c43));
    trunk.position.y = 0.68;
    trunk.castShadow = true;
    group.add(trunk);
    var crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), material(0x526f53));
    crown.position.y = 1.8;
    crown.castShadow = true;
    group.add(crown);
    scene.add(group);
  }

  function addLamp(x, z) {
    box(scene, 0.09, 3.2, 0.09, 0x424e48, x, 1.6, z);
    box(scene, 0.65, 0.11, 0.12, 0xd7d0ad, x + 0.25, 3.15, z);
  }

  function addShopSign() {
    var sign = box(scene, 3.2, 0.48, 0.16, 0xd9f36a, -3.2, 2.8, -4.25);
    sign.material.emissive = new THREE.Color(0x6c8e2b);
    var post = box(scene, 0.13, 2.1, 0.13, 0x45524a, -3.2, 1.05, -4.25);
    post.castShadow = true;
  }

  function buildCar() {
    car = new THREE.Group();
    scene.add(car);
    loadCarModel(selectedCar);
  }

  function loadCarModel(modelId) {
    var models = {
      bmw: { url: 'car-model.glb', label: 'BMW M3 GTR', targetLength: 4.2 },
      volvo: { url: 'assets/volvo-s60r.glb', label: 'VOLVO S60 R · 2004', targetLength: 4.2 },
      audi: { url: 'assets/audi-s4.glb', label: 'AUDI S4 · 2006', targetLength: 4.2 }
    };
    var modelInfo = models[modelId];
    var request = ++loadRequest;
    selectedCar = modelId;
    speed = 0;
    heading = 0;
    cameraOrbit = 0;
    cameraElevation = 0;
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    var selector = document.getElementById('car-selector');
    if (selector) selector.value = modelId;
    document.querySelector('.mini-brand small').textContent = modelInfo.label;
    document.getElementById('car-caption').textContent = modelInfo.label;

    new THREE.GLTFLoader().load(modelInfo.url, function (gltf) {
      if (request !== loadRequest) return;
      while (car.children.length) {
        var oldModel = car.children[0];
        car.remove(oldModel);
        oldModel.traverse(function (node) {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            var materials = Array.isArray(node.material) ? node.material : [node.material];
            for (var materialIndex = 0; materialIndex < materials.length; materialIndex++) materials[materialIndex].dispose();
          }
        });
      }
      wheels = [];
      parts = {};

      var model = gltf.scene;
      var modelBounds = new THREE.Box3();
      var modelSize = new THREE.Vector3();
      var modelCenter = new THREE.Vector3();
      model.updateMatrixWorld(true);
      modelBounds.setFromObject(model);
      modelBounds.getSize(modelSize);
      modelBounds.getCenter(modelCenter);
      if (modelSize.x > modelSize.z) model.rotation.y = -Math.PI / 2;
      model.updateMatrixWorld(true);
      modelBounds.setFromObject(model);
      modelBounds.getSize(modelSize);
      modelBounds.getCenter(modelCenter);
      var scale = modelInfo.targetLength / Math.max(modelSize.x, modelSize.z);
      model.scale.setScalar(scale);
      model.position.x = -modelCenter.x * scale;
      model.position.y = -modelBounds.min.y * scale;
      model.position.z = -modelCenter.z * scale;
      model.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      car.add(model);
      model.updateMatrixWorld(true);
      discoverCarParts(model);
      updatePartsPanel();
    }, undefined, function (error) {
      if (request !== loadRequest) return;
      console.error('Error loading GLB model:', error);
      showWarning('Не удалось загрузить ' + modelInfo.label + '. Проверь файл модели и обнови страницу.');
    });
  }

  function discoverCarParts(model) {
    var candidates = [];
    model.traverse(function (node) {
      if (node !== model && node.children.length && node.name) candidates.push(node);
    });
    var definitions = [
      { id: 'hood', label: 'Капот', pattern: /sm_hood|hood[ab]?_(?:body|black|chrome)/i, open: true, hinge: 'maxZ', direction: -1 },
      { id: 'trunk', label: 'Багажник', pattern: /(?:^|[_:])(?:sm_)?trunk(?:[_:]|$)|lod0_trunk_(?:body|black|chrome)/i, open: true, hinge: 'minZ', direction: 1 },
      { id: 'doors', label: 'Двери', pattern: /(?:^|[_:])(?:sm_)?doors?(?:[_:]|$)|lod0_door/i, open: true, hinge: 'centerZ', direction: 1 },
      { id: 'engine', label: 'Двигатель', pattern: /(?:^|[_:])(?:sm_)?engine(?:[_:]|$)/i },
      { id: 'battery', label: 'Аккумулятор', pattern: /(?:^|[_:])(?:sm_)?battery(?:[_:]|$)/i },
      { id: 'radiator', label: 'Радиатор', pattern: /(?:^|[_:])(?:sm_)?radiator(?:[_:]|$)/i }
    ];
    var partGroups = {};
    for (var definitionIndex = 0; definitionIndex < definitions.length; definitionIndex++) {
      var definition = definitions[definitionIndex];
      partGroups[definition.id] = [];
      for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
        var candidate = candidates[candidateIndex];
        if (definition.pattern.test(candidate.name)) partGroups[definition.id].push(candidate);
      }
      if (partGroups[definition.id].length) {
        parts[definition.id] = createPart(definition.id, definition.label, partGroups[definition.id], definition);
      }
    }

    var wheelGroups = [];
    for (var wheelIndex = 0; wheelIndex < candidates.length; wheelIndex++) {
      var wheelGroup = candidates[wheelIndex];
      if (/wheel|tyre|tire/i.test(wheelGroup.name) && !/steering|wheelhouse|brake|hub/i.test(wheelGroup.name)) wheelGroups.push(wheelGroup);
    }
    var uniqueWheelGroups = [];
    for (var groupIndex = 0; groupIndex < wheelGroups.length; groupIndex++) {
      var nested = false;
      for (var parentIndex = 0; parentIndex < wheelGroups.length; parentIndex++) {
        if (parentIndex !== groupIndex && wheelGroups[parentIndex].getObjectById(wheelGroups[groupIndex].id)) nested = true;
      }
      if (!nested) uniqueWheelGroups.push(wheelGroups[groupIndex]);
    }
    var wheelBounds = uniqueWheelGroups.map(function (group) {
      var bounds = new THREE.Box3().setFromObject(group);
      return { group: group, bounds: bounds, center: bounds.getCenter(new THREE.Vector3()) };
    }).sort(function (a, b) { return a.center.z - b.center.z; });
    if (wheelBounds.length && wheelBounds.length < 4) {
      parts.wheelSet = createPart('wheelSet', 'Комплект колёс (единый узел)', wheelBounds.map(function (wheel) { return wheel.group; }), { wheel: true });
      return;
    }
    for (var i = 0; i < wheelBounds.length; i++) {
      var wheel = wheelBounds[i];
      var front = i >= wheelBounds.length - Math.ceil(wheelBounds.length / 2);
      var side = wheel.center.x < 0 ? 'L' : 'R';
      var axle = front ? 'F' : 'R';
      var id = 'wheel' + axle + side;
      if (parts[id]) continue;
      var wheelPart = createPart(id, (front ? 'Переднее ' : 'Заднее ') + (side === 'L' ? 'левое' : 'правое') + ' колесо', [wheel.group], { hinge: 'center', wheel: true });
      parts[id] = wheelPart;
      wheels.push(wheelPart);
    }
  }

  function createPart(id, label, groups, options) {
    var bounds = new THREE.Box3();
    for (var i = 0; i < groups.length; i++) bounds.union(new THREE.Box3().setFromObject(groups[i]));
    var center = bounds.getCenter(new THREE.Vector3());
    var pivot = new THREE.Group();
    var localHinge = center.clone();
    if (options.hinge === 'maxZ') localHinge.z = bounds.max.z;
    if (options.hinge === 'minZ') localHinge.z = bounds.min.z;
    if (options.hinge === 'centerZ') localHinge.z = center.z;
    car.add(pivot);
    pivot.position.copy(car.worldToLocal(localHinge.clone()));
    for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) pivot.attach(groups[groupIndex]);
    return { id: id, label: label, groups: groups, pivot: pivot, visible: true, openable: !!options.open, direction: options.direction || 1, isOpen: false, wheel: !!options.wheel, center: center };
  }

  function setPartOpen(part, open) {
    part.isOpen = open;
    part.pivot.rotation.x = open ? part.direction * 0.7 : 0;
  }

  function buildWorkshop() {
    var pad = box(scene, 8, 0.08, 7, 0x9c9c83, -2.5, -0.025, -0.5, material(0x9c9c83));
    pad.receiveShadow = true;
    box(scene, 0.1, 2.7, 7, 0x757d6d, -6.5, 1.3, -0.5, material(0x757d6d));
    box(scene, 3.9, 0.08, 0.12, 0xd9f36a, -2.5, 0.045, 2.85, material(0xd9f36a));
    var lift = material(0x495751, 0.45, 0.46);
    box(scene, 0.2, 0.38, 0.48, 0x495751, -2.6, 0.15, -0.7, lift);
    box(scene, 0.2, 0.38, 0.48, 0x495751, -0.1, 0.15, -0.7, lift);
  }

  function bindInterface() {
    var choices = document.querySelectorAll('.device-choice');
    var i;
    for (i = 0; i < choices.length; i++) choices[i].addEventListener('click', startGame);
    var modes = document.querySelectorAll('.mode-button');
    for (i = 0; i < modes.length; i++) modes[i].addEventListener('click', setMode);
    document.getElementById('car-selector').addEventListener('change', function (event) {
      loadCarModel(event.currentTarget.value);
    });
    document.getElementById('exit-button').addEventListener('click', function () {
      document.getElementById('game-ui').classList.add('is-hidden');
      document.getElementById('start-screen').classList.remove('is-hidden');
      speed = 0;
    });
    window.addEventListener('keydown', function (event) {
      var key = getKeyboardKey(event);
      if (key.indexOf('arrow') === 0 || key === 'space') event.preventDefault();
      keyState[key] = true;
      if (key === 'keye' && !event.repeat) setMode();
    });
    window.addEventListener('keyup', function (event) {
      var key = getKeyboardKey(event);
      keyState[key] = false;
    });
    window.addEventListener('blur', function () { keyState = {}; touchState = {}; window.clearTimeout(gasTapTimer); });
    window.addEventListener('resize', resize);
    var controls = document.querySelectorAll('[data-control]');
    for (i = 0; i < controls.length; i++) {
      controls[i].addEventListener('pointerdown', pressControl);
      controls[i].addEventListener('pointerup', releaseControl);
      controls[i].addEventListener('pointerleave', releaseControl);
      controls[i].addEventListener('pointercancel', releaseControl);
    }
    renderer.domElement.addEventListener('pointerdown', beginScenePointer);
    renderer.domElement.addEventListener('pointermove', moveScenePointer);
    renderer.domElement.addEventListener('pointerup', endScenePointer);
    renderer.domElement.addEventListener('pointercancel', endScenePointer);
    renderer.domElement.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'mouse' && !pointerDown) mouseSteering = 0;
    });
    renderer.domElement.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }

  function beginScenePointer(event) {
    pointerDown = true;
    pointerStartX = pointerLastX = event.clientX;
    pointerStartY = pointerLastY = event.clientY;
    if (event.pointerType !== 'mouse') event.preventDefault();
    if (renderer.domElement.setPointerCapture) renderer.domElement.setPointerCapture(event.pointerId);
  }

  function moveScenePointer(event) {
    if (event.pointerType === 'mouse' && !pointerDown && driving) {
      var normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseSteering = Math.abs(normalizedX) < 0.08 ? 0 : Math.max(-1, Math.min(1, normalizedX));
    }
    if (!pointerDown) return;
    var deltaX = event.clientX - pointerLastX;
    var deltaY = event.clientY - pointerLastY;
    cameraOrbit -= deltaX * 0.006;
    cameraElevation = Math.max(-0.4, Math.min(0.75, cameraElevation + deltaY * 0.003));
    if (event.pointerType !== 'mouse') {
      touchState.swipeLeft = event.clientX - pointerStartX < -24;
      touchState.swipeRight = event.clientX - pointerStartX > 24;
    }
    pointerLastX = event.clientX;
    pointerLastY = event.clientY;
    if (event.pointerType !== 'mouse') event.preventDefault();
  }

  function endScenePointer() {
    pointerDown = false;
    touchState.swipeLeft = false;
    touchState.swipeRight = false;
  }

  function getKeyboardKey(event) {
    if (event.code) return event.code.toLowerCase();
    var key = event.key.toLowerCase();
    var aliases = { w: 'keyw', ц: 'keyw', a: 'keya', ф: 'keya', s: 'keys', ы: 'keys', d: 'keyd', в: 'keyd', e: 'keye', у: 'keye', ' ': 'space' };
    return aliases[key] || key;
  }

  function startGame(event) {
    device = event.currentTarget.getAttribute('data-device');
    document.body.classList.toggle('device-mobile', device === 'mobile');
    document.getElementById('start-screen').classList.add('is-hidden');
    document.getElementById('game-ui').classList.remove('is-hidden');
    document.getElementById('workshop-panel').classList.add('is-collapsed');
    driving = true;
    setMode('drive');
  }

  function setMode(eventOrMode) {
    var mode = typeof eventOrMode === 'string' ? eventOrMode : (eventOrMode && eventOrMode.currentTarget ? eventOrMode.currentTarget.getAttribute('data-mode') : (driving ? 'workshop' : 'drive'));
    driving = mode === 'drive';
    var buttons = document.querySelectorAll('.mode-button');
    var i;
    for (i = 0; i < buttons.length; i++) buttons[i].classList.toggle('is-active', buttons[i].getAttribute('data-mode') === mode);
    document.getElementById('workshop-panel').classList.toggle('is-collapsed', driving);
    document.getElementById('top-status-text').textContent = driving ? 'СВОБОДНЫЙ ЗАЕЗД' : 'РАБОТА В ГАРАЖЕ';
    if (!driving) speed = 0;
  }

  function pressControl(event) {
    event.preventDefault();
    var control = event.currentTarget.getAttribute('data-control');
    touchState[control] = true;
    if (control === 'gas') {
      gasPressedAt = Date.now();
      touchState.gasTap = false;
      window.clearTimeout(gasTapTimer);
    }
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function releaseControl(event) {
    var control = event.currentTarget.getAttribute('data-control');
    touchState[control] = false;
    if (control === 'gas' && Date.now() - gasPressedAt < 180) {
      touchState.gasTap = true;
      gasTapTimer = window.setTimeout(function () { touchState.gasTap = false; }, 700);
    }
  }

  function updatePartsPanel() {
    var order = ['hood', 'trunk', 'doors', 'engine', 'battery', 'radiator', 'wheelFL', 'wheelFR', 'wheelRL', 'wheelRR', 'wheelSet'];
    var list = document.getElementById('parts-list');
    var ids = [];
    for (var orderIndex = 0; orderIndex < order.length; orderIndex++) {
      if (parts[order[orderIndex]]) ids.push(order[orderIndex]);
    }
    var html = '';
    var ready = 0;
    for (var i = 0; i < ids.length; i++) {
      var part = parts[ids[i]];
      if (part.visible) ready++;
      var state = !part.visible ? 'Снята' : (part.isOpen ? 'Открыта' : 'Установлена');
      html += '<div class="part-row' + (part.visible ? '' : ' is-removed') + '"><span class="part-indicator">' + ('0' + (i + 1)).slice(-2) + '</span><span class="part-name">' + part.label + '<small class="part-state">' + state + '</small></span>';
      if (part.openable) html += '<button class="part-action part-open-action" data-open-part="' + part.id + '" type="button">' + (part.isOpen ? 'ЗАКРЫТЬ' : 'ОТКРЫТЬ') + '</button>';
      html += '<button class="part-action" data-part="' + part.id + '" type="button">' + (part.visible ? 'СНЯТЬ' : 'УСТАНОВИТЬ') + '</button></div>';
    }
    list.innerHTML = html || '<p class="parts-empty">В этой GLB-модели кузовные детали объединены и отдельно не размечены.</p>';
    document.getElementById('part-count').textContent = ids.length + ' ДЕТАЛЕЙ';
    var unavailable = [];
    if (!parts.hood) unavailable.push('капот');
    if (!parts.doors) unavailable.push('двери');
    if (!parts.trunk) unavailable.push('багажник');
    if (parts.wheelSet || wheels.length !== 4) unavailable.push('раздельный поворот каждого колеса');
    document.getElementById('parts-hint').textContent = unavailable.length
      ? 'Недоступно в этой GLB: ' + unavailable.join(', ') + '.'
      : 'Нажми «Открыть», чтобы открыть кузовную деталь, или сними и установи её.';
    var condition = ids.length ? Math.round(ready / ids.length * 100) : 100;
    document.getElementById('condition-value').textContent = condition + '%';
    document.getElementById('condition-bar').style.width = condition + '%';
    var actions = list.querySelectorAll('[data-part]');
    for (i = 0; i < actions.length; i++) actions[i].addEventListener('click', togglePart);
    var openActions = list.querySelectorAll('[data-open-part]');
    for (i = 0; i < openActions.length; i++) openActions[i].addEventListener('click', togglePartOpen);
  }

  function togglePart(event) {
    var id = event.currentTarget.getAttribute('data-part');
    var object = parts[id];
    if (!object) return;
    object.visible = !object.visible;
    object.pivot.visible = object.visible;
    if (!object.visible) setPartOpen(object, false);
    if (object.wheel && speed > 0) speed = 0;
    updatePartsPanel();
    showToast(object.label + (object.visible ? ' установлена' : ' снята'));
  }

  function togglePartOpen(event) {
    var object = parts[event.currentTarget.getAttribute('data-open-part')];
    if (!object || !object.visible) return;
    setPartOpen(object, !object.isOpen);
    updatePartsPanel();
    showToast(object.label + (object.isOpen ? ' открыта' : ' закрыта'));
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 1800);
  }

  function resize() {
    var width = host.clientWidth;
    var height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(width, height);
  }

  function updateCamera(delta) {
    var mobile = window.innerWidth <= 700;
    cameraTarget.set(car.position.x, mobile ? 0.5 : 0.65, car.position.z);
    var cameraHeading = heading + 0.32 + cameraOrbit;
    var offsetX = driving ? Math.sin(cameraHeading) * 5.2 : 7;
    var offsetZ = driving ? -Math.cos(cameraHeading) * 6.8 : 8;
    cameraPosition.set(car.position.x + offsetX, (mobile ? 3.5 : 3.1) + cameraElevation, car.position.z + offsetZ);
    camera.position.lerp(cameraPosition, Math.min(1, delta * (driving ? 2.7 : 3.5)));
    camera.lookAt(cameraTarget);
  }

  function updateDriving(delta) {
    if (!driving) {
      speed = 0;
      return;
    }
    var forward = keyState.keyw || keyState.arrowup || touchState.gas || touchState.gasTap;
    var reverse = keyState.keys || keyState.arrowdown;
    var brake = keyState.space || touchState.brake;
    var left = keyState.keya || keyState.arrowleft || touchState.left || touchState.swipeLeft || mouseSteering < -0.12;
    var right = keyState.keyd || keyState.arrowright || touchState.right || touchState.swipeRight || mouseSteering > 0.12;
    var ready = true;
    var wheelPartIds = ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR', 'wheelSet'];
    for (var partIndex = 0; partIndex < wheelPartIds.length; partIndex++) {
      if (parts[wheelPartIds[partIndex]] && !parts[wheelPartIds[partIndex]].visible) ready = false;
    }
    if (!ready) {
      forward = false;
      reverse = false;
      speed = 0;
    }
    if (forward) speed += 38 * delta;
    else if (reverse) speed -= 26 * delta;
    else speed *= Math.max(0, 1 - delta * 0.8);
    if (brake) speed *= Math.max(0, 1 - delta * 5.5);
    speed = Math.max(-18, Math.min(76, speed));
    if ((left || right) && Math.abs(speed) > 0.7) heading += (right ? 1 : -1) * delta * Math.min(1.1, Math.abs(speed) / 12) * (speed < 0 ? -1 : 1);
    var steeringAngle = left ? -0.32 : (right ? 0.32 : 0);
    if (parts.wheelFL) parts.wheelFL.pivot.rotation.y = steeringAngle;
    if (parts.wheelFR) parts.wheelFR.pivot.rotation.y = steeringAngle;
    var travel = speed * delta * 0.14;
    car.position.x += Math.sin(heading) * travel;
    car.position.z += Math.cos(heading) * travel;
    car.rotation.y = heading;
    distance += Math.abs(travel);
    var wheelIndex;
    for (wheelIndex = 0; wheelIndex < wheels.length; wheelIndex++) {
      if (wheels[wheelIndex].visible) wheels[wheelIndex].pivot.rotation.x += travel / 0.39;
    }
    document.getElementById('speed-value').textContent = ('0' + Math.round(Math.abs(speed))).slice(-2);
    document.getElementById('gear-value').textContent = Math.abs(speed) < 0.5 ? 'N' : (speed < 0 ? 'R' : (speed < 15 ? '1' : speed < 27 ? '2' : '3'));
    document.getElementById('top-status-text').textContent = 'СВОБОДНЫЙ ЗАЕЗД';
  }

  function animate() {
    requestAnimationFrame(animate);
    var delta = Math.min(clock.getDelta(), 0.25);
    updateDriving(delta);
    updateCamera(delta);
    renderer.render(scene, camera);
  }
})();