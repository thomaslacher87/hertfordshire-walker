import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve('dist');
const indexHtml = await readFile(
  resolve(outputDirectory, 'index.html'),
  'utf8',
);
const fallbackHtml = await readFile(
  resolve(outputDirectory, '404.html'),
  'utf8',
);

if (indexHtml !== fallbackHtml) {
  throw new Error('The GitHub Pages fallback does not match index.html.');
}

const assetPaths = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => path.includes('/assets/'));

if (assetPaths.length === 0) {
  throw new Error('The production shell does not reference any built assets.');
}

for (const assetPath of assetPaths) {
  const expectedPrefix = '/hertfordshire-walker/';

  if (!assetPath.startsWith(expectedPrefix)) {
    throw new Error(`Asset is missing the Pages base path: ${assetPath}`);
  }

  const localPath = assetPath.slice(expectedPrefix.length);
  await stat(resolve(outputDirectory, localPath));
}

console.log(
  `Verified Pages fallback and ${assetPaths.length} base-prefixed assets.`,
);

const manifest = JSON.parse(
  await readFile(resolve(outputDirectory, '.vite/manifest.json'), 'utf8'),
);
if (!manifest['src/WalkMap.tsx']?.isDynamicEntry) {
  throw new Error('The lazy map entry is missing from the Pages manifest.');
}
for (const entry of Object.values(manifest)) {
  for (const dependency of [
    ...(entry.imports ?? []),
    ...(entry.dynamicImports ?? []),
  ]) {
    if (!manifest[dependency])
      throw new Error(`Build dependency missing: ${dependency}`);
  }
  for (const asset of [
    entry.file,
    ...(entry.css ?? []),
    ...(entry.assets ?? []),
  ]) {
    await stat(resolve(outputDirectory, asset));
  }
}
console.log('Verified the map chunk, styles, and manifest dependencies.');
