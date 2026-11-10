import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('new job inspection photo uploads default to published with staff opt-out', () => {
  const gallery = src('src/components/vehicles/VehiclePhotoGallery.jsx');
  const service = src('src/services/vehiclePhoto.service.js');
  assert.match(gallery, /useState\(Boolean\(jobId && canPublish\)\)/);
  assert.match(gallery, /checked=\{publishNewPhotos\}/);
  assert.match(gallery, /setPublishNewPhotos\(event\.target\.checked\)/);
  assert.match(gallery, /published: Boolean\(canPublish && publishNewPhotos\)/);
  assert.match(gallery, /canPublish && <label className="vehicle-photo-upload-publish"/);
  assert.match(service, /body\.append\('published', published \? 'true' : 'false'\)/);
  assert.match(service, /published = false/);
});

test('direct inspection capture defaults published but other uploads remain private', () => {
  const inspection = src('src/components/jobs/JobInspectionPanel.jsx');
  assert.match(inspection, /caption: file\.name\.slice\(0, 255\), published: true/);
  assert.match(inspection, /canEdit=\{editable\} canPublish=\{canEdit\}/);
  const gallery = src('src/components/vehicles/VehiclePhotoGallery.jsx');
  assert.match(gallery, /canPublish = canEdit/);
  assert.match(gallery, /jobId && canPublish/);
  assert.match(gallery, /setPublished\(id, published\)/);
});

test('publish control remains usable and touch-friendly on mobile', () => {
  const css = src('src/styles/vehicle-camera-queue.css');
  assert.match(css, /\.vehicle-photo-upload-publish\{/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /accent-color:var\(--primary\)/);
});
