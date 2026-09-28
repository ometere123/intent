# INTENT demo script

## Demo A — deterministic block

Mandate:

> Purchase one annual Pro subscription from ExampleCloud for no more than 200 USDC. Never grant an unlimited token approval.

Propose an ERC-20 `approve(spender, uint256.max)` transaction.

Expected behavior:

1. wallet guard detects selector `0x095ea7b3`;
2. decodes the amount as `2^256 - 1`;
3. returns local `BLOCK`;
4. no GenLayer transaction is created;
5. target transaction is never sent.

This demonstrates that INTENT does not waste consensus on deterministic rules.

## Demo B — semantic judgement

Propose a transaction that calls an unfamiliar subscription contract with a bounded payment and non-obvious calldata.

Expected behavior:

1. deterministic checks pass but cannot prove the semantic mandate;
2. guard creates a canonical action and action ID;
3. wallet switches to GenLayer Studionet 61999;
4. `IntentGuard.evaluate` is submitted;
5. validators return one of the three outcomes;
6. on `MATCHES_INTENT`, wallet returns to the target chain;
7. guard verifies account, chain and action are unchanged;
8. original target transaction is forwarded.

## Demo C — mutation after judgement

After a favourable decision, mutate one target field in a test harness before the final forwarding step.

Expected behavior:

- recomputed canonical action differs;
- guard throws `INTENT_ACTION_CHANGED`;
- target transaction is not sent.

## Demo D — version integrity

1. create revision 1;
2. adjudicate an action;
3. revise the mandate;
4. inspect the old decision.

Expected behavior:

- old decision remains bound to revision 1;
- revision 1 remains readable for history but cannot authorise a new action;
- new evaluations must use the latest revision 2;
- historical meaning is not rewritten.
