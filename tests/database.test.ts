import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
let dir: string;
let db: PGlite;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'minassati-test-'));
  db = new PGlite(dir);
  await db.exec(await readFile('database/schema.sql', 'utf8'));
});
after(async () => {
  if (!db.closed) await db.close();
  await rm(dir, { recursive: true, force: true });
});
test('persists applicant JSON, enforces idempotency, and supports search, status and delete', async () => {
  const id = crypto.randomUUID();
  const key = crypto.randomUUID();
  const data = {
    fullName: 'سارة أحمد',
    phone: '+963944123456',
    country: 'سوريا',
    city: 'دمشق',
    specialty: 'التعليم',
  };
  await db.query(
    'INSERT INTO applications(id,idempotency_key,payload_hash,data) VALUES($1,$2,$3,$4)',
    [id, key, 'hash', JSON.stringify(data)],
  );
  assert.equal(
    (await db.query<{ total: number }>('SELECT COUNT(*)::int total FROM applications')).rows[0]
      .total,
    1,
  );
  await assert.rejects(() =>
    db.query('INSERT INTO applications(id,idempotency_key,payload_hash,data) VALUES($1,$2,$3,$4)', [
      crypto.randomUUID(),
      key,
      'hash',
      JSON.stringify(data),
    ]),
  );
  assert.equal(
    (
      await db.query(
        "SELECT id FROM applications WHERE data->>'fullName' ILIKE $1 AND data->>'city'=$2",
        ['%سارة%', 'دمشق'],
      )
    ).rows.length,
    1,
  );
  await db.query('UPDATE applications SET status=$1 WHERE id=$2', ['مقبول', id]);
  assert.equal(
    (await db.query<{ status: string }>('SELECT status FROM applications WHERE id=$1', [id]))
      .rows[0].status,
    'مقبول',
  );
  await assert.rejects(() =>
    db.query('UPDATE applications SET status=$1 WHERE id=$2', ['غير صالح', id]),
  );
  await db.close();
  const reopened = new PGlite(dir);
  assert.equal((await reopened.query('SELECT id FROM applications')).rows.length, 1);
  await reopened.query('DELETE FROM applications WHERE id=$1', [id]);
  assert.equal((await reopened.query('SELECT id FROM applications')).rows.length, 0);
  await reopened.close();
});
