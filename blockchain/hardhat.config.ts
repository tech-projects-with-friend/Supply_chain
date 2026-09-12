import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_API_URL || "",
      accounts:
        process.env.PRIVATE_KEY && /^0x?[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY.trim())
          ? [process.env.PRIVATE_KEY.trim()]
          : [],
    },
  },
};

export default config;
