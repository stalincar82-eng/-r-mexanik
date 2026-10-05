'use strict';

const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '..', 'site');
const root = path.resolve(__dirname, '..');
const files = [
  'index.html',
  'game.js',
  'styles.css',
  'car-animation.js',
  '1967_chevrolet_camaro_ss_350_coupe.glb'
];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const destination = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

for (const file of files) copyFile(file);
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
fs.mkdirSync(path.join(output, 'vendor'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules/three/build/three.min.js'),
  path.join(output, 'vendor/three.min.js')
);
fs.copyFileSync(
  path.join(root, 'node_modules/three/examples/js/loaders/GLTFLoader.js'),
  path.join(output, 'vendor/GLTFLoader.js')
);
console.log(`Website files prepared in ${output}`);
