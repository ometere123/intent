import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.py', '.yaml', '.yml']);
const ignored = new Set(['node_modules', '.next', '.git', 'dist']);
const forbiddenNeedles = [
  String(62000 - 3),
  ['studio', 'dev'].join('-'),
  ['studio', 'next'].join('-'),
];
const hits = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (allowedExt.has(path.extname(entry.name))) {
      const text = await readFile(full, 'utf8');
      for (const needle of forbiddenNeedles) {
        if (text.toLowerCase().includes(needle.toLowerCase())) hits.push(`${path.relative(ROOT, full)} -> ${needle}`);
      }
    }
  }
}

await walk(ROOT);
if (hits.length) {
  console.error('Non-Studionet GenLayer network reference found in executable/config source:', hits);
  process.exit(1);
}
console.log('Studionet-only source check passed.');
