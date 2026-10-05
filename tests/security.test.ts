import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  checkOrigin,
  HttpError,
  readJson,
} from '../src/lib/security';
test('password hashes have distinct salts and reject incorrect passwords', async () => {
  const first = await hashPassword('example-password-123!');
  const second = await hashPassword('example-password-123!');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('example-password-123!', first), true);
  assert.equal(await verifyPassword('wrong', first), false);
});
test('state changes reject foreign and missing origins', () => {
  process.env.APP_ORIGIN = 'http://localhost:3000';
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request('http://localhost:3000', { headers: { Origin: 'http://localhost:3000' } }),
    ),
  );
  const cases: Record<string, string>[] = [{}, { Origin: 'https://evil.example' }];
  for (const headers of cases)
    assert.throws(() => checkOrigin(new Request('http://localhost:3000', { headers })), HttpError);
});
test('JSON reader rejects malformed, oversized and non-JSON bodies', async () => {
  const request = (body: string, type = 'application/json') =>
    new Request('http://localhost:3000', {
      method: 'POST',
      headers: { 'Content-Type': type },
      body,
    });
  await assert.rejects(() => readJson(request('{')), HttpError);
  await assert.rejects(() => readJson(request('x'.repeat(20001))), HttpError);
  await assert.rejects(() => readJson(request('{}', 'text/plain')), HttpError);
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
});
