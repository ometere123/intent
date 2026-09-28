// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Minimal harmless target used only for the Sepolia protected-account proof.
contract IntentDemoTarget {
    uint256 public pingCount;
    bytes32 public lastPayload;
    address public lastCaller;

    event Ping(address indexed caller, bytes32 payload, uint256 count);

    function ping(bytes32 payload) external {
        pingCount += 1;
        lastPayload = payload;
        lastCaller = msg.sender;
        emit Ping(msg.sender, payload, pingCount);
    }
}
