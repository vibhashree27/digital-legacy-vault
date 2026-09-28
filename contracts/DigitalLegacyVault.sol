// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DigitalLegacyVault
 * @notice Decentralized Dead Man's Switch requiring dual confirmation:
 *         1. Inactivity period expired (lastPing + pingInterval <= block.timestamp)
 *         2. At least 2 out of 3 trustees approve the release on-chain.
 */
contract DigitalLegacyVault {

    // Simple built-in reentrancy guard (zero external dependencies)
    uint256 private _status;
    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    struct Vault {
        address owner;
        address beneficiary;          // Beneficiary who receives the digital legacy
        string secretDataOrIpfs;      // Encrypted message, password, or IPFS CID
        uint256 pingInterval;         // Inactivity window in seconds (e.g. 60s for demo, 30 days for prod)
        uint256 lastPing;             // Unix timestamp of the last owner check-in
        uint8 requiredApprovals;      // Set to 2 (2 out of 3)
        uint8 currentApprovals;       // Current count of trustee approvals
        bool isReleased;              // True once unlocked
        bool isCanceled;              // True if owner cancels vault
    }

    uint256 public vaultCount;
    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => address[]) private _vaultTrustees;
    mapping(uint256 => mapping(address => bool)) public isTrustee;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    // Events for frontend indexing & on-chain verification
    event VaultCreated(uint256 indexed vaultId, address indexed owner, address indexed beneficiary, uint256 pingInterval);
    event CheckedIn(uint256 indexed vaultId, uint256 newLastPing);
    event TrusteeApproved(uint256 indexed vaultId, address indexed trustee, uint8 totalApprovals);
    event VaultReleased(uint256 indexed vaultId, string secretDataOrIpfs, address indexed beneficiary);
    event VaultCanceled(uint256 indexed vaultId);

    modifier onlyVaultOwner(uint256 _vaultId) {
        require(vaults[_vaultId].owner == msg.sender, "Caller is not the vault owner");
        _;
    }

    constructor() {
        _status = 1;
    }

    /**
     * @notice Owner creates a vault with 3 trusted trustees and a 2-of-3 approval threshold.
     */
    function createVault(
        address _beneficiary,
        address[] calldata _trustees,
        uint8 _requiredApprovals,
        uint256 _pingInterval,
        string calldata _secretDataOrIpfs
    ) external returns (uint256) {
        require(_beneficiary != address(0), "Invalid beneficiary address");
        require(_beneficiary != msg.sender, "Beneficiary cannot be owner");
        require(_trustees.length == 3, "Must configure exactly 3 trustees");
        require(_requiredApprovals == 2, "Required approvals must be 2 (2-of-3)");
        require(_pingInterval >= 30, "Interval must be >= 30 seconds");
        require(bytes(_secretDataOrIpfs).length > 0, "Secret data cannot be empty");

        uint256 currentId = ++vaultCount;

        vaults[currentId] = Vault({
            owner: msg.sender,
            beneficiary: _beneficiary,
            secretDataOrIpfs: _secretDataOrIpfs,
            pingInterval: _pingInterval,
            lastPing: block.timestamp,
            requiredApprovals: _requiredApprovals,
            currentApprovals: 0,
            isReleased: false,
            isCanceled: false
        });

        for (uint256 i = 0; i < 3; i++) {
            address t = _trustees[i];
            require(t != address(0), "Trustee cannot be zero address");
            require(t != msg.sender, "Owner cannot be a trustee");
            require(!isTrustee[currentId][t], "Duplicate trustee address");

            isTrustee[currentId][t] = true;
            _vaultTrustees[currentId].push(t);
        }

        emit VaultCreated(currentId, msg.sender, _beneficiary, _pingInterval);
        return currentId;
    }

    /**
     * @notice Owner check-in resets the timer and resets any premature trustee approvals.
     */
    function checkIn(uint256 _vaultId) external onlyVaultOwner(_vaultId) {
        Vault storage vault = vaults[_vaultId];
        require(!vault.isReleased, "Vault already released");
        require(!vault.isCanceled, "Vault canceled");

        vault.lastPing = block.timestamp;

        // If trustees voted while owner was away, but owner returns before release:
        if (vault.currentApprovals > 0) {
            vault.currentApprovals = 0;
            address[] memory trustees = _vaultTrustees[_vaultId];
            for (uint256 i = 0; i < trustees.length; i++) {
                hasApproved[_vaultId][trustees[i]] = false;
            }
        }

        emit CheckedIn(_vaultId, block.timestamp);
    }

    /**
     * @notice Trustee submits an approval when owner is inactive past the timeout.
     */
    function trusteeApprove(uint256 _vaultId) external {
        Vault storage vault = vaults[_vaultId];
        require(!vault.isReleased, "Vault already released");
        require(!vault.isCanceled, "Vault canceled");
        require(isTrustee[_vaultId][msg.sender], "Caller is not a designated trustee");
        require(!hasApproved[_vaultId][msg.sender], "Trustee already approved");
        require(block.timestamp >= vault.lastPing + vault.pingInterval, "Owner is still active (timeout not reached)");

        hasApproved[_vaultId][msg.sender] = true;
        vault.currentApprovals += 1;

        emit TrusteeApproved(_vaultId, msg.sender, vault.currentApprovals);

        // Auto-release once 2-of-3 threshold is reached
        if (vault.currentApprovals >= vault.requiredApprovals) {
            _executeRelease(_vaultId);
        }
    }

    /**
     * @notice Explicit release function once conditions are satisfied.
     */
    function release(uint256 _vaultId) external nonReentrant {
        Vault storage vault = vaults[_vaultId];
        require(!vault.isReleased, "Vault already released");
        require(!vault.isCanceled, "Vault canceled");
        require(block.timestamp >= vault.lastPing + vault.pingInterval, "Inactivity timeout not reached");
        require(vault.currentApprovals >= vault.requiredApprovals, "Need at least 2 trustee approvals");

        _executeRelease(_vaultId);
    }

    function _executeRelease(uint256 _vaultId) internal {
        Vault storage vault = vaults[_vaultId];
        vault.isReleased = true;
        emit VaultReleased(_vaultId, vault.secretDataOrIpfs, vault.beneficiary);
    }

    /**
     * @notice Owner can cancel and revoke the vault anytime before release.
     */
    function cancelVault(uint256 _vaultId) external onlyVaultOwner(_vaultId) {
        Vault storage vault = vaults[_vaultId];
        require(!vault.isReleased, "Cannot cancel released vault");
        require(!vault.isCanceled, "Already canceled");

        vault.isCanceled = true;
        emit VaultCanceled(_vaultId);
    }

    // View functions for frontend & trustees
    function getTrustees(uint256 _vaultId) external view returns (address[] memory) {
        return _vaultTrustees[_vaultId];
    }

    function getVault(uint256 _vaultId) external view returns (Vault memory) {
        return vaults[_vaultId];
    }

    function isExpired(uint256 _vaultId) external view returns (bool) {
        Vault memory vault = vaults[_vaultId];
        return block.timestamp >= vault.lastPing + vault.pingInterval;
    }
}