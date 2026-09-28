import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DigitalLegacyVaultModule", (m) => {
  const vault = m.contract("DigitalLegacyVault");

  return { vault };
});