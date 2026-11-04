import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('read-only company logo is never re-submitted with settings JSON', () => {
  const service = read('src/services/settings.service.js');
  assert.match(service, /COMPANY_EDITABLE_SETTINGS = new Set/);
  assert.match(service, /COMPANY_EDITABLE_SETTINGS\.has\(key\)/);
  assert.match(service, /const payload = editablePayload\(category, data\)/);
  assert.match(service, /apiClient\.put\(\x60\$\{API_ENDPOINTS\.SETTINGS\}\/\$\{category\}\x60, payload\)/);
  assert.doesNotMatch(service.match(/const COMPANY_EDITABLE_SETTINGS[\s\S]*?\];/)?.[0] || '', /['"]logo['"]/);
});

test('logo upload uses existing authenticated company image endpoint with no client file-size cap', () => {
  const service = read('src/services/settings.service.js');
  const editor = read('src/components/settings/SettingsCompanyLogo.jsx');
  const page = read('src/pages/settings/Settings.jsx');
  const form = read('src/components/settings/SettingsEditor.jsx');
  assert.match(service, /body\.append\('logo_image', file, file\.name\)/);
  assert.match(service, /apiClient\.patch\('\/company\/me', body/);
  assert.match(service, /apiClient\.get\('\/company\/logo', \{ responseType: 'blob' \}\)/);
  assert.doesNotMatch(editor, /file\.size\s*[><=]|MAX_SOURCE_LOGO_BYTES|10\s*MB/);
  assert.match(editor, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(editor, /canManage = false/);
  assert.match(form, /<SettingsCompanyLogo canManage=\{canManageLogo\}/);
  assert.match(page, /canManageLogo=\{can\('company\.manage'\)\}/);
});

test('uploaded logo is previewed with a cleaned-up blob URL and explicit status feedback', () => {
  const editor = read('src/components/settings/SettingsCompanyLogo.jsx');
  assert.match(editor, /URL\.createObjectURL\(blob\)/);
  assert.match(editor, /URL\.revokeObjectURL\(objectUrlRef\.current\)/);
  assert.match(editor, /setMessage\('Company logo uploaded successfully\.'\)/);
  assert.match(editor, /role="alert"/);
  assert.match(editor, /Upload Logo/);
  assert.match(editor, /Replace Logo/);
});
