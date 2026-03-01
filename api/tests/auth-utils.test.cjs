'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCookies,
  createSessionToken,
  verifySessionToken,
  isAllowedOrigin
} = require('../auth-utils.cjs');

test('parseCookies decodifica valori URL encoded', () => {
  const req = {
    headers: {
      cookie: 'a=1; b=ciao%20mondo; empty='
    }
  };

  const cookies = parseCookies(req);
  assert.equal(cookies.a, '1');
  assert.equal(cookies.b, 'ciao mondo');
  assert.equal(cookies.empty, '');
});

test('createSessionToken + verifySessionToken roundtrip', () => {
  const secret = 'super-secret-key';
  const token = createSessionToken({ sub: '123', username: 'Tester' }, secret, 60);
  const payload = verifySessionToken(token, secret);

  assert.equal(payload.sub, '123');
  assert.equal(payload.username, 'Tester');
  assert.ok(Number.isInteger(payload.iat));
  assert.ok(Number.isInteger(payload.exp));
});

test('isAllowedOrigin accetta same-origin anche senza ALLOWED_ORIGINS', () => {
  delete process.env.ALLOWED_ORIGINS;
  const req = {
    headers: {
      origin: 'http://skyfrost.it',
      host: 'skyfrost.it',
      'x-forwarded-proto': 'https'
    },
    secure: true
  };

  assert.equal(isAllowedOrigin(req, 'http://skyfrost.it'), true);
});

test('isAllowedOrigin rispetta ALLOWED_ORIGINS quando configurato', () => {
  process.env.ALLOWED_ORIGINS = 'http://skyfrost.it,http://www.skyfrost.it';
  const req = {
    headers: {
      origin: 'https://evil.example',
      host: 'skyfrost.it',
      'x-forwarded-proto': 'https'
    },
    secure: true
  };

  assert.equal(isAllowedOrigin(req, 'http://www.skyfrost.it'), true);
  assert.equal(isAllowedOrigin(req, 'https://evil.example'), false);
});

