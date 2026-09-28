// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IntentAuthorizationRegistry} from "../src/IntentAuthorizationRegistry.sol";
import {IntentSafeGuard} from "../src/IntentSafeGuard.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function chainId(uint256 newChainId) external;
}

Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

contract FakeSafe {
    uint256 public currentNonce;
    function nonce() external view returns (uint256) { return currentNonce; }
    function setNonce(uint256 value) external { currentNonce = value; }
    function readHash(IntentSafeGuard guard, address to, uint256 value, bytes calldata data, uint8 operation) external view returns (bytes32) {
        return guard.actionHash(to, value, data, operation, currentNonce);
    }
}

contract ProtectedAccountTest {
    function _certificate(address safe) internal view returns (IntentAuthorizationRegistry.Certificate memory c) {
        c.protocolVersion = "1";
        c.genLayerChainId = 61999;
        c.genLayerIntent = address(0x1234);
        c.decisionRef = keccak256("decision");
        c.targetChainId = 11155111;
        c.safe = safe;
        c.actionHash = keccak256("action");
        c.intentIdHash = keccak256("intent");
        c.intentRevision = 1;
        c.safeNonce = 0;
        c.authorizationNonce = 1;
        c.validAfter = block.timestamp;
        c.validUntil = block.timestamp + 1 days;
        c.outcome = keccak256("MATCHES_INTENT");
    }

    function testRegistryStartsWithThreshold() external {
        address[] memory attestors = new address[](1);
        attestors[0] = address(this);
        IntentAuthorizationRegistry registry = new IntentAuthorizationRegistry(attestors, 1);
        require(registry.threshold() == 1, "threshold");
        require(registry.isAttestor(address(this)), "attestor");
        registry.setConsumer(address(this), true);
        require(registry.isConsumer(address(this)), "consumer");
    }

    function testActionHashBindsEveryExecutionField() external {
        FakeSafe safe = new FakeSafe();
        IntentSafeGuard guard = new IntentSafeGuard(address(safe), address(this));
        bytes memory data = hex"1234";
        bytes32 first = safe.readHash(guard, address(1), 0, data, 0);
        bytes32 changedRecipient = safe.readHash(guard, address(2), 0, data, 0);
        bytes32 changedValue = safe.readHash(guard, address(1), 1, data, 0);
        require(first != changedRecipient && first != changedValue, "binding");
    }

    function testThresholdAttestationAdmitsOnceAndConsumes() external {
        vm.chainId(11155111);
        address first = vm.addr(1);
        address second = vm.addr(2);
        address[] memory attestors = new address[](2);
        attestors[0] = first;
        attestors[1] = second;
        IntentAuthorizationRegistry registry = new IntentAuthorizationRegistry(attestors, 2);
        IntentAuthorizationRegistry.Certificate memory c = _certificate(address(0xBEEF));
        bytes32 digest = registry.certificateDigest(c);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(1, digest);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(2, digest);
        bytes[] memory signatures = new bytes[](2);
        if (first < second) {
            signatures[0] = abi.encodePacked(r1, s1, v1);
            signatures[1] = abi.encodePacked(r2, s2, v2);
        } else {
            signatures[0] = abi.encodePacked(r2, s2, v2);
            signatures[1] = abi.encodePacked(r1, s1, v1);
        }
        registry.admit(c, signatures);
        require(registry.isAuthorized(c.actionHash), "authorized");
        registry.setConsumer(address(this), true);
        registry.consume(c.actionHash);
        require(!registry.isAuthorized(c.actionHash), "consumed");
    }
}
