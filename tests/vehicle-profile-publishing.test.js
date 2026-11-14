import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profile = readFileSync(new URL('../src/pages/vehicles/VehicleDetails.jsx', import.meta.url), 'utf8');
const gallery = readFileSync(new URL('../src/components/vehicles/VehiclePhotoGallery.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/vehicle-profile-refresh.css', import.meta.url), 'utf8');
const photoService = readFileSync(new URL('../src/services/vehiclePhoto.service.js', import.meta.url), 'utf8');

test('vehicle details remove the large Back to Vehicles button but retain safe breadcrumbs', () => {
  assert.doesNotMatch(profile, /Back to Vehicles/);
  assert.doesNotMatch(profile, /vehicle-back-link/);
  assert.match(profile, /aria-label="Breadcrumb"/);
  assert.match(profile, /<Link to="\/vehicles">Vehicles<\/Link>/);
  assert.match(profile, /<span aria-current="page">\{vehicle\.registration\}<\/span>/);
});

test('vehicle profile exposes accessible photos tab for managing customer sharing', () => {
  assert.match(profile, /id: 'photos', label: 'Photos & Customer Sharing'/);
  assert.match(profile, /role="tablist"/);
  assert.match(profile, /role="tabpanel"/);
  assert.match(profile, /aria-selected=\{activeTab === tab\.id\}/);
  assert.match(profile, /<VehiclePhotoGallery vehicleId=\{vehicle\.id\} canEdit=\{canEdit\} canPublish=\{canEdit\}\/>/);
  assert.match(profile, /Manage Photos/);
});

test('publishing new vehicle photos is selected by default only for authorized staff', () => {
  assert.match(gallery, /useState\(Boolean\(canPublish\)\)/);
  assert.match(gallery, /published: Boolean\(canPublish && publishNewPhotos\)/);
  assert.match(gallery, /Published to Customer/);
  assert.match(gallery, /privateCount/);
  assert.match(gallery, /visibilityFilter === 'published'/);
  assert.match(gallery, /visibilityFilter === 'private'/);
  assert.match(gallery, /await vehiclePhotoService\.setPublished\(id, published\)/);
  assert.match(photoService, /return apiClient\.patch\(`\/vehicle-photos\/\$\{id\}`, \{ published \}\)/);
});

test('vehicle photo customer visibility uses backend state and is not spoofed by UI label', () => {
  assert.match(gallery, /checked=\{Boolean\(photo\.published\)\}/);
  assert.match(gallery, /photo\.published \? 'Published to Customer' : 'Private'/);
  assert.doesNotMatch(gallery, /setPhotos\(\(current\) => current\.map\(.*published: true/);
  assert.match(css, /\.vehicle-photo-visibility-badge\.is-published/);
});

test('vehicle list and profile load same scoped responsive styles', () => {
  const list = readFileSync(new URL('../src/pages/vehicles/VehicleList.jsx', import.meta.url), 'utf8');
  assert.match(list, /vehicle-profile-refresh\.css/);
  assert.match(profile, /vehicle-profile-refresh\.css/);
  assert.match(css, /@media\(max-width:767px\)/);
});
