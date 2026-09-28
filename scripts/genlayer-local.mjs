#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const EXPECTED = '0.39.1';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const pkgPath = join(root, 'node_modules', 'genlayer', 'package.json');

if (!existsSync(pkgPath)) {
  console.error(`INTENT requires the repository-local genlayer@${EXPECTED}. Run "npm install" in the repo first.`);
  process.exit(2);
}

const installed = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
if (installed !== EXPECTED) {
  console.error(`Refusing GenLayer CLI ${installed}. INTENT requires exactly ${EXPECTED} for Studionet 61999.`);
  process.exit(3);
}

const binName = process.platform === 'win32' ? 'genlayer.cmd' : 'genlayer';
const binPath = join(root, 'node_modules', '.bin', binName);
if (!existsSync(binPath)) {
  console.error(`Local GenLayer binary not found at ${binPath}. Re-run "npm install".`);
  process.exit(4);
}

const args = process.argv.slice(2);
const result = spawnSync(binPath, args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(5);
}
process.exit(result.status ?? 1);
