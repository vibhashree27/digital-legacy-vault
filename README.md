# 🛡️ Digital Legacy Vault — Powered by MST Blockchain

> A decentralized, trustless Dead Man's Switch for digital assets and sensitive credentials, secured by dual-condition consensus on the MST Blockchain.

[![MST Testnet](https://img.shields.io/badge/Network-MST%20Testnet-06b6d4)](https://testnet.mstscan.com)
[![Smart Contract](https://img.shields.io/badge/Contract-Verified-10b981)](https://testnet.mstscan.com/address/0xC9f7A42Acd76Ad2ebC84C886920545990ad5139a)
[![BridgeKey](https://img.shields.io/badge/Wallet-BridgeKey%20Integrated-3b82f6)](https://bridgekey.io)

---

## 1. 💡 Problem Statement
People store valuable digital assets, passwords, instructions, and seed phrases across various online platforms and cold wallets. If an individual unexpectedly becomes incapacitated or unavailable, family members and heirs often have no way to access these critical assets.

Centralized solutions introduce custodial risk, single points of failure, and middleman vulnerabilities. Traditional blockchain dead man's switches rely solely on an inactivity timer, making them prone to catastrophic accidental releases if the owner is simply traveling without internet access.

---

## 2. 🚀 The Solution: Dual-Condition Consensus
**Digital Legacy Vault** introduces a resilient, trustless succession architecture:
1. **Inactivity Timer:** The owner regularly pings the smart contract ("I'm still here").
2. **Multi-Trustee Verification Stage:** If the inactivity timer expires, the vault enters a verification stage. The secret is **never released on a timer alone**.
3. **2-of-3 Consensus:** Release requires at least **2 out of 3 designated trustees** to cryptographically vote on-chain confirming the owner is truly unreachable.
4. **Owner Protection:** If the owner returns before consensus is finalized, a single `checkIn()` resets the timer and wipes all pending trustee votes.

---

## 3. ⛓️ Meaningful MST Blockchain Usage
MST Blockchain serves as the **core state machine and trust layer** of the platform:
- **Immutable State Machine:** All vault parameters (inactivity windows, last check-in timestamps, approvals, and trustee registries) are enforced entirely on-chain.
- **Dual-Condition Verification:** Cryptographically validates that both the timeout condition and the $M$-of-$N$ signature threshold are satisfied before emitting the `VaultReleased` event.
- **On-Chain Auditability:** Every action (`VaultCreated`, `CheckedIn`, `TrusteeApproved`, `VaultReleased`) produces verifiable transaction receipts on **MSTScan**.

---

## 4. 📍 Deployed Contracts on MST Testnet

- **Network:** MST Testnet
- **Chain ID:** `91562037` (`0x5752035`)
- **Currency:** `tMSTC`
- **RPC URL:** `https://testnetrpc.mstblockchain.com`
- **Explorer:** [https://testnet.mstscan.com](https://testnet.mstscan.com)

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **DigitalLegacyVault (Main)** | `0xC9f7A42Acd76Ad2ebC84C886920545990ad5139a` | [View on MSTScan](https://testnet.mstscan.com/address/0xC9f7A42Acd76Ad2ebC84C886920545990ad5139a) |
| **Canary Test Pipeline** | `0xF3a648424d4dBd9C88f7A6EcE7cdEA5fA2E08478` | [View on MSTScan](https://testnet.mstscan.com/address/0xF3a648424d4dBd9C88f7A6EcE7cdEA5fA2E08478) |

---

## 5. 🔑 Official BridgeKey Wallet Integration
Digital Legacy Vault integrates with **BridgeKey**, the official non-custodial wallet of MST Blockchain:
- **EIP-3085 Auto-Switching:** Detects current network and prompts one-click switching to MST Testnet (`91562037`).
- **Cryptographic Signing:** Uses BridgeKey to sign vault creations, owner check-in pings, and trustee consensus approvals.
- **EIP-1559 Optimization:** Configured with priority fee bumping to ensure transactions confirm seamlessly on MST nodes.

---

## 6. 🛠️ Tech Stack & Architecture
- **Smart Contracts:** Solidity `^0.8.28`, Hardhat 3, Hardhat Ignition
- **Frontend:** React 19, TypeScript, Vite, Ethers.js v6
- **Wallet Provider:** BridgeKey Chromium Extension
- **Testing:** Mocha, Chai (100% test coverage across 5 edge-case scenarios)

---

## 7. 🚀 Local Setup & Installation

### Smart Contract Development
```bash
# Clone the repository
git clone https://github.com/vibhashree27/digital-legacy-vault.git
cd digital-legacy-vault

# Install dependencies
npm install

# Run automated test suite
npx hardhat test

# Deploy to MST Testnet via Ignition
npx hardhat ignition deploy ignition/modules/DigitalLegacyVault.ts --network mstTestnet