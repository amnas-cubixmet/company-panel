import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const list = read('src/pages/vehicles/VehicleList.jsx');
const header = read('src/components/vehicles/VehiclesHeader.jsx');
const toolbar = read('src/components/vehicles/VehicleSearchToolbar.jsx');
const directory = read('src/components/vehicles/VehicleDirectoryPanel.jsx');
const css = read('src/styles/vehicle-directory-refined.css');

test('vehicles directory adopts scoped white workshop-primary theme without changing vehicle routes', () => {
  assert.match(list, /cg-vehicles vehicle-dashboard cg-vehicle-directory-refined/);
  assert.match(list, /import '..\/..\/styles\/vehicle-directory-refined\.css'/);
  assert.match(css, /\.cg-vehicles\.vehicle-dashboard\.cg-vehicle-directory-refined/);
  assert.match(css, /background:var\(--cg-fleet-paper\)/);
  assert.match(css, /var\(--primary\)/);
  assert.match(css, /var\(--surface\)/);
  assert.doesNotMatch(css, /orange|rose|#f57645|#d9582e/i);
  assert.match(header, /<h1>Vehicles<\/h1>/);
  assert.match(header, /hasPermission\(user, 'vehicles\.create'\)/);
  assert.match(header, /onClick=\{onAddVehicle\}/);
  assert.match(list, /navigate\('\/vehicles\/new'\)/);
});

test('search retains VIN, registration, make, model, owner and contact; filters are removable', () => {
  assert.match(list, /vehicle\.registration/);
  assert.match(list, /vehicle\.vin/);
  assert.match(list, /vehicle\.make/);
  assert.match(list, /vehicle\.model/);
  assert.match(list, /vehicle\.customerName/);
  assert.match(list, /vehicle\.customerPhone/);
  assert.match(list, /const \[statusFilter, setStatusFilter\] = useState\('all'\)/);
  assert.match(list, /statusFilter === 'open-job' && !vehicle\.openJob/);
  assert.match(list, /statusFilter === 'active'/);
  assert.match(list, /statusFilter === 'inactive'/);
  assert.match(list, /\[vehicles, query, statusFilter\]/);
  assert.match(toolbar, /aria-label="Search vehicles"/);
  assert.match(toolbar, /aria-label="Filter vehicles by status"/);
  assert.match(toolbar, /<option value="all">All Vehicles<\/option>/);
  assert.match(toolbar, /<option value="open-job">Open Jobs<\/option>/);
  assert.match(toolbar, /onClick=\{onReset\}/);
  assert.match(toolbar, /resultCount/);
  assert.match(list, /setQuery\(''\); setStatusFilter\('all'\)/);
});

test('vehicle and owner links are real routes and row click does not hijack nested actions', () => {
  assert.match(directory, /import \{ Link \} from 'react-router-dom'/);
  assert.match(directory, /className="cg-vehicle-profile-link" to=\{\x60\/vehicles\/\$\{vehicle\.id\}\x60\}/);
  assert.match(directory, /className="cg-vehicle-owner-link" to=\{\x60\/customers\/\$\{vehicle\.customerId\}\x60\}/);
  assert.match(directory, /event\.target\.closest\('a, button, input, select, textarea'\)/);
  assert.match(directory, /onNavigate\(\x60\/vehicles\/\$\{vehicle\.id\}\x60\)/);
  assert.match(directory, /onNavigate\(\x60\/jobs\/\$\{vehicle\.openJob\.id\}\/overview\x60\)/);
  assert.match(directory, /hasPermission\(user, 'vehicles\.edit'\)/);
  assert.match(directory, /hasPermission\(user, 'jobs\.create'\)/);
  assert.match(directory, /aria-label="Vehicle directory table"/);
});

test('mobile vehicle card retains owner, service, status and job actions', () => {
  for (const name of ['Registration','Make / Model','Customer','Last Service','Next Service','Open Job','Status','Actions']) {
    assert.ok(directory.includes('<th scope="col">'+name+'</th>'),name);
  }
  for(const fragment of ['vehicle-mobile-grid','vehicle-mobile-card-head',
    'vehicle-owner-row','vehicle-mobile-meta','vehicle-open-job','vehicle-card-actions',
    'is-primary','cg-vehicle-owner-link','cg-vehicle-profile-link']) {
    assert.ok(directory.includes(fragment),fragment);
  }
  assert.match(directory, /canEdit &&/);
  assert.match(directory, /canCreateJob &&/);
  assert.match(directory, /hasFilters && <button type="button" onClick=\{onReset\}>Clear filters<\/button>/);
});

test('directory is responsive at tablet and phone widths with accessible controls', () => {
  for(const fragment of ['.vehicle-dashboard-header','.vehicle-dashboard-stats',
    '.vehicle-dashboard-toolbar','.vehicle-table-wrap','.vehicle-mobile-grid',
    '.vehicle-mobile-card','.vehicle-dashboard-empty','overflow-x:auto',
    'min-height:46px','font-size:16px',':focus-visible',
    '@media(max-width:1100px)','@media(max-width:767px)',
    '@media(max-width:390px)']) {
      assert.ok(css.includes(fragment),fragment);
  }
  assert.doesNotMatch(css,/\.app-sidebar\s*\{/);
  assert.match(css,/\.vehicle-table-wrap\{display:none\}/);
  assert.match(css,/\.vehicle-mobile-grid\{\s*display:grid;grid-template-columns:minmax\(0,1fr\)/);
});
