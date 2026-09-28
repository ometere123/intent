"""Consensus-bound evaluation and receipt tests for INTENT."""

import json
import hashlib

from tests.direct.conftest import as_hex

CONTRACT = "contracts/intent_guard.py"
ACTION_OBJECT = {
    "targetChainId": 8453,
    "from": "0x" + "1" * 40,
    "to": "0x" + "2" * 40,
    "valueWei": "0",
    "data": "0xabcdef01",
    "selector": "0xabcdef01",
}
ACTION_JSON = json.dumps(ACTION_OBJECT)
ACTION_ID = hashlib.sha256(json.dumps(ACTION_OBJECT, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
CHECKS_JSON = json.dumps({"semanticJudgement": "required", "targetChainId": 8453})


def setup(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    contract.create_intent(
        "cloud-pro",
        "Purchase one annual cloud subscription within the declared budget and no unrelated transfer.",
        '{"purpose":"cloud subscription","max_amount":"200"}',
        "{}",
        0,
    )
    return contract


def mock_decision(direct_vm, outcome="MATCHES_INTENT", reason="within_mandate"):
    direct_vm.mock_llm(
        r"(?s).*",
        json.dumps({
            "outcome": outcome,
            "reason_code": reason,
            "rationale": "The supplied action is classified against the exact mandate.",
        }),
    )


def test_matching_decision_is_bound_to_exact_revision_and_action(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm)
    contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Custom call to configured cloud merchant.", CHECKS_JSON)
    decision = json.loads(contract.get_decision(as_hex(direct_alice), ACTION_ID))
    assert decision["outcome"] == "MATCHES_INTENT"
    assert decision["intent_revision"] == 1
    assert decision["action_id"] == ACTION_ID
    assert decision["action"]["targetChainId"] == 8453


def test_duplicate_action_id_cannot_be_re_adjudicated(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm)
    contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)
    with direct_vm.expect_revert("action_id already adjudicated for this owner"):
        contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Changed description.", CHECKS_JSON)


def test_revoked_family_cannot_be_evaluated(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    contract.revoke_intent("cloud-pro")
    mock_decision(direct_vm)
    with direct_vm.expect_revert("intent is revoked"):
        contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)


def test_receipt_only_for_positive_decision(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm, "DOES_NOT_MATCH", "mandate_conflict")
    contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Unrelated transfer.", CHECKS_JSON)
    with direct_vm.expect_revert("only matching decisions may receive execution receipts"):
        contract.record_execution_receipt(ACTION_ID, 8453, "0x" + "9" * 64)


def test_on_chain_hard_rule_cannot_be_weakened_by_evaluation_input(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    contract.create_intent(
        "bounded-cloud",
        "Purchase one annual cloud subscription with no unrelated transfer or excess value.",
        "{}",
        '{"maxNativeValueWei":"1"}',
        0,
    )
    mock_decision(direct_vm)
    action = json.loads(ACTION_JSON)
    action["valueWei"] = "2"
    changed = json.dumps(action)
    changed_id = hashlib.sha256(json.dumps(action, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
    with direct_vm.expect_revert("action violates the on-chain hard-rule policy"):
        contract.evaluate("bounded-cloud", 1, changed_id, changed, "Cloud purchase.", CHECKS_JSON)


def test_positive_decision_accepts_single_execution_receipt(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm)
    contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)
    target_hash = "0x" + "9" * 64
    contract.record_execution_receipt(ACTION_ID, 8453, target_hash)
    receipt = json.loads(contract.get_execution_receipt(as_hex(direct_alice), ACTION_ID))
    assert receipt["target_chain_id"] == 8453
    assert receipt["target_tx_hash"] == target_hash
    with direct_vm.expect_revert("execution receipt already recorded"):
        contract.record_execution_receipt(ACTION_ID, 8453, target_hash)


def test_old_revision_cannot_authorize_new_action(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    contract.revise_intent(
        "cloud-pro",
        "Purchase one annual cloud subscription up to 150 USDC and no unrelated transfer.",
        '{"purpose":"cloud subscription","max_amount":"150"}',
        "{}",
        0,
    )
    mock_decision(direct_vm)
    with direct_vm.expect_revert("only the latest intent revision may authorize a new action"):
        contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)


def test_action_id_must_match_canonical_action_json(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm)
    with direct_vm.expect_revert("action_id does not match canonical action_json"):
        contract.evaluate("cloud-pro", 1, "f" * 64, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)


def test_execution_receipt_chain_must_match_adjudicated_action(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm)
    contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)
    with direct_vm.expect_revert("execution receipt chain does not match the adjudicated action"):
        contract.record_execution_receipt(ACTION_ID, 1, "0x" + "9" * 64)


def test_action_id_case_cannot_create_duplicate_decision_key(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    mock_decision(direct_vm, "MATCHES_INTENT", "within_mandate")
    contract.evaluate("cloud-pro", 1, ACTION_ID.upper(), ACTION_JSON, "Cloud purchase.", CHECKS_JSON)
    with direct_vm.expect_revert("action_id already adjudicated for this owner"):
        contract.evaluate("cloud-pro", 1, ACTION_ID.lower(), ACTION_JSON, "Cloud purchase.", CHECKS_JSON)
    decision = json.loads(contract.get_decision(as_hex(direct_alice), ACTION_ID.lower()))
    assert decision["action_id"] == ACTION_ID.lower()
    assert decision["consensus_fields"] == ["outcome", "reason_code"]
    assert decision["rationale_is_consensus_field"] is False


def test_intent_expires_at_the_exact_declared_second(direct_vm, direct_deploy, direct_alice):
    from datetime import datetime, timezone

    direct_vm.warp("2026-01-01T00:00:00Z")
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    expires = int(datetime(2026, 1, 1, 0, 1, 0, tzinfo=timezone.utc).timestamp())
    contract.create_intent(
        "expiring-cloud",
        "Purchase one annual cloud subscription within the declared budget and no unrelated transfer.",
        '{"purpose":"cloud subscription"}',
        "{}",
        expires,
    )
    direct_vm.warp("2026-01-01T00:01:00Z")
    mock_decision(direct_vm)
    with direct_vm.expect_revert("intent revision is expired"):
        contract.evaluate("expiring-cloud", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)

def test_malformed_validator_output_collapses_to_unclear(direct_vm, direct_deploy, direct_alice):
    contract = setup(direct_vm, direct_deploy, direct_alice)
    direct_vm.mock_llm(r"(?s).*", "not-json")
    contract.evaluate("cloud-pro", 1, ACTION_ID, ACTION_JSON, "Cloud purchase.", CHECKS_JSON)
    decision = json.loads(contract.get_decision(as_hex(direct_alice), ACTION_ID))
    assert decision["outcome"] == "UNCLEAR"
    assert decision["reason_code"] == "insufficient_evidence"
