# INTENT toolchain lock

INTENT targets **GenLayer Studionet only**.

- Network alias: `studionet`
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Repository-local GenLayer CLI: **`genlayer@0.39.1` exactly**

## Why the CLI is local

A developer machine may also have a release-candidate GenLayer CLI installed globally. INTENT must not depend on or modify that global installation. Running `npm install` in this repository installs the stable CLI into `node_modules`, and `scripts/genlayer-local.mjs` executes only that local binary after verifying its package version is exactly 0.39.1. It never falls back to `PATH`.

## Required commands

```bash
npm install
npm run check:cli-pin
npm run cli:version
npm run cli:network:studionet
npm run cli:network:info
node scripts/assert-studionet.mjs
```

The version command must report `0.39.1`, and the network check must resolve to chain `61999` at `https://studio.genlayer.com/api`.

Deploy only through:

```bash
npm run deploy:studionet
```

Do not replace these commands with a bare global `genlayer ...` invocation.
