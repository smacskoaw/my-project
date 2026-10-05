import { config } from 'dotenv';
config({ path: '.env.local' });
config();
async function main() {
  const { upsertAdmin } = await import('../src/lib/store');
  const { hashPassword } = await import('../src/lib/security');
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || username.length < 3 || !password || password.length < 8)
    throw new Error('Set ADMIN_USERNAME (3+ characters) and ADMIN_PASSWORD (8+ characters).');
  const hash = await hashPassword(password);
  await upsertAdmin(username, hash);
  console.log('تم إنشاء / تحديث حساب الإدارة وإلغاء جلساته السابقة.');
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
