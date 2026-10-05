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
  var distance = 0;
  var heading = 0;
  var steering = 0;
  var selectedGear = 'D';
  var engineRunning = true;
  var driving = true;
  var device = 'desktop';
  var toastTimer;
  var scene;
  var camera;
  var renderer;
  var car;
  var wheels = [];
  var wheelDisks = [];
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

  var orientationButton = document.getElementById('orientation-button');
  if (orientationButton) orientationButton.addEventListener('click', toggleOrientation);

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
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    device = 'mobile';
    document.body.classList.add('device-mobile');
  }
  updateCamera(1);
  animate();

  function setLandscapeLayout(enabled) {
    document.body.classList.toggle('force-landscape', enabled);
    try {
      if (screen.orientation && screen.orientation.lock) {
        var lockPromise = screen.orientation.lock(enabled ? 'landscape' : 'portrait');
        if (lockPromise && lockPromise.catch) lockPromise.catch(function () {});
      }
    } catch (error) {}
    var button = document.getElementById('orientation-button');
    if (button) {
      button.textContent = enabled ? '↻ ВЕРНУТЬ ВЕРТИКАЛЬНЫЙ ВИД' : '↻ ВКЛЮЧИТЬ ГОРИЗОНТАЛЬНЫЙ ВИД';
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
    window.setTimeout(resize, 80);
    window.setTimeout(resize, 350);
    showToast(enabled ? 'Горизонтальный вид включён' : 'Вертикальный вид включён');
  }

  function toggleOrientation() {
    setLandscapeLayout(!document.body.classList.contains('force-landscape'));
  }

  function requestLandscape() {
    setLandscapeLayout(true);
  }

  function requestPortrait() {
    setLandscapeLayout(false);
  }

  function showWarning(message) {
    warning.classList.remove('is-hidden');
    document.getElementById('warning-copy').textContent = message;
  }

  function loadCarModel(modelId) {
    var models = {
      bmw: { url: 'chevrolet_camaro_1967_animated.glb', label: 'CHEVROLET CAMARO · 1967', targetLength: 4.2 },
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
      wheelDisks = [];
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
