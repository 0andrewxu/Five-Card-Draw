import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
import * as dotenv from "dotenv";
import { Wallet } from "ethers";
dotenv.config();

import "./tasks/accounts";
import "./tasks/FHECounter";
import "./tasks/FiveCardDraw";

const INFURA_API_KEY: string = process.env.INFURA_API_KEY || "";
const PRIVATE_KEY: string | undefined = process.env.PRIVATE_KEY;
const NORMALIZED_PRIVATE_KEY = PRIVATE_KEY ? (PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`) : undefined;
const SEPOLIA_DEPLOYER_ADDRESS = NORMALIZED_PRIVATE_KEY ? new Wallet(NORMALIZED_PRIVATE_KEY).address : undefined;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
      sepolia: SEPOLIA_DEPLOYER_ADDRESS ?? 0,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: vars.get("ETHERSCAN_API_KEY", ""),
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      // accounts are auto-provisioned by hardhat
      chainId: 31337,
    },
    anvil: {
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: NORMALIZED_PRIVATE_KEY ? [NORMALIZED_PRIVATE_KEY] : [],
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
