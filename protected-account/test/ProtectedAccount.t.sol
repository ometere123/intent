// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IntentAuthorizationRegistry} from "../src/IntentAuthorizationRegistry.sol";
import {IntentSafeGuard} from "../src/IntentSafeGuard.sol";
import {Safe} from "safe-smart-account/Safe.sol";
import {SafeProxyFactory} from "safe-smart-account/proxies/SafeProxyFactory.sol";
import {Enum} from "safe-smart-account/common/Enum.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function chainId(uint256 newChainId) external;
    function warp(uint256 timestamp) external;
}

Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

contract Target {
    uint256 public calls;
    function ping() external { calls += 1; }
    function fail() external pure { revert("target failure"); }
}

contract ProtectedAccountTest {
    function _ownerSignature() internal view returns (bytes memory) {
        return abi.encodePacked(bytes32(uint256(uint160(address(this)))), bytes32(0), uint8(1));
    }

    function _certificate(address safe, bytes32 actionHash, uint256 validUntil) internal view returns (IntentAuthorizationRegistry.Certificate memory c) {
        c.protocolVersion = "1";
        c.genLayerChainId = 61999;
        c.genLayerIntent = address(0x1234);
        c.decisionRef = keccak256("decision");
        c.targetChainId = 11155111;
        c.safe = safe;
        c.actionHash = actionHash;
        c.intentIdHash = keccak256("intent");
        c.intentRevision = 1;
        c.safeNonce = 1;
        c.authorizationNonce = 1;
        c.validAfter = block.timestamp;
        c.validUntil = validUntil;
        c.outcome = keccak256("MATCHES_INTENT");
    }

    function _setup() internal returns (Safe safe, IntentAuthorizationRegistry registry, IntentSafeGuard guard) {
        vm.chainId(11155111);
        Safe singleton = new Safe();
        SafeProxyFactory factory = new SafeProxyFactory();
        address[] memory owners = new address[](1);
        owners[0] = address(this);
        bytes memory initializer = abi.encodeWithSelector(
            Safe.setup.selector, owners, 1, address(0), "", address(0), address(0), 0, payable(address(0))
        );
        safe = Safe(payable(address(factory.createProxyWithNonce(address(singleton), initializer, 1))));

        address[] memory attestors = new address[](1);
        attestors[0] = vm.addr(1);
        registry = new IntentAuthorizationRegistry(address(0x1234), attestors, 1);
        guard = new IntentSafeGuard(address(safe), address(registry));
        registry.registerGuard(address(safe), address(guard));

        bytes memory setGuard = abi.encodeWithSelector(safe.setGuard.selector, address(guard));
        safe.execTransaction(address(safe), 0, setGuard, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature());
    }

    function _admit(IntentAuthorizationRegistry registry, IntentAuthorizationRegistry.Certificate memory c) internal {
        bytes32 digest = registry.certificateDigest(c);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, digest);
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = abi.encodePacked(r, s, v);
        registry.admit(c, signatures);
    }

    function testOfficialSafeInstallsGuardAndUsesOfficialInterface() external {
        (Safe safe,, IntentSafeGuard guard) = _setup();
        require(guard.supportsInterface(0xe6d7a83a), "Guard interface");
        require(guard.supportsInterface(0x01ffc9a7), "ERC165");
        require(address(safe) != address(0), "Safe deployed");
    }

    function testOfficialSafeExecutesExactAuthorizedTransactionAndConsumes() external {
        (Safe safe, IntentAuthorizationRegistry registry,) = _setup();
        Target target = new Target();
        bytes memory data = abi.encodeWithSelector(Target.ping.selector);
        bytes32 txHash = safe.getTransactionHash(address(target), 0, data, Enum.Operation.Call, 0, 0, 0, address(0), address(0), 1);
        _admit(registry, _certificate(address(safe), txHash, block.timestamp + 1 days));
        require(registry.isAuthorized(txHash), "admitted");

        safe.execTransaction(address(target), 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature());
        require(target.calls() == 1, "target executed");
        require(!registry.isAuthorized(txHash), "authorization consumed");
    }

    function testGuardHashMatchesOfficialSafeHash() external {
        (Safe safe,, IntentSafeGuard guard) = _setup();
        bytes32 hash = safe.getTransactionHash(
            address(0x0000000000000000000000000000000000000002), 7, hex"1234", Enum.Operation.Call,
            100, 20, 3, address(0), address(0x0000000000000000000000000000000000000003), 1
        );
        require(guard.actionHash(
            address(0x0000000000000000000000000000000000000002), 7, hex"1234", Enum.Operation.Call,
            100, 20, 3, address(0), payable(address(0x0000000000000000000000000000000000000003)), 1
        ) == hash, "Safe hash parity");
    }

    function testNoAuthorizationAndMutationAreRejected() external {
        (Safe safe, IntentAuthorizationRegistry registry,) = _setup();
        Target target = new Target();
        bytes memory data = abi.encodeWithSelector(Target.ping.selector);
        (bool noAuth,) = address(safe).call(abi.encodeWithSelector(
            Safe.execTransaction.selector, address(target), 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature()
        ));
        require(!noAuth, "unauthorized transaction passed");

        bytes32 txHash = safe.getTransactionHash(address(target), 0, data, Enum.Operation.Call, 0, 0, 0, address(0), address(0), 1);
        _admit(registry, _certificate(address(safe), txHash, block.timestamp + 1 days));
        (bool mutated,) = address(safe).call(abi.encodeWithSelector(
            Safe.execTransaction.selector, address(0xBEEF), 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature()
        ));
        require(!mutated, "recipient mutation passed");

        Target gasTarget = new Target();
        bytes memory gasData = abi.encodeWithSelector(Target.ping.selector);
        bytes32 gasBoundHash = safe.getTransactionHash(address(gasTarget), 0, gasData, Enum.Operation.Call, 0, 0, 1, address(0), address(0), 1);
        IntentAuthorizationRegistry.Certificate memory gasCertificate = _certificate(address(safe), gasBoundHash, block.timestamp + 1 days);
        gasCertificate.authorizationNonce = 2;
        _admit(registry, gasCertificate);
        (bool gasMutated,) = address(safe).call(abi.encodeWithSelector(
            Safe.execTransaction.selector, address(gasTarget), 0, gasData, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature()
        ));
        require(!gasMutated, "gas/refund mutation passed");
    }

    function testAdmittedAuthorizationExpires() external {
        (Safe safe, IntentAuthorizationRegistry registry,) = _setup();
        Target target = new Target();
        bytes memory data = abi.encodeWithSelector(Target.ping.selector);
        bytes32 txHash = safe.getTransactionHash(address(target), 0, data, Enum.Operation.Call, 0, 0, 0, address(0), address(0), 1);
        _admit(registry, _certificate(address(safe), txHash, block.timestamp + 1));
        vm.warp(block.timestamp + 2);
        require(!registry.isAuthorized(txHash), "expired authorization active");
    }

    function testInnerFailureStillConsumesSafeNonceAuthorization() external {
        (Safe safe, IntentAuthorizationRegistry registry,) = _setup();
        Target target = new Target();
        bytes memory data = abi.encodeWithSelector(Target.fail.selector);
        bytes32 txHash = safe.getTransactionHash(address(target), 0, data, Enum.Operation.Call, 100000, 0, 0, address(0), address(0), 1);
        _admit(registry, _certificate(address(safe), txHash, block.timestamp + 1 days));
        bool success = safe.execTransaction(address(target), 0, data, Enum.Operation.Call, 100000, 0, 0, address(0), payable(0), _ownerSignature());
        require(!success, "failing inner call unexpectedly succeeded");
        require(!registry.isAuthorized(txHash), "failed Safe nonce remained authorized");
    }

    function testDelegateCallIsRejectedByGuard() external {
        (Safe safe,,) = _setup();
        Target target = new Target();
        (bool ok,) = address(safe).call(abi.encodeWithSelector(
            Safe.execTransaction.selector, address(target), 0, "", Enum.Operation.DelegateCall, 0, 0, 0, address(0), payable(0), _ownerSignature()
        ));
        require(!ok, "delegatecall bypass");
    }

    function testGuardRemovalRequiresDelayAndUsesRealSafeCalls() external {
        (Safe safe,, IntentSafeGuard guard) = _setup();
        bytes memory request = abi.encodeWithSelector(guard.requestProtectionRemoval.selector);
        safe.execTransaction(address(guard), 0, request, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature());
        require(guard.removalRequestedAt() != 0, "removal request missing");

        bytes memory remove = abi.encodeWithSelector(safe.setGuard.selector, address(0));
        (bool early,) = address(safe).call(abi.encodeWithSelector(
            Safe.execTransaction.selector, address(safe), 0, remove, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature()
        ));
        require(!early, "early guard removal passed");

        bytes memory cancel = abi.encodeWithSelector(guard.cancelProtectionRemoval.selector);
        safe.execTransaction(address(guard), 0, cancel, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature());
        require(guard.removalRequestedAt() == 0, "cancel failed");

        safe.execTransaction(address(guard), 0, request, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature());
        vm.warp(block.timestamp + guard.REMOVAL_DELAY() + 1);
        safe.execTransaction(address(safe), 0, remove, Enum.Operation.Call, 0, 0, 0, address(0), payable(0), _ownerSignature());
    }
}
