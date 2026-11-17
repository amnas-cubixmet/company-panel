import assert from 'node:assert/strict';
import test from 'node:test';
import { customerWebsiteDevParams, trackingUrlWithDevPort } from '../src/utils/customerWebsiteAddresses.js';

const trackingUrl = 'http://abc-motors.localhost:5174/access/fixture.token';

test('customer tracking uses the configured local port and keeps the issued workshop and token', () => {
  for (const port of [3000, 4190]) {
    const params = customerWebsiteDevParams(true, 'localhost', `http://127.0.0.1:${port}`);
    assert.equal(trackingUrlWithDevPort(trackingUrl, params.customerWebsiteDevOrigin),
      `http://abc-motors.localhost:${port}/access/fixture.token`);
  }
});

test('customer tracking keeps the backend URL outside configured local development', () => {
  const serverUrl = 'https://abc-motors.customer.example.test/access/fixture.token';
  const configuredOrigin = 'http://localhost:3000';
  assert.equal(trackingUrlWithDevPort(serverUrl, configuredOrigin), serverUrl);
  assert.equal(trackingUrlWithDevPort(trackingUrl, 'https://external.example.test'), trackingUrl);
  for (const params of [customerWebsiteDevParams(false, 'localhost', configuredOrigin),
    customerWebsiteDevParams(true, 'app.example.test', configuredOrigin)]) {
    assert.equal(trackingUrlWithDevPort(trackingUrl, params.customerWebsiteDevOrigin), trackingUrl);
  }
});
