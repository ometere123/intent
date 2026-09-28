// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIntentAuthorizationRegistry {
    function isAuthorized(bytes32 actionHash) external view returns (bool);
    function consume(bytes32 actionHash) external;
}

interface ISafeLike {
    function nonce() external view returns (uint256);
}

/// @notice Safe Guard enforcing an exact one-time registry authorization.
/// @dev The Safe must not enable unprotected modules. Guard checks do not secure
/// arbitrary module execution paths; deployments must keep the Safe module set empty.
contract IntentSafeGuard {
    uint256 public constant TARGET_CHAIN_ID = 11155111;
    uint256 public constant REMOVAL_DELAY = 7 days;
    IIntentAuthorizationRegistry public immutable registry;
    address public immutable safe;
    uint256 public removalRequestedAt;
    bytes32 private pendingActionHash;

    bytes4 private constant SET_GUARD = bytes4(keccak256("setGuard(address)"));
    bytes4 private constant REQUEST_REMOVAL = bytes4(keccak256("requestProtectionRemoval()"));
    bytes4 private constant CANCEL_REMOVAL = bytes4(keccak256("cancelProtectionRemoval()"));

    constructor(address safeAddress, address registryAddress) {
        require(safeAddress != address(0) && registryAddress != address(0), "zero address");
        safe = safeAddress;
        registry = IIntentAuthorizationRegistry(registryAddress);
    }

    function actionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeNonce) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, safe, safeNonce, to, value, keccak256(data), operation));
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
        address to, uint256 value, bytes calldata data, uint8 operation,
        uint256, uint256, uint256, address, address payable, bytes calldata
    ) external {
        require(msg.sender == safe, "only Safe");
        if (to == safe && data.length >= 4 && bytes4(data[:4]) == SET_GUARD) {
            address replacement;
            assembly { replacement := calldataload(data.offset) }
            require(replacement == address(0) && removalRequestedAt != 0 && block.timestamp >= removalRequestedAt + REMOVAL_DELAY, "protected guard");
        }
        if (to == address(this) && data.length >= 4 && (bytes4(data[:4]) == REQUEST_REMOVAL || bytes4(data[:4]) == CANCEL_REMOVAL)) {
            // The Safe may schedule its own delayed recovery request.
        } else {
            uint256 nonce = ISafeLike(safe).nonce();
            bytes32 hash = actionHash(to, value, data, operation, nonce);
            require(registry.isAuthorized(hash), "INTENT authorization required");
            pendingActionHash = hash;
        }
    }

    function checkAfterExecution(bytes32, bool success) external {
        require(msg.sender == safe, "only Safe");
        bytes32 hash = pendingActionHash;
        pendingActionHash = bytes32(0);
        if (success && hash != bytes32(0)) registry.consume(hash);
    }
}
