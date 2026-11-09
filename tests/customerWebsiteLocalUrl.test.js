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

test('verified custom domain takes production priority but localhost still stays local', () => {
  const config = {
    subdomain: slug + '.cubegears.com',
    subdomainLabel: slug,
    primaryDomain: { hostname: 'service.example.com' },
    wildcardReady: false,
  };
  const prod = customerWebsiteAddresses(config);
  assert.equal(prod.displayUrl, 'https://service.example.com/');
  assert.equal(prod.canOpen, true);
  const dev = customerWebsiteAddresses({ ...config, localDevelopment: true });
  assert.equal(dev.displayUrl, 'http://mendoza-and-chang-traders.localhost:5174/');
  assert.equal(dev.productionUrl, 'https://service.example.com/');
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
  });
  assert.equal(invalid.localUrl, '');
  assert.equal(invalid.canOpen, false);
});
