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
- Frontend finality tests: **4 passed**
- Safe/Registry Foundry suite: **10 passed**
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

## Current live Sepolia evidence

- Registry: `0x6946cf884e54e89a25fde6130cf9d88d7d0e5eef`
- Guard: `0x84308509e7ac6b995bbefa6342761cd2a8fdd451`
- Safe v1.4.1 proxy: `0x2C1688c1eC10020a3919Ce67000fFa91Bf4bd778`
- Demo target: `0xa74a3a9db4747856b196d41e29d52e996079c458`
- Certificate admission: `0x7045364748f759c4664d9900118404dfec742eaa6d7687b3675d43aebf7c1cc9`
- Exact Safe execution: `0x72547bc0ba6c38b6aecd1d60c917b7e2b36a63c8f3c0572f735caa8dff5167eb`
- The target `pingCount` changed to `2`, the Safe nonce advanced to `2`, and the authorization read back `false`
  after execution. Replay, mutation and delegatecall simulations reverted.

The fresh matching GenLayer decision was
`0x466171198c2bd76f01258bcc274e40d104a945aedc3bb570c4776a8f0704c90e`,
`FINALIZED / MAJORITY_AGREE / SUCCESS`, with action hash
`0x3fbaaf1a0a63fb431162030543e01aac8de715bb75de0aab64f5dd3f162eb878`.
The Registry binds this Safe to policy owner
`0xb29Ead15B1E8A2420faE84de974088f67a15ccC2` and intent-family hash
`0xa50095f8799fd7ad8c0ccc0d9e87b62de185970b87420aaa21c2e64fc15bfd1a`.

## Limitations

The attestors are five test-controlled keys operated under a 3-of-5 threshold;
they are not independent operators. This is threshold-attested finalized
GenLayer authorization, not a native trustless GenLayer light client. The
reviewer-facing frontend is publicly deployed at
`https://intent-beta-jade.vercel.app` and its root HTML was externally verified
over HTTPS. Browser-wallet signing E2E and a fresh current UNCLEAR protected flow
remain unclaimed.
