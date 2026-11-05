import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildJobComplaints, newComplaint } from '../src/utils/jobCreateAdapters.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('one customer complaints section sits before vehicle, assignment, photos and review', () => {
  const page = read('src/pages/jobs/JobCreatePage.jsx');
  const complaint = page.indexOf('id="job-step-complaints"');
  const vehicle = page.indexOf('</span> Vehicle Details</h2>');
  const assignment = page.indexOf('id="job-step-assignment"');
  const photos = page.indexOf('id="job-step-photos"');
  const review = page.indexOf('id="job-card-review"');
  assert.ok(complaint > 0 && vehicle > complaint && assignment > vehicle && photos > assignment && review > photos);
  assert.equal(page.match(/<JobComplaintEntries /g)?.length, 1);
  assert.match(page, /JOB_CREATE_STEPS\.map\(/);
  assert.deepEqual(
    [...page.matchAll(/\{ id: '(customer|complaints|vehicle|assignment|photos|review)', label:/g)].map(row => row[1]),
    ['customer','complaints','vehicle','assignment','photos','review'],
  );
  assert.match(page, /stepNumber\('complaints'\)/);
  assert.match(page, /stepNumber\('vehicle'\)/);
  assert.match(page, /stepNumber\('photos'\)/);
});

test('existing multiple complaint fields and backend payload are preserved', () => {
  const page = read('src/pages/jobs/JobCreatePage.jsx');
  const component = read('src/components/jobs/JobComplaintEntries.jsx');
  assert.match(component, /newComplaint\(\)/);
  assert.match(component, /onChange\(\(rows\) => rows\.filter/);
  assert.match(component, /row\.description/);
  assert.match(component, /row\.inspectionNotes/);
  assert.match(component, /row\.category/);
  assert.match(component, /row\.priority/);
  assert.match(page, /setComplaints\(updater\)/);
  assert.match(page, /setComplaintErrors\(errors\)/);
  assert.match(page, /buildJobComplaints\(complaints\)/);
  assert.match(page, /customerComplaints: normalizedComplaints/);
  assert.match(page, /await jobService\.createJob\(/);
  const first={...newComplaint(),description:'Engine noise'};
  const second={...newComplaint(),description:'AC not cooling'};
  assert.deepEqual(buildJobComplaints([first,second]).map(x=>x.description),['Engine noise','AC not cooling']);
});

test('queued vehicle photos use blob-backed compact thumbnails and full preview on demand', () => {
  const queue=read('src/components/vehicles/VehicleCameraQueue.jsx');
  const css=read('src/styles/vehicle-camera-queue.css');
  const job=read('src/pages/jobs/JobCreatePage.jsx');
  assert.match(css, /\.vehicle-camera-queue-grid,\.vehicle-photo-gallery-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1100px\)/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.vehicle-camera-preview-image\{[^}]*object-fit:contain/);
  assert.match(css, /\.vehicle-camera-queued \.vehicle-camera-preview-button img\{[^}]*object-fit:cover/);
  assert.match(queue, /URL\.createObjectURL\(item\.file\)/);
  assert.match(queue, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(queue, /createPortal\(/);
  assert.match(queue, /aria-modal="true"/);
  assert.match(queue, /onRemove\(item\.id\)/);
  assert.match(queue, /item\.phase/);
  assert.match(queue, /item\.notes/);
  assert.match(queue, /uploadingPhotoId === item\.id/);
  assert.match(job, /setUploadingPhotoId\(photo\.id\)/);
  assert.match(job, /await vehiclePhotoService\.upload\(/);
  assert.match(queue, /<LiveVehicleCamera onCapture=\{add\}/);
  assert.match(queue, /onChange=\{addUploads\}/);
});

test('vehicle accordion mounts no empty body when collapsed; VIN and checkbox are retained in parent state', () => {
  const page=read('src/pages/jobs/JobCreatePage.jsx');
  const styles=read('src/styles/job-create-professional.css');
  assert.match(page, /\[advancedVehicleOpen, setAdvancedVehicleOpen\] = useState\(false\)/);
  assert.match(page, /aria-expanded=\{advancedVehicleOpen\}/);
  assert.match(page, /advancedVehicleOpen && <div id="job-create-vehicle-advanced-content"/);
  assert.match(page, /name="vin" value=\{form\.vin\}/);
  assert.match(page, /set\('vin', e\.target\.value\.toUpperCase\(\)\)/);
  assert.doesNotMatch(page, /<details className="job-create-vehicle-advanced">/);
  assert.match(page, /name="vehicleReg"/);
  assert.match(page, /vehicleDetailsUpdate/);
  assert.match(styles, /\.job-create-vehicle-update input\[type="checkbox"\]/);
  assert.match(styles, /background:var\(--surface\)/);
  assert.match(styles, /color:var\(--text-primary\)/);
  assert.match(styles, /#job-step-photos \.vehicle-camera-queue\{border:0/);
});
