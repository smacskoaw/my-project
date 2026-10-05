import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
  stdio: 'inherit',
  env: { ...process.env, E2E_DATABASE_PROVIDER: 'firestore' },
});
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', () => process.exit(1));
