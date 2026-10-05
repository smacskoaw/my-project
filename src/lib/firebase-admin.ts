import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { validateProductionConfig } from './runtime-config';

// Server only. The browser SDK config does not grant this server database access.
export function firestore() {
  validateProductionConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId))
    throw new Error('Set FIREBASE_PROJECT_ID');
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulator && !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator))
    throw new Error('Only a local Firestore emulator is allowed');
  const name = 'minassati-' + projectId;
  const existing = getApps().find((app) => app.name === name);
  if (existing) return getFirestore(existing);
  let credential;
  if (!emulator) {
    const accountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (accountJson) {
      const account = JSON.parse(accountJson);
      if (account.project_id !== projectId)
        throw new Error('Service account belongs to a different project');
      credential = cert(account);
    } else {
      credential = applicationDefault();
    }
  }
  return getFirestore(initializeApp({ projectId, ...(credential ? { credential } : {}) }, name));
}
