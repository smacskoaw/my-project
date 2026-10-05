'use client';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Public web-app identifiers. Authorization is enforced by Firebase Auth and rules.
const config = {
  apiKey: 'AIzaSyD3Q9yYHTPLHiVfqSJlyof1S3Ik2FOL_ac',
  authDomain: 'sgyqkl.firebaseapp.com',
  projectId: 'sgyqkl',
  appId: '1:20879732503:web:662f3fb9b34317bc281152',
};
export function firebaseClient() {
  const app =
    getApps().find((a) => a.name === 'minassati-web') || initializeApp(config, 'minassati-web');
  return { auth: getAuth(app), db: getFirestore(app) };
}
