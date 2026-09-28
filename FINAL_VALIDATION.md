# INTENT final validation record

Date: 2026-09-28

## Repository and toolchain

- GenLayer CLI: repository-local `0.39.1`
- GenLayer network: Studionet, chain `61999`, RPC `https://studio.genlayer.com/api`
- Canonical GenLayer contract: `0x7b26BC39E2A6aB74A677E558FC53E8b3a3fBe6Bf`
- Canonical deployed source commit: `b886be91e8e756f49595c865c4b1ae0901a094d2`
- Canonical deployed source SHA-256: `2e27aeb4635a4f2db0907cf67c5186d531fccb1ff34d3819c308cf5e02b01058`

## Checks

- Wallet/security suite: **36 passed**
- Attestor tests: **3 passed**
- Safe/Registry Foundry suite: **8 passed**
- Hash parity: **3/3 vectors passed**
- Frontend typecheck/build: **PASS**
- Preflight: **PASS**
- GenVM lint: **PASS for the repository's supported static checks**
- Direct Mode baseline: **24 passed in the verified CI/WSL path**. Native Windows
  execution remains affected by the gltest temporary-file sharing violation.

## Live GenLayer evidence

- Positive protected action: evaluate tx
  `0x2cd5fa2dfd5bb5b22d7fa8ab8ce24ecb4388ef4d47e344c4e7fcd5f001afa172`,
  `FINALIZED / MAJORITY_AGREE / SUCCESS`, `MATCHES_INTENT`.
- Negative protected action: evaluate tx
  `0x0505f833a0d2c2a56ebf806534125d9292fa0c3cae2cfc0736367695b94f252f`,
  `FINALIZED / MAJORITY_AGREE / SUCCESS`, `DOES_NOT_MATCH`.
- A current final-contract `UNCLEAR` protected decision was not reproduced and is
  not claimed here.

## Live Sepolia evidence

- Registry: `0xdca0557775d387d28b3f46a49d011a1e93ba982a`
- Guard: `0x9417cf657bf65e16f1eebc25b01083498ca9e703`
- Safe v1.4.1 proxy: `0xe4eB50EB02bdBd611960c0629B3C779C1645a4c7`
- Demo target: `0xa74a3a9db4747856b196d41e29d52e996079c458`
- Certificate admission: `0x29420cddf1e0742b9f7a7c0d9bf589607fd5d85718360234d68681268ed70f87`
- Exact Safe execution: `0x27ef89740ed8c981aa03c1fc80e521dee029f2dbe6c04a7934369b3962ed1c25`
- The target `pingCount` changed to `1`, and the authorization read back `false`
  after execution. Replay, mutation and delegatecall simulations reverted.

## Limitations

The attestors are five test-controlled keys operated under a 3-of-5 threshold;
they are not independent operators. This is threshold-attested finalized
GenLayer authorization, not a native trustless GenLayer light client. Browser
wallet E2E, a publicly accessible production frontend, and a fresh current
UNCLEAR protected flow remain unclaimed. The existing frontend builds
successfully, but Vercel currently fails after build during its immutable
static-file/preview-comment upload step, so no deployment URL is claimed as
the public production frontend.
