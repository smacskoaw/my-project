import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
type Database = { query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> };
const globalDb = globalThis as unknown as { minassatiDb?: Promise<Database> };
async function initialize(): Promise<Database> {
  const connection = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production' && !connection)
    throw new Error('DATABASE_URL is required in production');
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.APP_ORIGIN?.startsWith('https://') ||
      process.env.COOKIE_SECURE !== 'true' ||
      (process.env.RATE_LIMIT_SECRET?.length || 0) < 32)
  )
    throw new Error(
      'Production requires HTTPS APP_ORIGIN, COOKIE_SECURE=true and a strong RATE_LIMIT_SECRET',
    );
  const localPath = path.resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_DIR || 'data/minassati',
  );
  if (!connection) await mkdir(localPath, { recursive: true });
  const raw = connection
    ? new Pool({ connectionString: connection, max: 10 })
    : new PGlite(localPath);
  const db: Database = {
    async query<T>(sql: string, params: unknown[] = []) {
      const result =
        raw instanceof Pool ? await raw.query(sql, params) : await raw.query<T>(sql, params);
      return { rows: result.rows as T[] };
    },
  };
  const schema = await readFile(path.join(process.cwd(), 'database/schema.sql'), 'utf8');
  for (const statement of schema.split(';').filter((s) => s.trim())) await db.query(statement);
  return db;
}
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  globalDb.minassatiDb ??= initialize().catch((e) => {
    globalDb.minassatiDb = undefined;
    throw e;
  });
  return (await (await globalDb.minassatiDb).query<T>(sql, params)).rows;
}
