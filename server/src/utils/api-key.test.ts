import assert from 'node:assert/strict';
import test from 'node:test';
import { API_KEY_SCOPES, generateApiKey, hashApiKey, isApiKey, validScopes } from './api-key';

test('generates unique high-entropy prefixed keys and deterministic hashes', () => {
  const first = generateApiKey();
  const second = generateApiKey();
  assert.notEqual(first.key, second.key);
  assert.ok(first.key.startsWith('sk_live_'));
  assert.equal(first.keyHash, hashApiKey(first.key));
  assert.notEqual(first.keyHash, first.key);
  assert.ok(isApiKey(first.key));
});

test('accepts only supported API key scopes', () => {
  assert.equal(validScopes(['numbers:read', 'dashboard:read']), true);
  assert.equal(validScopes(['numbers:read', 'unknown:scope']), false);
  assert.equal(API_KEY_SCOPES.includes('numbers:write'), true);
});
