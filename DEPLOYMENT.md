# INTENT deployment

INTENT deploys only to GenLayer Studionet.

- Network: Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Repository-local CLI: `genlayer@0.39.1`
- Deployer: `0xb29Ead15B1E8A2420faE84de974088f67a15ccC2`
- Contract: `0xAc5b56ebB95132fC75736E8AFb715c9AE072d42D`
- Deployment transaction: `0x4367d3fa31f2a1cfc67315a514bc3fefde19471aa6436e8a9e1c01069127a3c2`
- Deployment result: `ACCEPTED / MAJORITY_AGREE / SUCCESS`
- Source bytes: `20,721`
- Source SHA-256: `27ce002c89b38f6e4263d7bba23dc4b15900443edd909bbfcd9fa0ccaaf40376`

The deployment used the working-tree source representation derived from baseline commit `dbe38adfd4b8984c7c10f6221f4834555ef8dba0`. Git normalizes text line endings in the committed blob, so the recorded deployment bytes/hash are preserved as observed evidence and are not claimed as raw byte-for-byte Git-blob parity.

## Reproduce checks

```bash
npm install
npm run check:cli-pin
npm run cli:version
npm run check:source-network
npm test
npm run typecheck
npm run build
npm run preflight
pytest tests/direct -v -s
```

On Windows, use WSL for the Direct Mode suite if the native temporary-file locking issue appears. The test harness pins the stable `v0.2.12` runner deliberately; it does not migrate INTENT to the v0.3 RC runner.

## Live evidence

See [`LIVE_EVIDENCE.md`](LIVE_EVIDENCE.md) for finalized transaction hashes, consensus outcomes, state readbacks, action IDs, and the explicit execution-receipt limitation. Do not infer target-chain execution from a positive intent decision: a receipt is only valid after a real target-chain transaction is supplied and bound.

## Network guard

Before signing or submitting a transaction, require the active environment to report exactly:

```text
Studionet
61999
https://studio.genlayer.com/api
```

If any active configuration says `61997`, Studio Dev, or `https://studio-dev.genlayer.com`, stop.
