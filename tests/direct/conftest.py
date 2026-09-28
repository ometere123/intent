"""Direct-mode configuration for INTENT.

The GenLayer direct runner defaults to chain id 1. INTENT intentionally refuses to
run anywhere except Studionet, so all positive-path tests explicitly execute with
contract-visible chain id 61999.
"""

import pytest


@pytest.fixture(autouse=True)
def pin_stable_genvm_runner(monkeypatch):
    """Keep Direct Mode on INTENT's explicitly supported stable GenVM."""
    from gltest.direct import sdk_loader

    original = sdk_loader.setup_sdk_paths

    def setup_stable_sdk_paths(contract_path=None, version=None):
        return original(contract_path, "v0.2.12")

    monkeypatch.setattr(sdk_loader, "setup_sdk_paths", setup_stable_sdk_paths)


@pytest.fixture(autouse=True)
def refresh_chain_id_in_sdk_message(monkeypatch):
    """Keep gl.message.chain_id in sync with v0.29 VMContext test mutations."""
    from gltest.direct.vm import VMContext

    original_setattr = VMContext.__setattr__

    def set_attr(self, name, value):
        original_setattr(self, name, value)
        if name == "_chain_id":
            self._refresh_gl_message()

    monkeypatch.setattr(VMContext, "__setattr__", set_attr)

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
