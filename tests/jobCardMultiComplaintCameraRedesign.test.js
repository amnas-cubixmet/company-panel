import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  JOB_COUNTRY_CODES, splitInternationalPhone, joinInternationalPhone, validInternationalPhone,
  splitVehicleMakeModel, newComplaint, buildJobComplaints,
} from '../src/utils/jobCreateAdapters.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('international phone defaults to +91 and never duplicates a pasted prefix', () => {
  assert.deepEqual(splitInternationalPhone(''), { country:'+91',national:'' });
  assert.deepEqual(splitInternationalPhone('+91 98765 43210'), { country:'+91',national:'9876543210' });
  assert.deepEqual(splitInternationalPhone('00971 50 123 4567'), { country:'+971',national:'501234567' });
  assert.equal(joinInternationalPhone('+91', '9876543210'), '+919876543210');
  assert.equal(joinInternationalPhone('+91', '+91 9876543210'), '+919876543210');
  assert.equal(joinInternationalPhone('+971', '501234567'), '+971501234567');
  assert.ok(validInternationalPhone('+919876543210'));
  assert.ok(validInternationalPhone('+971501234567'));
  assert.equal(validInternationalPhone('9876543210'),false);
  assert.ok(JOB_COUNTRY_CODES.some(([code]) => code === '+91'));
});

test('vehicle Make / Model splitting protects compound brands', () => {
  assert.deepEqual(splitVehicleMakeModel({make:'Maruti Suzuki',model:'Swift'}), {
    make:'Maruti Suzuki',model:'Swift',
  });
  assert.deepEqual(splitVehicleMakeModel({makeModel:'Maruti Suzuki Swift VXI'}), {
    make:'Maruti Suzuki',model:'Swift VXI',
  });
  assert.deepEqual(splitVehicleMakeModel({vehicleInfo:'Toyota Innova'}), {
    make:'Toyota',model:'Innova',
  });
});

test('multiple complaints keep stable identities and order without overwrites', () => {
  const first = {...newComplaint(), description:'AC Not Cooling'};
  const second = {...newComplaint(), description:'Brake Noise', priority:'High'};
  const third = {...newComplaint(), description:'Engine Vibration'};
  assert.equal(new Set([first.id, second.id, third.id]).size, 3);
  const result = buildJobComplaints([first,second,third]);
  assert.deepEqual(result.map((row) => row.description),
    ['AC Not Cooling','Brake Noise','Engine Vibration']);
  assert.deepEqual(result.map((row) => row.id), [first.id,second.id,third.id]);
  assert.deepEqual(buildJobComplaints([first, {...second, description:'  '}, third])
    .map((row) => row.description), ['AC Not Cooling','Engine Vibration']);
});

test('Job Card Create uses existing API, separate vehicle fields, complaints and review slip', () => {
  const page = read('src/pages/jobs/JobCreatePage.jsx');
  const complaint = read('src/components/jobs/JobComplaintEntries.jsx');
  const review = read('src/components/jobs/JobCardReview.jsx');
  assert.match(page, /<PhoneInput/);
  assert.match(page, /customerPhone: customer\?\.phone \? joinInternationalPhone/);
  assert.match(page, /name="vehicleMake"/);
  assert.match(page, /name="vehicleModel"/);
  assert.match(page, /name="fuelType"/);
  assert.match(page, /name="kilometre"/);
  assert.match(page, /newComplaint\(\)/);
  assert.match(page, /<JobComplaintEntries/);
  assert.match(page, /<JobCardReview/);
  assert.match(page, /buildJobComplaints\(complaints\)/);
  assert.match(page, /await jobService\.createJob\(/);
  assert.match(page, /const created = createdId \?/);
  assert.match(page, /await vehiclePhotoService\.upload/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /getCustomerVehicles/);
  assert.match(page, /branchService\.getBranches/);
  assert.match(complaint, /onChange\(\(rows\) => \[\.\.\.rows, newComplaint\(\)\]\)/);
  assert.match(review, /Service Advisor/);
});

test('photo gallery uploads only real backend-supported image types, camera releases stream', () => {
  const queue = read('src/components/vehicles/VehicleCameraQueue.jsx');
  const camera = read('src/components/vehicles/LiveVehicleCamera.jsx');
  assert.match(queue, /accept="image\/\*"/);
  assert.match(queue, /multiple/);
  assert.match(queue, /10 \* 1024 \* 1024/);
  assert.match(queue, /image\/jpeg/);
  assert.match(queue, /image\/png/);
  assert.match(queue, /image\/webp/);
  assert.match(camera, /getUserMedia/);
  assert.match(camera, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(camera, /Capture Another/);
});
