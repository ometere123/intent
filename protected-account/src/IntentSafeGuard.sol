// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {BaseGuard} from "safe-smart-account/base/GuardManager.sol";
import {Enum} from "safe-smart-account/common/Enum.sol";

interface IIntentAuthorizationRegistry {
    function isAuthorized(bytes32 actionHash) external view returns (bool);
    function consume(bytes32 actionHash) external;
}

interface ISafeLike {
    function nonce() external view returns (uint256);
    function getTransactionHash(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        uint256 nonce
    ) external view returns (bytes32);
}

/// @notice Safe Guard enforcing an exact one-time registry authorization.
/// @dev The Safe must not enable unprotected modules. Guard checks do not secure
/// arbitrary module execution paths; deployments must keep the Safe module set empty.
contract IntentSafeGuard is BaseGuard {
    struct SafeTx {
        address to;
        uint256 value;
        bytes data;
        Enum.Operation operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
    }
    uint256 public constant TARGET_CHAIN_ID = 11155111;
    uint256 public constant REMOVAL_DELAY = 7 days;
    IIntentAuthorizationRegistry public immutable registry;
    address public immutable safe;
    uint256 public removalRequestedAt;
    mapping(bytes32 => bool) public recoveryTransaction;
    bytes4 private constant SET_GUARD = bytes4(keccak256("setGuard(address)"));
    bytes4 private constant ENABLE_MODULE = bytes4(keccak256("enableModule(address)"));
    bytes4 private constant DISABLE_MODULE = bytes4(keccak256("disableModule(address,address)"));
    bytes4 private constant SET_MODULE_GUARD = bytes4(keccak256("setModuleGuard(address)"));
    bytes4 private constant SET_FALLBACK_HANDLER = bytes4(keccak256("setFallbackHandler(address)"));
    bytes4 private constant REQUEST_REMOVAL = bytes4(keccak256("requestProtectionRemoval()"));
    bytes4 private constant CANCEL_REMOVAL = bytes4(keccak256("cancelProtectionRemoval()"));

    constructor(address safeAddress, address registryAddress) {
        require(safeAddress != address(0) && registryAddress != address(0), "zero address");
        safe = safeAddress;
        registry = IIntentAuthorizationRegistry(registryAddress);
    }

    function actionHash(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        uint256 safeNonce
    ) public view returns (bytes32) {
        return _safeTxHash(to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, safeNonce);
    }

    function requestProtectionRemoval() external {
        require(msg.sender == safe, "only Safe");
        removalRequestedAt = block.timestamp;
    }

    function cancelProtectionRemoval() external {
        require(msg.sender == safe, "only Safe");
        removalRequestedAt = 0;
    }

    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory,
        address
    ) external override {
        require(msg.sender == safe, "only Safe");
        SafeTx memory txData = SafeTx(to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver);
        _checkTransaction(txData);
    }

    function _checkTransaction(SafeTx memory txData) private {
        require(txData.operation == Enum.Operation.Call, "delegatecall blocked");
        bytes4 selector;
        assembly ("memory-safe") { selector := mload(add(mload(add(txData, 64)), 32)) }
        require(selector != ENABLE_MODULE && selector != DISABLE_MODULE && selector != SET_MODULE_GUARD && selector != SET_FALLBACK_HANDLER, "security config blocked");
        bool delayedRemoval = txData.to == safe && selector == SET_GUARD;
        if (delayedRemoval) {
            address replacement;
            assembly ("memory-safe") { replacement := shr(96, mload(add(mload(add(txData, 64)), 36))) }
            require(replacement == address(0) && removalRequestedAt != 0 && block.timestamp >= removalRequestedAt + REMOVAL_DELAY, "protected guard");
        }
        bool recoveryCall = txData.to == address(this) && (selector == REQUEST_REMOVAL || selector == CANCEL_REMOVAL);
        if (recoveryCall || delayedRemoval) {
            uint256 recoveryNonce = ISafeLike(safe).nonce();
            require(recoveryNonce > 0, "invalid Safe nonce");
            recoveryTransaction[_safeTxHashFromStruct(txData, recoveryNonce - 1)] = true;
            return;
        }
        uint256 currentNonce = ISafeLike(safe).nonce();
        require(currentNonce > 0, "invalid Safe nonce");
        bytes32 hash = _safeTxHash(txData.to, txData.value, txData.data, txData.operation, txData.safeTxGas, txData.baseGas, txData.gasPrice, txData.gasToken, txData.refundReceiver, currentNonce - 1);
        require(registry.isAuthorized(hash), "INTENT authorization required");
    }

    function checkAfterExecution(bytes32 txHash, bool) external override {
        require(msg.sender == safe, "only Safe");
        if (recoveryTransaction[txHash]) {
            delete recoveryTransaction[txHash];
            return;
        }
        registry.consume(txHash);
    }

    function _safeTxHash(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        uint256 nonce
    ) private view returns (bytes32) {
        return ISafeLike(safe).getTransactionHash(
            to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce
        );
    }

    function _safeTxHashFromStruct(SafeTx memory txData, uint256 nonce) private view returns (bytes32) {
        return _safeTxHash(
            txData.to, txData.value, txData.data, txData.operation, txData.safeTxGas,
            txData.baseGas, txData.gasPrice, txData.gasToken, txData.refundReceiver, nonce
        );
    }
}
