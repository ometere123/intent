"""Deterministic intent lifecycle tests for contracts/intent_guard.py."""

import json

from tests.direct.conftest import as_hex

CONTRACT = "contracts/intent_guard.py"


def deploy(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    return direct_deploy(CONTRACT)


def test_deploys_only_with_studionet_context(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm._chain_id = 1
    with direct_vm.expect_revert("INTENT deploys only on GenLayer Studionet chain 61999"):
        direct_deploy(CONTRACT)


def test_network_identity(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    network = contract.get_network()
    assert network["chain_id"] == 61999
    assert network["name"] == "GenLayer Studionet"


def test_create_intent_and_read_revision(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    owner = as_hex(direct_alice)
    contract.create_intent(
        "cloud-pro",
        "Purchase one annual cloud plan and never grant unlimited token approval.",
        '{"purpose":"cloud subscription","max_amount":"200"}',
        "{}",
        0,
    )
    assert int(contract.get_latest_revision(owner, "cloud-pro")) == 1
    record = json.loads(contract.get_intent(owner, "cloud-pro", 1))
    assert record["intent_id"] == "cloud-pro"
    assert record["revision"] == 1
    assert record["scope"]["max_amount"] == "200"
    assert contract.is_revoked(owner, "cloud-pro") is False


def test_hard_rules_are_frozen_on_chain(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    owner = as_hex(direct_alice)
    contract.create_intent(
        "bounded-cloud",
        "Purchase one annual cloud plan only from the declared target without unrelated authority.",
        "{}",
        '{"allowedTargetChainIds":[8453],"forbidUnlimitedApprovals":true,"maxNativeValueWei":"10"}',
        0,
    )
    record = json.loads(contract.get_intent(owner, "bounded-cloud", 1))
    assert record["hard_rules"]["allowedTargetChainIds"] == [8453]
    assert record["hard_rules"]["forbidUnlimitedApprovals"] is True
    assert record["hard_rules"]["maxNativeValueWei"] == "10"


def test_duplicate_intent_id_reverts(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    statement = "Purchase one annual cloud plan and never grant unlimited token approval."
    contract.create_intent("cloud-pro", statement, "{}", "{}", 0)
    with direct_vm.expect_revert("intent_id already exists for this owner"):
        contract.create_intent("cloud-pro", statement, "{}", "{}", 0)


def test_revision_is_immutable_and_latest_advances(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    owner = as_hex(direct_alice)
    v1 = "Purchase one annual cloud plan with a maximum declared price of 200 USDC."
    v2 = "Purchase one annual cloud plan with a maximum declared price of 150 USDC."
    contract.create_intent("cloud-pro", v1, '{"max":"200"}', "{}", 0)
    contract.revise_intent("cloud-pro", v2, '{"max":"150"}', "{}", 0)
    assert int(contract.get_latest_revision(owner, "cloud-pro")) == 2
    assert json.loads(contract.get_intent(owner, "cloud-pro", 1))["statement"] == v1
    assert json.loads(contract.get_intent(owner, "cloud-pro", 2))["statement"] == v2


def test_owner_namespaces_are_independent(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    statement = "Purchase one annual cloud plan with no unrelated authority or recurring approval."
    direct_vm.sender = direct_alice
    contract.create_intent("shared-name", statement, '{"owner":"alice"}', "{}", 0)
    direct_vm.sender = direct_bob
    contract.create_intent("shared-name", statement, '{"owner":"bob"}', "{}", 0)
    assert int(contract.get_latest_revision(as_hex(direct_alice), "shared-name")) == 1
    assert int(contract.get_latest_revision(as_hex(direct_bob), "shared-name")) == 1


def test_revoke_blocks_future_revision(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    statement = "Purchase one annual cloud plan with no unrelated authority or recurring approval."
    contract.create_intent("cloud-pro", statement, "{}", "{}", 0)
    contract.revoke_intent("cloud-pro")
    assert contract.is_revoked(as_hex(direct_alice), "cloud-pro") is True
    with direct_vm.expect_revert("revoked intent cannot be revised"):
        contract.revise_intent("cloud-pro", statement + " Revised.", "{}", "{}", 0)


def test_write_refuses_wrong_chain_after_deploy(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm._chain_id = 1
    with direct_vm.expect_revert("wrong network: INTENT requires chain 61999"):
        contract.create_intent(
            "cloud-pro",
            "Purchase one annual cloud plan with no unrelated authority or recurring approval.",
            "{}",
            "{}",
            0,
        )


def test_intent_id_rejects_key_separator_characters(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("intent_id may contain only"):
        contract.create_intent(
            "bad|id",
            "Purchase one annual cloud plan with no unrelated authority or recurring approval.",
            "{}",
            "{}",
            0,
        )


def test_revocation_has_audit_record(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    owner = as_hex(direct_alice)
    contract.create_intent(
        "cloud-pro",
        "Purchase one annual cloud plan with no unrelated authority or recurring approval.",
        "{}",
        "{}",
        0,
    )
    contract.revoke_intent("cloud-pro")
    record = json.loads(contract.get_revocation(owner, "cloud-pro"))
    assert record["owner"].lower() == owner.lower()
    assert record["intent_id"] == "cloud-pro"
    assert record["revoked_at"]


def test_owner_pagination_and_counts(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_alice)
    owner = as_hex(direct_alice)
    statement = "Purchase one annual cloud plan with no unrelated authority or recurring approval."
    for suffix in ["a", "b", "c"]:
        contract.create_intent(f"cloud-{suffix}", statement, "{}", "{}", 0)
    counts = contract.get_owner_counts(owner)
    assert counts["intent_count"] == 3
    assert contract.list_intent_ids_page(owner, 0, 2) == ["cloud-a", "cloud-b"]
    assert contract.list_intent_ids_page(owner, 2, 2) == ["cloud-c"]
