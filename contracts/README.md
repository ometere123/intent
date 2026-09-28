# Intelligent Contract

`intent_guard.py` is deliberately a single-contract deployment.

## Studionet only

The constructor and every write path reject any chain other than 61999.

```bash
genlayer network set studionet
genlayer network info
genlayer deploy --contract contracts/intent_guard.py
```

## Public write methods

- `create_intent(intent_id, statement, scope_json, hard_rules_json, expires_at_unix)`
- `revise_intent(intent_id, statement, scope_json, hard_rules_json, expires_at_unix)`
- `revoke_intent(intent_id)`
- `evaluate(intent_id, revision, action_id, action_json, decoded_summary, deterministic_checks_json)`
- `record_execution_receipt(action_id, target_chain_id, target_tx_hash)` (a submission/anchor record, not independent target-chain execution proof)

`hard_rules_json` is stored in the immutable revision and enforced by the
contract before semantic adjudication. An integration may add stricter local
checks, but cannot weaken the on-chain policy.

## Public views

- `get_network()`
- `get_latest_revision(owner, intent_id)`
- `get_intent(owner, intent_id, revision)`
- `is_revoked(owner, intent_id)`
- `get_decision(owner, action_id)`
- `get_execution_receipt(owner, action_id)`
- `get_revocation(owner, intent_id)`
- `get_owner_counts(owner)`
- `list_intent_ids_page(owner, offset, limit)`
- `list_action_ids_page(owner, offset, limit)`
- `list_my_intent_ids_page(offset, limit)`
- `list_my_action_ids_page(offset, limit)`
