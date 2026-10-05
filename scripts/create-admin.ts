import { config } from 'dotenv';
config({ path: '.env.local' });
config();
async function main() {
  const { query } = await import('../src/lib/db');
  const { hashPassword } = await import('../src/lib/security');
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || username.length < 3 || !password || password.length < 8)
    throw new Error('Set ADMIN_USERNAME (3+ characters) and ADMIN_PASSWORD (8+ characters).');
  const hash = await hashPassword(password);
  await query(
    'INSERT INTO admins(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash',
    [crypto.randomUUID(), username, hash],
  );
  await query('DELETE FROM sessions WHERE admin_id=(SELECT id FROM admins WHERE username=$1)', [
    username,
  ]);
  console.log('تم إنشاء / تحديث حساب الإدارة وإلغاء جلساته السابقة.');
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
