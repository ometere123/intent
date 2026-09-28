// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGuardBinding {
    function safe() external view returns (address);
    function registry() external view returns (address);
}

interface ISafeModules {
    function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] memory array, address next);
    function getStorageAt(uint256 offset, uint256 length) external view returns (bytes memory);
}

/// @notice Target-chain admission layer for finalized, threshold-attested INTENT decisions.
/// @dev This is an attestation bridge, not a trustless GenLayer light client.
contract IntentAuthorizationRegistry {
    string public constant NAME = "INTENT Authorization Registry";
    string public constant VERSION = "1";
    uint256 public constant GENLAYER_CHAIN_ID = 61999;
    uint256 public constant TARGET_CHAIN_ID = 11155111;
    uint256 public constant CONFIG_DELAY = 1 days;
    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant CERTIFICATE_TYPEHASH = keccak256("Certificate(string protocolVersion,uint256 genLayerChainId,address genLayerIntent,address policyOwner,bytes32 decisionRef,uint256 targetChainId,address safe,bytes32 actionHash,bytes32 intentIdHash,uint256 intentRevision,uint256 safeNonce,uint256 authorizationNonce,uint256 validAfter,uint256 validUntil,bytes32 outcome)");
    bytes32 private constant MATCHES_INTENT = keccak256("MATCHES_INTENT");
    uint256 private constant HALF_ORDER = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;
    uint256 private constant GUARD_STORAGE_SLOT = uint256(0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8);

    address public immutable canonicalGenLayerIntent;
    address public owner;
    uint256 public threshold;
    uint256 public activeAttestorCount;
    mapping(address => bool) public isAttestor;
    mapping(address => address) public guardForSafe;

    struct PolicyBinding {
        address owner;
        bytes32 intentIdHash;
        address pendingOwner;
        bytes32 pendingIntentIdHash;
        uint256 executeAfter;
        bool configured;
    }
    mapping(address => PolicyBinding) public policyForSafe;

    struct Authorization {
        bytes32 certificateDigest;
        address safe;
        address policyOwner;
        bytes32 decisionRef;
        bytes32 intentIdHash;
        uint256 intentRevision;
        uint256 safeNonce;
        uint256 authorizationNonce;
        uint256 validAfter;
        uint256 validUntil;
        bool admitted;
        bool consumed;
    }
    mapping(bytes32 => Authorization) public authorizations;
    mapping(bytes32 => bool) private usedAuthorizationNonces;

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
        address policyOwner;
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
    event GuardRegistered(address indexed safe, address indexed guard);
    event PolicyBindingQueued(address indexed safe, address indexed policyOwner, bytes32 indexed intentIdHash, uint256 executeAfter);
    event PolicyBindingChanged(address indexed safe, address indexed policyOwner, bytes32 indexed intentIdHash);
    event AttestorChangeQueued(address indexed attestor, bool value, uint256 executeAfter);
    event AttestorChanged(address indexed attestor, bool value);
    event ThresholdChangeQueued(uint256 value, uint256 executeAfter);
    event ThresholdChanged(uint256 value);

    modifier onlyOwner() { require(msg.sender == owner, "only owner"); _; }

    constructor(address canonicalIntent, address[] memory initialAttestors, uint256 initialThreshold) {
        require(canonicalIntent != address(0), "zero intent");
        require(initialThreshold > 0 && initialThreshold <= initialAttestors.length, "invalid threshold");
        canonicalGenLayerIntent = canonicalIntent;
        owner = msg.sender;
        threshold = initialThreshold;
        for (uint256 i; i < initialAttestors.length; ++i) {
            address attestor = initialAttestors[i];
            require(attestor != address(0) && !isAttestor[attestor], "duplicate attestor");
            isAttestor[attestor] = true;
        }
        activeAttestorCount = initialAttestors.length;
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(NAME)), keccak256(bytes(VERSION)), block.chainid, address(this)));
    }

    function certificateDigest(Certificate calldata c) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), _certificateStructHash(c)));
    }

    function _certificateStructHash(Certificate calldata c) private pure returns (bytes32) {
        bytes memory prefix = abi.encode(
            CERTIFICATE_TYPEHASH, keccak256(bytes(c.protocolVersion)), c.genLayerChainId, c.genLayerIntent, c.policyOwner, c.decisionRef
        );
        bytes memory middle = abi.encode(c.targetChainId, c.safe, c.actionHash, c.intentIdHash, c.intentRevision);
        bytes memory suffix = abi.encode(c.safeNonce, c.authorizationNonce, c.validAfter, c.validUntil, c.outcome);
        return keccak256(bytes.concat(prefix, middle, suffix));
    }

    function registerGuard(address safe, address guard, address policyOwner, bytes32 intentIdHash) external onlyOwner {
        require(safe != address(0) && guard != address(0), "zero binding");
        require(policyOwner != address(0) && intentIdHash != bytes32(0), "zero policy");
        require(guardForSafe[safe] == address(0), "guard already registered");
        (address[] memory modules,) = ISafeModules(safe).getModulesPaginated(address(0x1), 1);
        require(modules.length == 0, "Safe has modules");
        bytes memory guardSlot = ISafeModules(safe).getStorageAt(GUARD_STORAGE_SLOT, 1);
        require(guardSlot.length == 32, "Safe guard unreadable");
        bytes32 guardWord;
        assembly ("memory-safe") { guardWord := mload(add(guardSlot, 32)) }
        require(address(uint160(uint256(guardWord))) == guard, "Safe guard not installed");
        require(IGuardBinding(guard).safe() == safe && IGuardBinding(guard).registry() == address(this), "guard binding");
        guardForSafe[safe] = guard;
        policyForSafe[safe] = PolicyBinding(policyOwner, intentIdHash, address(0), bytes32(0), 0, true);
        emit GuardRegistered(safe, guard);
        emit PolicyBindingChanged(safe, policyOwner, intentIdHash);
    }

    function queuePolicyBinding(address safe, address policyOwner, bytes32 intentIdHash) external onlyOwner {
        require(guardForSafe[safe] != address(0), "unregistered Safe");
        require(policyOwner != address(0) && intentIdHash != bytes32(0), "zero policy");
        uint256 executeAfter = block.timestamp + CONFIG_DELAY;
        PolicyBinding storage p = policyForSafe[safe];
        p.pendingOwner = policyOwner;
        p.pendingIntentIdHash = intentIdHash;
        p.executeAfter = executeAfter;
        emit PolicyBindingQueued(safe, policyOwner, intentIdHash, executeAfter);
    }

    function executePolicyBinding(address safe) external onlyOwner {
        PolicyBinding storage p = policyForSafe[safe];
        require(p.executeAfter != 0 && block.timestamp >= p.executeAfter, "policy delay");
        require(p.pendingOwner != address(0) && p.pendingIntentIdHash != bytes32(0), "no pending policy");
        p.owner = p.pendingOwner;
        p.intentIdHash = p.pendingIntentIdHash;
        p.pendingOwner = address(0);
        p.pendingIntentIdHash = bytes32(0);
        p.executeAfter = 0;
        emit PolicyBindingChanged(safe, p.owner, p.intentIdHash);
    }

    function admit(Certificate calldata c, bytes[] calldata signatures) external {
        bytes32 nonceKey = _validateCertificate(c);
        bytes32 digest = certificateDigest(c);
        require(_countValidSignatures(digest, signatures) >= threshold, "threshold not reached");
        require(!authorizations[c.actionHash].admitted, "action already authorized");
        _storeAuthorization(c, digest, nonceKey);
    }

    function _validateCertificate(Certificate calldata c) private view returns (bytes32 nonceKey) {
        require(keccak256(bytes(c.protocolVersion)) == keccak256(bytes(VERSION)), "protocol version");
        require(c.genLayerChainId == GENLAYER_CHAIN_ID, "GenLayer chain");
        require(c.genLayerIntent == canonicalGenLayerIntent, "GenLayer intent");
        require(c.safe != address(0) && guardForSafe[c.safe] != address(0), "unregistered Safe");
        PolicyBinding memory policy = policyForSafe[c.safe];
        require(policy.configured && c.policyOwner == policy.owner && c.intentIdHash == policy.intentIdHash, "policy binding");
        require(c.targetChainId == TARGET_CHAIN_ID && block.chainid == TARGET_CHAIN_ID, "target chain");
        require(c.outcome == MATCHES_INTENT, "outcome");
        require(c.validAfter <= block.timestamp && c.validUntil > block.timestamp, "certificate expired");
        nonceKey = keccak256(abi.encode(c.safe, c.authorizationNonce));
        require(!usedAuthorizationNonces[nonceKey], "authorization nonce used");
    }

    function _countValidSignatures(bytes32 digest, bytes[] calldata signatures) private view returns (uint256 valid) {
        address previous;
        for (uint256 i; i < signatures.length; ++i) {
            address signer = _recover(digest, signatures[i]);
            require(signer > previous, "duplicate or unsorted signer");
            previous = signer;
            if (isAttestor[signer]) ++valid;
        }
    }

    function _storeAuthorization(Certificate calldata c, bytes32 digest, bytes32 nonceKey) private {
        Authorization storage existing = authorizations[c.actionHash];
        existing.certificateDigest = digest;
        existing.safe = c.safe;
        existing.policyOwner = c.policyOwner;
        existing.decisionRef = c.decisionRef;
        existing.intentIdHash = c.intentIdHash;
        existing.intentRevision = c.intentRevision;
        existing.safeNonce = c.safeNonce;
        existing.authorizationNonce = c.authorizationNonce;
        existing.validAfter = c.validAfter;
        existing.validUntil = c.validUntil;
        existing.admitted = true;
        usedAuthorizationNonces[nonceKey] = true;
        emit AuthorizationAdmitted(c.actionHash, digest, c.safe, c.authorizationNonce);
    }

    function isAuthorized(bytes32 actionHash) external view returns (bool) {
        Authorization memory a = authorizations[actionHash];
        return a.admitted && !a.consumed && a.validAfter <= block.timestamp && a.validUntil > block.timestamp;
    }

    function consume(bytes32 actionHash) external {
        Authorization storage a = authorizations[actionHash];
        require(a.admitted && !a.consumed, "authorization inactive");
        require(msg.sender == guardForSafe[a.safe], "wrong Guard");
        a.consumed = true;
        emit AuthorizationConsumed(actionHash);
    }

    function queueAttestor(address attestor, bool value) external onlyOwner {
        require(attestor != address(0), "zero attestor");
        if (!value) require(isAttestor[attestor] && activeAttestorCount > threshold, "threshold would break");
        pendingAttestors[attestor] = PendingAttestor(value, block.timestamp + CONFIG_DELAY);
        emit AttestorChangeQueued(attestor, value, block.timestamp + CONFIG_DELAY);
    }

    function executeAttestorChange(address attestor) external onlyOwner {
        PendingAttestor memory p = pendingAttestors[attestor];
        require(p.executeAfter != 0 && block.timestamp >= p.executeAfter, "attestor delay");
        if (p.value) {
            require(!isAttestor[attestor], "already attestor");
            isAttestor[attestor] = true;
            activeAttestorCount += 1;
        } else {
            require(isAttestor[attestor] && activeAttestorCount > threshold, "threshold would break");
            isAttestor[attestor] = false;
            activeAttestorCount -= 1;
        }
        delete pendingAttestors[attestor];
        emit AttestorChanged(attestor, p.value);
    }

    function queueThreshold(uint256 value) external onlyOwner {
        require(value > 0 && value <= activeAttestorCount, "invalid threshold");
        pendingThreshold = PendingThreshold(value, block.timestamp + CONFIG_DELAY);
        emit ThresholdChangeQueued(value, block.timestamp + CONFIG_DELAY);
    }

    function executeThresholdChange() external onlyOwner {
        PendingThreshold memory p = pendingThreshold;
        require(p.executeAfter != 0 && block.timestamp >= p.executeAfter && p.value <= activeAttestorCount, "threshold delay");
        threshold = p.value;
        delete pendingThreshold;
        emit ThresholdChanged(threshold);
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address signer) {
        require(signature.length == 65, "signature length");
        bytes32 r; bytes32 s; uint8 v;
        assembly ("memory-safe") { r := calldataload(signature.offset) s := calldataload(add(signature.offset, 32)) v := byte(0, calldataload(add(signature.offset, 64))) }
        if (v < 27) v += 27;
        require((v == 27 || v == 28) && uint256(s) <= HALF_ORDER, "invalid signature");
        signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "bad signer");
    }
}
