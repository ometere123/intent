# INTENT deployment

INTENT deploys **only** to GenLayer Studionet.

- Network: Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Repository-local CLI: `genlayer@0.39.1`

Do not use Studio Dev, chain 61997, or the machine-global `0.40.0rc2` CLI.

## Install

```bash
npm install
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

On Windows, use the equivalent virtual-environment activation command or WSL.

## Toolchain and source checks

```bash
npm run check:cli-pin
npm run cli:version
npm run check:source-network
npm test
genvm-lint check contracts/intent_guard.py
pytest tests/direct -v -s
npm run typecheck
npm run build
```

Require the CLI version output to be exactly `0.39.1`.

## Select and independently verify Studionet

```bash
npm run cli:network:studionet
npm run cli:network:info
node scripts/assert-studionet.mjs
```

Before signing anything, require all active evidence to agree on:

```text
Studionet
61999
https://studio.genlayer.com/api
```

If any active configuration says 61997 or Studio Dev, stop.

## Deploy

```bash
npm run deploy:studionet
```

Record the exact deployed source commit, deployment transaction, finality and contract address in `LIVE_EVIDENCE.md`.

Then:

```bash
export INTENT_CONTRACT_ADDRESS=0x...
npm run postdeploy:check
```

The post-deploy check must report chain 61999 and the expected INTENT contract identity.

## Frontend configuration

```bash
cp frontend/.env.example frontend/.env.local
```

Set:

```text
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS=0x...
```

Then run the production build again.

## Live completion

Use `LIVE_DEMO.md`, `tests/integration/README.md` and `AGENT_HANDOFF.md`. Do not fill any evidence field until the corresponding transaction/state was actually observed.
