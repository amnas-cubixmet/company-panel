import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  customerWebsiteAddresses,
  isLocalCustomerWebsiteDevelopment,
} from '../src/utils/customerWebsiteAddresses.js';

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const slug = 'mendoza-and-chang-traders';

test('localhost panel uses the SAME workshop subdomain for preview, open, copy and form suffix', () => {
  const urls = customerWebsiteAddresses({
    subdomain: slug + '.cubegears.com',
    subdomainLabel: slug,
    wildcardReady: false,
    localDevelopment: isLocalCustomerWebsiteDevelopment(true, 'localhost'),
    localOrigin: 'http://localhost:5174',
  });
  assert.equal(urls.displayUrl, 'http://mendoza-and-chang-traders.localhost:5174/');
  assert.equal(urls.productionUrl, 'https://mendoza-and-chang-traders.cubegears.com/');
  assert.equal(urls.suffix, '.localhost:5174');
  assert.equal(urls.canOpen, true);
  assert.equal(urls.isLocalPreview, true);
  const page = file('src/pages/settings/CustomerWebsiteSettingsPage.jsx');
  assert.match(page, /navigator\.clipboard\.writeText\(websiteUrl\)/);
  assert.match(page, /href=\{websiteUrl\}/);
  assert.match(page, /\{websiteUrl \|\| 'Website domain not configured'\}/);
  assert.match(page, /\{urls\.suffix\}/);
  assert.doesNotMatch(page, /href=\{'https:\/\/'\+websiteHost/);
});

test('production never exposes local URLs and inactive wildcard remains unclickable', () => {
  const production = customerWebsiteAddresses({
    subdomain: slug + '.cubegears.com',
    subdomainLabel: slug,
    wildcardReady: false,
    localDevelopment: isLocalCustomerWebsiteDevelopment(false, 'example.com'),
  });
  assert.equal(production.localUrl, '');
  assert.equal(production.displayUrl, 'https://mendoza-and-chang-traders.cubegears.com/');
  assert.equal(production.suffix, '.cubegears.com');
  assert.equal(production.canOpen, false);
  const enabled = customerWebsiteAddresses({
    subdomain: slug + '.cubegears.com', subdomainLabel: slug,
    wildcardReady: true, localDevelopment: false,
  });
  assert.equal(enabled.canOpen, true);
  assert.equal(enabled.displayUrl, production.displayUrl);
});

test('default workshop subdomain remains authoritative on local and production URLs', () => {
  const config = {
    subdomain: slug + '.cubegears.com',
    subdomainLabel: slug,
    wildcardReady: false,
  };
  const production = customerWebsiteAddresses(config);
  assert.equal(production.displayUrl, 'https://mendoza-and-chang-traders.cubegears.com/');
  assert.equal(production.canOpen, false);
  const dev = customerWebsiteAddresses({ ...config, localDevelopment: true, localOrigin: 'http://localhost:5174' });
  assert.equal(dev.displayUrl, 'http://mendoza-and-chang-traders.localhost:5174/');
  assert.equal(dev.productionUrl, production.displayUrl);

  // A stale custom-domain property never overrides the platform default.
  const staleConfig = customerWebsiteAddresses({
    ...config,
    primaryDomain: { hostname: 'disabled.example.com' },
    wildcardReady: true,
  });
  assert.equal(staleConfig.displayUrl, 'https://mendoza-and-chang-traders.cubegears.com/');
  assert.equal(staleConfig.canOpen, true);
});

test('development website preview follows configured port and rejects remote origins', () => {
  const workshop = {
    subdomain: slug + '.cubegears.com',
    subdomainLabel: slug,
    localDevelopment: true,
  };
  const configured = customerWebsiteAddresses({ ...workshop, localOrigin: 'http://127.0.0.1:5414' });
  assert.equal(configured.displayUrl, 'http://mendoza-and-chang-traders.localhost:5414/');
  assert.equal(configured.suffix, '.localhost:5414');
  assert.equal(configured.canOpen, true);
  for (const localOrigin of ['', 'https://evil.example.com', 'http://evil.example.com:5414',
    'http://localhost:5414/custom', 'http://localhost:5414?redirect=1']) {
    const rejected = customerWebsiteAddresses({ ...workshop, localOrigin });
    assert.equal(rejected.localUrl, '');
    assert.equal(rejected.canOpen, false);
  }
});

test('dev-only localhost detection never activates on remote hosts or bad labels', () => {
  assert.equal(isLocalCustomerWebsiteDevelopment(true, 'localhost'), true);
  assert.equal(isLocalCustomerWebsiteDevelopment(true, '127.0.0.1'), true);
  assert.equal(isLocalCustomerWebsiteDevelopment(true, 'garage.localhost'), true);
  assert.equal(isLocalCustomerWebsiteDevelopment(false, 'localhost'), false);
  assert.equal(isLocalCustomerWebsiteDevelopment(true, 'garage.example.com'), false);
  const invalid = customerWebsiteAddresses({
    subdomain: 'bad.cubegears.com',
    subdomainLabel: 'invalid.label',
    localDevelopment: true,
    localOrigin: 'http://localhost:5174',
  });
  assert.equal(invalid.localUrl, '');
  assert.equal(invalid.canOpen, false);
});
