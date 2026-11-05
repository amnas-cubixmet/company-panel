import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('customer tracking portal is loginless and calls only the secure allowlisted public API', () => {
  const routes = src('src/routes/AppRoutes.jsx');
  const portal = src('src/pages/customer-portal/CustomerPortalPage.jsx');
  assert.match(routes, /path="\/c\/:token" element=\{<CustomerPortalPage \/>\}/);
  assert.ok(routes.indexOf('path="/c/:token"') < routes.indexOf('<Route element={<ProtectedRoute />}>'));
  assert.match(portal, /credentials: 'omit'/);
  assert.match(portal, /encodeURIComponent\(token\)/);
  assert.match(portal, /dictionaries = \{/);
  assert.match(portal, /ml: \{/);
  assert.match(portal, /published/);
  assert.match(portal, /PortalPhoto/);
});

test('existing customer profile exposes revocable customer tracking and consent actions', () => {
  const profile = src('src/pages/customers/CustomerDetails.jsx');
  const links = src('src/components/customers/CustomerTrackingLinkPanel.jsx');
  const consent = src('src/components/customers/CustomerWhatsAppConsent.jsx');
  assert.match(profile, /<CustomerTrackingLinkPanel/);
  assert.match(profile, /<CustomerWhatsAppConsent/);
  assert.match(links, /apiClient\.post\(\x60\/customer-portal\/links\/\$\{customerId\}\x60/);
  assert.match(links, /Regenerate Link/);
  assert.match(links, /WhatsAppManualShareButton/);
  assert.match(links, /Send via WhatsApp/);
  assert.match(links, /Revoke Link/);
  assert.match(consent, /optIn: value/);
  assert.match(consent, /Record Explicit WhatsApp Opt In/);
  assert.match(consent, /Opt Out — Stop Notifications/);
});

test('live camera captures from actual browser media streams and releases tracks', () => {
  const camera = src('src/components/vehicles/LiveVehicleCamera.jsx');
  const vehicle = src('src/pages/vehicles/AddVehicle.jsx');
  const job = src('src/pages/jobs/JobCreatePage.jsx');
  const gallery = src('src/components/vehicles/VehiclePhotoGallery.jsx');
  assert.match(camera, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(camera, /navigator\.mediaDevices\.enumerateDevices/);
  assert.match(camera, /facingMode: \{ ideal: nextFacing \}/);
  assert.match(camera, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(camera, /canvas\.toBlob/);
  assert.match(camera, /Capture/);
  assert.match(camera, /Retake/);
  assert.match(vehicle, /<VehicleCameraQueue/);
  assert.match(vehicle, /setSavedVehicleId\(vehicleId\)/);
  assert.match(job, /<VehicleCameraQueue/);
  assert.match(job, /setSavedJobId\(created\.id\)/);
  assert.match(gallery, /<LiveVehicleCamera/);
  assert.match(gallery, /vehiclePhotoService\.setPublished/);
});

test('WhatsApp Settings is authenticated, official Meta only, and sending is opt-in gated', () => {
  const routes = src('src/routes/AppRoutes.jsx');
  const settings = src('src/pages/settings/Settings.jsx');
  const whatsapp = src('src/pages/settings/WhatsAppSettingsPage.jsx');
  assert.match(routes, /path="\/settings\/whatsapp" element=\{<WhatsAppSettingsPage \/>\}/);
  assert.match(settings, /navigate\('\/settings\/whatsapp'\)/);
  assert.match(whatsapp, /connect\.facebook\.net\/en_US\/sdk\.js/);
  assert.match(whatsapp, /WA_EMBEDDED_SIGNUP/);
  assert.match(whatsapp, /config_id: info\.configId/);
  assert.match(whatsapp, /apiClient\.post\('\/whatsapp\/connect'/);
  assert.match(whatsapp, /notificationsEnabled: enabled, events/);
  assert.match(whatsapp, /apiClient\.get\('\/whatsapp\/logs'\)/);
  assert.doesNotMatch(whatsapp, /whatsapp-web\.js|puppeteer|selenium/i);
});

test('workshops independently select manual or automatic WhatsApp messages with fallback', () => {
  const settings = src('src/pages/settings/WhatsAppSettingsPage.jsx');
  const share = src('src/components/common/WhatsAppManualShareButton.jsx');
  const customer = src('src/components/customers/CustomerTrackingLinkPanel.jsx');
  const job = src('src/pages/jobs/JobCardWorkspace.jsx');
  const invoice = src('src/pages/invoices/InvoiceRoutePage.jsx');
  const staff = src('src/pages/staff-management/staff/StaffProfile.jsx');
  assert.match(settings, /messagingMode: mode/);
  assert.match(settings, /Automatic — Official Cloud API/);
  assert.match(settings, /Manual — No API needed/);
  assert.match(settings, /targetType="log"/);
  assert.match(share, /'\/whatsapp\/manual-share'/);
  assert.match(share, /Review it in WhatsApp and press Send/);
  assert.match(share, /window\.open\('', '_blank'\)/);
  assert.match(customer, /targetType="customer"/);
  assert.match(job, /targetType="job"/);
  assert.match(invoice, /targetType="invoice"/);
  assert.match(staff, /Send via WhatsApp/);
});
