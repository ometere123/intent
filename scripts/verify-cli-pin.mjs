#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED = '0.39.1';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pinned = packageJson.devDependencies?.genlayer;

if (pinned !== EXPECTED) {
  throw new Error(`package.json must pin genlayer exactly to ${EXPECTED}; found ${String(pinned)}`);
}

const installedPath = join(root, 'node_modules', 'genlayer', 'package.json');
if (existsSync(installedPath)) {
  const installed = JSON.parse(readFileSync(installedPath, 'utf8')).version;
  if (installed !== EXPECTED) throw new Error(`Installed local GenLayer CLI is ${installed}; expected exactly ${EXPECTED}`);
  console.log(`GenLayer CLI pin OK: local genlayer@${installed}`);
} else {
  console.log(`GenLayer CLI manifest pin OK: genlayer@${EXPECTED} (local dependencies not installed in this environment)`);
}
