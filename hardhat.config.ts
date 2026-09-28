import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    mstTestnet: {
      type: "http",
      chainType: "generic",
      url: configVariable("MST_TESTNET_RPC_URL"),
      accounts: [configVariable("MST_PRIVATE_KEY")],
      chainId: 91562037,
      ignition: {
        maxFeePerGas: 20_000_000_000n,        // 20 Gwei total max
        maxPriorityFeePerGas: 2_000_000_000n, // 2 Gwei tip (clears the 1 Gwei minimum)
      },
    },
  },
});