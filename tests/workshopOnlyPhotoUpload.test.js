import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('only authenticated workshop staff have photo upload and publish controls', () => {
  const gallery = read('src/components/vehicles/VehiclePhotoGallery.jsx');
  const vehiclePage = read('src/pages/vehicles/VehicleDetails.jsx');
  const inspection = read('src/components/jobs/JobInspectionPanel.jsx');
  assert.match(gallery, /\{canEdit && <div className="vehicle-photo-add-actions">/);
  assert.match(gallery, /Upload Photos/);
  assert.match(gallery, /onChange=\{uploadFromDevice\}/);
  assert.match(gallery, /multiple/);
  assert.match(gallery, /canEdit=\{canPublish\}/);
  assert.match(gallery, /setPublished\(id, published\)/);
  assert.match(vehiclePage, /<VehiclePhotoGallery vehicleId=\{vehicle\.id\} canEdit=\{canEdit\}/);
  assert.match(inspection, /<VehiclePhotoGallery jobId=\{job\.id\} canEdit=\{editable\} canPublish=\{canEdit\}/);
});

test('photo uploads are validated, remain private, and use existing authenticated service', () => {
  const gallery = read('src/components/vehicles/VehiclePhotoGallery.jsx');
  const service = read('src/services/vehiclePhoto.service.js');
  assert.match(gallery, /image\/jpeg/);
  assert.match(gallery, /image\/png/);
  assert.match(gallery, /image\/webp/);
  assert.match(gallery, /MAX_FILE_SIZE = 10 \* 1024 \* 1024/);
  assert.match(gallery, /MAX_BATCH_SIZE = 8/);
  assert.match(gallery, /vehiclePhotoService\.upload\(/);
  assert.match(gallery, /setPhotos\(current => \[saved,/);
  assert.match(gallery, /saved privately/);
  assert.match(service, /apiClient\.post\(endpoint, body/);
  assert.match(service, /apiClient\.patch\(\x60\/vehicle-photos\/\$\{id\}\x60, \{ published \}\)/);
});

test('public customer site has no upload action or write endpoint in main', () => {
  const gallery = read('src/components/vehicles/VehiclePhotoGallery.jsx');
  assert.match(gallery, /Only workshop staff can upload and publish photos/);
  assert.match(gallery, /photo\.published \? 'Published to customer' : 'Private — publish photo'/);
  const css = read('src/styles/vehicle-camera-queue.css');
  assert.match(css, /\.vehicle-photo-gallery \.vehicle-gallery-upload-metadata/);
  assert.match(css, /@media\(max-width:650px\)/);
});
