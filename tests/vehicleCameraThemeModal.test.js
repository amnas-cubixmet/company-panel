import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('vehicle camera modal follows existing CubeGears data-theme and form tokens', () => {
  const css = source('src/styles/live-vehicle-camera.css');
  const theme = source('src/context/ThemeContext.jsx');
  assert.match(theme, /root\.dataset\.theme = active/);
  assert.match(css, /:root\[data-theme='dark'\] \.live-camera-overlay/);
  assert.match(css, /--camera-surface: var\(--surface/);
  assert.match(css, /--camera-field: var\(--field-bg/);
  assert.match(css, /--camera-text: var\(--text-primary/);
  assert.match(css, /background-color: var\(--camera-field\)/);
  assert.match(css, /color: var\(--camera-text\)/);
  assert.match(css, /\.live-camera-controls select option/);
  assert.match(css, /color-scheme: inherit/);
  assert.match(css, /select:focus-visible|:is\(select, input\):focus-visible/);
  assert.doesNotMatch(css, /\.live-camera-action-row button:nth-child/);
});

test('camera modal keeps focus within a portal and restores background interaction', () => {
  const camera = source('src/components/vehicles/LiveVehicleCamera.jsx');
  assert.match(camera, /import \{ createPortal \} from 'react-dom'/);
  assert.match(camera, /createPortal\(/);
  assert.match(camera, /document\.body/);
  assert.match(camera, /appRoot\.inert = true/);
  assert.match(camera, /appRoot\.inert = wasInert/);
  assert.match(camera, /previouslyFocused\?\.focus\?\.\(\)/);
  assert.match(camera, /event\.key === 'Escape'/);
  assert.match(camera, /event\.key !== 'Tab'/);
  assert.match(camera, /ref=\{closeButtonRef\}/);
});

test('camera capture lifecycle and Job Card metadata are unchanged', () => {
  const camera = source('src/components/vehicles/LiveVehicleCamera.jsx');
  assert.match(camera, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(camera, /canvas\.toBlob/);
  assert.match(camera, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(camera, /\[open\]\)/);
  assert.match(camera, /onCapture\?\.\(\{ file, category, phase, caption:/);
  assert.match(camera, /Capture Another/);
  assert.match(camera, /Retake/);
  const job = source('src/pages/jobs/JobCreatePage.jsx');
  assert.match(job, /<VehicleCameraQueue/);
});
