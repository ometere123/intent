// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Target-chain admission layer for finalized, threshold-attested INTENT decisions.
/// @dev This is an attestation bridge, not a trustless GenLayer light client.
contract IntentAuthorizationRegistry {
    string public constant NAME = "INTENT Authorization Registry";
    string public constant VERSION = "1";
    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant CERTIFICATE_TYPEHASH = keccak256(
        "Certificate(string protocolVersion,uint256 genLayerChainId,address genLayerIntent,bytes32 decisionRef,uint256 targetChainId,address safe,bytes32 actionHash,bytes32 intentIdHash,uint256 intentRevision,uint256 safeNonce,uint256 authorizationNonce,uint256 validAfter,uint256 validUntil,bytes32 outcome)"
    );
    uint256 public constant TARGET_CHAIN_ID = 11155111;

    address public owner;
    uint256 public threshold;
    mapping(address => bool) public isAttestor;
    mapping(bytes32 => bool) public authorized;
    mapping(bytes32 => bool) public consumed;
    mapping(uint256 => bool) public usedAuthorizationNonce;
    mapping(address => bool) public isConsumer;

    uint256 public constant CONFIG_DELAY = 1 days;
    struct PendingAttestor { bool value; uint256 executeAfter; }
    struct PendingThreshold { uint256 value; uint256 executeAfter; }
    mapping(address => PendingAttestor) public pendingAttestors;
    PendingThreshold public pendingThreshold;

    struct Certificate {
        string protocolVersion;
        uint256 genLayerChainId;
        address genLayerIntent;
        bytes32 decisionRef;
        uint256 targetChainId;
        address safe;
        bytes32 actionHash;
        bytes32 intentIdHash;
        uint256 intentRevision;
        uint256 safeNonce;
        uint256 authorizationNonce;
        uint256 validAfter;
        uint256 validUntil;
        bytes32 outcome;
    }

    event AuthorizationAdmitted(bytes32 indexed actionHash, bytes32 indexed digest, address indexed safe, uint256 authorizationNonce);
    event AuthorizationConsumed(bytes32 indexed actionHash);
    event AttestorChangeQueued(address indexed attestor, bool value, uint256 executeAfter);
    event AttestorChanged(address indexed attestor, bool value);
    event ThresholdChangeQueued(uint256 value, uint256 executeAfter);
    event ThresholdChanged(uint256 value);
    event ConsumerConfigured(address indexed consumer, bool enabled);

    modifier onlyOwner() { require(msg.sender == owner, "only owner"); _; }

    constructor(address[] memory initialAttestors, uint256 initialThreshold) {
        require(initialThreshold > 0 && initialThreshold <= initialAttestors.length, "invalid threshold");
        owner = msg.sender;
        threshold = initialThreshold;
        for (uint256 i; i < initialAttestors.length; ++i) {
            require(initialAttestors[i] != address(0) && !isAttestor[initialAttestors[i]], "duplicate attestor");
            isAttestor[initialAttestors[i]] = true;
        }
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(NAME)), keccak256(bytes(VERSION)), block.chainid, address(this)));
    }

    function certificateDigest(Certificate calldata c) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), keccak256(abi.encode(
            CERTIFICATE_TYPEHASH, keccak256(bytes(c.protocolVersion)), c.genLayerChainId, c.genLayerIntent,
            c.decisionRef, c.targetChainId, c.safe, c.actionHash, c.intentIdHash, c.intentRevision,
            c.safeNonce, c.authorizationNonce, c.validAfter, c.validUntil, c.outcome
        ))));
    }

    function admit(Certificate calldata c, bytes[] calldata signatures) external {
        require(keccak256(bytes(c.protocolVersion)) == keccak256(bytes(VERSION)), "protocol version");
        require(c.genLayerChainId == 61999, "GenLayer chain");
        require(c.genLayerIntent != address(0) && c.safe != address(0), "binding address");
        require(c.targetChainId == TARGET_CHAIN_ID && block.chainid == TARGET_CHAIN_ID, "target chain");
        require(c.outcome == keccak256("MATCHES_INTENT"), "outcome");
        require(c.validAfter <= block.timestamp && c.validUntil > block.timestamp, "certificate expired");
        require(!usedAuthorizationNonce[c.authorizationNonce], "authorization nonce used");
        bytes32 digest = certificateDigest(c);
        uint256 valid;
        address previous;
        for (uint256 i; i < signatures.length; ++i) {
            address signer = _recover(digest, signatures[i]);
            require(signer > previous, "duplicate or unsorted signer");
            previous = signer;
            if (isAttestor[signer]) ++valid;
        }
        require(valid >= threshold, "threshold not reached");
        require(!authorized[c.actionHash], "action already authorized");
        authorized[c.actionHash] = true;
        usedAuthorizationNonce[c.authorizationNonce] = true;
        emit AuthorizationAdmitted(c.actionHash, digest, c.safe, c.authorizationNonce);
    }

    function isAuthorized(bytes32 actionHash) external view returns (bool) { return authorized[actionHash] && !consumed[actionHash]; }

    function setConsumer(address consumer, bool enabled) external onlyOwner {
        require(consumer != address(0), "zero consumer");
        isConsumer[consumer] = enabled;
        emit ConsumerConfigured(consumer, enabled);
    }

    function consume(bytes32 actionHash) external {
        require(isConsumer[msg.sender], "only consumer");
        require(authorized[actionHash] && !consumed[actionHash], "authorization inactive");
        consumed[actionHash] = true;
        emit AuthorizationConsumed(actionHash);
    }

    function queueAttestor(address attestor, bool value) external onlyOwner {
        require(attestor != address(0), "zero attestor");
        pendingAttestors[attestor] = PendingAttestor(value, block.timestamp + CONFIG_DELAY);
        emit AttestorChangeQueued(attestor, value, block.timestamp + CONFIG_DELAY);
    }

    function executeAttestorChange(address attestor) external onlyOwner {
        PendingAttestor memory p = pendingAttestors[attestor];
        require(p.executeAfter != 0 && block.timestamp >= p.executeAfter, "attestor delay");
        isAttestor[attestor] = p.value;
        delete pendingAttestors[attestor];
        emit AttestorChanged(attestor, p.value);
    }

    function queueThreshold(uint256 value) external onlyOwner {
        require(value > 0, "invalid threshold");
        pendingThreshold = PendingThreshold(value, block.timestamp + CONFIG_DELAY);
        emit ThresholdChangeQueued(value, block.timestamp + CONFIG_DELAY);
    }

    function executeThresholdChange() external onlyOwner {
        require(pendingThreshold.executeAfter != 0 && block.timestamp >= pendingThreshold.executeAfter, "threshold delay");
        threshold = pendingThreshold.value;
        delete pendingThreshold;
        emit ThresholdChanged(threshold);
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address signer) {
        require(signature.length == 65, "signature length");
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := calldataload(signature.offset) s := calldataload(add(signature.offset, 32)) v := byte(0, calldataload(add(signature.offset, 64))) }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "signature v");
        signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "bad signature");
    }
}
