import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('mobile-only workshop signup uses live Django and never exposes setup bearer tokens', () => {
  const routes = read('src/routes/AppRoutes.jsx');
  const login = read('src/pages/auth/Login.jsx');
  const signup = read('src/pages/auth/WorkshopMobileSignup.jsx');
  assert.match(routes, /path="\/signup" element=\{<WorkshopMobileSignup \/>\}/);
  assert.match(routes, /path="\/set-password\/:token" element=\{<StaffSetPasswordPage \/>\}/);
  assert.match(login, /to="\/signup"/);
  assert.match(signup, /\/auth\/signup/);
  assert.match(signup, /form\.email\.trim\(\) \? \{email:/);
  assert.doesNotMatch(signup, /MOCK_USER|mock_jwt_token_2026|setupLink: data/);
  assert.match(routes, /path="\/forgot-password" element=\{<ForgotPassword \/>\}/);
  assert.match(routes, /path="\/setup-password" element=\{<SetupPassword \/>\}/);
});

test('production disables mock auth and requires configured real backend', () => {
  const config = read('src/api/apiConfig.js');
  const vite = read('vite.config.js');
  assert.match(config, /!import\.meta\.env\.PROD/);
  assert.match(vite, /Production build requires VITE_API_URL/);
});

test('frontend RBAC does not promote platform superusers', () => {
  const permissions = read('src/utils/permissions.js');
  assert.doesNotMatch(permissions, /if \(user\?\.is_superuser\) return/);
  assert.match(permissions, /permissions\.includes\('\*'\)/);
});

test('branch-specific permissions are not claimed without backend enforcement', () => {
  const editor = read('src/components/staff-management/RoleEditorForm.jsx');
  assert.match(editor, /Branch-specific restrictions are not available yet/);
  assert.doesNotMatch(editor, /<option value="Selected Branches">/);
});
