import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newComplaint, buildJobComplaints, splitInternationalPhone, joinInternationalPhone } from '../src/utils/jobCreateAdapters.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('existing job card form retains separate vehicle fields and one-use save/retry logic', () => {
  const page = read('src/pages/jobs/JobCreatePage.jsx');
  assert.match(page, /name="vehicleMake"/);
  assert.match(page, /name="vehicleModel"/);
  assert.match(page, /name="fuelType"/);
  assert.match(page, /name="kilometre"/);
  assert.match(page, /vehicleDetailsUpdate/);
  assert.match(page, /const created = createdId \?/);
  assert.match(page, /setSavedJobId\(created\.id\)/);
  assert.match(page, /setUploadedPhotosCount\(\(count\) => count \+ 1\)/);
  assert.match(page, /if \(!savedJobId\) setReview\(false\)/);
  assert.match(page, /disabled=\{saving \|\| Boolean\(savedJobId && !pendingPhotos\.length\)\}/);
  assert.match(page, /uploadTotal=\{uploadTotal\}/);
  assert.match(page, /uploadedPhotosCount=\{uploadedPhotosCount\}/);
});

test('blank untouched complaints are optional but incomplete complaint details need description', () => {
  const code = read('src/pages/jobs/JobCreatePage.jsx');
  assert.match(code, /!item\.description\.trim\(\) && \(item\.category \|\| item\.inspectionNotes\.trim\(\)\)/);
  const one = { ...newComplaint(), description: 'AC Not Cooling' };
  const two = { ...newComplaint(), description: 'Brake Noise' };
  const three = { ...newComplaint(), description: 'Engine Vibration' };
  assert.deepEqual(buildJobComplaints([one, two, three]).map(({description}) => description),
    ['AC Not Cooling', 'Brake Noise', 'Engine Vibration']);
  assert.equal(buildJobComplaints([newComplaint()]).length, 0);
});

test('photo queue keeps fixed upload total while completed photos leave the queue', () => {
  const queue = read('src/components/vehicles/VehicleCameraQueue.jsx');
  const review = read('src/components/jobs/JobCardReview.jsx');
  assert.match(queue, /uploadTotal = 0/);
  assert.match(queue, /uploadTotal \|\| photos\.length/);
  assert.match(review, /uploadedPhotosCount/);
  assert.match(review, /pending upload/);
  assert.match(review, /Print Job Card Slip/);
});

test('mobile camera keeps constrained desktop preview, safe cleanup and photo delete', () => {
  const camera = read('src/components/vehicles/LiveVehicleCamera.jsx');
  const styles = read('src/styles/live-vehicle-camera.css');
  assert.match(camera, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(camera, /facingMode: \{ ideal: nextFacing \}/);
  assert.match(camera, /cameraGeneration\.current/);
  assert.match(camera, /generation !== cameraGeneration\.current/);
  assert.match(camera, /stream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(camera, /Delete captured photo/);
  assert.match(camera, /Capture Another/);
  assert.match(styles, /width:min\(94vw,780px\)/);
  assert.match(styles, /aspect-ratio:16\/9/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /orientation:landscape/);
});

test('international phone remains country-code-aware without duplicating +91', () => {
  assert.deepEqual(splitInternationalPhone('+91 98765 43210'), {
    country: '+91', national: '9876543210',
  });
  assert.equal(joinInternationalPhone('+91', '+919876543210'), '+919876543210');
  assert.equal(joinInternationalPhone('+971', '501234567'), '+971501234567');
});
