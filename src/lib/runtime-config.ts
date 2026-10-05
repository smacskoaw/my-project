export function databaseProvider() {
  const provider = process.env.DATABASE_PROVIDER || 'postgres';
  if (provider !== 'postgres' && provider !== 'firestore')
    throw new Error('Unsupported DATABASE_PROVIDER');
  return provider;
}
export function appOrigin() {
  return (
    process.env.APP_ORIGIN ||
    (process.env.RENDER === 'true' ? process.env.RENDER_EXTERNAL_URL : undefined) ||
    'http://localhost:3000'
  );
}
export function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  if (
    !appOrigin().startsWith('https://') ||
    process.env.COOKIE_SECURE !== 'true' ||
    (process.env.RATE_LIMIT_SECRET?.length || 0) < 32
  )
    throw new Error(
      'Production requires HTTPS APP_ORIGIN, COOKIE_SECURE=true and a strong RATE_LIMIT_SECRET',
    );
  if (process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error('Firestore emulator must never be used in production');
}
