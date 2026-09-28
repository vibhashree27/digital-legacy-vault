import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, MST_TESTNET_CONFIG } from "./contracts/contractConfig";
import "./App.css";

export default function App() {
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [totalVaults, setTotalVaults] = useState<number>(0);
  const [myVaultIds, setMyVaultIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "owner" | "trustee" | "beneficiary">("create");
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form states for creating a vault
  const [beneficiary, setBeneficiary] = useState("");
  const [trustee1, setTrustee1] = useState("");
  const [trustee2, setTrustee2] = useState("");
  const [trustee3, setTrustee3] = useState("");
  const [pingInterval, setPingInterval] = useState("60");
  const [secretData, setSecretData] = useState("");

  // Inspecting Vault State
  const [searchVaultId, setSearchVaultId] = useState("1");
  const [vaultData, setVaultData] = useState<any>(null);
  const [trusteesList, setTrusteesList] = useState<string[]>([]);
  const [isUserTrustee, setIsUserTrustee] = useState<boolean>(false);
  const [isChainExpired, setIsChainExpired] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const showNotif = (text: string, type: "success" | "error") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 8000);
  };

  const getEthereumObject = () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  };

  // Connect BridgeKey Wallet & Switch to MST Testnet
  const connectWallet = async () => {
    const eth = getEthereumObject();
    if (!eth) {
      alert("BridgeKey extension not detected! Please ensure BridgeKey is installed and enabled.");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(eth);

      // Check current chain ID
      const network = await provider.getNetwork();
      const currentChainIdHex = "0x" + Number(network.chainId).toString(16);

      if (currentChainIdHex.toLowerCase() !== MST_TESTNET_CONFIG.chainId.toLowerCase()) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: MST_TESTNET_CONFIG.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [MST_TESTNET_CONFIG],
            });
          }
        }
      }

      await eth.request({ method: "eth_requestAccounts" });
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);

      const bal = await provider.getBalance(userAddress);
      setBalance(ethers.formatEther(bal));

      // Refresh platform stats
      await refreshVaultTracker(provider, userAddress);
      showNotif(`Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`, "success");
    } catch (err: any) {
      console.error("Connection error:", err);
      showNotif(err.message || "Failed to connect wallet", "error");
    } finally {
      setLoading(false);
    }
  };

  // Track all vaults created on-chain and for this user
  const refreshVaultTracker = async (provider: any, userAddr: string) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const count = await contract.vaultCount();
      const total = Number(count);
      setTotalVaults(total);

      // Scan user's created vaults
      const owned: string[] = [];
      for (let i = 1; i <= total; i++) {
        try {
          const v = await contract.getVault(i);
          if (v.owner.toLowerCase() === userAddr.toLowerCase()) {
            owned.push(i.toString());
          }
        } catch {}
      }
      setMyVaultIds(owned);
    } catch (e) {
      console.error("Vault tracker error:", e);
    }
  };

  // Fetch Vault Data and Trustee Status from Blockchain
  const fetchVault = async (id: string) => {
    const eth = getEthereumObject();
    if (!eth || !id) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(eth);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const data = await contract.getVault(id);

      if (data.owner === ethers.ZeroAddress) {
        setVaultData(null);
        showNotif(`Vault #${id} does not exist on-chain.`, "error");
        setLoading(false);
        return;
      }

      setVaultData({
        id,
        owner: data.owner,
        beneficiary: data.beneficiary,
        secretDataOrIpfs: data.secretDataOrIpfs,
        pingInterval: Number(data.pingInterval),
        lastPing: Number(data.lastPing),
        requiredApprovals: Number(data.requiredApprovals),
        currentApprovals: Number(data.currentApprovals),
        isReleased: data.isReleased,
        isCanceled: data.isCanceled,
      });

      // Get the 3 trustees recorded on the blockchain
      const tList: string[] = await contract.getTrustees(id);
      setTrusteesList(tList);

      const expired = await contract.isExpired(id);
      setIsChainExpired(expired);

      // Simple array check: is current account in the trustee list?
      if (account) {
        const isT = tList.some((t: string) => t.toLowerCase() === account.toLowerCase());
        setIsUserTrustee(isT);
      }
    } catch (err: any) {
      console.error("Fetch Vault error:", err);
      showNotif("Could not fetch vault data from blockchain", "error");
      setVaultData(null);
    } finally {
      setLoading(false);
    }
  };

  // Create Vault Action
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const eth = getEthereumObject();
    if (!eth || !account) {
      alert("Please connect your BridgeKey wallet first.");
      return;
    }

    let b: string, t1: string, t2: string, t3: string;
    try {
      b = ethers.getAddress(beneficiary.trim().toLowerCase());
      t1 = ethers.getAddress(trustee1.trim().toLowerCase());
      t2 = ethers.getAddress(trustee2.trim().toLowerCase());
      t3 = ethers.getAddress(trustee3.trim().toLowerCase());
    } catch {
      alert("One or more addresses are invalid. Please check the addresses.");
      return;
    }

    if (b.toLowerCase() === account.toLowerCase()) {
      alert("Beneficiary cannot be your own address! Please use another address.");
      return;
    }

    if ([t1.toLowerCase(), t2.toLowerCase(), t3.toLowerCase()].includes(account.toLowerCase())) {
      alert("You cannot set yourself as a trustee! Please use 3 different trustee addresses.");
      return;
    }

    const uniqueTrustees = new Set([t1.toLowerCase(), t2.toLowerCase(), t3.toLowerCase()]);
    if (uniqueTrustees.size < 3) {
      alert("All 3 trustee addresses must be unique!");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      showNotif("Confirm transaction in BridgeKey...", "success");

      const tx = await contract.createVault(
        b,
        [t1, t2, t3],
        2, // 2 out of 3 required
        Number(pingInterval),
        secretData,
        {
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
          maxFeePerGas: ethers.parseUnits("20", "gwei"),
        }
      );

      showNotif("Transaction broadcast! Waiting for block confirmation...", "success");
      const receipt = await tx.wait();
      showNotif(`Vault created successfully! Tx: ${receipt.hash.slice(0, 10)}...`, "success");

      // Auto-switch to the new vault ID
      const count = await contract.vaultCount();
      const newId = count.toString();
      setSearchVaultId(newId);
      await refreshVaultTracker(provider, account);
      setActiveTab("owner");
      fetchVault(newId);
    } catch (err: any) {
      console.error("Vault Creation Error:", err);
      showNotif(err.reason || err.shortMessage || err.message || "Error creating vault", "error");
    } finally {
      setLoading(false);
    }
  };

  // Owner Check-In Action
  const handleCheckIn = async () => {
    const eth = getEthereumObject();
    if (!eth || !account || !vaultData) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      showNotif("Confirm check-in in BridgeKey...", "success");
      const tx = await contract.checkIn(vaultData.id, {
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
      });

      showNotif("Pinging MST Blockchain...", "success");
      await tx.wait();
      showNotif("Check-in confirmed! Inactivity timer has been reset.", "success");
      fetchVault(vaultData.id);
    } catch (err: any) {
      console.error("CheckIn error:", err);
      showNotif(err.reason || err.shortMessage || err.message || "Error checking in", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trustee Approval Action
  const handleTrusteeApprove = async () => {
    const eth = getEthereumObject();
    if (!eth || !account || !vaultData) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      showNotif("Confirm approval in BridgeKey...", "success");
      const tx = await contract.trusteeApprove(vaultData.id, {
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
      });

      showNotif("Submitting Trustee Approval...", "success");
      await tx.wait();
      showNotif("Trustee approval recorded on-chain!", "success");
      fetchVault(vaultData.id);
    } catch (err: any) {
      console.error("Approval error:", err);
      showNotif(err.reason || err.shortMessage || err.message || "Approval rejected", "error");
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer logic
  useEffect(() => {
    if (!vaultData || vaultData.isReleased || vaultData.isCanceled) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const deadline = vaultData.lastPing + vaultData.pingInterval;
      const remaining = deadline - now;
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) {
        setIsChainExpired(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [vaultData]);

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="title-area">
          <h1>🛡️ Digital Legacy Vault</h1>
          <div className="network-badge">
            <span className="badge-dot"></span>
            MST Testnet (Chain: 91562037) • {totalVaults} Total Vaults
          </div>
        </div>

        <div>
          {account ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{account.slice(0, 6)}...{account.slice(-4)}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--accent-cyan)" }}>
                {parseFloat(balance).toFixed(4)} tMSTC
              </div>
            </div>
          ) : (
            <button className="btn-connect" onClick={connectWallet} disabled={loading}>
              {loading ? "Connecting..." : "Connect BridgeKey"}
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div className={`notification ${notification.type === "success" ? "notif-success" : "notif-error"}`}>
          {notification.text}
        </div>
      )}

      {/* Quick Vault Selector Bar */}
      {account && myVaultIds.length > 0 && (
        <div style={{ background: "#111827", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", border: "1px solid #1f2937" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Your Created Vaults:</span>
          {myVaultIds.map((id) => (
            <button
              key={id}
              className="btn-secondary"
              style={{ background: searchVaultId === id ? "var(--accent-cyan)" : "#1f2937", color: searchVaultId === id ? "#000" : "#fff" }}
              onClick={() => {
                setSearchVaultId(id);
                fetchVault(id);
              }}
            >
              Vault #{id}
            </button>
          ))}
        </div>
      )}

      {/* Role Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>
          1. Create Vault
        </button>
        <button className={`tab-btn ${activeTab === "owner" ? "active" : ""}`} onClick={() => { setActiveTab("owner"); fetchVault(searchVaultId); }}>
          2. Owner (Check-in)
        </button>
        <button className={`tab-btn ${activeTab === "trustee" ? "active" : ""}`} onClick={() => { setActiveTab("trustee"); fetchVault(searchVaultId); }}>
          3. Trustee (Vote)
        </button>
        <button className={`tab-btn ${activeTab === "beneficiary" ? "active" : ""}`} onClick={() => { setActiveTab("beneficiary"); fetchVault(searchVaultId); }}>
          4. Beneficiary (Claim)
        </button>
      </div>

      {/* TAB 1: CREATE VAULT */}
      {activeTab === "create" && (
        <div className="card">
          <h2>Create Your Digital Legacy Vault</h2>
          <p className="desc">
            Lock an encrypted secret that automatically releases only if you stop checking in AND at least 2 of 3 trustees vote to confirm.
          </p>

          <form onSubmit={handleCreateVault}>
            <div className="form-group">
              <label>Beneficiary Address (Who inherits the secret):</label>
              <input
                className="form-input"
                placeholder="0x..."
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Trustee 1 Address:</label>
              <input className="form-input" placeholder="0x..." value={trustee1} onChange={(e) => setTrustee1(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Trustee 2 Address:</label>
              <input className="form-input" placeholder="0x..." value={trustee2} onChange={(e) => setTrustee2(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Trustee 3 Address:</label>
              <input className="form-input" placeholder="0x..." value={trustee3} onChange={(e) => setTrustee3(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Inactivity Window (Seconds):</label>
              <input
                type="number"
                className="form-input"
                value={pingInterval}
                onChange={(e) => setPingInterval(e.target.value)}
                required
              />
              <div className="quick-buttons">
                <button type="button" className="btn-secondary" onClick={() => setPingInterval("60")}>60s (Demo Preset)</button>
                <button type="button" className="btn-secondary" onClick={() => setPingInterval("2592000")}>30 Days (Production)</button>
              </div>
            </div>

            <div className="form-group">
              <label>Secret Payload / IPFS CID / Private Note:</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. Seed phrase, safe combination, or IPFS CID: ipfs://Qm..."
                value={secretData}
                onChange={(e) => setSecretData(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Waiting for BridgeKey Confirmation..." : "Lock Vault On-Chain"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: OWNER (CHECK-IN) */}
      {activeTab === "owner" && (
        <div className="card">
          <h2>Owner Control Dashboard</h2>
          <p className="desc">Regularly ping the smart contract to prove you are active and keep the vault locked.</p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              className="form-input"
              placeholder="Vault ID (e.g. 1)"
              value={searchVaultId}
              onChange={(e) => setSearchVaultId(e.target.value)}
              style={{ width: "150px" }}
            />
            <button className="btn-secondary" onClick={() => fetchVault(searchVaultId)} disabled={loading}>
              {loading ? "Loading..." : "Load Vault"}
            </button>
          </div>

          {vaultData ? (
            <div>
              <div className="countdown-box">
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>TIME UNTIL INACTIVITY TIMEOUT</div>
                <div className="countdown-digits">
                  {timeLeft === null ? "--:--" : timeLeft > 0 ? `${timeLeft}s` : "0s (EXPIRED)"}
                </div>
                <div>
                  <span className={`status-badge ${timeLeft === 0 ? "status-expired" : "status-active"}`}>
                    {timeLeft === 0 ? "⚠️ Verification Stage (Inactive)" : "✅ Owner Active (Locked)"}
                  </span>
                </div>
              </div>

              <button className="btn-primary" onClick={handleCheckIn} disabled={loading || vaultData.isReleased}>
                {loading ? "Pinging Contract..." : "🔄 I'm Still Here (Check In)"}
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Enter a Vault ID and click Load Vault to inspect your status.</p>
          )}
        </div>
      )}

      {/* TAB 3: TRUSTEE (VOTE) */}
      {activeTab === "trustee" && (
        <div className="card">
          <h2>Trustee Approval Portal</h2>
          <p className="desc">
            Vote to release the vault when the owner has been unresponsive beyond the inactivity timeout.
          </p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              className="form-input"
              placeholder="Vault ID (e.g. 1)"
              value={searchVaultId}
              onChange={(e) => setSearchVaultId(e.target.value)}
              style={{ width: "150px" }}
            />
            <button className="btn-secondary" onClick={() => fetchVault(searchVaultId)} disabled={loading}>
              {loading ? "Checking..." : "Inspect Vault"}
            </button>
          </div>

          {vaultData ? (
            <div>
              {/* LIVE ON-CHAIN DIAGNOSTIC PANEL */}
              <div style={{ background: "#0a0e17", border: "1px solid #1f2937", padding: "16px", borderRadius: "10px", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "var(--accent-cyan)", fontSize: "0.9rem" }}>
                  🔍 Live Blockchain Verification for Vault #{vaultData.id}:
                </h4>

                <div style={{ fontSize: "0.85rem", lineHeight: "1.6" }}>
                  <div><strong>Vault Owner:</strong> <code>{vaultData.owner}</code></div>
                  <div><strong>Your Connected Wallet:</strong> <code>{account || "Not connected"}</code></div>

                  <div style={{ marginTop: "10px", fontWeight: 600 }}>Designated Trustees on Contract:</div>
                  {trusteesList.map((t, idx) => (
                    <div key={idx} style={{ paddingLeft: "12px", fontFamily: "monospace", color: t.toLowerCase() === account.toLowerCase() ? "#10b981" : "var(--text-muted)" }}>
                      {idx + 1}. {t} {t.toLowerCase() === account.toLowerCase() ? "👈 (YOU ARE THIS TRUSTEE!)" : ""}
                    </div>
                  ))}

                  <div style={{ marginTop: "12px", padding: "8px", borderRadius: "6px", background: isUserTrustee ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" }}>
                    {isUserTrustee ? (
                      <span style={{ color: "#34d399", fontWeight: 600 }}>
                        ✅ Verified: Your connected wallet IS an authorized trustee!
                      </span>
                    ) : (
                      <span style={{ color: "#f87171", fontWeight: 600 }}>
                        ❌ Warning: Your connected wallet is NOT one of the 3 trustees above. Switch accounts in BridgeKey to one of the 3 addresses!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Box */}
              <div className="countdown-box">
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>TRUSTEE CONSENSUS PROGRESS</div>
                <div className="countdown-digits">
                  {vaultData.currentApprovals} / {vaultData.requiredApprovals}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {vaultData.currentApprovals >= 2 ? "🎉 Consensus reached! Vault is unlocked." : "Requires 2 of 3 approvals"}
                </div>
              </div>

              {/* Action Button */}
              <button
                className="btn-primary"
                onClick={handleTrusteeApprove}
                disabled={loading || !isUserTrustee || !isChainExpired || vaultData.isReleased}
              >
                {!isUserTrustee
                  ? "❌ Connect Authorized Trustee Wallet Above"
                  : !isChainExpired
                  ? "🔒 Owner Still Active On-Chain (Wait for Timeout)"
                  : vaultData.isReleased
                  ? "Vault Already Released"
                  : "✍️ Sign & Approve Release"}
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Enter a Vault ID and click Inspect Vault.</p>
          )}
        </div>
      )}

      {/* TAB 4: BENEFICIARY (CLAIM) */}
      {activeTab === "beneficiary" && (
        <div className="card">
          <h2>Beneficiary Access Portal</h2>
          <p className="desc">Inherited secret or IPFS link will be unlocked once both the inactivity timer and 2-of-3 trustee approvals are satisfied.</p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              className="form-input"
              placeholder="Vault ID (e.g. 1)"
              value={searchVaultId}
              onChange={(e) => setSearchVaultId(e.target.value)}
              style={{ width: "150px" }}
            />
            <button className="btn-secondary" onClick={() => fetchVault(searchVaultId)} disabled={loading}>
              {loading ? "Checking..." : "Check Vault"}
            </button>
          </div>

          {vaultData ? (
            vaultData.isReleased ? (
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", padding: "20px", borderRadius: "8px" }}>
                <h3 style={{ color: "#34d399", marginTop: 0 }}>🎉 Vault Released Successfully!</h3>
                <p style={{ color: "var(--text-muted)" }}>Decrypted Secret Data / IPFS Pointer:</p>
                <div style={{ background: "#0a0e17", padding: "14px", borderRadius: "6px", fontFamily: "monospace", color: "#06b6d4", wordBreak: "break-all" }}>
                  {vaultData.secretDataOrIpfs}
                </div>
              </div>
            ) : (
              <div style={{ background: "#1f2937", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-amber)" }}>🔒 Vault is Locked</div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Status: {isChainExpired ? "Awaiting Trustee Consensus" : "Owner Inactivity Countdown Active"}.
                </p>
              </div>
            )
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Enter a Vault ID to check release status.</p>
          )}
        </div>
      )}
    </div>
  );
}