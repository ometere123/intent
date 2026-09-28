# INTENT live demo

Use a low-value test wallet and inexpensive target-chain actions. Do not use meaningful funds for reviewer evidence.

## 1. Prove deterministic blocking

Create a mandate that forbids unlimited ERC-20 approvals.

Submit a standard `approve(spender, uint256.max)` request through the guarded provider.

Require:

- local `BLOCK`;
- zero GenLayer adjudication transaction;
- zero target `eth_sendTransaction`.

## 2. Prove a semantic match

Create an immutable mandate such as:

> Purchase one annual Pro subscription from ExampleCloud for no more than 200 USDC. Do not create recurring authority, unlimited approval or any unrelated transfer.

Submit a bounded transaction whose custom call cannot be completely established by deterministic rules but has sufficient evidence for validators.

Require actual finalized GenLayer evidence of:

- latest intent revision used;
- exact lowercase SHA-256 action ID;
- `MATCHES_INTENT`;
- successful GenVM execution;
- target chain restored;
- exact captured request forwarded once;
- target transaction hash returned.

## 3. Prove denial

Submit a clearly unrelated transfer under the same mandate.

Require:

- `DOES_NOT_MATCH`;
- target chain restored;
- target transaction not sent.

## 4. Prove uncertainty fails closed

Submit a deliberately under-specified custom call where the supplied evidence cannot establish that it is the authorised purchase.

Require:

- `UNCLEAR`;
- target chain restored;
- no target transaction.

Do not manipulate the prompt merely to manufacture this outcome.

## 5. Prove immutable revision semantics

Create revision 2.

Require:

- revision 1 remains readable;
- revision 1 cannot authorise a new action;
- new decisions bind revision 2.

## 6. Prove revocation

Revoke the family.

Require:

- revocation audit record exists;
- future evaluation reverts;
- historical revisions/decisions remain readable.

## 7. Prove replay resistance

For one adjudicated action:

- retry the same action ID;
- retry an uppercase/lowercase variant.

Require a duplicate/replay rejection rather than a second independent permission.

## 8. Prove execution-receipt binding

For a successful target transaction, anchor its real transaction hash.

Require:

- one receipt only;
- receipt target chain equals the chain stored in the adjudicated canonical action;
- wrong-chain receipt fails.

## 9. Prove mutation resistance

Using a controlled test harness, mutate each after adjudication but before forward:

- selected account;
- target chain;
- `to`;
- calldata;
- value;
- gas/fee/nonce field.

Each must abort before a target send.

## 10. Prove concurrent safety

Launch two guarded sends against the same underlying injected provider.

Require serialised adjudication/network switching and no cross-request chain/account contamination.

## Evidence

Record every real GenLayer and target-chain transaction, finality result, fee measurement, contract address and source commit in `LIVE_EVIDENCE.md`.
