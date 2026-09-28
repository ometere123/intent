# INTENT live evidence

This record contains observed Studionet evidence for the deployed contract. All writes below were finalized with accepted consensus and successful contract execution unless explicitly noted.

## Deployment

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Deployer: `0xb29Ead15B1E8A2420faE84de974088f67a15ccC2`
- Canonical contract address: `0x7b26BC39E2A6aB74A677E558FC53E8b3a3fBe6Bf`
- Deployment transaction: [`0x248fa17255d25a16bd6e10764163ecf2448c6af7df07ddda2523bfd6cff3fe38`](https://explorer-studio.genlayer.com/tx/0x248fa17255d25a16bd6e10764163ecf2448c6af7df07ddda2523bfd6cff3fe38)
- Deployment result: `FINALIZED / MAJORITY_AGREE / SUCCESS`
- Deployed source commit: `b886be91e8e756f49595c865c4b1ae0901a094d2`
- Post-deployment `get_network`: `chain_id=61999`, `contract_version=1.2.0`, `name=GenLayer Studionet`
- Source bytes submitted: `25,435`
- Source SHA-256: `2e27aeb4635a4f2db0907cf67c5186d531fccb1ff34d3819c308cf5e02b01058`

The previous `1.1.0` deployment at `0xAc5b56ebB95132fC75736E8AFb715c9AE072d42D` is
superseded historical evidence. The final deployment adds immutable on-chain hard
rules; the current contract source and deployment metadata above are canonical.

## Superseded 1.1 live flow transactions

The following finalized semantic writes were executed against the previous
`1.1.0` deployment and are retained as historical evidence. They are not claims
about state on the canonical `1.2.0` deployment above. Fresh current protected-
account evidence is recorded in the corrected Sepolia section below.

The first canonical-1.2.0 smoke attempts are not lifecycle evidence. Transaction
`0x4805e87e6b537aa18c7fe298d31cdcc8982d63db0ae0c6a6e770cb38dca3e304` used
unsupported `str:` pseudo-type tokens and finalized with a Python argument-count
error. Transactions `0x138753495e8fc5f08cc7959765a2acf3b019505fce4eb37a4eb22cbbcc1f3400`
and `0xc636e08dd7ddc53340e69e06c59afa711bd7fd823810430b0a6c1d941af11da1`
were rejected because the CLI transmitted JSON-looking values as objects instead
of the required JSON strings. No successful intent state is claimed from these
operator/encoding diagnostics.

The CLI wrapper was not used for these successful writes because its Windows shell forwarding split spaced arguments and treated pseudo-type tokens as literal arguments. Writes were submitted with the local `genlayer@0.39.1` binary directly; calldata shown by the receipts contains the intended arguments.

### Intent creation

- `cloud-pro-2`: [`0x7ef97c6971300ffc5a3683b137fe46262c1d6072f74210bd4c07d5d5b64134b8`](https://explorer-studio.genlayer.com/tx/0x7ef97c6971300ffc5a3683b137fe46262c1d6072f74210bd4c07d5d5b64134b8)
- `demo-intent`: [`0x88e39eeac14486866e6352a9a22501889f4080e9c244bb06ccd8ee2aa7e4236e`](https://explorer-studio.genlayer.com/tx/0x88e39eeac14486866e6352a9a22501889f4080e9c244bb06ccd8ee2aa7e4236e)

### Consensus evaluations

- Matching action `32f6bb3464fce8e7921b669013519bcc93298018d2443d8ca1526211ef4b4bf9`: [`0xb6c208b84b94450e7f9638921891df5de5f5019964438fe7f2ed16d8e5fe29e3`](https://explorer-studio.genlayer.com/tx/0xb6c208b84b94450e7f9638921891df5de5f5019964438fe7f2ed16d8e5fe29e3)
  - Result: `ACCEPTED / MAJORITY_AGREE / SUCCESS`; readback: `MATCHES_INTENT`, `within_mandate`.
- Contradictory action `90fb2865754bac55041956fba1623e2b1ce32433725b5d77f16f80c6f635442b`: [`0x133196608aa0fb27a0771ee4d376a4dc95ef76789e524bb3e1e703698ec9f867`](https://explorer-studio.genlayer.com/tx/0x133196608aa0fb27a0771ee4d376a4dc95ef76789e524bb3e1e703698ec9f867)
  - Result: `ACCEPTED / MAJORITY_AGREE / SUCCESS`; readback: `DOES_NOT_MATCH`, `mandate_conflict`.
- Earlier uncertainty action `966211fd582e7c7ba2f552517b8b95609bfce82a49f49f74f81fe8e50b114332`: [`0xd9ac2e19bcce92b074089f267fcdf5a14f79347e23bf7072df159d0e833ebeaf`](https://explorer-studio.genlayer.com/tx/0xd9ac2e19bcce92b074089f267fcdf5a14f79347e23bf7072df159d0e833ebeaf)
  - Result: `ACCEPTED / MAJORITY_AGREE / SUCCESS`; readback: `UNCLEAR`, `insufficient_evidence`.

### Revision and revocation

- `demo-intent` revision: [`0xe870c77005058cbb82db2ba3aad5f035ceb3b30add9ed309cef908eee8b4b57e`](https://explorer-studio.genlayer.com/tx/0xe870c77005058cbb82db2ba3aad5f035ceb3b30add9ed309cef908eee8b4b57e)
- `demo-intent` revocation: [`0x21cca906678eea8d69069de99aa727242c942b3788b7a5c58698587a17681f6f`](https://explorer-studio.genlayer.com/tx/0x21cca906678eea8d69069de99aa727242c942b3788b7a5c58698587a17681f6f)
- Both finalized as `ACCEPTED / MAJORITY_AGREE / SUCCESS`.

## Compatibility-mode browser evidence

A real Chrome wallet session connected to the production control plane and
created a current revision on the canonical Studionet contract:

- frontend: [`https://intent-beta-jade.vercel.app`](https://intent-beta-jade.vercel.app)
- connected account: `0x81301DD9C3605a7DA743D87b803156d8445620B0`
- intent: `browser-demo-2026-09-28`, revision `1`
- finalized creation transaction: [`0xe68a84233b5468d6cb8a8794d349eb8f5025607bc4f3cb4f6222d9ff51e09093`](https://explorer-studio.genlayer.com/tx/0xe68a84233b5468d6cb8a8794d349eb8f5025607bc4f3cb4f6222d9ff51e09093)
- canonical readback: `get_latest_revision(...) == 1`; `get_intent(...)` matched the
  submitted statement, scope, owner and hard rules.

This is real browser-wallet mandate evidence. It is not being presented as a
complete Compatibility Mode target-chain send: the deployed control plane does
not currently expose a browser button that runs `IntentGuardProvider` through a
real target transaction.

## Compatibility-mode execution anchor

The historical Compatibility Mode run documented here did not call
`record_execution_receipt`; it therefore makes no Compatibility Mode claim about
an externally verified target-chain receipt. Protected Account Mode is separate:
the canonical Sepolia section below records a real Safe execution and target
state readback. The Compatibility Mode receipt-binding path remains covered by
Direct Mode tests.

## Tooling and verification

- Repository-local CLI: `genlayer@0.39.1`
- Active network: Studionet, chain `61999`, `https://studio.genlayer.com/api`
- JavaScript SDK tests: `36 passed`
- Hash parity: passed for 3 representative requests
- Direct Mode: `24 passed`
- Frontend typecheck: passed
- Frontend production build: passed
- Static GenVM lint: passed (`3 checks`)
- Full linter validation was not claimed: `genvm-linter 0.11.1rc2` could not resolve the old v0.2.12 runner archive format. This is a tooling artifact limitation, not a live execution failure.
- No separate frontend product was added; the existing control plane now includes a
  Protected Account Mode reference page while remaining separate from the contract.

## Protected Account Mode — corrected policy-bound live Sepolia evidence

This is the canonical corrected Sepolia deployment for the current hardening pass.
The Registry binds each Safe to the GenLayer policy owner and intent-family hash,
and admission requires those fields in the signed certificate.

- Target network: Ethereum Sepolia, chain ID `11155111`
- Registry: `0x6946cf884e54e89a25fde6130cf9d88d7d0e5eef`
  - deployment transaction: [`0x5ecee926be0bc7491107f53ebac24edab191ddb80ae23b6da881d01c391d9bf1`](https://sepolia.etherscan.io/tx/0x5ecee926be0bc7491107f53ebac24edab191ddb80ae23b6da881d01c391d9bf1)
  - canonical GenLayer INTENT: `0x7b26BC39E2A6aB74A677E558FC53E8b3a3fBe6Bf`
  - threshold: `3-of-5` test-controlled attestors
- Safe v1.4.1 singleton: `0x69332b1612f8a4b1b756bd2e3457ba1c89958272`
- SafeProxyFactory: `0x9f4c37d17d5e6835c6cb835e77e0b60772fd7a44`
- protected Safe: `0x2C1688c1eC10020a3919Ce67000fFa91Bf4bd778`
  - owner: `0x02d1cAaaa1C79Be548FD4Fd188dd7f851eCb9910`
  - threshold: `1`
  - setup transaction: `0xdae491216098cd3efb0bebcc74cfaabf46084cae959a1c15dbabc2ef4b2b767a`
- IntentSafeGuard: `0x84308509e7ac6b995bbefa6342761cd2a8fdd451`
  - deployment transaction: [`0x9db8bf03b209f34017c48244f3934e3e73fa461ca311edb44c4e0eb1e9dbdd0d`](https://sepolia.etherscan.io/tx/0x9db8bf03b209f34017c48244f3934e3e73fa461ca311edb44c4e0eb1e9dbdd0d)
  - Safe installation transaction: [`0x77ab87b5bdde1976a9c919b4196326364f58af2225d085cb8bf93a6cdf9cad67`](https://sepolia.etherscan.io/tx/0x77ab87b5bdde1976a9c919b4196326364f58af2225d085cb8bf93a6cdf9cad67)
  - Registry binding transaction: [`0xcdd8059956cbfb361be6ae5f5d65643d89936e7836f508ef31e0856e7753c27c`](https://sepolia.etherscan.io/tx/0xcdd8059956cbfb361be6ae5f5d65643d89936e7836f508ef31e0856e7753c27c)
- Demo target: `0x9a5e9b87f887764aeeeca3dba53c185a6181be99` (deployed but not used by the bound decision)

Policy binding:

- owner: `0xb29Ead15B1E8A2420faE84de974088f67a15ccC2`
- intent family: `protected-demo-9`
- intent ID hash: `0xa50095f8799fd7ad8c0ccc0d9e87b62de185970b87420aaa21c2e64fc15bfd1a`
- module baseline: empty before activation; Safe guard storage readback matched the deployed Guard.

### Fresh finalized GenLayer decision and exact Safe execution

- evaluate transaction: [`0x466171198c2bd76f01258bcc274e40d104a945aedc3bb570c4776a8f0704c90e`](https://explorer-studio.genlayer.com/tx/0x466171198c2bd76f01258bcc274e40d104a945aedc3bb570c4776a8f0704c90e)
- final result: `FINALIZED / MAJORITY_AGREE / SUCCESS`
- outcome: `MATCHES_INTENT`
- action ID: `fb661ec7de20e6b0d7cd09446b8bd353201b61cda3fa6eafd0fea164d96f539b`
- Safe nonce bound: `1`
- exact Safe transaction hash/action hash: `0x3fbaaf1a0a63fb431162030543e01aac8de715bb75de0aab64f5dd3f162eb878`
- certificate digest: `0x27d7b31c8d122d1f4e016de2b6b01db169743dcc2ac9350aba8748c0807629c3`
- Registry admission transaction: [`0x7045364748f759c4664d9900118404dfec742eaa6d7687b3675d43aebf7c1cc9`](https://sepolia.etherscan.io/tx/0x7045364748f759c4664d9900118404dfec742eaa6d7687b3675d43aebf7c1cc9)
- admission readback: `isAuthorized(actionHash) == true` before execution; signers were attestors 1, 2 and 3.
- exact Safe execution transaction: [`0x72547bc0ba6c38b6aecd1d60c917b7e2b36a63c8f3c0572f735caa8dff5167eb`](https://sepolia.etherscan.io/tx/0x72547bc0ba6c38b6aecd1d60c917b7e2b36a63c8f3c0572f735caa8dff5167eb)
- execution receipt: `success`; target state: `pingCount=2`, payload `0x...03`, caller is the protected Safe; Safe nonce advanced from `1` to `2`.
- post-execution readback: `isAuthorized(actionHash) == false`.

The earlier failed nonce-0 attempt is not presented as successful protected
execution. It demonstrated the expected Safe nonce binding and was superseded by
the finalized nonce-1 decision above. The corrected Registry also rejects a
certificate whose policy owner or intent-family hash is substituted, covered by
the Foundry adversarial test and the live policy-binding checks in the attestor.

### Negative protected-account evidence

- A replay of the exact consumed authorization was rejected by the live Registry/Safe path (`isAuthorized == false`; execution helper refused before sending).
- Mutated-recipient and delegatecall attempts were rejected by the Guard path in the live target deployment; full revert assertions remain in the real-Safe Foundry suite.
- Policy substitution is rejected before threshold admission when the certificate does not match the Safe's bound owner/family.

## Historical Protected Account Mode — superseded Sepolia evidence

The following older deployment is historical and superseded. It is retained only
to preserve the earlier evidence trail. The corrected policy-bound deployment is
the canonical Protected Account evidence below. It is not a trustless GenLayer
light client: the target-chain bridge is threshold-attested finalized GenLayer
state.

- Target network: Ethereum Sepolia, chain ID `11155111`
- Registry: `0xdca0557775d387d28b3f46a49d011a1e93ba982a`
  - deployment transaction: `0x9fd9be7eab3b186818f81acdda660b066d48755d3a453a6ca5b6b0419d396a80`
- Safe v1.4.1 singleton: `0xec0d3a131b4ebb570a7bee77ebad24d1a4667492`
- SafeProxyFactory: `0xf08f8869f56caccb20b152396618e188b4e45b7f`
- protected Safe proxy: `0xe4eB50EB02bdBd611960c0629B3C779C1645a4c7`
  - owner: `0x02d1cAaaa1C79Be548FD4Fd188dd7f851eCb9910`
  - threshold: `1`
  - setup transaction: `0x1c1e29d20c893e801dbf8f66187ddd26358fad9266e851236a159b8cf68b087d`
- IntentSafeGuard: `0x9417cf657bf65e16f1eebc25b01083498ca9e703`
  - deployment transaction: `0x3b9f360b7703516694f0147f572eb5b25ffc9d40d0d3920631d9a674b11ea2b7`
  - Safe installation transaction: `0x896f4a7a1af4777306ce41b3afa9969c915bba65fcc6fc3ba77626c87a7fe606`
  - Registry binding transaction: `0x4cc99093053a08cd35f6fdb51cc57cc75d32f9773c22c506fef50a6290eb7713`
- Demo target: `0xa74a3a9db4747856b196d41e29d52e996079c458`
  - deployment transaction: `0x74f2656a7fe597fa37e181fa17849fa91c0c1051f2983e65cf05a6bc87d91d95`
- The live Safe module baseline was empty and the Safe storage guard slot read back
  the deployed IntentSafeGuard before Registry registration.

### Fresh finalized GenLayer decisions

- Positive protected action, `protected-demo-9`, revision `1`:
  - evaluate transaction: [`0x2cd5fa2dfd5bb5b22d7fa8ab8ce24ecb4388ef4d47e344c4e7fcd5f001afa172`](https://explorer-studio.genlayer.com/tx/0x2cd5fa2dfd5bb5b22d7fa8ab8ce24ecb4388ef4d47e344c4e7fcd5f001afa172)
  - final result: `FINALIZED / MAJORITY_AGREE / SUCCESS`
  - outcome read by the attestor: `MATCHES_INTENT / within_mandate`
  - Safe nonce bound: `1`
  - exact Safe transaction hash: `0x4d668c35edb41f1404cd656321812705b91fb530f00ece90a84a249a09fd37f7`
- Negative protected action, `protected-demo-8`, revision `1`:
  - evaluate transaction: [`0x0505f833a0d2c2a56ebf806534125d9292fa0c3cae2cfc0736367695b94f252f`](https://explorer-studio.genlayer.com/tx/0x0505f833a0d2c2a56ebf806534125d9292fa0c3cae2cfc0736367695b94f252f)
  - final result: `FINALIZED / MAJORITY_AGREE / SUCCESS`
  - outcome readback: `DOES_NOT_MATCH / mandate_conflict`
- An `UNCLEAR` result was not reproduced on the final current action set; the
  previous UNCLEAR record remains historical and is not presented as final-flow proof.

### Attestation and exact Safe execution

- The five configured public attestors were used as test-controlled keys; the live
  certificate used a sorted 3-of-5 subset.
- Positive certificate digest:
  `0x6855e1c34db3774d6ad33d30bddeb3d79e1274d8a04bdde4c55f144f08755b80`
- Registry admission transaction:
  [`0x29420cddf1e0742b9f7a7c0d9bf589607fd5d85718360234d68681268ed70f87`](https://sepolia.etherscan.io/tx/0x29420cddf1e0742b9f7a7c0d9bf589607fd5d85718360234d68681268ed70f87)
  - `isAuthorized(actionHash)` before execution: `true`
  - signers: attestors 1, 2 and 3
- Exact Safe execution transaction:
  [`0x27ef89740ed8c981aa03c1fc80e521dee029f2dbe6c04a7934369b3962ed1c25`](https://sepolia.etherscan.io/tx/0x27ef89740ed8c981aa03c1fc80e521dee029f2dbe6c04a7934369b3962ed1c25)
  - receipt status: `success`
  - target `pingCount`: `1`
  - target payload: `0x...03`
  - target caller: the protected Safe
  - `isAuthorized(actionHash)` after execution: `false`
- Replay and mutation simulations against the live Safe both reverted. Delegatecall
  simulation also reverted. These were rejected without claiming successful target
  transactions for the negative cases.

The existing Next.js control plane builds successfully and is deployed at
[`https://intent-beta-jade.vercel.app`](https://intent-beta-jade.vercel.app).
The production deployment was verified with an external HTTPS request returning
HTTP 200 and the INTENT application HTML. Browser-wallet signing E2E remains a
separate unclaimed verification item.

## Operator diagnostics

- Malformed wrapper invocations that passed pseudo-type tokens (`str`, `int`) or split JSON were rejected by the contract and are not successful lifecycle evidence.
- The successful live writes above used direct local CLI invocation with exact calldata and were independently read back from finalized state.
