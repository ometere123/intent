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
about state on the canonical `1.2.0` deployment above. The new deployment has
only been post-deployment smoke-checked so far; fresh intent/evaluation lifecycle
evidence must be collected before presenting it as a protected-account proof.

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

## Execution-receipt anchor

No external target-chain transaction was executed during this run, so `record_execution_receipt` was not called and no target transaction hash is claimed. This is an explicit remaining live-evidence limitation; the contract's receipt-binding path remains covered by Direct Mode tests.

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

## Operator diagnostics

- Malformed wrapper invocations that passed pseudo-type tokens (`str`, `int`) or split JSON were rejected by the contract and are not successful lifecycle evidence.
- The successful live writes above used direct local CLI invocation with exact calldata and were independently read back from finalized state.
