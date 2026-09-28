export const CONTRACT_ADDRESS = "0xC9f7A42Acd76Ad2ebC84C886920545990ad5139a";

export const MST_TESTNET_CONFIG = {
  chainId: "0x5752035", // 91562037 in hex
  chainName: "MST Testnet",
  nativeCurrency: {
    name: "Testnet MST Coin",
    symbol: "tMSTC",
    decimals: 18,
  },
  rpcUrls: ["https://testnetrpc.mstblockchain.com"],
  blockExplorerUrls: ["https://testnet.mstscan.com"],
};

export const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "createVault",
    "inputs": [
      { "name": "_beneficiary", "type": "address" },
      { "name": "_trustees", "type": "address[]" },
      { "name": "_requiredApprovals", "type": "uint8" },
      { "name": "_pingInterval", "type": "uint256" },
      { "name": "_secretDataOrIpfs", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkIn",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "trusteeApprove",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "release",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelVault",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getVault",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "owner", "type": "address" },
          { "name": "beneficiary", "type": "address" },
          { "name": "secretDataOrIpfs", "type": "string" },
          { "name": "pingInterval", "type": "uint256" },
          { "name": "lastPing", "type": "uint256" },
          { "name": "requiredApprovals", "type": "uint8" },
          { "name": "currentApprovals", "type": "uint8" },
          { "name": "isReleased", "type": "bool" },
          { "name": "isCanceled", "type": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTrustees",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isExpired",
    "inputs": [{ "name": "_vaultId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vaultCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "VaultCreated",
    "inputs": [
      { "name": "vaultId", "type": "uint256", "indexed": true },
      { "name": "owner", "type": "address", "indexed": true },
      { "name": "beneficiary", "type": "address", "indexed": true },
      { "name": "pingInterval", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CheckedIn",
    "inputs": [
      { "name": "vaultId", "type": "uint256", "indexed": true },
      { "name": "newLastPing", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrusteeApproved",
    "inputs": [
      { "name": "vaultId", "type": "uint256", "indexed": true },
      { "name": "trustee", "type": "address", "indexed": true },
      { "name": "totalApprovals", "type": "uint8", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VaultReleased",
    "inputs": [
      { "name": "vaultId", "type": "uint256", "indexed": true },
      { "name": "secretDataOrIpfs", "type": "string", "indexed": false },
      { "name": "beneficiary", "type": "address", "indexed": true }
    ],
    "anonymous": false
  }
];