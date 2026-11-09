import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('new signup is locked into sole fullscreen onboarding until completed', () => {
  const route = source('src/routes/ProtectedRoute.jsx');
  const setup = route.indexOf("user?.onboardingRequired === true");
  const shell = route.indexOf("<DashboardLayout>");
  assert.ok(setup > 0 && setup < shell);
  assert.match(route, /location\.pathname === '\/onboarding'\s*\? <Outlet \/>/);
  assert.match(route, /<Navigate to="\/onboarding" replace \/>/);
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  assert.match(wizard, /\{state\.completed && <Link[^>]*>Return to account/);
  assert.doesNotMatch(wizard, /Finish later/);
  assert.match(wizard, /<main className="cg-setup">/);
  assert.match(wizard, /<form onSubmit=\{submit\}>/);
});

test('mandatory account details and wallet credit balance are server sourced', () => {
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  assert.match(wizard, /state\.account\?\.companyName/);
  assert.match(wizard, /state\.account\?\.ownerName/);
  assert.match(wizard, /state\.account\.walletBalanceCredits/);
  assert.match(wizard, /Read-only balance from cubixgear billing/);
  assert.match(wizard, /window\.location\.replace\('\/account'\)/);
});

test('GST opt-out is an explicit checkbox, not automatic absence or made-up GSTIN', () => {
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  assert.match(wizard, /name="gstNotRegistered"/);
  assert.match(wizard, /No GST registration/);
  assert.match(wizard, /gstNotRegistered: checked/);
  assert.match(wizard, /values\.gstNotRegistered = Boolean\(draft\?\.gstNotRegistered\)/);
  assert.match(wizard, /values\.gstin = ''/);
  assert.match(wizard, /disabled=\{key === 'gstin' && drafts\.company\?\.gstNotRegistered\}/);
});

test('one package describes related modules, links and one backend price', () => {
  const marketplace = source('src/pages/saas/CreditWorkspace.jsx');
  assert.match(marketplace, /bundle\.includedModules/);
  assert.match(marketplace, /bundle\.workflowPaths/);
  assert.match(marketplace, /bundle\.workflowDependencies/);
  assert.match(marketplace, /creditWalletService\.purchaseBundle\(bundle\.id\)/);
  assert.match(marketplace, /bundle\.totalCredits/);
});

test('fullscreen onboarding is vertically scrollable independently of the dashboard scroll lock', () => {
  const global = source('src/styles/globals.css');
  const css = source('src/styles/owner-onboarding.css');
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  assert.match(global, /html, body, #root\s*\{[^}]*overflow: hidden/s);
  assert.match(css, /\.cg-setup\s*\{[^}]*height:\s*100dvh;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.cg-setup::-webkit-scrollbar\s*\{[^}]*display:\s*none;/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /-ms-overflow-style:\s*none/);
  assert.match(wizard, /previousActive\.current !== active/);
  assert.match(wizard, /firstField\.current\?\.scrollIntoView/);
});

test('onboarding explains loading failures and keeps a retry action', () => {
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  assert.match(wizard, /Loading workshop setup…/);
  assert.match(wizard, /Connecting to your workshop account/);
  assert.match(wizard, /Check your Django backend connection/);
  assert.match(wizard, /onClick=\{load\}>Retry loading setup/);
});


test('workshop logo shows a local preview and authenticated saved image', () => {
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  const css = source('src/styles/owner-onboarding.css');
  assert.match(wizard, /URL\.createObjectURL\(logoFile\)/);
  assert.match(wizard, /URL\.revokeObjectURL\(previewUrl\)/);
  assert.match(wizard, /settingsService\.getCompanyLogo\(\)/);
  assert.match(wizard, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(wizard, /src=\{logoPreviewUrl \|\| savedLogoUrl\}/);
  assert.match(wizard, /alt=\{logoPreviewUrl \? 'Selected workshop logo preview'/);
  assert.match(wizard, /settingsService\.uploadCompanyLogo\(logoFile\)/);
  assert.match(css, /\.cg-setup-logo-preview img\s*\{[^}]*object-fit:\s*contain/s);
});

test('GST exemption checkbox has separate aligned title and description', () => {
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  const css = source('src/styles/owner-onboarding.css');
  assert.match(wizard, /className="cg-setup-gst-copy"/);
  assert.match(wizard, /<strong>No GST registration<\/strong>/);
  assert.match(css, /#root \.cg-setup-gst-exempt\s*\{[^}]*grid-template-columns:\s*22px minmax\(0, 1fr\)/s);
  assert.match(css, /#root \.cg-setup-gst-copy\s*\{[^}]*flex-direction:\s*column;[^}]*gap:\s*7px/s);
});

test('branch setup captures device location without manual GPS text inputs', () => {
  const wizard = source('src/pages/saas/OwnerOnboarding.jsx');
  const css = source('src/styles/owner-onboarding.css');
  assert.match(wizard, /navigator\.geolocation\.getCurrentPosition\(/);
  assert.match(wizard, /!window\.isSecureContext/);
  assert.match(wizard, /enableHighAccuracy: true, timeout: 20000, maximumAge: 0/);
  assert.match(wizard, /latitude: latitude\.toFixed\(6\)/);
  assert.match(wizard, /longitude: longitude\.toFixed\(6\)/);
  assert.match(wizard, /current\.key !== 'branch' \|\| !LOCATION_FIELDS\.has\(key\)/);
  assert.match(wizard, /Use current location/);
  assert.match(wizard, /onClick=\{clearWorkshopLocation\}/);
  assert.match(wizard, /name="punchRadiusMeters" value=\{String\(radius\)\}/);
  assert.match(wizard, /GPS is optional/);
  assert.match(wizard, /locationRequestRef\.current !== requestId/);
  assert.match(css, /\.cg-setup-location\s*\{/);
  // The API still sends latitude, longitude and punchRadiusMeters as before.
  assert.match(wizard, /fields: \[[\s\S]*?\['latitude', 'Workshop Latitude', 'number'\]/);
  assert.match(wizard, /\['longitude', 'Workshop Longitude', 'number'\]/);
  assert.match(wizard, /\['punchRadiusMeters', 'Punch Radius \(metres\)', 'number'\]/);
});
