import { readdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Static hosts do not run Next rewrites. Supply the dotted segment-prefetch
// filenames requested by the App Router alongside exported segment folders.
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(full)));
    else result.push(full);
  }
  return result;
}
for (const file of await files('out')) {
  const parts = file.split(path.sep);
  const index = parts.findIndex((p) => p.startsWith('__next.'));
  if (index >= 0 && index < parts.length - 1 && file.endsWith('.txt')) {
    await copyFile(file, path.join(...parts.slice(0, index), parts.slice(index).join('.')));
  }
}
await writeFile('out/.nojekyll', '');
