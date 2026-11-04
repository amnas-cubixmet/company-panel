import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const nav = read('../src/routes/saasRouteRegistration.js');
const routes = read('../src/routes/AppRoutes.jsx');
const credit = read('../src/pages/saas/CreditWorkspace.jsx');
const chip = read('../src/components/layout/CreditBalanceChip.jsx');
const client = read('../src/services/creditWallet.service.js');

test('account navigation contains four credit tabs and no old subscription plans', () => {
  for (const path of ['/account', '/account/credits/buy', '/account/storage', '/account/credits/logs']) {
    assert.ok(nav.includes(`path: '${path}'`), `Missing ${path}`);
    assert.ok(routes.includes(`path="${path}"`), `Missing route ${path}`);
  }
  assert.doesNotMatch(nav, /Change Plan|Plan & Usage/);
  assert.doesNotMatch(nav, /path: '\/account\/credits\/features'/);
  assert.match(routes, /path="\/account\/credits\/features" element=\{<Navigate to="\/account\/credits" replace \/>\}/);
});

test('credits are always server-authoritative, not generated in local storage', () => {
  assert.match(client, /\/saas\/credits\/overview/);
  assert.match(client, /\/saas\/credits\/checkout-links/);
  assert.match(client, /hostedCheckoutStatus/);
  assert.match(client, /\/saas\/credits\/features\/enable/);
  assert.match(client, /\/saas\/credits\/logs/);
  assert.doesNotMatch(client, /localStorage\.(?:setItem|getItem)/);
  assert.match(credit, /No balance or payment has been assumed/);
  assert.match(credit, /wallet\?\.lowBalance/);
  assert.match(chip, /creditWalletService\.overview/);
});

test('Buy Credits header omits Razorpay Top-Up label without removing checkout', () => {
  assert.doesNotMatch(credit, /RAZORPAY TOP-UP/);
  assert.match(credit, /<h2>Choose a credit package<\/h2>/);
  assert.match(credit, /purchaseCredits\(pack\.id\)/);
});

test('Buy Credits removes server verification explanatory paragraph only', () => {
  assert.doesNotMatch(credit, /Package prices and credit amounts come from the server/);
  assert.doesNotMatch(credit, /No money or credits are created until Razorpay verifies a captured payment/);
  assert.match(credit, /<h2>Choose a credit package<\/h2>/);
  assert.match(credit, /packages\.filter\(p => p\.active\)/);
  assert.match(credit, /onClick=\{\(\) => buy\(pack\)\}/);
});

test('credit purchases and feature actions require confirmation from backend', () => {
  assert.match(credit, /purchaseCredits\(pack\.id\)/);
  assert.match(credit, /creditWalletService\.purchaseBundle\(bundle\.id\)/);
  assert.match(credit, /creditWalletService\.disableBundle\(bundle\.id\)/);
  assert.match(credit, /payment\.credited === true && payment\.status === 'credited'/);
});
