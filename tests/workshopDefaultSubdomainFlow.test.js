import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const settings = read('src/pages/settings/CustomerWebsiteSettingsPage.jsx');
const routes = read('src/routes/AppRoutes.jsx');
const helper = read('src/utils/customerWebsiteAddresses.js');
const styles = read('src/styles/customer-website-settings.css');

test('workshop website uses only its backend-issued default address with normal branding settings', () => {
  assert.match(settings, /apiClient\.get\('\/company\/customer-website'\)/);
  assert.match(settings, /website\.subdomainLabel/);
  assert.match(settings, /website\.wildcardReady/);
  assert.match(settings, /apiClient\.patch\('\/company\/customer-website\/subdomain',\{label\}\)/);
  assert.match(settings, /Update Subdomain/);
  assert.match(settings, /Existing customer links/);
  assert.match(settings, /Production address reserved in CubeGears/);
  assert.match(settings, /websiteReady = Boolean\(wildcardReady\)/);
  assert.match(settings, /href=\{websiteUrl\}/);
  assert.match(settings, /navigator\.clipboard\.writeText\(websiteUrl\)/);
  assert.match(settings, /!urls\.canOpen\|\|!websiteUrl/);
  assert.match(settings, /Save Branding/);
  assert.match(settings, /Website Branding/);
  assert.match(styles, /\.cws-subdomain-form/);
  assert.match(styles, /\.cws-domain-url/);
});

test('custom domain section, disabled entries, DNS UI and custom-domain endpoints are removed from company settings', () => {
  for (const fragment of [
    'Custom Domain', 'Manage Domains, DNS & SSL', 'Add My Own Domain / DNS Settings',
    'Request Domain', 'cws-domain-item', '/company/customer-website/domains',
    'requestDomain', 'disableDomain', 'setDomains', 'domainRows',
  ]) {
    assert.ok(!settings.includes(fragment), 'Unexpected custom domain feature in settings: ' + fragment);
  }
  assert.doesNotMatch(helper, /primaryDomain|customDomain/);
  assert.doesNotMatch(styles, /\.cws-domain-form|\.cws-domain-list|\.cws-domain-status/);
  assert.match(routes, /path="\/settings\/customer-website\/domains" element=\{<Navigate to="\/settings\/customer-website" replace \/>\}/);
  assert.ok(!routes.includes('CustomerWebsiteDomainsPage'));
  assert.equal(existsSync(new URL('../src/pages/settings/CustomerWebsiteDomainsPage.jsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/styles/customer-website-domains.css', import.meta.url)), false);
});
