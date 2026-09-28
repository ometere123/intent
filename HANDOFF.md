# Final live handoff for INTENT

The repository has been pushed until this environment's network/tooling/account boundary. The remaining work needs an online development environment, the GenLayer toolchain and a funded Studionet wallet.

Use `CODEX_HANDOFF.md` as the authoritative continuation prompt.

## Hard constraints

- GenLayer Studionet **61999 only**.
- Stable RPC: `https://studio.genlayer.com/api`.
- Never substitute 61997 or another preview/dev network.
- Continue in place. Do not redesign or scaffold a replacement.
- Preserve fail-closed semantics and all 34 SDK tests.
- The repository-local CLI is exactly `genlayer@0.39.1`. Do not uninstall, upgrade, or replace it with the machine-global `0.40.0-rc2`.

## First commands after unzipping

```bash
npm install
# npm install brings in repo-local genlayer@0.39.1; it does not change the global CLI
python -m pip install -r requirements.txt
npm run check:cli-pin
npm run cli:version
npm test
genvm-lint check contracts/intent_guard.py
pytest tests/direct -v
npm run typecheck
npm run build
npm run cli:network:studionet
npm run cli:network:info
node scripts/assert-studionet.mjs
```

Only after every applicable pre-deploy check is green should the agent deploy.

After deployment:

```bash
export INTENT_CONTRACT_ADDRESS=0x...
INTENT_CONTRACT_ADDRESS=$INTENT_CONTRACT_ADDRESS npm run postdeploy:check
```

Then set the same address in `frontend/.env.local` as `NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS` and execute the complete live matrix in `CODEX_HANDOFF.md` and `tests/integration/README.md`.

Do not fabricate evidence. Every address, transaction ID and fee in `LIVE_EVIDENCE.md` must come from an actual 61999 run.
