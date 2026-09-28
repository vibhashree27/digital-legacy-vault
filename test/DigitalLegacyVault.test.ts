import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("DigitalLegacyVault - Edge Case Tests", function () {
  let vaultContract: any;
  let owner: any;
  let beneficiary: any;
  let trustee1: any;
  let trustee2: any;
  let trustee3: any;

  const PING_INTERVAL = 60; // 60 seconds for fast testing
  const SECRET_PAYLOAD = "ipfs://QmDigitalLegacyVaultDemoSecret123456789";

  beforeEach(async function () {
    [owner, beneficiary, trustee1, trustee2, trustee3] = await ethers.getSigners();
    vaultContract = await ethers.deployContract("DigitalLegacyVault");
  });

  it("1. Should create a vault with 3 trustees and 2 required approvals", async function () {
    const trustees = [trustee1.address, trustee2.address, trustee3.address];
    await vaultContract.createVault(beneficiary.address, trustees, 2, PING_INTERVAL, SECRET_PAYLOAD);

    const vault = await vaultContract.getVault(1);
    expect(vault.owner).to.equal(owner.address);
    expect(vault.beneficiary).to.equal(beneficiary.address);
    expect(vault.requiredApprovals).to.equal(2);
    expect(vault.isReleased).to.be.false;
  });

  it("2. Should reset timer and clear premature votes when owner checks in", async function () {
    const trustees = [trustee1.address, trustee2.address, trustee3.address];
    await vaultContract.createVault(beneficiary.address, trustees, 2, PING_INTERVAL, SECRET_PAYLOAD);

    // Fast-forward 30 seconds
    await ethers.provider.send("evm_increaseTime", [30]);
    await ethers.provider.send("evm_mine", []);

    await vaultContract.checkIn(1);
    const vault = await vaultContract.getVault(1);
    expect(vault.currentApprovals).to.equal(0);
  });

  it("3. FAIL TEST: Should REJECT trustee approval if timer has NOT expired", async function () {
    const trustees = [trustee1.address, trustee2.address, trustee3.address];
    await vaultContract.createVault(beneficiary.address, trustees, 2, PING_INTERVAL, SECRET_PAYLOAD);

    // Trustee 1 tries to approve while owner is still active:
    await expect(
      vaultContract.connect(trustee1).trusteeApprove(1)
    ).to.be.revertedWith("Owner is still active (timeout not reached)");
  });

  it("4. FAIL TEST: Should NOT release with only 1 trustee approval (needs 2)", async function () {
    const trustees = [trustee1.address, trustee2.address, trustee3.address];
    await vaultContract.createVault(beneficiary.address, trustees, 2, PING_INTERVAL, SECRET_PAYLOAD);

    // Fast-forward past the 60s timeout
    await ethers.provider.send("evm_increaseTime", [PING_INTERVAL + 5]);
    await ethers.provider.send("evm_mine", []);

    // Trustee 1 approves
    await vaultContract.connect(trustee1).trusteeApprove(1);

    const vault = await vaultContract.getVault(1);
    expect(vault.currentApprovals).to.equal(1);
    expect(vault.isReleased).to.be.false;

    // Explicit release should also fail because only 1 approved
    await expect(vaultContract.release(1)).to.be.revertedWith("Need at least 2 trustee approvals");
  });

  it("5. SUCCESS FLOW: Should release when timeout expired AND 2 trustees approve", async function () {
    const trustees = [trustee1.address, trustee2.address, trustee3.address];
    await vaultContract.createVault(beneficiary.address, trustees, 2, PING_INTERVAL, SECRET_PAYLOAD);

    // Fast-forward past the 60s timeout
    await ethers.provider.send("evm_increaseTime", [PING_INTERVAL + 5]);
    await ethers.provider.send("evm_mine", []);

    // Trustee 1 approves
    await vaultContract.connect(trustee1).trusteeApprove(1);

    // Trustee 2 approves -> triggers automatic release
    const tx = await vaultContract.connect(trustee2).trusteeApprove(1);

    await expect(tx)
      .to.emit(vaultContract, "VaultReleased")
      .withArgs(1, SECRET_PAYLOAD, beneficiary.address);

    const vault = await vaultContract.getVault(1);
    expect(vault.isReleased).to.be.true;
  });
});