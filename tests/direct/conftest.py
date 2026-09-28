"""Direct-mode configuration for INTENT.

The GenLayer direct runner defaults to chain id 1. INTENT intentionally refuses to
run anywhere except Studionet, so all positive-path tests explicitly execute with
contract-visible chain id 61999.
"""

import pytest

STUDIONET_CHAIN_ID = 61999


@pytest.fixture(autouse=True)
def intent_studionet_chain(direct_vm):
    direct_vm._chain_id = STUDIONET_CHAIN_ID
    return direct_vm


def as_hex(address) -> str:
    if hasattr(address, "as_hex"):
        return address.as_hex
    from genlayer.py.types import Address
    return Address(address).as_hex
