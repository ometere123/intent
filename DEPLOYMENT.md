# INTENT deployment

INTENT deploys only to GenLayer Studionet.

- Network: Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Repository-local CLI: `genlayer@0.39.1`
- Deployer: `0xb29Ead15B1E8A2420faE84de974088f67a15ccC2`
- Canonical contract: `0x7b26BC39E2A6aB74A677E558FC53E8b3a3fBe6Bf`
- Canonical deployment transaction: `0x248fa17255d25a16bd6e10764163ecf2448c6af7df07ddda2523bfd6cff3fe38`
- Canonical deployment result: `FINALIZED / MAJORITY_AGREE / SUCCESS`
- Canonical source commit: `b886be91e8e756f49595c865c4b1ae0901a094d2`
- Canonical source bytes: `25,435`
- Canonical source SHA-256: `2e27aeb4635a4f2db0907cf67c5186d531fccb1ff34d3819c308cf5e02b01058`

The previous `1.1.0` deployment at `0xAc5b56ebB95132fC75736E8AFb715c9AE072d42D`
(`0x4367d3fa31f2a1cfc67315a514bc3fefde19471aa6436e8a9e1c01069127a3c2`) is
superseded by this `1.2.0` deployment, which binds hard rules into immutable
intent revisions. It remains historical evidence only.

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

The Protected Account reference deployment is recorded in the same evidence file:
Ethereum Sepolia Registry `0xdca0557775d387d28b3f46a49d011a1e93ba982a`, Guard
`0x9417cf657bf65e16f1eebc25b01083498ca9e703`, protected Safe
`0xe4eB50EB02bdBd611960c0629B3C779C1645a4c7`, and demo target
`0xa74a3a9db4747856b196d41e29d52e996079c458`. The exact admission and Safe
execution transactions are recorded only after their Sepolia receipts and state
readbacks were observed.

## Network guard

Before signing or submitting a transaction, require the active environment to report exactly:

```text
Studionet
61999
https://studio.genlayer.com/api
```

If any active configuration says `61997`, Studio Dev, or `https://studio-dev.genlayer.com`, stop.
