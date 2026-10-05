import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Java on Windows can misread non-ASCII command-line paths. Keep its rule/config
// files and emulator cache in an ASCII temporary directory, not the Arabic repo path.
const temporary = await mkdtemp(path.join(tmpdir(), 'minassati-firestore-'));
const configuration = JSON.parse(await readFile('firebase.json', 'utf8'));
await copyFile('firestore.rules', path.join(temporary, 'firestore.rules'));
await copyFile('firestore.indexes.json', path.join(temporary, 'firestore.indexes.json'));
const configPath = path.join(temporary, 'firebase.json');
await writeFile(configPath, JSON.stringify(configuration));
const command =
  process.argv[2] === 'e2e'
    ? 'node scripts/firestore-e2e.mjs'
    : 'tsx --test tests/firestore/*.test.ts';
const child = spawn(
  process.execPath,
  [
    'node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:exec',
    '--only',
    'firestore',
    '--project',
    'demo-minassati',
    '--config',
    configPath,
    command,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DEBUG: '',
      FIREBASE_SERVICE_ACCOUNT_JSON: '',
      GOOGLE_APPLICATION_CREDENTIALS: '',
      FIREBASE_PROJECT_ID: 'demo-minassati',
      FIREBASE_EMULATORS_PATH: path.join(tmpdir(), 'minassati-firebase-emulators'),
    },
  },
);
child.on('exit', async (code) => {
  await rm(temporary, { recursive: true, force: true });
  process.exit(code ?? 1);
});
child.on('error', async () => {
  await rm(temporary, { recursive: true, force: true });
  process.exit(1);
});
