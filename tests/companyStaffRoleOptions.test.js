import test from 'node:test';
import assert from 'node:assert/strict';
import { companyPermissionModules } from '../src/config/rolePermissions.js';
import { staffInviteDeliveryMessage } from '../src/utils/staffInviteDelivery.js';

test('role editor exposes only exact permissions authorized for the current company', () => {
  const modules = companyPermissionModules(code => ['jobs.view','staff.edit'].includes(code));
  assert.deepEqual(modules.map(module => [module.key,module.actions]), [['jobs',['view']],['staff',['edit']]]);
  assert.deepEqual(companyPermissionModules(() => false), []);
});
test('WhatsApp status messages distinguish queued, provider accepted and delivered', () => {
  assert.match(staffInviteDeliveryMessage('pending'), /pending/);
  assert.match(staffInviteDeliveryMessage('queued'), /not yet confirmed/);
  assert.match(staffInviteDeliveryMessage('sent'), /not yet confirmed/);
  assert.match(staffInviteDeliveryMessage('delivered'), /delivered/);
  assert.match(staffInviteDeliveryMessage('failed'), /Do not create the staff again/);
});
