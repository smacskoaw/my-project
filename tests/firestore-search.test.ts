import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearch, searchTokens } from '../src/lib/firestore-search';
test('Firestore search indexes Arabic name prefixes and normalized local phones', () => {
  const tokens = searchTokens('أحمد محمد علي', '+9647701234567');
  for (const text of [
    'أحمد',
    'محم',
    'علي',
    'أحمد محمد',
    '٠٧٧٠١٢٣٤٥٦٧',
    '7701234',
    '+9647701234567',
  ])
    assert.ok(tokens.includes(normalizeSearch(text)), text);
  assert.ok(!tokens.includes('محمود'));
});
test('Search token size remains bounded for maximum field lengths', () => {
  assert.ok(searchTokens('ا'.repeat(120), '+9647701234567').length < 500);
  assert.ok(searchTokens('احمد '.repeat(24).trim(), '+9647701234567').length < 500);
});
